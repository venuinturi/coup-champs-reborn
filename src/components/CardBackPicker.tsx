import { useState } from "react";
import { Check, RectangleVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { CARD_BACKS, getCardBack, type CardBack } from "@/lib/cardBacks";

interface CardBackPickerProps {
  currentBack: string;
  onSelectBack: (backId: string) => void;
}

const CardBackPicker = ({ currentBack, onSelectBack }: CardBackPickerProps) => {
  const [hovered, setHovered] = useState<CardBack | null>(null);
  const preview = hovered ?? getCardBack(currentBack);

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-medium text-muted-foreground">Card Back</h3>

      {/* Swatches */}
      <div className="flex flex-wrap gap-2.5">
        {CARD_BACKS.map((back) => {
          const isSelected = currentBack === back.id;
          return (
            <button
              key={back.id}
              onClick={() => onSelectBack(back.id)}
              onMouseEnter={() => setHovered(back)}
              onMouseLeave={() => setHovered(null)}
              className={cn(
                "group relative w-11 h-11 rounded-full border-2 transition-all duration-200 flex items-center justify-center",
                "hover:scale-115 hover:shadow-xl",
                isSelected
                  ? "border-foreground ring-2 ring-foreground/20 scale-110"
                  : "border-transparent hover:border-foreground/30"
              )}
              style={{
                backgroundColor: back.swatch,
                boxShadow: isSelected ? `0 0 16px ${back.swatch}60` : undefined,
              }}
              title={back.name}
            >
              {isSelected && (
                <Check className="w-5 h-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
              )}
              <span className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {back.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Preview */}
      <div className="flex items-center justify-center gap-3 py-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="relative w-16 h-24 rounded-lg border-2 overflow-hidden shadow-lg transition-all duration-500"
            style={{
              background: preview.background,
              borderColor: `${preview.swatch}80`,
              transform: `rotate(${(i - 1) * 8}deg)`,
            }}
          >
            {/* Pattern overlay */}
            {preview.pattern && (
              <div
                className="absolute inset-0 opacity-100"
                style={{
                  backgroundImage: preview.pattern,
                  backgroundRepeat: "repeat",
                }}
              />
            )}
            {/* Inner border */}
            <div className="absolute inset-1.5 rounded border border-white/15" />
            {/* Center symbol */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="text-2xl font-bold transition-all duration-500"
                style={{ color: preview.symbolColor }}
              >
                {preview.symbol}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center">
        <div className="inline-flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-full">
          <RectangleVertical className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-bold text-muted-foreground">{preview.name}</span>
        </div>
      </div>
    </div>
  );
};

export default CardBackPicker;
