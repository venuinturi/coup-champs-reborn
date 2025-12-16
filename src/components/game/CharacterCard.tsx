import { Character, CHARACTER_DESCRIPTIONS } from "@/lib/gameTypes";
import { cn } from "@/lib/utils";

interface CharacterCardProps {
  character: Character;
  isRevealed?: boolean;
  isSelectable?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
}

const CHARACTER_COLORS: Record<Character, string> = {
  Duke: "from-violet-600 to-violet-900",
  Assassin: "from-gray-700 to-gray-900",
  Captain: "from-blue-600 to-blue-900",
  Ambassador: "from-emerald-600 to-emerald-900",
  Contessa: "from-rose-600 to-rose-900",
};

const CHARACTER_ICONS: Record<Character, string> = {
  Duke: "👑",
  Assassin: "🗡️",
  Captain: "⚓",
  Ambassador: "📜",
  Contessa: "💎",
};

export const CharacterCard = ({
  character,
  isRevealed = false,
  isSelectable = false,
  isSelected = false,
  onClick,
  size = "md",
}: CharacterCardProps) => {
  const sizeClasses = {
    sm: "w-16 h-24 text-xs",
    md: "w-24 h-36 text-sm",
    lg: "w-32 h-48 text-base",
  };

  if (!isRevealed && !isSelectable) {
    return (
      <div
        className={cn(
          sizeClasses[size],
          "rounded-lg bg-gradient-to-b from-secondary to-muted border-2 border-border",
          "flex items-center justify-center",
          "shadow-lg"
        )}
      >
        <span className="text-2xl">🂠</span>
      </div>
    );
  }

  return (
    <div
      onClick={isSelectable ? onClick : undefined}
      className={cn(
        sizeClasses[size],
        "rounded-lg bg-gradient-to-b border-2",
        CHARACTER_COLORS[character],
        isRevealed ? "opacity-50 grayscale" : "",
        isSelectable && "cursor-pointer hover:scale-105 transition-transform",
        isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        "flex flex-col items-center justify-between p-2",
        "shadow-lg"
      )}
    >
      <span className={size === "sm" ? "text-xl" : "text-3xl"}>
        {CHARACTER_ICONS[character]}
      </span>
      <div className="text-center">
        <div className="font-display font-semibold text-foreground">
          {character}
        </div>
        {size !== "sm" && (
          <div className="text-[10px] text-foreground/70 leading-tight mt-1">
            {CHARACTER_DESCRIPTIONS[character]}
          </div>
        )}
      </div>
    </div>
  );
};

export const CardBack = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const sizeClasses = {
    sm: "w-16 h-24",
    md: "w-24 h-36",
    lg: "w-32 h-48",
  };

  return (
    <div
      className={cn(
        sizeClasses[size],
        "rounded-lg bg-gradient-to-b from-primary/20 to-primary/40 border-2 border-primary/50",
        "flex items-center justify-center",
        "shadow-lg"
      )}
    >
      <span className="text-3xl opacity-50">🂠</span>
    </div>
  );
};
