import { useState } from "react";
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
}: ActionPanelProps) => {
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [showTargetDialog, setShowTargetDialog] = useState(false);

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

  // Waiting state
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="font-display text-lg text-foreground mb-2">
        {pendingAction
          ? "Waiting for other players..."
          : `${currentPlayer.name}'s turn...`}
      </h3>
      <p className="text-sm text-muted-foreground">
        {pendingAction
          ? `Waiting for: ${pendingAction.waitingForPlayers
              .map((id) => gameState.players.find((p) => p.id === id)?.name)
              .join(", ")}`
          : "Wait for your turn to take an action."}
      </p>
    </div>
  );
};
