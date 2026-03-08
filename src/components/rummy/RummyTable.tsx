import { RummyGameState, Card, Meld } from "@/lib/rummy/rummyTypes";
import { getAvailableActions, sortCards, isJoker, validateMeld } from "@/lib/rummy/rummyEngine";
import PlayingCard from "@/components/cards/PlayingCard";
import Confetti from "@/components/Confetti";
import SoundToggle from "@/components/SoundToggle";
import PlayerAvatar from "@/components/PlayerAvatar";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { sounds } from "@/lib/sounds";
import { usePlayersProfiles } from "@/hooks/usePlayerProfile";
import { useTableFelt } from "@/hooks/useTableFelt";

interface RummyTableProps {
  gameState: RummyGameState;
  localPlayerId: string;
  onDrawDeck: () => void;
  onDrawDiscard: () => void;
  onDiscard: (cardIndex: number) => void;
  onDrop: () => void;
  onDeclare: (melds: Meld[]) => void;
  isSpectator?: boolean;
  tableFelt?: string;
  cardBack?: string;
}

export const RummyTable = ({
  gameState,
  localPlayerId,
  onDrawDeck,
  onDrawDiscard,
  onDrop,
  onDiscard,
  onDeclare,
  isSpectator = false,
  tableFelt,
  cardBack,
}: RummyTableProps) => {
  const { feltStyle, patternStyle } = useTableFelt(tableFelt);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [melds, setMelds] = useState<Meld[]>([]);
  const [isArranging, setIsArranging] = useState(false);
  const [showShake, setShowShake] = useState(false);
  const prevPhaseRef = useRef(gameState.phase);
  const prevHasDrawn = useRef(gameState.hasDrawn);
  const playerIds = useMemo(() => gameState.players.map(p => p.id), [gameState.players]);
  const profiles = usePlayersProfiles(playerIds);
  
  const localPlayer = gameState.players.find(p => p.id === localPlayerId);
  const availableActions = getAvailableActions(gameState, localPlayerId);
  const isMyTurn = localPlayer?.isTurn || false;
  const sortedCards = localPlayer ? sortCards(localPlayer.cards, gameState.openJoker) : [];
  const isWinner = gameState.winner === localPlayerId;
  const isLoser = gameState.winner !== null && gameState.winner !== localPlayerId;

  // Sound effects
  useEffect(() => {
    if (gameState.hasDrawn && !prevHasDrawn.current) {
      sounds.draw();
    }
    prevHasDrawn.current = gameState.hasDrawn;
  }, [gameState.hasDrawn]);

  useEffect(() => {
    if (gameState.winner && prevPhaseRef.current !== 'finished') {
      if (isWinner) {
        sounds.declare();
        setTimeout(() => sounds.win(), 300);
      } else {
        sounds.lose();
        setShowShake(true);
        setTimeout(() => setShowShake(false), 500);
      }
    }
    prevPhaseRef.current = gameState.phase;
  }, [gameState.winner, gameState.phase, isWinner]);
  
  const topDiscard = gameState.discardPile.length > 0 
    ? gameState.discardPile[gameState.discardPile.length - 1] 
    : null;

  const toggleCardSelection = (index: number) => {
    if (selectedCards.includes(index)) {
      setSelectedCards(selectedCards.filter(i => i !== index));
    } else {
      setSelectedCards([...selectedCards, index]);
    }
  };

  const handleCreateMeld = () => {
    if (selectedCards.length < 3) {
      toast({ title: "Error", description: "Select at least 3 cards for a meld", variant: "destructive" });
      return;
    }

    const meldCards = selectedCards.map(i => sortedCards[i]);
    const result = validateMeld(meldCards, gameState.openJoker);

    if (!result.valid) {
      toast({ title: "Invalid Meld", description: "Selected cards don't form a valid set or run", variant: "destructive" });
      return;
    }

    const newMeld: Meld = {
      cards: meldCards,
      type: result.type!,
      isPure: result.isPure,
    };

    setMelds([...melds, newMeld]);
    setSelectedCards([]);
    sounds.meldCreate();
    
    toast({ title: "Meld Created", description: `${result.type} (${result.isPure ? 'pure' : 'with joker'})` });
  };

  const handleDeclare = () => {
    if (!localPlayer) return;
    
    // Check if all cards are in melds
    const meldedCardCount = melds.reduce((sum, m) => sum + m.cards.length, 0);
    if (meldedCardCount !== localPlayer.cards.length) {
      toast({ 
        title: "Cannot Declare", 
        description: `You have ${localPlayer.cards.length} cards but only ${meldedCardCount} in melds`, 
        variant: "destructive" 
      });
      return;
    }

    onDeclare(melds);
    setMelds([]);
    setIsArranging(false);
  };

  const handleDiscard = () => {
    if (selectedCards.length !== 1) {
      toast({ title: "Error", description: "Select exactly one card to discard", variant: "destructive" });
      return;
    }
    
    // Find the actual index in the original cards array
    const selectedCard = sortedCards[selectedCards[0]];
    const originalIndex = localPlayer?.cards.findIndex(c => 
      c.suit === selectedCard.suit && c.rank === selectedCard.rank && c.isJoker === selectedCard.isJoker
    );
    
    if (originalIndex !== undefined && originalIndex >= 0) {
      onDiscard(originalIndex);
      setSelectedCards([]);
    }
  };

  const resetArrangement = () => {
    setMelds([]);
    setSelectedCards([]);
    setIsArranging(false);
  };

  // Get remaining cards not in melds
  const getRemainingCards = () => {
    const meldedCards = melds.flatMap(m => m.cards);
    return sortedCards.filter(card => 
      !meldedCards.some(mc => 
        mc.suit === card.suit && mc.rank === card.rank && mc.isJoker === card.isJoker
      )
    );
  };

  const remainingCards = getRemainingCards();

  return (
    <div className={cn(
      "relative w-full min-h-[700px] rounded-3xl border-8 border-amber-800 shadow-2xl p-6",
      showShake && "animate-shake"
    )} style={feltStyle}>
      <div className="absolute inset-0 rounded-3xl opacity-30" style={patternStyle} />
      <SoundToggle />
      <Confetti active={isWinner} />
      {/* Game message */}
      <div className="text-center mb-4">
        <div className="bg-black/40 backdrop-blur-sm rounded-lg px-6 py-3 inline-block">
          <span className="text-lg text-foreground">{gameState.message}</span>
        </div>
      </div>

      {/* Open joker display */}
      {gameState.openJoker && (
        <div className="absolute top-4 left-4 text-center">
          <div className="text-xs text-muted-foreground mb-1">Wild Joker</div>
          <PlayingCard
            suit={gameState.openJoker.suit}
            rank={gameState.openJoker.rank}
            faceUp={true}
            size="sm"
            isJoker={gameState.openJoker.isJoker}
          />
        </div>
      )}

      {/* Deck and discard pile */}
      <div className="flex justify-center gap-8 mb-6">
        {/* Deck */}
        <div className="text-center">
          <div className="text-sm text-muted-foreground mb-2">Deck ({gameState.deck.length})</div>
          <div
            className={cn(
              "cursor-pointer transition-transform",
              availableActions.includes('draw-deck') && "hover:scale-105"
            )}
            onClick={() => availableActions.includes('draw-deck') && onDrawDeck()}
          >
            <PlayingCard
              suit="spades"
              rank="A"
              faceUp={false}
              size="lg"
            />
          </div>
        </div>

        {/* Discard pile */}
        <div className="text-center">
          <div className="text-sm text-muted-foreground mb-2">Discard</div>
          {topDiscard ? (
            <div
              className={cn(
                "cursor-pointer transition-transform",
                availableActions.includes('draw-discard') && "hover:scale-105"
              )}
              onClick={() => availableActions.includes('draw-discard') && onDrawDiscard()}
            >
              <PlayingCard
                suit={topDiscard.suit}
                rank={topDiscard.rank}
                faceUp={true}
                size="lg"
                isJoker={topDiscard.isJoker}
              />
            </div>
          ) : (
            <div className="w-20 h-28 rounded-lg border-2 border-dashed border-white/20" />
          )}
        </div>
      </div>

      {/* Other players */}
      <div className="flex flex-wrap justify-center gap-4 mb-6">
        {gameState.players.filter(p => p.id !== localPlayerId).map((player) => (
          <div
            key={player.id}
            className={cn(
              "bg-black/40 backdrop-blur-sm rounded-lg px-4 py-3 text-center min-w-[120px]",
              player.isTurn && "ring-2 ring-primary"
            )}
          >
            <div className="text-sm font-medium text-foreground flex items-center justify-center gap-1.5">
              <PlayerAvatar
                preset={profiles.get(player.id)?.avatar_preset}
                customUrl={profiles.get(player.id)?.avatar_url}
                size="sm"
              />
              {player.name}
            </div>
            <div className="text-xs text-muted-foreground">{player.cards.length} cards</div>
            {player.hasDropped && (
              <div className="text-xs text-destructive">Dropped ({player.points} pts)</div>
            )}
          </div>
        ))}
      </div>

      {/* Local player's melds */}
      {melds.length > 0 && (
        <div className="mb-4">
          <div className="text-sm text-muted-foreground mb-2 text-center">Your Melds</div>
          <div className="flex flex-wrap justify-center gap-4">
            {melds.map((meld, meldIndex) => (
              <div key={meldIndex} className="bg-black/30 rounded-lg p-2">
                <div className="flex gap-1">
                  {meld.cards.map((card, cardIndex) => (
                    <PlayingCard
                      key={cardIndex}
                      suit={card.suit}
                      rank={card.rank}
                      faceUp={true}
                      size="sm"
                      isJoker={card.isJoker}
                    />
                  ))}
                </div>
                <div className="text-xs text-center mt-1 text-muted-foreground">
                  {meld.type} {meld.isPure && '(pure)'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Local player's cards */}
      {localPlayer && (
        <div className="bg-black/40 backdrop-blur-sm rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <div className="text-sm font-medium text-foreground flex items-center gap-2">
              <PlayerAvatar
                preset={profiles.get(localPlayerId)?.avatar_preset}
                customUrl={profiles.get(localPlayerId)?.avatar_url}
                size="sm"
              />
              Your Cards ({remainingCards.length})
            </div>
            <div className="text-sm text-muted-foreground">
              Points: {localPlayer.points}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 justify-center mb-4">
            {(isArranging ? remainingCards : sortedCards).map((card, index) => (
              <PlayingCard
                key={index}
                suit={card.suit}
                rank={card.rank}
                faceUp={true}
                size="md"
                isJoker={isJoker(card, gameState.openJoker)}
                selected={selectedCards.includes(index)}
                onClick={() => isMyTurn && toggleCardSelection(index)}
              />
            ))}
          </div>

          {/* Action buttons */}
          {isMyTurn && (
            <div className="flex flex-wrap gap-2 justify-center">
              {!gameState.hasDrawn && (
                <>
                  <Button onClick={onDrawDeck}>Draw from Deck</Button>
                  <Button variant="secondary" onClick={onDrawDiscard} disabled={!topDiscard}>
                    Pick from Discard
                  </Button>
                  <Button variant="destructive" onClick={onDrop}>Drop</Button>
                </>
              )}
              
              {gameState.hasDrawn && (
                <>
                  {!isArranging ? (
                    <>
                      <Button 
                        onClick={handleDiscard}
                        disabled={selectedCards.length !== 1}
                      >
                        Discard Selected
                      </Button>
                      <Button 
                        variant="secondary"
                        onClick={() => setIsArranging(true)}
                      >
                        Arrange for Declaration
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button 
                        onClick={handleCreateMeld}
                        disabled={selectedCards.length < 3}
                      >
                        Create Meld
                      </Button>
                      <Button 
                        onClick={handleDeclare}
                        disabled={remainingCards.length > 0}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Declare
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={resetArrangement}
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Winner announcement */}
      {gameState.winner && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-3xl z-40">
          <div className="bg-card rounded-lg p-8 text-center animate-bounce-in">
            {isWinner ? (
              <>
                <h2 className="text-3xl font-display font-bold text-primary shimmer-text mb-4">
                  🎉 You Win!
                </h2>
                <p className="text-muted-foreground animate-fade-in">Congratulations!</p>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-display font-bold text-primary mb-4">
                  {gameState.players.find(p => p.id === gameState.winner)?.name} Wins!
                </h2>
              </>
            )}
            <div className="space-y-2 mt-4">
              {gameState.players.map(player => (
                <div key={player.id} className={cn(
                  "text-muted-foreground",
                  player.id === gameState.winner && "text-primary font-bold"
                )}>
                  {player.name}: {player.points} points
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Round info */}
      <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm rounded-lg px-4 py-2">
        <div className="text-sm text-muted-foreground">Round {gameState.roundNumber}</div>
      </div>
    </div>
  );
};

export default RummyTable;
