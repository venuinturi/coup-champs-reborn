import { Player } from "@/lib/gameTypes";
import { CharacterCard, CardBack } from "./CharacterCard";
import { Coins } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlayerDisplayProps {
  player: Player;
  isCurrentPlayer: boolean;
  isLocalPlayer: boolean;
  showCards?: boolean;
}

export const PlayerDisplay = ({
  player,
  isCurrentPlayer,
  isLocalPlayer,
  showCards = false,
}: PlayerDisplayProps) => {
  return (
    <div
      className={cn(
        "p-4 rounded-xl border transition-all",
        isCurrentPlayer
          ? "bg-primary/10 border-primary shadow-lg shadow-primary/20"
          : "bg-card border-border",
        !player.isAlive && "opacity-50"
      )}
    >
      {/* Player info */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-display font-semibold text-foreground">
            {player.name}
            {isLocalPlayer && " (You)"}
          </span>
          {isCurrentPlayer && (
            <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
              Acting
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-primary">
          <Coins className="w-4 h-4" />
          <span className="font-semibold">{player.coins}</span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex gap-2 justify-center">
        {/* Active influences */}
        {player.influences.map((char, idx) =>
          showCards || isLocalPlayer ? (
            <CharacterCard key={idx} character={char} size="sm" isRevealed={false} />
          ) : (
            <CardBack key={idx} size="sm" />
          )
        )}

        {/* Revealed (lost) influences */}
        {player.revealedInfluences.map((char, idx) => (
          <CharacterCard
            key={`revealed-${idx}`}
            character={char}
            size="sm"
            isRevealed={true}
          />
        ))}

        {/* Show eliminated state */}
        {!player.isAlive && player.influences.length === 0 && (
          <div className="text-muted-foreground text-sm italic">Eliminated</div>
        )}
      </div>
    </div>
  );
};
