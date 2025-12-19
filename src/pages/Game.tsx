import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { GameState, ActionType, Character } from "@/lib/gameTypes";
import { createGame, startAction, pass, getCurrentPlayer, challenge, block } from "@/lib/gameEngine";
import { supabase } from "@/integrations/supabase/client";
import { GameBoard } from "@/components/game/GameBoard";
import { toast } from "@/hooks/use-toast";

const Game = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const playerName = searchParams.get("name") || "Player";
  const numBots = parseInt(searchParams.get("bots") || "3", 10);
  const roomCode = searchParams.get("room");

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [localPlayerId, setLocalPlayerId] = useState<string>("player_0");

  const isMultiplayer = !!roomCode;

  // Get or create player ID
  useEffect(() => {
    if (isMultiplayer) {
      let playerId = localStorage.getItem('coup_player_id');
      if (!playerId) {
        playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('coup_player_id', playerId);
      }
      setLocalPlayerId(playerId);
    }
  }, [isMultiplayer]);

  // Initialize local game with bots
  useEffect(() => {
    if (isMultiplayer) return;

    const botNames = ["Lord Baelish", "Cersei", "Tyrion", "Varys", "Daenerys"];
    const players = [playerName, ...botNames.slice(0, numBots)];
    const state = createGame(players);
    setGameState(state);
  }, [playerName, numBots, isMultiplayer]);

  // Initialize multiplayer game
  useEffect(() => {
    if (!isMultiplayer || !roomCode) return;

    const fetchAndSubscribe = async () => {
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
  }, [isMultiplayer, roomCode, navigate]);

  // Update game state in database (multiplayer)
  const updateGameState = useCallback(async (newState: GameState) => {
    if (!roomId) return;

    await supabase
      .from('game_rooms')
      .update({
        game_state: JSON.parse(JSON.stringify(newState)),
        status: newState.winner ? 'finished' : 'playing',
      })
      .eq('id', roomId);
  }, [roomId]);

  // AI turn handler (local only)
  useEffect(() => {
    if (isMultiplayer) return;
    if (!gameState || gameState.winner || gameState.phase !== "playing") return;

    const currentPlayer = getCurrentPlayer(gameState);
    const isBot = currentPlayer.id !== localPlayerId;

    // Handle pending action responses from bots
    if (gameState.pendingAction) {
      const waitingBots = gameState.pendingAction.waitingForPlayers.filter(
        (id) => id !== localPlayerId
      );

      if (waitingBots.length > 0) {
        const timer = setTimeout(() => {
          let newState = gameState;
          for (const botId of waitingBots) {
            try {
              // Bots always pass (simplified AI for demo)
              newState = pass(newState, botId);
            } catch {
              // Ignore errors
            }
            if (!newState.pendingAction) break;
          }
          setGameState(newState);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }

    // Bot's turn to take action
    if (isBot && !gameState.pendingAction) {
      const timer = setTimeout(() => {
        try {
          // Simple bot AI: prioritize income for coins, then coup when possible
          const bot = currentPlayer;
          let newState: GameState;

          if (bot.coins >= 7) {
            // Coup a random alive player
            const targets = gameState.players.filter(
              (p) => p.isAlive && p.id !== bot.id
            );
            if (targets.length > 0) {
              const target = targets[Math.floor(Math.random() * targets.length)];
              newState = startAction(gameState, {
                type: "coup",
                playerId: bot.id,
                targetId: target.id,
              });
              setGameState(newState);
              return;
            }
          }

          // Otherwise, take income
          newState = startAction(gameState, {
            type: "income",
            playerId: bot.id,
          });
          setGameState(newState);
        } catch (error) {
          console.error("Bot action error:", error);
        }
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [gameState, localPlayerId, isMultiplayer]);

  // Multiplayer action handlers
  const handleMultiplayerAction = useCallback(async (actionType: ActionType, targetId?: string) => {
    if (!gameState) return;

    try {
      const newState = startAction(gameState, {
        type: actionType,
        playerId: localPlayerId,
        targetId,
      });
      setGameState(newState);
      await updateGameState(newState);
    } catch (error) {
      toast({
        title: "Invalid Action",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }, [gameState, localPlayerId, updateGameState]);

  const handleMultiplayerChallenge = useCallback(async () => {
    if (!gameState) return;

    try {
      const newState = challenge(gameState, localPlayerId);
      setGameState(newState);
      await updateGameState(newState);
    } catch (error) {
      toast({
        title: "Challenge Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }, [gameState, localPlayerId, updateGameState]);

  const handleMultiplayerBlock = useCallback(async (character: Character) => {
    if (!gameState) return;

    try {
      const newState = block(gameState, localPlayerId, character);
      setGameState(newState);
      await updateGameState(newState);
    } catch (error) {
      toast({
        title: "Block Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }, [gameState, localPlayerId, updateGameState]);

  const handleMultiplayerPass = useCallback(async () => {
    if (!gameState) return;

    try {
      const newState = pass(gameState, localPlayerId);
      setGameState(newState);
      await updateGameState(newState);
    } catch (error) {
      toast({
        title: "Pass Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }, [gameState, localPlayerId, updateGameState]);

  const handleRestart = () => {
    navigate("/");
  };

  const handleGameEnd = (winnerId: string) => {
    const winner = gameState?.players.find((p) => p.id === winnerId);
    if (winner) {
      toast({
        title: winnerId === localPlayerId ? "You Won!" : "Game Over",
        description:
          winnerId === localPlayerId
            ? "Congratulations! You've claimed the throne."
            : `${winner.name} has claimed the throne.`,
      });
    }
  };

  if (!gameState) {
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
      onAction={isMultiplayer ? handleMultiplayerAction : undefined}
      onChallenge={isMultiplayer ? handleMultiplayerChallenge : undefined}
      onBlock={isMultiplayer ? handleMultiplayerBlock : undefined}
      onPass={isMultiplayer ? handleMultiplayerPass : undefined}
      isMultiplayer={isMultiplayer}
    />
  );
};

export default Game;
