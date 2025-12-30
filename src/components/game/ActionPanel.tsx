import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  ActionType,
  GameState,
  Player,
  Character,
  ACTION_COSTS,
  ACTION_CHARACTERS,
  BLOCK_CHARACTERS,
} from "@/lib/gameTypes";
import { getValidActions, getValidTargets, getCurrentPlayer } from "@/lib/gameEngine";
import { cn } from "@/lib/utils";
import { ChallengeTimer } from "./ChallengeTimer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ActionPanelProps {
  gameState: GameState;
  localPlayerId: string;
  onAction: (action: ActionType, targetId?: string) => void;
  onChallenge: () => void;
  onBlock: (character: Character) => void;
  onPass: () => void;
  onChooseCardToLose?: (card: Character) => void;
  onExchangeSelect?: (selectedCards: Character[]) => void;
}

const ACTION_LABELS: Record<ActionType, { name: string; description: string }> = {
  income: { name: "Income", description: "+1 coin (cannot be blocked)" },
  foreign_aid: { name: "Foreign Aid", description: "+2 coins (blocked by Duke)" },
  coup: { name: "Coup", description: "Pay 7 coins, eliminate an influence" },
  tax: { name: "Tax (Duke)", description: "+3 coins" },
  assassinate: { name: "Assassinate", description: "Pay 3 coins, eliminate an influence" },
  steal: { name: "Steal (Captain)", description: "Take 2 coins from another player" },
  exchange: { name: "Exchange (Ambassador)", description: "Swap cards with the deck" },
};

