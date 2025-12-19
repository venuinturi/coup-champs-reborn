import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GameState, ActionType, Character } from '@/lib/gameTypes';
import {
  startAction,
  challenge,
  block,
  pass,
  getCurrentPlayer,
} from '@/lib/gameEngine';
import { supabase } from '@/integrations/supabase/client';
import { GameBoard } from '@/components/game/GameBoard';
import { toast } from '@/hooks/use-toast';

const MultiplayerGame = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomCode = searchParams.get('room');
  const playerName = searchParams.get('name') || 'Player';

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [localPlayerId, setLocalPlayerId] = useState<string>('');

  // Get player ID from localStorage
  useEffect(() => {
    let playerId = localStorage.getItem('coup_player_id');
    if (!playerId) {
      playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('coup_player_id', playerId);
    }
    setLocalPlayerId(playerId);
  }, []);

  // Fetch initial game state and subscribe to updates
  useEffect(() => {
    if (!roomCode) {
      navigate('/');
      return;
    }

    const fetchAndSubscribe = async () => {
      // Fetch room
      const { data: roomData, error } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('room_code', roomCode)
        .single();

      if (error || !roomData) {
        toast({
          title: 'Error',
          description: 'Room not found',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }

      setRoomId(roomData.id);
      if (roomData.game_state) {
        setGameState(roomData.game_state as unknown as GameState);
      }

      // Subscribe to game state changes
      const channel = supabase
        .channel(`game_${roomCode}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'game_rooms',
            filter: `room_code=eq.${roomCode}`,
          },
          (payload) => {
            console.log('Game state update:', payload);
            const newRoom = payload.new as any;
            if (newRoom.game_state) {
              setGameState(newRoom.game_state as GameState);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    fetchAndSubscribe();
  }, [roomCode, navigate]);

  // Update game state in database
  const updateGameState = useCallback(async (newState: GameState) => {
    if (!roomId) return;

    setGameState(newState);

    await supabase
      .from('game_rooms')
      .update({
        game_state: newState as any,
        status: newState.winner ? 'finished' : 'playing',
      })
      .eq('id', roomId);
  }, [roomId]);

  // Handle player action
  const handleAction = useCallback(async (actionType: ActionType, targetId?: string) => {
    if (!gameState) return;

    try {
      const newState = startAction(gameState, {
        type: actionType,
        playerId: localPlayerId,
        targetId,
      });
      await updateGameState(newState);
    } catch (error) {
      toast({
        title: 'Invalid Action',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [gameState, localPlayerId, updateGameState]);

  // Handle challenge
  const handleChallenge = useCallback(async () => {
    if (!gameState) return;

    try {
      const newState = challenge(gameState, localPlayerId);
      await updateGameState(newState);
    } catch (error) {
      toast({
        title: 'Challenge Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [gameState, localPlayerId, updateGameState]);

  // Handle block
  const handleBlock = useCallback(async (character: Character) => {
    if (!gameState) return;

    try {
      const newState = block(gameState, localPlayerId, character);
      await updateGameState(newState);
    } catch (error) {
      toast({
        title: 'Block Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [gameState, localPlayerId, updateGameState]);

  // Handle pass
  const handlePass = useCallback(async () => {
    if (!gameState) return;

    try {
      const newState = pass(gameState, localPlayerId);
      await updateGameState(newState);
    } catch (error) {
      toast({
        title: 'Pass Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [gameState, localPlayerId, updateGameState]);

  const handleRestart = () => {
    navigate('/');
  };

  const handleGameEnd = (winnerId: string) => {
    const winner = gameState?.players.find((p) => p.id === winnerId);
    if (winner) {
      toast({
        title: winnerId === localPlayerId ? 'You Won!' : 'Game Over',
        description:
          winnerId === localPlayerId
            ? "Congratulations! You've claimed the throne."
            : `${winner.name} has claimed the throne.`,
      });
    }
  };

  if (!gameState || !localPlayerId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading game...</div>
      </div>
    );
  }

  return (
    <GameBoard
      initialState={gameState}
      localPlayerId={localPlayerId}
      onGameEnd={handleGameEnd}
      onRestart={handleRestart}
      onAction={handleAction}
      onChallenge={handleChallenge}
      onBlock={handleBlock}
      onPass={handlePass}
      isMultiplayer
    />
  );
};

export default MultiplayerGame;
