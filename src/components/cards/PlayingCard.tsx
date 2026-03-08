import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { getCardBack } from "@/lib/cardBacks";

interface PlayingCardProps {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: string;
  faceUp?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  selected?: boolean;
  isJoker?: boolean;
  animated?: boolean;
  dealDelay?: number;
  cardBack?: string;
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
  animated = false,
  dealDelay = 0,
  cardBack: cardBackId,
}: PlayingCardProps) => {
  const [dealt, setDealt] = useState(!animated);
  const sizeClass = sizeClasses[size];
  const suitSymbol = suitSymbols[suit];
  const colorClass = suitColors[suit];

  useEffect(() => {
    if (animated && !dealt) {
      const timer = setTimeout(() => setDealt(true), dealDelay);
      return () => clearTimeout(timer);
    }
  }, [animated, dealt, dealDelay]);

  if (animated && !dealt) {
    return <div className={cn(sizeClass, "opacity-0", className)} />;
  }

  const animClass = animated ? "animate-card-deal" : "";
  const animStyle = animated ? { animationDelay: `${dealDelay}ms` } : undefined;

  if (isJoker) {
    return (
      <div
        className={cn(
          "relative rounded-lg shadow-lg border-2 flex flex-col items-center justify-center font-bold cursor-pointer transition-all duration-200",
          sizeClass,
          "bg-gradient-to-br from-purple-500 to-pink-500 border-purple-400 text-white",
          selected && "ring-2 ring-primary -translate-y-2 shadow-[0_0_12px_hsl(var(--primary)/0.4)]",
          onClick && "hover:scale-105",
          animClass,
          className
        )}
        onClick={onClick}
        style={animStyle}
      >
        <span className="text-lg">🃏</span>
        <span className="text-[10px]">JOKER</span>
      </div>
    );
  }

  if (!faceUp) {
    const back = getCardBack(cardBackId ?? 'classic');
    return (
      <div
        className={cn(
          "relative rounded-lg shadow-lg border-2 flex items-center justify-center cursor-pointer transition-all duration-200 overflow-hidden",
          sizeClass,
          animClass,
          className
        )}
        onClick={onClick}
        style={{
          ...animStyle,
          background: back.background,
          borderColor: `${back.swatch}60`,
        }}
      >
        {back.pattern && (
          <div
            className="absolute inset-0"
            style={{ backgroundImage: back.pattern, backgroundRepeat: 'repeat' }}
          />
        )}
        <div className="relative w-3/4 h-3/4 rounded border flex items-center justify-center"
          style={{ borderColor: 'rgba(255,255,255,0.15)' }}
        >
          <span className="text-lg" style={{ color: back.symbolColor }}>{back.symbol}</span>
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
        selected && "ring-2 ring-primary -translate-y-2 shadow-[0_0_12px_hsl(var(--primary)/0.4)]",
        onClick && "hover:scale-105 hover:-translate-y-1 hover:shadow-xl",
        animClass,
        className
      )}
      onClick={onClick}
      style={animStyle}
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
