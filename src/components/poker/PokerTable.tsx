import { PokerGameState, PokerAction } from "@/lib/poker/pokerTypes";
import { getAvailableActions } from "@/lib/poker/pokerEngine";
import PlayingCard from "@/components/cards/PlayingCard";
import PlayerAvatar from "@/components/PlayerAvatar";
import Confetti from "@/components/Confetti";
import SoundToggle from "@/components/SoundToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { sounds } from "@/lib/sounds";
import { usePlayersProfiles } from "@/hooks/usePlayerProfile";
import { useTableFelt } from "@/hooks/useTableFelt";

interface PokerTableProps {
  gameState: PokerGameState;
  localPlayerId: string;
  onAction: (action: PokerAction, amount?: number) => void;
  isSpectator?: boolean;
  tableFelt?: string;
}

export const PokerTable = ({ gameState, localPlayerId, onAction, isSpectator = false, tableFelt }: PokerTableProps) => {
  const { felt, feltStyle, patternStyle } = useTableFelt(tableFelt);
  const [raiseAmount, setRaiseAmount] = useState<number>(gameState.bigBlind * 2);
  const prevPhaseRef = useRef(gameState.phase);
  const prevTurnRef = useRef<string | null>(null);
  const prevLastAction = useRef(gameState.lastAction);
  
  const localPlayer = gameState.players.find(p => p.id === localPlayerId);
  const availableActions = getAvailableActions(gameState, localPlayerId);
  const isMyTurn = localPlayer?.isTurn || false;
  const callAmount = localPlayer ? gameState.currentBet - localPlayer.currentBet : 0;
  const playerIds = useMemo(() => gameState.players.map(p => p.id), [gameState.players]);
  const profiles = usePlayersProfiles(playerIds);

  // Sound effects for game events
  useEffect(() => {
    // Play sound when it becomes your turn
    if (isMyTurn && prevTurnRef.current !== localPlayerId) {
      sounds.yourTurn();
    }
    const currentTurnPlayer = gameState.players.find(p => p.isTurn);
    prevTurnRef.current = currentTurnPlayer?.id || null;
  }, [isMyTurn, gameState.players, localPlayerId]);

  useEffect(() => {
    if (gameState.phase === 'dealing' && prevPhaseRef.current !== 'dealing') {
      // Staggered deal sounds
      gameState.players.forEach((_, i) => {
        setTimeout(() => sounds.cardDeal(), i * 100);
        setTimeout(() => sounds.cardDeal(), (gameState.players.length + i) * 100);
      });
    }
    if (gameState.phase === 'finished' && prevPhaseRef.current !== 'finished') {
      if (gameState.winner === localPlayerId) {
        sounds.win();
      } else {
        sounds.lose();
      }
    }
    prevPhaseRef.current = gameState.phase;
  }, [gameState.phase, gameState.winner, localPlayerId, gameState.players]);

  // Sound on actions
  useEffect(() => {
    if (gameState.lastAction && gameState.lastAction !== prevLastAction.current) {
      const action = gameState.lastAction.action;
      if (action === 'fold') sounds.fold();
      else if (action === 'check') sounds.check();
      else if (action === 'call') sounds.call();
      else if (action === 'raise') sounds.raise();
      else if (action === 'all-in') sounds.allIn();
    }
    prevLastAction.current = gameState.lastAction;
  }, [gameState.lastAction]);

  const handleAction = (action: PokerAction) => {
    if (action === 'raise') {
      onAction(action, raiseAmount);
    } else {
      onAction(action);
    }
  };

  const getPlayerPosition = (index: number) => {
    const positions = [
      'bottom-4 left-1/2 -translate-x-1/2',
      'left-4 top-1/2 -translate-y-1/2',
      'top-4 left-1/4',
      'top-4 right-1/4',
      'right-4 top-1/2 -translate-y-1/2',
      'bottom-4 right-1/4',
    ];
    return positions[index % positions.length];
  };

  const orderedPlayers = [...gameState.players];
  const localIndex = orderedPlayers.findIndex(p => p.id === localPlayerId);
  if (localIndex > 0) {
    const before = orderedPlayers.splice(0, localIndex);
    orderedPlayers.push(...before);
  }

  return (
    <div className="relative w-full h-full min-h-[600px] rounded-[100px] border-8 border-amber-800 shadow-2xl overflow-hidden" style={feltStyle}>
      <SoundToggle />
      <Confetti active={gameState.winner === localPlayerId} />

      {/* Table felt pattern */}
      <div className="absolute inset-0 opacity-30" style={patternStyle} />

      {/* Pot display */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 text-center">
        <div className={cn(
          "bg-black/40 backdrop-blur-sm rounded-lg px-6 py-3 transition-all duration-300",
          gameState.pot > 0 && "animate-chip-bounce"
        )}>
          <div className="text-sm text-muted-foreground">Pot</div>
          <div className="text-2xl font-bold text-primary">${gameState.pot}</div>
        </div>
      </div>

      {/* Community cards */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-2">
        {gameState.communityCards.map((card, i) => (
          <PlayingCard
            key={i}
            suit={card.suit}
            rank={card.rank}
            faceUp={card.faceUp}
            size="lg"
            animated={true}
            dealDelay={i * 150}
          />
        ))}
        {[...Array(5 - gameState.communityCards.length)].map((_, i) => (
          <div
            key={`placeholder-${i}`}
            className="w-20 h-28 rounded-lg border-2 border-dashed border-white/20"
          />
        ))}
      </div>

      {/* Players */}
      {orderedPlayers.map((player, index) => (
        <div
          key={player.id}
          className={cn(
            "absolute flex flex-col items-center gap-2 animate-fade-in",
            getPlayerPosition(index)
          )}
          style={{ animationDelay: `${index * 100}ms` }}
        >
          {/* Player cards */}
          <div className="flex gap-1">
            {player.cards.map((card, i) => (
              <PlayingCard
                key={i}
                suit={card.suit}
                rank={card.rank}
                faceUp={player.id === localPlayerId || gameState.phase === 'showdown'}
                size="md"
                animated={true}
                dealDelay={index * 100 + i * 80}
              />
            ))}
          </div>

          {/* Player info */}
          <div className={cn(
            "bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 text-center min-w-[120px] transition-all duration-300",
            player.isTurn && "ring-2 ring-primary animate-pulse-ring turn-glow",
            player.folded && "opacity-50",
            player.id === gameState.winner && "animate-winner-glow"
          )}>
            <div className="text-sm font-medium text-foreground flex items-center justify-center gap-1.5">
              <PlayerAvatar
                preset={profiles.get(player.id)?.avatar_preset}
                customUrl={profiles.get(player.id)?.avatar_url}
                size="sm"
              />
              {player.name}
              {player.isDealer && <span className="text-xs bg-primary text-primary-foreground px-1 rounded animate-bounce-in">D</span>}
            </div>
            <div className="text-xs text-muted-foreground">${player.chips}</div>
            {player.currentBet > 0 && (
              <div className="text-xs text-primary animate-slide-up">Bet: ${player.currentBet}</div>
            )}
            {player.folded && (
              <div className="text-xs text-destructive animate-fade-in">Folded</div>
            )}
            {player.isAllIn && (
              <div className="text-xs text-amber-500 animate-bounce-in font-bold">All-In!</div>
            )}
          </div>
        </div>
      ))}

      {/* Action buttons */}
      {isMyTurn && gameState.phase === 'betting' && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 bg-black/60 backdrop-blur-sm rounded-lg p-4 animate-slide-up">
          <div className="flex gap-2 flex-wrap justify-center">
            {availableActions.includes('fold') && (
              <Button variant="destructive" onClick={() => handleAction('fold')} className="hover-scale">
                Fold
              </Button>
            )}
            {availableActions.includes('check') && (
              <Button variant="secondary" onClick={() => handleAction('check')} className="hover-scale">
                Check
              </Button>
            )}
            {availableActions.includes('call') && (
              <Button variant="secondary" onClick={() => handleAction('call')} className="hover-scale">
                Call ${callAmount}
              </Button>
            )}
            {availableActions.includes('raise') && (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={raiseAmount}
                  onChange={(e) => setRaiseAmount(Number(e.target.value))}
                  className="w-24"
                  min={gameState.minRaise}
                />
                <Button onClick={() => handleAction('raise')} className="hover-scale">
                  Raise
                </Button>
              </div>
            )}
            {availableActions.includes('all-in') && (
              <Button variant="default" className="bg-amber-600 hover:bg-amber-700 hover-scale" onClick={() => handleAction('all-in')}>
                All-In
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Game phase and last action */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center">
        <div className="bg-black/40 backdrop-blur-sm rounded-lg px-4 py-2">
          <div className="text-sm text-muted-foreground capitalize">{gameState.bettingRound}</div>
          {gameState.lastAction && (
            <div className="text-xs text-foreground animate-fade-in">
              {gameState.players.find(p => p.id === gameState.lastAction?.playerId)?.name}: {gameState.lastAction.action}
              {gameState.lastAction.amount && ` $${gameState.lastAction.amount}`}
            </div>
          )}
        </div>
      </div>

      {/* Winner announcement */}
      {gameState.winner && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <div className="bg-card rounded-lg p-8 text-center animate-bounce-in">
            <h2 className="text-3xl font-bold text-primary mb-2">
              {gameState.players.find(p => p.id === gameState.winner)?.name} Wins!
            </h2>
            {gameState.winningHand && (
              <p className="text-muted-foreground animate-fade-in">{gameState.winningHand}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PokerTable;
