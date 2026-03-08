import { cn } from "@/lib/utils";
import { useEffect, useState, useRef } from "react";
import { getCardBack } from "@/lib/cardBacks";
import { motion, AnimatePresence } from "framer-motion";

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

const CardFace = ({
  suit,
  rank,
  sizeClass,
  colorClass,
  suitSymbol,
  selected,
  onClick,
  className,
}: {
  suit: string;
  rank: string;
  sizeClass: string;
  colorClass: string;
  suitSymbol: string;
  selected: boolean;
  onClick?: () => void;
  className?: string;
}) => (
  <div
    className={cn(
      "absolute inset-0 rounded-lg shadow-lg border-2 flex flex-col p-1 backface-hidden",
      sizeClass,
      "bg-white border-gray-200",
      selected && "ring-2 ring-primary -translate-y-2 shadow-[0_0_12px_hsl(var(--primary)/0.4)]",
      onClick && "hover:scale-105 hover:-translate-y-1 hover:shadow-xl",
      className
    )}
    style={{ backfaceVisibility: 'hidden' }}
  >
    <div className={cn("flex flex-col items-center leading-none", colorClass)}>
      <span className="font-bold">{rank}</span>
      <span>{suitSymbol}</span>
    </div>
    <div className={cn("flex-1 flex items-center justify-center", colorClass)}>
      <span className="text-2xl">{suitSymbol}</span>
    </div>
    <div className={cn("flex flex-col items-center leading-none rotate-180", colorClass)}>
      <span className="font-bold">{rank}</span>
      <span>{suitSymbol}</span>
    </div>
  </div>
);

const CardBack = ({
  cardBackId,
  sizeClass,
  className,
}: {
  cardBackId: string;
  sizeClass: string;
  className?: string;
}) => {
  const back = getCardBack(cardBackId);
  return (
    <div
      className={cn(
        "absolute inset-0 rounded-lg shadow-lg border-2 flex items-center justify-center overflow-hidden backface-hidden",
        sizeClass,
        className
      )}
      style={{
        backfaceVisibility: 'hidden',
        transform: 'rotateY(180deg)',
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
      <div
        className="relative w-3/4 h-3/4 rounded border flex items-center justify-center"
        style={{ borderColor: 'rgba(255,255,255,0.15)' }}
      >
        <span className="text-lg" style={{ color: back.symbolColor }}>{back.symbol}</span>
      </div>
    </div>
  );
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
  const prevFaceUp = useRef(faceUp);
  const [isFlipping, setIsFlipping] = useState(false);
  const sizeClass = sizeClasses[size];
  const suitSymbol = suitSymbols[suit];
  const colorClass = suitColors[suit];

  useEffect(() => {
    if (animated && !dealt) {
      const timer = setTimeout(() => setDealt(true), dealDelay);
      return () => clearTimeout(timer);
    }
  }, [animated, dealt, dealDelay]);

  // Detect flip transitions
  useEffect(() => {
    if (prevFaceUp.current !== faceUp) {
      setIsFlipping(true);
      const timer = setTimeout(() => setIsFlipping(false), 600);
      prevFaceUp.current = faceUp;
      return () => clearTimeout(timer);
    }
  }, [faceUp]);

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

  return (
    <motion.div
      className={cn(
        "relative cursor-pointer transition-shadow duration-200",
        sizeClass,
        selected && "-translate-y-2",
        animClass,
        className
      )}
      onClick={onClick}
      style={{
        ...animStyle,
        perspective: 800,
        transformStyle: 'preserve-3d',
      }}
      animate={{ rotateY: faceUp ? 0 : 180 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
    >
      <CardFace
        suit={suit}
        rank={rank}
        sizeClass={sizeClass}
        colorClass={colorClass}
        suitSymbol={suitSymbol}
        selected={selected}
        onClick={onClick}
      />
      <CardBack
        cardBackId={cardBackId ?? 'classic'}
        sizeClass={sizeClass}
      />
    </motion.div>
  );
};

export default PlayingCard;
