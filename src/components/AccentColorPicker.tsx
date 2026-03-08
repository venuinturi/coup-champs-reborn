import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACCENT_COLORS } from "@/hooks/usePlayerProfile";

interface AccentColorPickerProps {
  currentAccent: string | null;
  onSelectAccent: (hsl: string | null) => void;
}

const AccentColorPicker = ({ currentAccent, onSelectAccent }: AccentColorPickerProps) => {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">Accent Color</h3>
      <div className="flex flex-wrap gap-2">
        {ACCENT_COLORS.map((color) => {
          const isSelected = currentAccent === color.hsl;
          return (
            <button
              key={color.name}
              onClick={() => onSelectAccent(color.hsl)}
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
        {/* Reset to default option */}
        <button
          onClick={() => onSelectAccent(null)}
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
    </div>
  );
};

export default AccentColorPicker;
