import { useState } from "react";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { CHIP_STYLES, getChipStyle, type ChipStyle } from "@/lib/chipStyles";
import PokerChip from "@/components/PokerChip";

interface ChipStylePickerProps {
  currentChipStyle: string;
  onSelectChipStyle: (styleId: string) => void;
}

const ChipStylePicker = ({ currentChipStyle, onSelectChipStyle }: ChipStylePickerProps) => {
  const [hovered, setHovered] = useState<ChipStyle | null>(null);
  const preview = hovered ?? getChipStyle(currentChipStyle);

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-medium text-muted-foreground">Chip Style</h3>

      {/* Swatches */}
      <div className="flex flex-wrap gap-2.5">
        {CHIP_STYLES.map((style) => {
          const isSelected = currentChipStyle === style.id;
          return (
            <button
              key={style.id}
              onClick={() => onSelectChipStyle(style.id)}
              onMouseEnter={() => setHovered(style)}
              onMouseLeave={() => setHovered(null)}
              className={cn(
                "group relative w-11 h-11 rounded-full border-2 transition-all duration-200 flex items-center justify-center",
                "hover:scale-115 hover:shadow-xl",
                isSelected
                  ? "border-foreground ring-2 ring-foreground/20 scale-110"
                  : "border-transparent hover:border-foreground/30"
              )}
              style={{
                background: style.outerGradient,
                boxShadow: isSelected ? `0 0 16px ${style.swatch}60` : undefined,
              }}
              title={style.name}
            >
              {isSelected && (
                <Check className="w-5 h-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
              )}
              <span className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {style.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Preview */}
      <div className="flex items-center justify-center gap-4 py-4">
        <PokerChip chipStyle={preview.id} value={5} size="md" />
        <PokerChip chipStyle={preview.id} value={25} size="lg" />
        <PokerChip chipStyle={preview.id} value={100} size="md" />
      </div>

      <div className="text-center">
        <div className="inline-flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-full">
          <Circle className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-bold text-muted-foreground">{preview.name}</span>
        </div>
      </div>
    </div>
  );
};

export default ChipStylePicker;
