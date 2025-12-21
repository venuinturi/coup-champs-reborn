import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GameState } from '@/lib/gameTypes';
import { toast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface RoomPlayer {
  id: string;
  player_id: string;
  player_name: string;
  is_host: boolean;
  is_ready: boolean;
  joined_at: string;
}

export interface GameRoom {
  id: string;
  room_code: string;
  host_id: string;
  host_name: string;
  max_players: number;
  status: 'waiting' | 'playing' | 'finished';
  game_state: GameState | null;
  created_at: string;
  updated_at: string;
}

// Generate a unique player ID for this session
const getOrCreatePlayerId = (): string => {
  let playerId = localStorage.getItem('coup_player_id');
  if (!playerId) {
    playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('coup_player_id', playerId);
  }
  return playerId;
};

// Generate a random 6-character room code
const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

export const useMultiplayer = () => {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const playerId = useRef(getOrCreatePlayerId()).current;
  const roomIdRef = useRef<string | null>(null);
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Cleanup all channels
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, []);

  // Create a new room
  const createRoom = useCallback(async (hostName: string): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      const roomCode = generateRoomCode();
      
      // Create room
      const { data: roomData, error: roomError } = await supabase
        .from('game_rooms')
        .insert({
          room_code: roomCode,
          host_id: playerId,
          host_name: hostName,
          status: 'waiting',
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Add host as first player
      const { error: playerError } = await supabase
        .from('room_players')
        .insert({
          room_id: roomData.id,
          player_id: playerId,
          player_name: hostName,
          is_host: true,
          is_ready: true,
        });

      if (playerError) throw playerError;

      console.log('Room created:', roomCode);
      return roomCode;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create room';
      if (isMountedRef.current) {
        setError(message);
      }
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
      return null;
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [playerId]);

  // Join an existing room
  const joinRoom = useCallback(async (roomCode: string, playerName: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Find room
      const { data: roomData, error: roomError } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('room_code', roomCode.toUpperCase())
        .eq('status', 'waiting')
        .maybeSingle();

      if (roomError) throw roomError;
      if (!roomData) {
        throw new Error('Room not found or game already started');
      }

      // Check player count
      const { data: existingPlayers } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomData.id);

      if (existingPlayers && existingPlayers.length >= roomData.max_players) {
        throw new Error('Room is full');
      }

      // Check if already in room
      const alreadyJoined = existingPlayers?.some(p => p.player_id === playerId);
      if (alreadyJoined) {
        console.log('Already in room');
        return true;
      }

      // Join room
      const { error: joinError } = await supabase
        .from('room_players')
        .insert({
          room_id: roomData.id,
          player_id: playerId,
          player_name: playerName,
          is_host: false,
          is_ready: false,
        });

      if (joinError) throw joinError;

      console.log('Joined room:', roomCode);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to join room';
      if (isMountedRef.current) {
        setError(message);
      }
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
      return false;
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [playerId]);

  // Fetch players for a room
  const fetchPlayers = useCallback(async (roomId: string) => {
    const { data: playersData } = await supabase
      .from('room_players')
      .select('*')
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true });

    if (playersData && isMountedRef.current) {
      console.log('Players fetched:', playersData.length);
      setPlayers(playersData as RoomPlayer[]);
    }
  }, []);

  // Subscribe to room updates
  const subscribeToRoom = useCallback((roomCode: string) => {
    console.log('Subscribing to room:', roomCode);

    // Cleanup any existing channels first
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];

    // Initial fetch
    const fetchRoom = async () => {
      const { data: roomData } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('room_code', roomCode)
        .single();

      if (roomData && isMountedRef.current) {
        console.log('Room fetched:', roomData.id);
        roomIdRef.current = roomData.id;
        
        setRoom({
          ...roomData,
          game_state: roomData.game_state as unknown as GameState | null,
        } as GameRoom);

        await fetchPlayers(roomData.id);
      }
    };

    fetchRoom();

    // Subscribe to room changes
    const roomChannel = supabase
      .channel(`room_updates_${roomCode}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rooms',
          filter: `room_code=eq.${roomCode}`,
        },
        (payload) => {
          console.log('Room update received:', payload.eventType);
          if (payload.new && isMountedRef.current) {
            const newRoom = payload.new as any;
            setRoom({
              ...newRoom,
              game_state: newRoom.game_state as GameState | null,
            } as GameRoom);
          }
        }
      )
      .subscribe((status) => {
        console.log('Room channel status:', status);
      });

    channelsRef.current.push(roomChannel);

    // Subscribe to player changes
    const playersChannel = supabase
      .channel(`players_updates_${roomCode}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_players',
        },
        async (payload) => {
          console.log('Players update received:', payload.eventType);
          if (roomIdRef.current && isMountedRef.current) {
            await fetchPlayers(roomIdRef.current);
          }
        }
      )
      .subscribe((status) => {
        console.log('Players channel status:', status);
      });

    channelsRef.current.push(playersChannel);

    return () => {
      console.log('Cleaning up subscriptions');
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, [fetchPlayers]);

  // Toggle ready status
  const toggleReady = useCallback(async () => {
    const currentRoom = room;
    const currentPlayers = players;
    
    if (!currentRoom) return;

    const player = currentPlayers.find(p => p.player_id === playerId);
    if (!player) return;

    const { error } = await supabase
      .from('room_players')
      .update({ is_ready: !player.is_ready })
      .eq('room_id', currentRoom.id)
      .eq('player_id', playerId);

    if (error) {
      console.error('Toggle ready error:', error);
    } else {
      console.log('Ready status toggled');
    }
  }, [room, players, playerId]);

  // Start the game (host only)
  const startGame = useCallback(async (gameState: GameState) => {
    const currentRoom = room;
    if (!currentRoom) return false;

    try {
      console.log('Starting game with state:', gameState);
      const { error } = await supabase
        .from('game_rooms')
        .update({
          status: 'playing',
          game_state: gameState as any,
        })
        .eq('id', currentRoom.id);

      if (error) throw error;
      console.log('Game started successfully');
      return true;
    } catch (err) {
      console.error('Failed to start game:', err);
      return false;
    }
  }, [room]);

  // Update game state
  const updateGameState = useCallback(async (gameState: GameState) => {
    const currentRoom = room;
    if (!currentRoom) return false;

    try {
      const { error } = await supabase
        .from('game_rooms')
        .update({
          game_state: JSON.parse(JSON.stringify(gameState)),
          status: gameState.winner ? 'finished' : 'playing',
        })
        .eq('id', currentRoom.id);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Failed to update game state:', err);
      return false;
    }
  }, [room]);

  // Leave room
  const leaveRoom = useCallback(async () => {
    const currentRoom = room;
    if (!currentRoom) return;

    await supabase
      .from('room_players')
      .delete()
      .eq('room_id', currentRoom.id)
      .eq('player_id', playerId);

    if (isMountedRef.current) {
      setRoom(null);
      setPlayers([]);
    }
  }, [room, playerId]);

  return {
    room,
    players,
    playerId,
    loading,
    error,
    createRoom,
    joinRoom,
    subscribeToRoom,
    toggleReady,
    startGame,
    updateGameState,
    leaveRoom,
  };
};
