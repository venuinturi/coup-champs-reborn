import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GameState } from '@/lib/gameTypes';
import { toast } from '@/hooks/use-toast';

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
  const playerId = getOrCreatePlayerId();

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
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
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
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  // Subscribe to room updates
  const subscribeToRoom = useCallback((roomCode: string) => {
    console.log('Subscribing to room:', roomCode);

    // Initial fetch
    const fetchRoom = async () => {
      const { data: roomData } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('room_code', roomCode)
        .single();

      if (roomData) {
        setRoom({
          ...roomData,
          game_state: roomData.game_state as unknown as GameState | null,
        } as GameRoom);

        const { data: playersData } = await supabase
          .from('room_players')
          .select('*')
          .eq('room_id', roomData.id)
          .order('joined_at', { ascending: true });

        if (playersData) {
          setPlayers(playersData as RoomPlayer[]);
        }
      }
    };

    fetchRoom();

    // Subscribe to room changes
    const roomChannel = supabase
      .channel(`room_${roomCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rooms',
          filter: `room_code=eq.${roomCode}`,
        },
        (payload) => {
          console.log('Room update:', payload);
          if (payload.new) {
            const newRoom = payload.new as any;
            setRoom({
              ...newRoom,
              game_state: newRoom.game_state as GameState | null,
            } as GameRoom);
          }
        }
      )
      .subscribe();

    // We need a separate approach for players since they're linked by room_id
    // Poll for player changes every 2 seconds as fallback
    const pollPlayers = setInterval(async () => {
      if (room?.id) {
        const { data: playersData } = await supabase
          .from('room_players')
          .select('*')
          .eq('room_id', room.id)
          .order('joined_at', { ascending: true });

        if (playersData) {
          setPlayers(playersData as RoomPlayer[]);
        }
      }
    }, 2000);

    return () => {
      supabase.removeChannel(roomChannel);
      clearInterval(pollPlayers);
    };
  }, [room?.id]);

  // Toggle ready status
  const toggleReady = useCallback(async () => {
    if (!room) return;

    const player = players.find(p => p.player_id === playerId);
    if (!player) return;

    await supabase
      .from('room_players')
      .update({ is_ready: !player.is_ready })
      .eq('room_id', room.id)
      .eq('player_id', playerId);
  }, [room, players, playerId]);

  // Start the game (host only)
  const startGame = useCallback(async (gameState: GameState) => {
    if (!room) return false;

    try {
      const { error } = await supabase
        .from('game_rooms')
        .update({
          status: 'playing',
          game_state: gameState as any,
        })
        .eq('id', room.id);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Failed to start game:', err);
      return false;
    }
  }, [room]);

  // Update game state
  const updateGameState = useCallback(async (gameState: GameState) => {
    if (!room) return false;

    try {
      const { error } = await supabase
        .from('game_rooms')
        .update({
          game_state: JSON.parse(JSON.stringify(gameState)),
          status: gameState.winner ? 'finished' : 'playing',
        })
        .eq('id', room.id);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Failed to update game state:', err);
      return false;
    }
  }, [room]);

  // Leave room
  const leaveRoom = useCallback(async () => {
    if (!room) return;

    await supabase
      .from('room_players')
      .delete()
      .eq('room_id', room.id)
      .eq('player_id', playerId);

    setRoom(null);
    setPlayers([]);
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
