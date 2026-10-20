import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getBrowserId } from "@/lib/poker/browserId";
import type { PokerLedgerSession } from "@/lib/poker/pokerLedger";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Generates a clean 6-character uppercase room code like "PK8F2M"
const generateRoomCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // unambiguous characters
  let code = "PK";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

export interface PokerRoom {
  id: string;
  room_code: string;
  room_name: string;
  creator_id: string;
  session_data: PokerLedgerSession;
  status: "active" | "ended";
  created_at: string;
  updated_at: string;
}

interface UsePokerRoomReturn {
  room: PokerRoom | null;
  isCreator: boolean;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;

  createRoom: (roomName: string, initialSession: PokerLedgerSession) => Promise<string | null>;
  joinRoom: (roomCode: string) => Promise<boolean>;
  updateRoomSession: (session: PokerLedgerSession) => Promise<void>;
  endRoom: () => Promise<void>;
  leaveRoom: () => void;
}

// Helper to ensure a valid auth id (anonymous or existing session)
const getOrCreateUserId = async (): Promise<string> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) return session.user.id;

    const { data, error } = await supabase.auth.signInAnonymously();
    if (!error && data?.user?.id) return data.user.id;
  } catch (err) {
    console.warn("Anonymous auth failed, falling back to browserId:", err);
  }
  return getBrowserId();
};

const parseRoomFromRow = (row: any): PokerRoom => {
  const gameState = (row.game_state || {}) as any;
  const sessionData = (gameState.session_data || {}) as PokerLedgerSession;
  return {
    id: row.id,
    room_code: row.room_code,
    room_name: gameState.room_name || row.host_name || "Poker Room",
    creator_id: row.host_id,
    session_data: sessionData,
    status: row.status === "finished" || row.status === "ended" ? "ended" : "active",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

export const usePokerRoom = (): UsePokerRoomReturn => {
  const [room, setRoom] = useState<PokerRoom | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>(getBrowserId());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Initialize user id
  useEffect(() => {
    getOrCreateUserId().then((uid) => {
      if (uid) setCurrentUserId(uid);
    });
  }, []);

  // Determine if current user is the host
  const isCreator = Boolean(
    room &&
      (room.creator_id === currentUserId ||
        localStorage.getItem(`poker_room_host_${room.room_code}`) === "true")
  );

  // Subscribe to realtime updates for a room
  const subscribeToRoom = useCallback((roomCode: string) => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`poker_ledger_room_${roomCode}_${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_rooms",
          filter: `room_code=eq.${roomCode}`,
        },
        (payload: any) => {
          if (payload.eventType === "DELETE") {
            setRoom(null);
            setError("Room has been deleted.");
            setIsConnected(false);
          } else if (payload.new) {
            setRoom(parseRoomFromRow(payload.new));
          }
        }
      )
      .subscribe((status: string) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    channelRef.current = channel;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  // Create a new room
  const createRoom = useCallback(
    async (roomName: string, initialSession: PokerLedgerSession): Promise<string | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const uid = await getOrCreateUserId();
        setCurrentUserId(uid);

        // Try creating with a new room code (retry up to 3 times on duplicate)
        let roomCode = generateRoomCode();
        let insertedData: any = null;

        for (let attempt = 0; attempt < 3; attempt++) {
          const { data, error: insertError } = await supabase
            .from("game_rooms")
            .insert({
              room_code: roomCode,
              host_id: uid,
              host_name: roomName.trim(),
              status: "waiting",
              max_players: 20,
              game_state: {
                type: "poker_ledger",
                room_name: roomName.trim(),
                session_data: initialSession,
              } as any,
            })
            .select()
            .single();

          if (!insertError && data) {
            insertedData = data;
            break;
          }

          if (insertError?.code === "23505") {
            roomCode = generateRoomCode();
            continue;
          }

          throw insertError;
        }

        if (!insertedData) {
          throw new Error("Could not create room code. Please try again.");
        }

        // Mark this browser as the host for this room
        try {
          localStorage.setItem(`poker_room_host_${roomCode}`, "true");
        } catch (e) {
          console.warn("Failed to set localStorage host flag", e);
        }

        const newRoom = parseRoomFromRow(insertedData);
        setRoom(newRoom);
        subscribeToRoom(roomCode);
        return roomCode;
      } catch (err: any) {
        console.error("Failed to create room:", err);
        const msg = err?.message || "Failed to create room";
        setError(msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [subscribeToRoom]
  );

  // Join an existing room by code
  const joinRoom = useCallback(
    async (roomCode: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const normalizedCode = roomCode.trim().toUpperCase();

        const { data, error: fetchError } = await supabase
          .from("game_rooms")
          .select("*")
          .eq("room_code", normalizedCode)
          .single();

        if (fetchError || !data) {
          setError("Room not found. Please check the code and try again.");
          return false;
        }

        const foundRoom = parseRoomFromRow(data);
        setRoom(foundRoom);
        subscribeToRoom(normalizedCode);
        return true;
      } catch (err: any) {
        console.error("Failed to join room:", err);
        setError(err?.message || "Failed to join room");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [subscribeToRoom]
  );

  // Update the session data in the room (creator only)
  const updateRoomSession = useCallback(
    async (session: PokerLedgerSession): Promise<void> => {
      if (!room) return;

      try {
        const { error: updateError } = await supabase
          .from("game_rooms")
          .update({
            game_state: {
              type: "poker_ledger",
              room_name: room.room_name,
              session_data: session,
            } as any,
            updated_at: new Date().toISOString(),
          })
          .eq("id", room.id);

        if (updateError) {
          console.error("Failed to sync room session:", updateError);
        }
      } catch (err) {
        console.error("Error updating room session:", err);
      }
    },
    [room]
  );

  // End the room
  const endRoom = useCallback(async (): Promise<void> => {
    if (!room) return;

    try {
      await supabase
        .from("game_rooms")
        .update({ status: "finished", updated_at: new Date().toISOString() })
        .eq("id", room.id);
    } catch (err) {
      console.error("Error ending room:", err);
    }
  }, [room]);

  // Leave / disconnect from room
  const leaveRoom = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setRoom(null);
    setIsConnected(false);
    setError(null);
  }, []);

  return {
    room,
    isCreator,
    isLoading,
    error,
    isConnected,
    createRoom,
    joinRoom,
    updateRoomSession,
    endRoom,
    leaveRoom,
  };
};
