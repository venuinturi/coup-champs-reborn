import { PokerGameState, PokerAction } from "@/lib/poker/pokerTypes";
import { getAvailableActions } from "@/lib/poker/pokerEngine";
import PlayingCard from "@/components/cards/PlayingCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface PokerTableProps {
  gameState: PokerGameState;
  localPlayerId: string;
  onAction: (action: PokerAction, amount?: number) => void;
}

export const PokerTable = ({ gameState, localPlayerId, onAction }: PokerTableProps) => {
  const [raiseAmount, setRaiseAmount] = useState<number>(gameState.bigBlind * 2);
  
  const localPlayer = gameState.players.find(p => p.id === localPlayerId);
  const availableActions = getAvailableActions(gameState, localPlayerId);
  const isMyTurn = localPlayer?.isTurn || false;
  const callAmount = localPlayer ? gameState.currentBet - localPlayer.currentBet : 0;

  const handleAction = (action: PokerAction) => {
    if (action === 'raise') {
      onAction(action, raiseAmount);
    } else {
      onAction(action);
    }
  };

  // Position players around the table
  const getPlayerPosition = (index: number, total: number) => {
    const positions = [
      'bottom-4 left-1/2 -translate-x-1/2', // 0 - bottom center (local player)
      'left-4 top-1/2 -translate-y-1/2',    // 1 - left
      'top-4 left-1/4',                      // 2 - top left
      'top-4 right-1/4',                     // 3 - top right
      'right-4 top-1/2 -translate-y-1/2',   // 4 - right
      'bottom-4 right-1/4',                  // 5 - bottom right
    ];
    return positions[index % positions.length];
  };

  // Reorder players so local player is first
  const orderedPlayers = [...gameState.players];
  const localIndex = orderedPlayers.findIndex(p => p.id === localPlayerId);
  if (localIndex > 0) {
    const before = orderedPlayers.splice(0, localIndex);
    orderedPlayers.push(...before);
  }

  return (
    <div className="relative w-full h-full min-h-[600px] bg-gradient-to-br from-green-900 to-green-800 rounded-[100px] border-8 border-amber-800 shadow-2xl overflow-hidden">
      {/* Table felt pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full" style={{
          backgroundImage: 'radial-gradient(circle, transparent 20%, rgba(0,0,0,0.3) 20%)',
          backgroundSize: '10px 10px'
        }} />
      </div>

      {/* Pot display */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 text-center">
        <div className="bg-black/40 backdrop-blur-sm rounded-lg px-6 py-3">
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
          />
        ))}
        {/* Placeholder cards */}
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
            "absolute flex flex-col items-center gap-2",
            getPlayerPosition(index, orderedPlayers.length)
          )}
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
              />
            ))}
          </div>

          {/* Player info */}
          <div className={cn(
            "bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 text-center min-w-[120px]",
            player.isTurn && "ring-2 ring-primary animate-pulse",
            player.folded && "opacity-50"
          )}>
            <div className="text-sm font-medium text-foreground flex items-center justify-center gap-1">
              {player.name}
              {player.isDealer && <span className="text-xs bg-primary text-primary-foreground px-1 rounded">D</span>}
            </div>
            <div className="text-xs text-muted-foreground">${player.chips}</div>
            {player.currentBet > 0 && (
              <div className="text-xs text-primary">Bet: ${player.currentBet}</div>
            )}
            {player.folded && (
              <div className="text-xs text-destructive">Folded</div>
            )}
            {player.isAllIn && (
              <div className="text-xs text-amber-500">All-In!</div>
            )}
          </div>
        </div>
      ))}

      {/* Action buttons */}
      {isMyTurn && gameState.phase === 'betting' && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 bg-black/60 backdrop-blur-sm rounded-lg p-4">
          <div className="flex gap-2 flex-wrap justify-center">
            {availableActions.includes('fold') && (
              <Button variant="destructive" onClick={() => handleAction('fold')}>
                Fold
              </Button>
            )}
            {availableActions.includes('check') && (
              <Button variant="secondary" onClick={() => handleAction('check')}>
                Check
              </Button>
            )}
            {availableActions.includes('call') && (
              <Button variant="secondary" onClick={() => handleAction('call')}>
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
                <Button onClick={() => handleAction('raise')}>
                  Raise
                </Button>
              </div>
            )}
            {availableActions.includes('all-in') && (
              <Button variant="default" className="bg-amber-600 hover:bg-amber-700" onClick={() => handleAction('all-in')}>
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
            <div className="text-xs text-foreground">
              {gameState.players.find(p => p.id === gameState.lastAction?.playerId)?.name}: {gameState.lastAction.action}
              {gameState.lastAction.amount && ` $${gameState.lastAction.amount}`}
            </div>
          )}
        </div>
      </div>

      {/* Winner announcement */}
      {gameState.winner && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <div className="bg-card rounded-lg p-8 text-center animate-fade-in">
            <h2 className="text-3xl font-bold text-primary mb-2">
              {gameState.players.find(p => p.id === gameState.winner)?.name} Wins!
            </h2>
            {gameState.winningHand && (
              <p className="text-muted-foreground">{gameState.winningHand}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PokerTable;