export const ActionPanel = ({
  gameState,
  localPlayerId,
  onAction,
  onChallenge,
  onBlock,
  onPass,
  onChooseCardToLose,
  onExchangeSelect,
}: ActionPanelProps) => {
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [showTargetDialog, setShowTargetDialog] = useState(false);
  const [selectedExchangeCards, setSelectedExchangeCards] = useState<Character[]>([]);

  const currentPlayer = getCurrentPlayer(gameState);
  const localPlayer = gameState.players.find((p) => p.id === localPlayerId);
  const isMyTurn = currentPlayer.id === localPlayerId;
  const { pendingAction } = gameState;

  // Check if we're waiting to respond
  const isWaitingForMe =
    pendingAction?.waitingForPlayers.includes(localPlayerId) ?? false;

  const handleActionClick = (action: ActionType) => {
    const targets = getValidTargets(gameState, action);
    if (targets.length > 0) {
      setSelectedAction(action);
      setShowTargetDialog(true);
    } else {
      onAction(action);
    }
  };

  const handleTargetSelect = (targetId: string) => {
    if (selectedAction) {
      onAction(selectedAction, targetId);
      setSelectedAction(null);
      setShowTargetDialog(false);
    }
  };

  // Render action buttons for current player's turn
  if (isMyTurn && !pendingAction) {
    const validActions = getValidActions(gameState);

    return (
      <>
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-display text-lg text-foreground mb-3">
            Your Turn - Choose an Action
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {validActions.map((action) => (
              <Button
                key={action}
                variant={action === "coup" && localPlayer!.coins >= 10 ? "gold" : "outline"}
                className="flex flex-col h-auto py-3"
                onClick={() => handleActionClick(action)}
              >
                <span className="font-semibold">{ACTION_LABELS[action].name}</span>
                <span className="text-xs text-muted-foreground">
                  {ACTION_LABELS[action].description}
                </span>
                {ACTION_COSTS[action] > 0 && (
                  <span className="text-xs text-primary mt-1">
                    Cost: {ACTION_COSTS[action]} coins
                  </span>
                )}
              </Button>
            ))}
          </div>
        </div>

        {/* Target Selection Dialog */}
        <Dialog open={showTargetDialog} onOpenChange={setShowTargetDialog}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display">Select Target</DialogTitle>
            </DialogHeader>
            <div className="grid gap-2">
              {selectedAction &&
                getValidTargets(gameState, selectedAction).map((target) => (
                  <Button
                    key={target.id}
                    variant="outline"
                    onClick={() => handleTargetSelect(target.id)}
                  >
                    {target.name} ({target.coins} coins, {target.influences.length} influence
                    {target.influences.length !== 1 ? "s" : ""})
                  </Button>
                ))}
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Render exchange card selection
  if (pendingAction?.phase === 'exchange_select' && 
      pendingAction.waitingForPlayers.includes(localPlayerId) &&
      pendingAction.exchangeCards &&
      pendingAction.cardsToKeep !== undefined) {
    const { exchangeCards, cardsToKeep } = pendingAction;
    
    const toggleCardSelection = (card: Character, idx: number) => {
      const cardKey = `${card}-${idx}`;
      const isSelected = selectedExchangeCards.some((c, i) => 
        exchangeCards.indexOf(c) === idx || selectedExchangeCards.includes(card)
      );
      
      // Use index-based tracking to handle duplicate cards
      const selectedIndices = selectedExchangeCards.map(c => {
        for (let i = 0; i < exchangeCards.length; i++) {
          if (exchangeCards[i] === c && !selectedExchangeCards.slice(0, selectedExchangeCards.indexOf(c)).includes(exchangeCards[i])) {
            return i;
          }
        }
        return -1;
      });
      
      if (selectedExchangeCards.length < cardsToKeep || selectedExchangeCards.includes(card)) {
        if (selectedExchangeCards.includes(card)) {
          const cardIdx = selectedExchangeCards.indexOf(card);
          setSelectedExchangeCards(prev => [...prev.slice(0, cardIdx), ...prev.slice(cardIdx + 1)]);
        } else if (selectedExchangeCards.length < cardsToKeep) {
          setSelectedExchangeCards(prev => [...prev, card]);
        }
      }
    };

    const handleConfirmExchange = () => {
      if (selectedExchangeCards.length === cardsToKeep) {
        onExchangeSelect?.(selectedExchangeCards);
        setSelectedExchangeCards([]);
      }
    };

    return (
      <div className="bg-card border border-primary rounded-xl p-4">
        <h3 className="font-display text-lg text-foreground mb-2">
          Ambassador Exchange
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Select {cardsToKeep} card{cardsToKeep !== 1 ? 's' : ''} to keep. The rest will be returned to the deck.
        </p>
        <div className="flex flex-wrap gap-3 justify-center mb-4">
          {exchangeCards.map((card, idx) => {
            const isSelected = selectedExchangeCards.filter(c => c === card).length > 
              exchangeCards.slice(0, idx).filter(c => c === card).length - 
              selectedExchangeCards.slice(0, selectedExchangeCards.findIndex(c => c === card)).filter(c => c === card).length
              ? selectedExchangeCards.includes(card) && 
                selectedExchangeCards.filter(c => c === card).length > 
                exchangeCards.slice(0, idx).filter(c => c === card).length
              : false;
            
            // Simpler selection logic
            const countInSelected = selectedExchangeCards.filter(c => c === card).length;
            const countBeforeInExchange = exchangeCards.slice(0, idx).filter(c => c === card).length;
            const selected = countInSelected > countBeforeInExchange;
            
            return (
              <Button
                key={idx}
                variant={selected ? "gold" : "outline"}
                className={cn(
                  "flex flex-col h-auto py-3 px-6 transition-all",
                  selected && "ring-2 ring-primary"
                )}
                onClick={() => {
                  if (selected) {
                    // Remove first occurrence of this card from selection
                    const idxToRemove = selectedExchangeCards.indexOf(card);
                    setSelectedExchangeCards(prev => [...prev.slice(0, idxToRemove), ...prev.slice(idxToRemove + 1)]);
                  } else if (selectedExchangeCards.length < cardsToKeep) {
                    setSelectedExchangeCards(prev => [...prev, card]);
                  }
                }}
              >
                <span className="text-2xl mb-1">
                  {card === 'Duke' && '👑'}
                  {card === 'Assassin' && '🗡️'}
                  {card === 'Captain' && '⚓'}
                  {card === 'Ambassador' && '📜'}
                  {card === 'Contessa' && '💎'}
                </span>
                <span className="font-semibold">{card}</span>
              </Button>
            );
          })}
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Selected: {selectedExchangeCards.length} / {cardsToKeep}
          </p>
          <Button 
            variant="gold" 
            onClick={handleConfirmExchange}
            disabled={selectedExchangeCards.length !== cardsToKeep}
          >
            Confirm Selection
          </Button>
        </div>
      </div>
    );
  }

  // Render card selection for losing influence
  if (pendingAction?.phase === 'lose_influence' && 
      pendingAction.playerLosingInfluence === localPlayerId &&
      localPlayer) {
    return (
      <div className="bg-card border border-destructive rounded-xl p-4">
        <h3 className="font-display text-lg text-foreground mb-2">
          Choose a Card to Lose
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          You must reveal and lose one of your influence cards.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          {localPlayer.influences.map((card, idx) => (
            <Button
              key={idx}
              variant="destructive"
              className="flex flex-col h-auto py-3 px-6"
              onClick={() => onChooseCardToLose?.(card)}
            >
              <span className="text-2xl mb-1">
                {card === 'Duke' && '👑'}
                {card === 'Assassin' && '🗡️'}
                {card === 'Captain' && '⚓'}
                {card === 'Ambassador' && '📜'}
                {card === 'Contessa' && '💎'}
              </span>
              <span className="font-semibold">{card}</span>
            </Button>
          ))}
        </div>
      </div>
    );
  }

  // Render response options (challenge/block/pass)
  if (isWaitingForMe && pendingAction) {
    const { action, phase, blockerCharacter } = pendingAction;
    const actionPlayer = gameState.players.find((p) => p.id === action.playerId)!;
    const claimedChar = ACTION_CHARACTERS[action.type];
    const blockChars = BLOCK_CHARACTERS[action.type] || [];

    // Can we block this action?
    const canBlock =
      (phase === "challenge_action" || phase === "block") &&
      blockChars.length > 0 &&
      (action.targetId === localPlayerId || action.type === "foreign_aid");

    // Can we challenge?
    const canChallenge =
      (phase === "challenge_action" && claimedChar) ||
      (phase === "challenge_block" && blockerCharacter);

    // Create a unique key for the timer based on the pending action phase
    const timerKey = `${phase}-${action.playerId}-${action.type}-${Date.now()}`;

    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-display text-lg text-foreground mb-2">
          {phase === "challenge_action" && `${actionPlayer.name} claims ${claimedChar}`}
          {phase === "block" && `${actionPlayer.name} is attempting ${action.type}`}
          {phase === "challenge_block" &&
            `${gameState.players.find((p) => p.id === pendingAction.blockerId)?.name} claims ${blockerCharacter} to block`}
        </h3>

        <p className="text-sm text-muted-foreground mb-4">
          {phase === "challenge_action" &&
            `Challenge if you think they're bluffing about having ${claimedChar}.`}
          {phase === "block" && `You can block this action if you have the right character.`}
          {phase === "challenge_block" &&
            `Challenge if you think they're bluffing about having ${blockerCharacter}.`}
        </p>

        {/* Challenge Timer */}
        <div className="mb-4">
          <ChallengeTimer
            duration={20}
            onTimeout={onPass}
            isActive={true}
            resetKey={`${phase}-${action.playerId}`}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {canChallenge && (
            <Button variant="destructive" onClick={onChallenge}>
              Challenge
            </Button>
          )}

          {canBlock &&
            blockChars.map((char) => (
              <Button key={char} variant="gold-outline" onClick={() => onBlock(char)}>
                Block with {char}
              </Button>
            ))}

          <Button variant="outline" onClick={onPass}>
            Pass
          </Button>
        </div>
      </div>
    );
  }

  // Someone else needs to lose influence - show waiting state
  if (pendingAction?.phase === 'lose_influence' && 
      pendingAction.playerLosingInfluence !== localPlayerId) {
    const losingPlayer = gameState.players.find(p => p.id === pendingAction.playerLosingInfluence);
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-display text-lg text-foreground mb-2">
          Waiting for Card Selection
        </h3>
        <p className="text-sm text-muted-foreground">
          {losingPlayer?.name || 'A player'} is choosing which card to reveal...
        </p>
      </div>
    );
  }

  // Someone else is doing exchange selection - show waiting state
  if (pendingAction?.phase === 'exchange_select' && 
      !pendingAction.waitingForPlayers.includes(localPlayerId)) {
    const exchangingPlayer = gameState.players.find(p => pendingAction.waitingForPlayers.includes(p.id));
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-display text-lg text-foreground mb-2">
          Ambassador Exchange in Progress
        </h3>
        <p className="text-sm text-muted-foreground">
          {exchangingPlayer?.name || 'A player'} is selecting which cards to keep...
        </p>
      </div>
    );
  }

  // Waiting state
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="font-display text-lg text-foreground mb-2">
        {pendingAction
          ? "Waiting for other players..."
          : isMyTurn
            ? "Your Turn - Choose an Action"
            : `${currentPlayer.name}'s turn...`}
      </h3>
      <p className="text-sm text-muted-foreground">
        {pendingAction
          ? `Waiting for: ${pendingAction.waitingForPlayers
              .map((id) => gameState.players.find((p) => p.id === id)?.name)
              .join(", ")}`
          : isMyTurn
            ? "Select an action above."
            : "Wait for your turn to take an action."}
      </p>
    </div>
  );
};
