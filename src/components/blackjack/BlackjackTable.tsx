import { BlackjackGameState, BlackjackAction } from "@/lib/blackjack/blackjackTypes";
import { getAvailableActions } from "@/lib/blackjack/blackjackEngine";
import PlayingCard from "@/components/cards/PlayingCard";
import Confetti from "@/components/Confetti";
import SoundToggle from "@/components/SoundToggle";
import PlayerAvatar from "@/components/PlayerAvatar";
import PokerChip from "@/components/PokerChip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { sounds } from "@/lib/sounds";
import { usePlayersProfiles } from "@/hooks/usePlayerProfile";
import { useTableFelt } from "@/hooks/useTableFelt";

interface BlackjackTableProps {
  gameState: BlackjackGameState;
  localPlayerId: string;
  onAction: (action: BlackjackAction) => void;
  onPlaceBet: (amount: number) => void;
  onStartRound: () => void;
  onNewRound: () => void;
  isSpectator?: boolean;
  tableFelt?: string;
  cardBack?: string;
  chipStyle?: string;
}

export const BlackjackTable = ({
  gameState,
  localPlayerId,
  onAction,
  onPlaceBet,
  onStartRound,
  onNewRound,
  isSpectator = false,
  tableFelt,
  cardBack,
  chipStyle,
}: BlackjackTableProps) => {
  const { feltStyle, patternStyle } = useTableFelt(tableFelt);
  const [betAmount, setBetAmount] = useState<number>(gameState.minBet);
  const prevPhaseRef = useRef(gameState.phase);
  const [showShake, setShowShake] = useState(false);
  const playerIds = useMemo(() => gameState.players.map(p => p.id), [gameState.players]);
  const profiles = usePlayersProfiles(playerIds);
  
  const localPlayer = gameState.players.find(p => p.id === localPlayerId);
  const availableActions = getAvailableActions(gameState, localPlayerId);
  const isMyTurn = localPlayer?.isTurn || false;
  const localResult = localPlayer?.result;
  const isWinner = localResult === 'win' || localResult === 'blackjack';
  const isLoser = localResult === 'lose';

  // Sound effects on phase changes
  useEffect(() => {
    if (gameState.phase === 'dealing' && prevPhaseRef.current !== 'dealing') {
      gameState.players.forEach((_, i) => {
        setTimeout(() => sounds.cardDeal(), i * 100);
        setTimeout(() => sounds.cardDeal(), (gameState.players.length + i) * 100);
      });
    }
    if (gameState.phase === 'results' && prevPhaseRef.current !== 'results') {
      if (isWinner) {
        sounds.win();
        if (localResult === 'blackjack') sounds.blackjack();
      } else if (isLoser) {
        sounds.lose();
        setShowShake(true);
        setTimeout(() => setShowShake(false), 500);
      } else if (localPlayer?.isBusted) {
        sounds.bust();
        setShowShake(true);
        setTimeout(() => setShowShake(false), 500);
      }
    }
    prevPhaseRef.current = gameState.phase;
  }, [gameState.phase, isWinner, isLoser, localResult, localPlayer?.isBusted, gameState.players]);

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
    <div className={cn(
      "relative w-full min-h-[600px] rounded-3xl border-8 border-amber-800 shadow-2xl p-8",
      showShake && "animate-shake"
    )} style={feltStyle}>
      {/* Felt pattern overlay */}
      <div className="absolute inset-0 rounded-3xl opacity-30" style={patternStyle} />
      <SoundToggle />
      <Confetti active={isWinner && gameState.phase === 'results'} />
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
              cardBack={cardBack}
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
              <div className="text-sm font-medium text-foreground flex items-center justify-center gap-1.5">
                <PlayerAvatar
                  preset={profiles.get(player.id)?.avatar_preset}
                  customUrl={profiles.get(player.id)?.avatar_url}
                  size="sm"
                />
                {player.name}
                {player.id === localPlayerId && <span className="text-xs ml-1">(You)</span>}
              </div>
              <div className="text-xs text-muted-foreground">Chips: ${player.chips}</div>
              {player.currentBet > 0 && (
                <div className="text-xs text-primary flex items-center justify-center gap-1">
                  <PokerChip chipStyle={chipStyle || profiles.get(player.id)?.chip_style} size="sm" />
                  ${player.currentBet}
                </div>
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
        <div className="text-center space-y-4">
          {isWinner && (
            <div className="animate-bounce-in">
              <h2 className="text-3xl font-display font-bold text-primary shimmer-text mb-2">
                {localResult === 'blackjack' ? '🃏 BLACKJACK!' : '🎉 You Win!'}
              </h2>
            </div>
          )}
          {isLoser && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-display font-bold text-destructive mb-2">
                Better luck next time
              </h2>
            </div>
          )}
          <Button size="lg" onClick={onNewRound} className="animate-fade-in">
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
