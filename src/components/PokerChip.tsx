import { getChipStyle } from "@/lib/chipStyles";
import { cn } from "@/lib/utils";

interface PokerChipProps {
  chipStyle?: string;
  value?: number | string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: { outer: "w-8 h-8", inner: "w-5 h-5", text: "text-[8px]", stripe: 1 },
  md: { outer: "w-12 h-12", inner: "w-8 h-8", text: "text-[10px]", stripe: 1.5 },
  lg: { outer: "w-16 h-16", inner: "w-10 h-10", text: "text-xs", stripe: 2 },
};

const PokerChip = ({ chipStyle = "classic", value, size = "md", className }: PokerChipProps) => {
  const style = getChipStyle(chipStyle);
  const s = sizeMap[size];

  return (
    <div
      className={cn(
        "relative rounded-full flex items-center justify-center shadow-lg",
        s.outer,
        className
      )}
      style={{ background: style.outerGradient }}
    >
      {/* Edge stripes (8 dashes around the perimeter) */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <div
          key={deg}
          className="absolute inset-0 flex items-start justify-center"
          style={{ transform: `rotate(${deg}deg)` }}
        >
          <div
            className="rounded-full"
            style={{
              width: `${s.stripe * 3}px`,
              height: `${s.stripe * 1.5}px`,
              backgroundColor: style.stripeColor,
            }}
          />
        </div>
      ))}

      {/* Inner circle */}
      <div
        className={cn("rounded-full flex items-center justify-center border border-white/10", s.inner)}
        style={{ background: style.innerGradient }}
      >
        <span
          className={cn("font-bold leading-none", s.text)}
          style={{ color: style.textColor }}
        >
          {value ?? style.symbol}
        </span>
      </div>
    </div>
  );
};

export default PokerChip;
