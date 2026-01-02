import { cn } from "@/lib/utils";

interface PlayingCardProps {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: string;
  faceUp?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  selected?: boolean;
  isJoker?: boolean;
}

const suitSymbols = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const suitColors = {
  hearts: 'text-red-500',
  diamonds: 'text-red-500',
  clubs: 'text-foreground',
  spades: 'text-foreground',
};

const sizeClasses = {
  sm: 'w-12 h-16 text-xs',
  md: 'w-16 h-22 text-sm',
  lg: 'w-20 h-28 text-base',
};

export const PlayingCard = ({
  suit,
  rank,
  faceUp = true,
  size = 'md',
  className,
  onClick,
  selected = false,
  isJoker = false,
}: PlayingCardProps) => {
  const sizeClass = sizeClasses[size];
  const suitSymbol = suitSymbols[suit];
  const colorClass = suitColors[suit];

  if (isJoker) {
    return (
      <div
        className={cn(
          "relative rounded-lg shadow-lg border-2 flex flex-col items-center justify-center font-bold cursor-pointer transition-all duration-200",
          sizeClass,
          "bg-gradient-to-br from-purple-500 to-pink-500 border-purple-400 text-white",
          selected && "ring-2 ring-primary -translate-y-2",
          onClick && "hover:scale-105",
          className
        )}
        onClick={onClick}
      >
        <span className="text-lg">🃏</span>
        <span className="text-[10px]">JOKER</span>
      </div>
    );
  }

  if (!faceUp) {
    return (
      <div
        className={cn(
          "relative rounded-lg shadow-lg border-2 border-primary/30 flex items-center justify-center cursor-pointer transition-all duration-200",
          sizeClass,
          "bg-gradient-to-br from-primary/20 to-primary/10",
          className
        )}
        onClick={onClick}
      >
        <div className="w-3/4 h-3/4 rounded border border-primary/40 bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
          <span className="text-primary/60 text-lg">♠</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative rounded-lg shadow-lg border-2 flex flex-col p-1 cursor-pointer transition-all duration-200",
        sizeClass,
        "bg-white border-gray-200",
        selected && "ring-2 ring-primary -translate-y-2",
        onClick && "hover:scale-105 hover:-translate-y-1",
        className
      )}
      onClick={onClick}
    >
      {/* Top left corner */}
      <div className={cn("flex flex-col items-center leading-none", colorClass)}>
        <span className="font-bold">{rank}</span>
        <span>{suitSymbol}</span>
      </div>
      
      {/* Center suit */}
      <div className={cn("flex-1 flex items-center justify-center", colorClass)}>
        <span className="text-2xl">{suitSymbol}</span>
      </div>
      
      {/* Bottom right corner (rotated) */}
      <div className={cn("flex flex-col items-center leading-none rotate-180", colorClass)}>
        <span className="font-bold">{rank}</span>
        <span>{suitSymbol}</span>
      </div>
    </div>
  );
};

export default PlayingCard;
