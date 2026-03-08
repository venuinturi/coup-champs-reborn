import { useState } from "react";
import { Check, Star, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACCENT_COLORS } from "@/hooks/usePlayerProfile";

interface AccentColorPickerProps {
  currentAccent: string | null;
  onSelectAccent: (hsl: string | null) => void;
}

const DEFAULT_HSL = "45 100% 50%";
const DEFAULT_PREVIEW = "#FFD700";

const AccentColorPicker = ({ currentAccent, onSelectAccent }: AccentColorPickerProps) => {
  const [hoveredColor, setHoveredColor] = useState<{ hsl: string; preview: string; name: string } | null>(null);

  // The color to show in the preview: hovered > current > default gold
  const previewHsl = hoveredColor?.hsl ?? currentAccent ?? DEFAULT_HSL;
  const previewHex = hoveredColor?.preview
    ?? ACCENT_COLORS.find((c) => c.hsl === currentAccent)?.preview
    ?? DEFAULT_PREVIEW;
  const previewName = hoveredColor?.name
    ?? ACCENT_COLORS.find((c) => c.hsl === currentAccent)?.name
    ?? "Default (Gold)";

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground">Accent Color</h3>

      {/* Color swatches */}
      <div className="flex flex-wrap gap-2">
        {ACCENT_COLORS.map((color) => {
          const isSelected = currentAccent === color.hsl;
          return (
            <button
              key={color.name}
              onClick={() => onSelectAccent(color.hsl)}
              onMouseEnter={() => setHoveredColor(color)}
              onMouseLeave={() => setHoveredColor(null)}
              className={cn(
                "w-10 h-10 rounded-full border-2 transition-all duration-200 flex items-center justify-center",
                "hover:scale-110 hover:shadow-lg",
                isSelected
                  ? "border-foreground ring-2 ring-foreground/20"
                  : "border-transparent"
              )}
              style={{ backgroundColor: color.preview }}
              title={color.name}
            >
              {isSelected && (
                <Check className="w-5 h-5 text-white drop-shadow-md" />
              )}
            </button>
          );
        })}
        {/* Reset to default */}
        <button
          onClick={() => onSelectAccent(null)}
          onMouseEnter={() => setHoveredColor({ name: "Default (Gold)", hsl: DEFAULT_HSL, preview: DEFAULT_PREVIEW })}
          onMouseLeave={() => setHoveredColor(null)}
          className={cn(
            "w-10 h-10 rounded-full border-2 transition-all duration-200 flex items-center justify-center",
            "hover:scale-110 bg-gradient-to-br from-muted to-muted-foreground/20",
            !currentAccent
              ? "border-foreground ring-2 ring-foreground/20"
              : "border-transparent"
          )}
          title="Default (Gold)"
        >
          {!currentAccent && (
            <Check className="w-5 h-5 text-foreground drop-shadow-md" />
          )}
        </button>
      </div>

      {/* Live preview strip */}
      <div
        className="rounded-xl border border-border/50 bg-background/60 p-4 transition-all duration-300"
        style={{ borderColor: `hsl(${previewHsl} / 0.3)` }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Preview — {previewName}
          </span>
          <Star className="w-3.5 h-3.5" style={{ color: previewHex }} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filled button */}
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
            style={{ backgroundColor: previewHex, color: "#0d0f14" }}
          >
            <Sparkles className="w-3 h-3" />
            Primary
          </span>

          {/* Outline button */}
          <span
            className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors"
            style={{ borderColor: previewHex, color: previewHex }}
          >
            Outline
          </span>

          {/* Ghost/link text */}
          <span
            className="text-xs font-semibold underline underline-offset-2 transition-colors"
            style={{ color: previewHex }}
          >
            Link text
          </span>

          {/* Badge */}
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide transition-colors"
            style={{ backgroundColor: `hsl(${previewHsl} / 0.15)`, color: previewHex }}
          >
            Badge
          </span>

          {/* Progress bar */}
          <div className="flex-1 min-w-[80px] h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: "65%", backgroundColor: previewHex }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccentColorPicker;
