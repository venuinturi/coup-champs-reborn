import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getBrowserId } from "@/lib/poker/browserId";
import type { PokerLedgerSession } from "@/lib/poker/pokerLedger";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Generates a short, human-friendly room code like "POKER-A3F7"
const generateRoomCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous I/O/0/1
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `PKR-${code}`;
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
  // State
  room: PokerRoom | null;
  isCreator: boolean;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;

  // Actions (only work for creator)
  createRoom: (roomName: string, initialSession: PokerLedgerSession) => Promise<string | null>;
  joinRoom: (roomCode: string) => Promise<boolean>;
  updateRoomSession: (session: PokerLedgerSession) => Promise<void>;
  endRoom: () => Promise<void>;
  leaveRoom: () => void;
}

export const usePokerRoom = (): UsePokerRoomReturn => {
  const [room, setRoom] = useState<PokerRoom | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const browserId = getBrowserId();

  const isCreator = room ? room.creator_id === browserId : false;

  // Subscribe to realtime updates for a room
  const subscribeToRoom = useCallback(
    (roomId: string) => {
      // Clean up existing channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const channel = supabase
        .channel(`poker_ledger_room_${roomId}`)
        .on(
          "postgres_changes" as any,
          {
            event: "UPDATE",
            schema: "public",
            table: "poker_ledger_rooms",
            filter: `id=eq.${roomId}`,
          },
          (payload: any) => {
            const updated = payload.new;
            if (updated) {
              setRoom({
                id: updated.id,
                room_code: updated.room_code,
                room_name: updated.room_name,
                creator_id: updated.creator_id,
                session_data: updated.session_data as PokerLedgerSession,
                status: updated.status,
                created_at: updated.created_at,
                updated_at: updated.updated_at,
              });
            }
          }
        )
        .on(
          "postgres_changes" as any,
          {
            event: "DELETE",
            schema: "public",
            table: "poker_ledger_rooms",
            filter: `id=eq.${roomId}`,
          },
          () => {
            setRoom(null);
            setError("Room has been deleted.");
            setIsConnected(false);
          }
        )
        .subscribe((status: string) => {
          setIsConnected(status === "SUBSCRIBED");
        });

      channelRef.current = channel;
    },
    []
  );

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
        const roomCode = generateRoomCode();

        const { data, error: insertError } = await supabase
          .from("poker_ledger_rooms" as any)
          .insert({
            room_code: roomCode,
            room_name: roomName.trim(),
            creator_id: browserId,
            session_data: initialSession as any,
            status: "active",
          })
          .select()
          .single();

        if (insertError) {
          // Retry once with a different code (unlikely collision)
          if (insertError.code === "23505") {
            const retryCode = generateRoomCode();
            const { data: retryData, error: retryError } = await supabase
              .from("poker_ledger_rooms" as any)
              .insert({
                room_code: retryCode,
                room_name: roomName.trim(),
                creator_id: browserId,
                session_data: initialSession as any,
                status: "active",
              })
              .select()
              .single();

            if (retryError) throw retryError;

            const newRoom: PokerRoom = {
              id: (retryData as any).id,
              room_code: retryCode,
              room_name: roomName.trim(),
              creator_id: browserId,
              session_data: initialSession,
              status: "active",
              created_at: (retryData as any).created_at,
              updated_at: (retryData as any).updated_at,
            };
            setRoom(newRoom);
            subscribeToRoom(newRoom.id);
            return retryCode;
          }
          throw insertError;
        }

        const newRoom: PokerRoom = {
          id: (data as any).id,
          room_code: roomCode,
          room_name: roomName.trim(),
          creator_id: browserId,
          session_data: initialSession,
          status: "active",
          created_at: (data as any).created_at,
          updated_at: (data as any).updated_at,
        };

        setRoom(newRoom);
        subscribeToRoom(newRoom.id);
        return roomCode;
      } catch (err: any) {
        setError(err.message || "Failed to create room");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [browserId, subscribeToRoom]
  );

  // Join an existing room by code
  const joinRoom = useCallback(
    async (roomCode: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const normalizedCode = roomCode.trim().toUpperCase();

        const { data, error: fetchError } = await supabase
          .from("poker_ledger_rooms" as any)
          .select("*")
          .eq("room_code", normalizedCode)
          .single();

        if (fetchError || !data) {
          setError("Room not found. Please check the code and try again.");
          return false;
        }

        const foundRoom: PokerRoom = {
          id: (data as any).id,
          room_code: (data as any).room_code,
          room_name: (data as any).room_name,
          creator_id: (data as any).creator_id,
          session_data: (data as any).session_data as PokerLedgerSession,
          status: (data as any).status,
          created_at: (data as any).created_at,
          updated_at: (data as any).updated_at,
        };

        setRoom(foundRoom);
        subscribeToRoom(foundRoom.id);
        return true;
      } catch (err: any) {
        setError(err.message || "Failed to join room");
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
      if (!room || room.creator_id !== browserId) return;

      try {
        const { error: updateError } = await supabase
          .from("poker_ledger_rooms" as any)
          .update({
            session_data: session as any,
          })
          .eq("id", room.id);

        if (updateError) {
          console.error("Failed to sync room session:", updateError);
        }
      } catch (err) {
        console.error("Error updating room session:", err);
      }
    },
    [room, browserId]
  );

  // End the room
  const endRoom = useCallback(async (): Promise<void> => {
    if (!room || room.creator_id !== browserId) return;

    try {
      await supabase
        .from("poker_ledger_rooms" as any)
        .update({ status: "ended" })
        .eq("id", room.id);
    } catch (err) {
      console.error("Error ending room:", err);
    }
  }, [room, browserId]);

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
