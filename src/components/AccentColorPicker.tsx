import { useState } from "react";
import { Check, Star, Sparkles, Crown, Zap } from "lucide-react";
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

  const previewHsl = hoveredColor?.hsl ?? currentAccent ?? DEFAULT_HSL;
  const previewHex = hoveredColor?.preview
    ?? ACCENT_COLORS.find((c) => c.hsl === currentAccent)?.preview
    ?? DEFAULT_PREVIEW;
  const previewName = hoveredColor?.name
    ?? ACCENT_COLORS.find((c) => c.hsl === currentAccent)?.name
    ?? "Default (Gold)";

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-medium text-muted-foreground">Accent Color</h3>

      {/* Color swatches — larger with tooltips */}
      <div className="flex flex-wrap gap-2.5">
        {ACCENT_COLORS.map((color) => {
          const isSelected = currentAccent === color.hsl;
          return (
            <button
              key={color.name}
              onClick={() => onSelectAccent(color.hsl)}
              onMouseEnter={() => setHoveredColor(color)}
              onMouseLeave={() => setHoveredColor(null)}
              className={cn(
                "group relative w-11 h-11 rounded-full border-2 transition-all duration-200 flex items-center justify-center",
                "hover:scale-115 hover:shadow-xl",
                isSelected
                  ? "border-foreground ring-2 ring-foreground/20 scale-110"
                  : "border-transparent hover:border-foreground/30"
              )}
              style={{
                backgroundColor: color.preview,
                boxShadow: isSelected ? `0 0 16px ${color.preview}60` : undefined,
              }}
              title={color.name}
            >
              {isSelected && (
                <Check className="w-5 h-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
              )}
              {/* Floating label on hover */}
              <span className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {color.name}
              </span>
            </button>
          );
        })}
        {/* Reset to default */}
        <button
          onClick={() => onSelectAccent(null)}
          onMouseEnter={() => setHoveredColor({ name: "Default", hsl: DEFAULT_HSL, preview: DEFAULT_PREVIEW })}
          onMouseLeave={() => setHoveredColor(null)}
          className={cn(
            "group relative w-11 h-11 rounded-full border-2 transition-all duration-200 flex items-center justify-center",
            "hover:scale-115 bg-gradient-to-br from-muted to-muted-foreground/20",
            !currentAccent
              ? "border-foreground ring-2 ring-foreground/20 scale-110"
              : "border-transparent hover:border-foreground/30"
          )}
          title="Default (Gold)"
        >
          {!currentAccent && (
            <Check className="w-5 h-5 text-foreground drop-shadow-md" />
          )}
          <span className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Reset
          </span>
        </button>
      </div>

      {/* Rich preview card */}
      <div
        className="relative rounded-2xl border overflow-hidden transition-all duration-500"
        style={{
          borderColor: `hsl(${previewHsl} / 0.25)`,
          background: `linear-gradient(135deg, hsl(${previewHsl} / 0.06) 0%, transparent 60%)`,
        }}
      >
        {/* Header strip */}
        <div
          className="h-1.5 w-full transition-all duration-500"
          style={{ background: `linear-gradient(90deg, ${previewHex}, hsl(${previewHsl} / 0.3), transparent)` }}
        />

        <div className="p-4 space-y-4">
          {/* Title row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300"
                style={{ backgroundColor: `hsl(${previewHsl} / 0.15)` }}
              >
                <Crown className="w-4 h-4 transition-colors duration-300" style={{ color: previewHex }} />
              </div>
              <div>
                <span className="text-xs font-bold text-foreground block leading-tight">
                  Preview — {previewName}
                </span>
                <span className="text-[10px] text-muted-foreground">How your accent looks across the app</span>
              </div>
            </div>
            <Star className="w-4 h-4 transition-colors duration-300" style={{ color: previewHex }} />
          </div>

          {/* Interactive elements row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filled button */}
            <span
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-300 shadow-sm"
              style={{
                backgroundColor: previewHex,
                color: "#0d0f14",
                boxShadow: `0 4px 12px ${previewHex}40`,
              }}
            >
              <Sparkles className="w-3 h-3" />
              Primary
            </span>

            {/* Outline button */}
            <span
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold border-2 transition-all duration-300"
              style={{ borderColor: previewHex, color: previewHex }}
            >
              <Zap className="w-3 h-3" />
              Outline
            </span>

            {/* Ghost/link text */}
            <span
              className="text-xs font-bold underline underline-offset-2 decoration-2 transition-all duration-300 cursor-default"
              style={{ color: previewHex, textDecorationColor: `hsl(${previewHsl} / 0.4)` }}
            >
              Link text
            </span>

            {/* Badge */}
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300"
              style={{ backgroundColor: `hsl(${previewHsl} / 0.12)`, color: previewHex }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: previewHex }}
              />
              Badge
            </span>
          </div>

          {/* Progress bar + stat pills */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: "68%",
                  background: `linear-gradient(90deg, ${previewHex}, hsl(${previewHsl} / 0.6))`,
                  boxShadow: `0 0 8px ${previewHex}50`,
                }}
              />
            </div>
            <span className="text-[10px] font-bold transition-colors duration-300" style={{ color: previewHex }}>
              68%
            </span>
          </div>

          {/* Mini card row */}
          <div className="flex gap-2">
            {["Wins", "Rate", "Coins"].map((label, i) => (
              <div
                key={label}
                className="flex-1 rounded-lg py-2 px-2.5 text-center transition-all duration-300"
                style={{
                  backgroundColor: `hsl(${previewHsl} / ${0.04 + i * 0.02})`,
                  borderLeft: `2px solid hsl(${previewHsl} / ${0.2 + i * 0.1})`,
                }}
              >
                <div className="text-sm font-bold text-foreground">{[24, "76%", "1.2k"][i]}</div>
                <div className="text-[10px] text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccentColorPicker;
