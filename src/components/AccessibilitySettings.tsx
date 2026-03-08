import { cn } from "@/lib/utils";
import { Type, Zap } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { FontSize } from "@/hooks/useAccessibilitySettings";

const FONT_OPTIONS: { value: FontSize; label: string; sample: string }[] = [
  { value: 'small', label: 'S', sample: 'text-xs' },
  { value: 'medium', label: 'M', sample: 'text-sm' },
  { value: 'large', label: 'L', sample: 'text-base' },
  { value: 'x-large', label: 'XL', sample: 'text-lg' },
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
  return (
    <div className="space-y-5">
      {/* Font Size */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Font Size</span>
        </div>
        <div className="flex gap-2">
          {FONT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onFontSizeChange(opt.value)}
              className={cn(
                "flex-1 py-2.5 rounded-lg border-2 transition-all duration-200 font-semibold",
                "hover:bg-primary/10",
                fontSize === opt.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/50 text-muted-foreground"
              )}
            >
              <span className={opt.sample}>{opt.label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Adjusts the base text size across the app
        </p>
      </div>

      {/* Reduced Motion */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-muted-foreground" />
          <div>
            <Label htmlFor="reduced-motion" className="text-sm font-medium cursor-pointer">
              Reduce Motion
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Minimize animations and transitions
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
