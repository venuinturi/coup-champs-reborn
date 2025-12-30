import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GameState, ActionType, Character } from '@/lib/gameTypes';
import {
  startAction,
  challenge,
  block,
  pass,
  chooseCardToLose,
  chooseExchangeCards,
} from '@/lib/gameEngine';
import { supabase } from '@/integrations/supabase/client';
import { GameBoard } from '@/components/game/GameBoard';
import { GameChat } from '@/components/game/GameChat';
import { VoiceChat } from '@/components/game/VoiceChat';
import { toast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';
import { usePlayerAuth } from '@/hooks/usePlayerAuth';

const MultiplayerGame = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomCode = searchParams.get('room');
  const playerName = searchParams.get('name') || 'Player';

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  
  // Use secure anonymous auth instead of localStorage
  const { playerId: localPlayerId, loading: authLoading } = usePlayerAuth();
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isMountedRef = useRef(true);

  // Fetch initial game state and subscribe to updates
  useEffect(() => {
    if (!roomCode) {
      navigate('/');
      return;
    }

    // Wait for auth to be ready
    if (authLoading || !localPlayerId) {
      console.log('Waiting for auth to be ready...');
      return;
    }

    isMountedRef.current = true;

    const fetchAndSubscribe = async () => {
      console.log('Fetching room:', roomCode, 'Player:', localPlayerId);
      
      // Fetch room
      const { data: roomData, error } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('room_code', roomCode)
        .single();

      if (error || !roomData) {
        console.error('Room fetch error:', error);
        toast({
          title: 'Error',
          description: 'Room not found',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }

      console.log('Room fetched, status:', roomData.status);
      
      if (isMountedRef.current) {
        setRoomId(roomData.id);
        if (roomData.game_state) {
          console.log('Setting initial game state');
          setGameState(roomData.game_state as unknown as GameState);
        }
      }

      // Clean up any existing channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      // Subscribe to game state changes
      const channel = supabase
        .channel(`multiplayer_game_${roomCode}_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'game_rooms',
            filter: `room_code=eq.${roomCode}`,
          },
          (payload) => {
            console.log('Game state update received:', payload.eventType);
            const newRoom = payload.new as any;
            if (newRoom.game_state && isMountedRef.current) {
              console.log('Updating game state from realtime');
              setGameState(newRoom.game_state as GameState);
            }
          }
        )
        .subscribe((status) => {
          console.log('Multiplayer game channel status:', status);
        });

      channelRef.current = channel;
    };

    fetchAndSubscribe();

    return () => {
      console.log('MultiplayerGame unmounting, cleaning up');
      isMountedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [roomCode, navigate, authLoading, localPlayerId]);

  // Update game state in database
  const updateGameState = useCallback(async (newState: GameState) => {
    if (!roomId) {
      console.error('No room ID, cannot update game state');
      return;
    }

    console.log('Updating game state in database');
    
    // Update local state immediately for responsiveness
    setGameState(newState);

    const { error } = await supabase
      .from('game_rooms')
      .update({
        game_state: newState as any,
        status: newState.winner ? 'finished' : 'playing',
      })
      .eq('id', roomId);

    if (error) {
      console.error('Failed to update game state:', error);
      toast({
        title: 'Sync Error',
        description: 'Failed to sync game state',
        variant: 'destructive',
      });
    } else {
      console.log('Game state updated successfully');
    }
  }, [roomId]);

  // Handle player action
  const handleAction = useCallback(async (actionType: ActionType, targetId?: string) => {
    if (!gameState) return;

    console.log('Action:', actionType, 'Target:', targetId, 'Player:', localPlayerId);

    try {
      const newState = startAction(gameState, {
        type: actionType,
        playerId: localPlayerId,
        targetId,
      });
      await updateGameState(newState);
    } catch (error) {
      console.error('Action error:', error);
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

    console.log('Challenge by:', localPlayerId);

    try {
      const newState = challenge(gameState, localPlayerId);
      await updateGameState(newState);
    } catch (error) {
      console.error('Challenge error:', error);
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

    console.log('Block with:', character, 'by:', localPlayerId);

    try {
      const newState = block(gameState, localPlayerId, character);
      await updateGameState(newState);
    } catch (error) {
      console.error('Block error:', error);
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

    console.log('Pass by:', localPlayerId);

    try {
      const newState = pass(gameState, localPlayerId);
      await updateGameState(newState);
    } catch (error) {
      console.error('Pass error:', error);
      toast({
        title: 'Pass Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [gameState, localPlayerId, updateGameState]);

  // Handle choosing which card to lose
  const handleChooseCardToLose = useCallback(async (card: Character) => {
    if (!gameState) return;

    console.log('Choose card to lose:', card, 'by:', localPlayerId);

    try {
      const newState = chooseCardToLose(gameState, localPlayerId, card);
      await updateGameState(newState);
    } catch (error) {
      console.error('Choose card error:', error);
      toast({
        title: 'Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [gameState, localPlayerId, updateGameState]);

  // Handle exchange card selection
  const handleExchangeSelect = useCallback(async (selectedCards: Character[]) => {
    if (!gameState) return;

    console.log('Exchange select:', selectedCards, 'by:', localPlayerId);

    try {
      const newState = chooseExchangeCards(gameState, localPlayerId, selectedCards);
      await updateGameState(newState);
    } catch (error) {
      console.error('Exchange error:', error);
      toast({
        title: 'Exchange Failed',
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

  if (!gameState || !localPlayerId || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">
          {authLoading ? 'Authenticating...' : 'Loading game...'}
        </div>
      </div>
    );
  }

  // Debug: show current player info
  const currentPlayerIndex = gameState.currentPlayerIndex;
  const currentPlayer = gameState.players[currentPlayerIndex];
  console.log('Current turn:', currentPlayer?.name, 'Local player:', localPlayerId, 'Is my turn:', currentPlayer?.id === localPlayerId);

  return (
    <>
      <GameBoard
        initialState={gameState}
        localPlayerId={localPlayerId}
        onGameEnd={handleGameEnd}
        onRestart={handleRestart}
        onAction={handleAction}
        onChallenge={handleChallenge}
        onBlock={handleBlock}
        onPass={handlePass}
        onChooseCardToLose={handleChooseCardToLose}
        onExchangeSelect={handleExchangeSelect}
        isMultiplayer
      />
      
      {/* Chat and Voice */}
      {roomId && (
        <>
          <GameChat 
            roomId={roomId} 
            playerId={localPlayerId} 
            playerName={playerName} 
          />
          <VoiceChat 
            roomId={roomId} 
            playerId={localPlayerId} 
            playerName={playerName} 
          />
        </>
      )}
    </>
  );
};

export default MultiplayerGame;
