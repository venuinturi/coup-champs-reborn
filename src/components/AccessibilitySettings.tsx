import { useState } from "react";
import { cn } from "@/lib/utils";
import { Type, Zap, Eye } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { FontSize } from "@/hooks/useAccessibilitySettings";

const FONT_OPTIONS: { value: FontSize; label: string; displaySize: string; desc: string }[] = [
  { value: 'small', label: 'S', displaySize: '14px', desc: 'Compact' },
  { value: 'medium', label: 'M', displaySize: '16px', desc: 'Default' },
  { value: 'large', label: 'L', displaySize: '18px', desc: 'Large' },
  { value: 'x-large', label: 'XL', displaySize: '20px', desc: 'Extra Large' },
];

interface AccessibilitySettingsProps {
  fontSize: FontSize;
  reducedMotion: boolean;
  onFontSizeChange: (size: FontSize) => void;
  onReducedMotionChange: (enabled: boolean) => void;
}

const AccessibilitySettings = ({
  fontSize,
  reducedMotion,
  onFontSizeChange,
  onReducedMotionChange,
}: AccessibilitySettingsProps) => {
  const [hoveredSize, setHoveredSize] = useState<FontSize | null>(null);
  const previewSize = hoveredSize ?? fontSize;
  const previewPx = FONT_OPTIONS.find((o) => o.value === previewSize)?.displaySize ?? '16px';

  return (
    <div className="space-y-6">
      {/* Font Size */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Font Size</span>
        </div>

        <div className="flex gap-2">
          {FONT_OPTIONS.map((opt) => {
            const isActive = fontSize === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => onFontSizeChange(opt.value)}
                onMouseEnter={() => setHoveredSize(opt.value)}
                onMouseLeave={() => setHoveredSize(null)}
                className={cn(
                  "flex-1 py-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-0.5",
                  "hover:bg-primary/10",
                  isActive
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border/50 hover:border-primary/30"
                )}
              >
                <span
                  className={cn(
                    "font-bold transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                  style={{ fontSize: opt.displaySize }}
                >
                  {opt.label}
                </span>
                <span className="text-[10px] text-muted-foreground leading-none">{opt.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Live preview */}
        <div className="rounded-xl border border-border/30 bg-background/40 p-3.5 space-y-1.5">
          <div className="flex items-center gap-1.5 mb-2">
            <Eye className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Preview ({previewPx})
            </span>
          </div>
          <p
            className="font-bold text-foreground transition-all duration-300 leading-snug"
            style={{ fontSize: previewPx }}
          >
            The quick brown fox jumps
          </p>
          <p
            className="text-muted-foreground transition-all duration-300 leading-relaxed"
            style={{ fontSize: `calc(${previewPx} - 2px)` }}
          >
            Body text looks like this at your selected size. Cards, stats, and game UI will scale accordingly.
          </p>
        </div>
      </div>

      {/* Reduced Motion */}
      <div
        className={cn(
          "flex items-center justify-between gap-4 rounded-xl border p-4 transition-all duration-200",
          reducedMotion
            ? "border-primary/30 bg-primary/5"
            : "border-border/50"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200",
              reducedMotion ? "bg-primary/15" : "bg-muted"
            )}
          >
            <Zap className={cn("w-4 h-4 transition-colors", reducedMotion ? "text-primary" : "text-muted-foreground")} />
          </div>
          <div>
            <Label htmlFor="reduced-motion" className="text-sm font-semibold cursor-pointer text-foreground">
              Reduce Motion
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Disables animations and transitions throughout the app
            </p>
          </div>
        </div>
        <Switch
          id="reduced-motion"
          checked={reducedMotion}
          onCheckedChange={onReducedMotionChange}
        />
      </div>
    </div>
  );
};

export default AccessibilitySettings;
