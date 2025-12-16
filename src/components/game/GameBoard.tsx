import { useState, useCallback } from "react";
import { GameState, ActionType, Character } from "@/lib/gameTypes";
import {
  startAction,
  challenge,
  block,
  pass,
  getCurrentPlayer,
} from "@/lib/gameEngine";
import { PlayerDisplay } from "./PlayerDisplay";
import { ActionPanel } from "./ActionPanel";
import { GameLog } from "./GameLog";
import { Button } from "@/components/ui/button";
import { Crown, RotateCcw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface GameBoardProps {
  initialState: GameState;
  localPlayerId: string;
  onGameEnd?: (winnerId: string) => void;
  onRestart?: () => void;
}

export const GameBoard = ({
  initialState,
  localPlayerId,
  onGameEnd,
  onRestart,
}: GameBoardProps) => {
  const [gameState, setGameState] = useState<GameState>(initialState);

  const handleAction = useCallback((actionType: ActionType, targetId?: string) => {
    try {
      const newState = startAction(gameState, {
        type: actionType,
        playerId: localPlayerId,
        targetId,
      });
      setGameState(newState);

      if (newState.winner) {
        onGameEnd?.(newState.winner);
      }
    } catch (error) {
      toast({
        title: "Invalid Action",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }, [gameState, localPlayerId, onGameEnd]);

  const handleChallenge = useCallback(() => {
    try {
      const newState = challenge(gameState, localPlayerId);
      setGameState(newState);

      if (newState.winner) {
        onGameEnd?.(newState.winner);
      }
    } catch (error) {
      toast({
        title: "Challenge Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }, [gameState, localPlayerId, onGameEnd]);

  const handleBlock = useCallback((character: Character) => {
    try {
      const newState = block(gameState, localPlayerId, character);
      setGameState(newState);
    } catch (error) {
      toast({
        title: "Block Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }, [gameState, localPlayerId]);

  const handlePass = useCallback(() => {
    try {
      const newState = pass(gameState, localPlayerId);
      setGameState(newState);

      if (newState.winner) {
        onGameEnd?.(newState.winner);
      }
    } catch (error) {
      toast({
        title: "Pass Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }, [gameState, localPlayerId, onGameEnd]);

  const winner = gameState.winner
    ? gameState.players.find((p) => p.id === gameState.winner)
    : null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="font-display text-3xl text-gold-gradient">COUP</h1>
          <p className="text-muted-foreground text-sm">
            {winner
              ? `Game Over!`
              : `Turn ${Math.floor(gameState.logs.length / 2) + 1}`}
          </p>
        </div>

        {/* Winner Banner */}
        {winner && (
          <div className="bg-primary/20 border border-primary rounded-xl p-6 text-center animate-fade-in">
            <Crown className="w-12 h-12 text-primary mx-auto mb-2" />
            <h2 className="font-display text-2xl text-foreground mb-1">
              {winner.name} Wins!
            </h2>
            <p className="text-muted-foreground mb-4">
              The last family standing claims the throne.
            </p>
            <Button variant="gold" onClick={onRestart}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Play Again
            </Button>
          </div>
        )}

        {/* Players Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {gameState.players.map((player) => (
            <PlayerDisplay
              key={player.id}
              player={player}
              isCurrentPlayer={
                getCurrentPlayer(gameState).id === player.id && !winner
              }
              isLocalPlayer={player.id === localPlayerId}
            />
          ))}
        </div>

        {/* Action Panel */}
        {!winner && (
          <ActionPanel
            gameState={gameState}
            localPlayerId={localPlayerId}
            onAction={handleAction}
            onChallenge={handleChallenge}
            onBlock={handleBlock}
            onPass={handlePass}
          />
        )}

        {/* Game Log */}
        <GameLog logs={gameState.logs} />

        {/* Restart Button (during game) */}
        {!winner && (
          <div className="text-center">
            <Button variant="ghost" size="sm" onClick={onRestart}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Restart Game
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
