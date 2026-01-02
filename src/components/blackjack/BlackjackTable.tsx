import { BlackjackGameState, BlackjackAction } from "@/lib/blackjack/blackjackTypes";
import { getAvailableActions } from "@/lib/blackjack/blackjackEngine";
import PlayingCard from "@/components/cards/PlayingCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface BlackjackTableProps {
  gameState: BlackjackGameState;
  localPlayerId: string;
  onAction: (action: BlackjackAction) => void;
  onPlaceBet: (amount: number) => void;
  onStartRound: () => void;
  onNewRound: () => void;
}

export const BlackjackTable = ({
  gameState,
  localPlayerId,
  onAction,
  onPlaceBet,
  onStartRound,
  onNewRound,
}: BlackjackTableProps) => {
  const [betAmount, setBetAmount] = useState<number>(gameState.minBet);
  
  const localPlayer = gameState.players.find(p => p.id === localPlayerId);
  const availableActions = getAvailableActions(gameState, localPlayerId);
  const isMyTurn = localPlayer?.isTurn || false;

  const handlePlaceBet = () => {
    if (betAmount >= gameState.minBet && betAmount <= Math.min(gameState.maxBet, localPlayer?.chips || 0)) {
      onPlaceBet(betAmount);
    }
  };

  const getResultColor = (result: string | null) => {
    switch (result) {
      case 'win':
      case 'blackjack':
        return 'text-green-500';
      case 'lose':
        return 'text-destructive';
      case 'push':
        return 'text-amber-500';
      default:
        return '';
    }
  };

  return (
    <div className="relative w-full min-h-[600px] bg-gradient-to-br from-green-900 to-green-800 rounded-3xl border-8 border-amber-800 shadow-2xl p-8">
      {/* Dealer section */}
      <div className="text-center mb-8">
        <h3 className="text-lg font-medium text-white/80 mb-3">Dealer</h3>
        <div className="flex justify-center gap-2 mb-2">
          {gameState.dealer.cards.map((card, i) => (
            <PlayingCard
              key={i}
              suit={card.suit}
              rank={card.rank}
              faceUp={card.faceUp}
              size="lg"
            />
          ))}
        </div>
        {gameState.dealer.cards.length > 0 && (
          <div className="text-white">
            {gameState.dealer.handValue > 0 && (
              <span className={cn(
                "text-xl font-bold",
                gameState.dealer.isBusted && "text-destructive"
              )}>
                {gameState.dealer.isBusted ? 'BUST!' : gameState.dealer.handValue}
              </span>
            )}
            {gameState.dealer.hasBlackjack && (
              <span className="text-primary ml-2">BLACKJACK!</span>
            )}
          </div>
        )}
      </div>

      {/* Message */}
      <div className="text-center mb-6">
        <div className="bg-black/40 backdrop-blur-sm rounded-lg px-6 py-3 inline-block">
          <span className="text-lg text-foreground">{gameState.message}</span>
        </div>
      </div>

      {/* Players section */}
      <div className="flex flex-wrap justify-center gap-8 mb-8">
        {gameState.players.map((player) => (
          <div
            key={player.id}
            className={cn(
              "flex flex-col items-center gap-3 p-4 rounded-lg",
              player.id === localPlayerId && "bg-black/30",
              player.isTurn && "ring-2 ring-primary"
            )}
          >
            {/* Player cards */}
            <div className="flex gap-1">
              {player.cards.map((card, i) => (
                <PlayingCard
                  key={i}
                  suit={card.suit}
                  rank={card.rank}
                  faceUp={true}
                  size="lg"
                />
              ))}
            </div>

            {/* Hand value */}
            {player.cards.length > 0 && (
              <div className={cn(
                "text-xl font-bold text-white",
                player.isBusted && "text-destructive"
              )}>
                {player.isBusted ? 'BUST!' : player.handValue}
                {player.hasBlackjack && <span className="text-primary ml-2">BLACKJACK!</span>}
              </div>
            )}

            {/* Result */}
            {player.result && (
              <div className={cn("text-lg font-bold uppercase", getResultColor(player.result))}>
                {player.result}
              </div>
            )}

            {/* Player info */}
            <div className="bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 text-center min-w-[140px]">
              <div className="text-sm font-medium text-foreground">
                {player.name}
                {player.id === localPlayerId && <span className="text-xs ml-1">(You)</span>}
              </div>
              <div className="text-xs text-muted-foreground">Chips: ${player.chips}</div>
              {player.currentBet > 0 && (
                <div className="text-xs text-primary">Bet: ${player.currentBet}</div>
              )}
            </div>

            {/* Betting controls for local player */}
            {player.id === localPlayerId && gameState.phase === 'betting' && player.currentBet === 0 && (
              <div className="flex items-center gap-2 mt-2">
                <Input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(Number(e.target.value))}
                  className="w-24"
                  min={gameState.minBet}
                  max={Math.min(gameState.maxBet, player.chips)}
                />
                <Button onClick={handlePlaceBet}>Bet</Button>
              </div>
            )}

            {/* Action buttons for local player */}
            {player.id === localPlayerId && isMyTurn && availableActions.length > 0 && (
              <div className="flex gap-2 mt-2">
                {availableActions.includes('hit') && (
                  <Button onClick={() => onAction('hit')}>Hit</Button>
                )}
                {availableActions.includes('stand') && (
                  <Button variant="secondary" onClick={() => onAction('stand')}>Stand</Button>
                )}
                {availableActions.includes('double') && (
                  <Button variant="outline" onClick={() => onAction('double')}>Double</Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Start round button */}
      {gameState.phase === 'betting' && localPlayer?.currentBet && localPlayer.currentBet > 0 && (
        <div className="text-center">
          <Button size="lg" onClick={onStartRound}>
            Deal Cards
          </Button>
        </div>
      )}

      {/* New round button */}
      {gameState.phase === 'results' && (
        <div className="text-center">
          <Button size="lg" onClick={onNewRound}>
            New Round
          </Button>
        </div>
      )}

      {/* Round info */}
      <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm rounded-lg px-4 py-2">
        <div className="text-sm text-muted-foreground">Round {gameState.roundNumber}</div>
      </div>
    </div>
  );
};

export default BlackjackTable;
