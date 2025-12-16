import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { GameState } from "@/lib/gameTypes";
import { createGame, startAction, pass, getCurrentPlayer } from "@/lib/gameEngine";
import { GameBoard } from "@/components/game/GameBoard";
import { toast } from "@/hooks/use-toast";

const Game = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const playerName = searchParams.get("name") || "Player";
  const numBots = parseInt(searchParams.get("bots") || "3", 10);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const localPlayerId = "player_0";

  // Initialize game
  useEffect(() => {
    const botNames = ["Lord Baelish", "Cersei", "Tyrion", "Varys", "Daenerys"];
    const players = [playerName, ...botNames.slice(0, numBots)];
    const state = createGame(players);
    setGameState(state);
  }, [playerName, numBots]);

  // AI turn handler
  useEffect(() => {
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
  }, [gameState, localPlayerId]);

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
    />
  );
};

export default Game;
