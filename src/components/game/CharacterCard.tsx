import { Character, CHARACTER_DESCRIPTIONS } from "@/lib/gameTypes";
import { cn } from "@/lib/utils";

// Import card images
import dukeImage from "@/assets/cards/duke.png";
import assassinImage from "@/assets/cards/assassin.png";
import ambassadorImage from "@/assets/cards/ambassador.png";
import captainImage from "@/assets/cards/captain.png";
import contessaImage from "@/assets/cards/contessa.png";

interface CharacterCardProps {
  character: Character;
  isRevealed?: boolean;
  isSelectable?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
}

const CHARACTER_COLORS: Record<Character, string> = {
  Duke: "from-red-700 to-red-950",
  Assassin: "from-purple-800 to-purple-950",
  Captain: "from-blue-700 to-blue-950",
  Ambassador: "from-orange-600 to-orange-900",
  Contessa: "from-rose-700 to-rose-950",
};

const CHARACTER_IMAGES: Record<Character, string> = {
  Duke: dukeImage,
  Assassin: assassinImage,
  Captain: captainImage,
  Ambassador: ambassadorImage,
  Contessa: contessaImage,
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
        "rounded-lg overflow-hidden border-2 relative",
        isRevealed ? "opacity-50 grayscale" : "",
        isSelectable && "cursor-pointer hover:scale-105 transition-transform",
        isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        "shadow-lg"
      )}
    >
      {/* Card image */}
      <img 
        src={CHARACTER_IMAGES[character]} 
        alt={character}
        className="w-full h-full object-cover"
      />
      
      {/* Overlay with character name */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent",
        size === "sm" ? "p-1" : "p-2"
      )}>
        <div className="font-display font-semibold text-white text-center">
          {character}
        </div>
        {size !== "sm" && (
          <div className="text-[10px] text-white/80 leading-tight mt-0.5 text-center">
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
