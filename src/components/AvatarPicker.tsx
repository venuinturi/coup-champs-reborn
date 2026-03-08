import { useState, useRef } from "react";
import { AVATAR_PRESETS } from "@/hooks/usePlayerProfile";
import PlayerAvatar from "@/components/PlayerAvatar";
import { Button } from "@/components/ui/button";
import { Upload, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvatarPickerProps {
  currentPreset: string;
  currentUrl?: string | null;
  onSelectPreset: (preset: string) => void;
  onUpload: (file: File) => void;
  uploading?: boolean;
}

const AvatarPicker = ({
  currentPreset,
  currentUrl,
  onSelectPreset,
  onUpload,
  uploading = false,
}: AvatarPickerProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground font-medium">Choose your avatar</p>

      <div className="grid grid-cols-8 gap-2">
        {Object.entries(AVATAR_PRESETS).map(([key, config]) => (
          <button
            key={key}
            onClick={() => onSelectPreset(key)}
            className={cn(
              "relative w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br transition-all duration-200 hover:scale-110",
              config.bg,
              currentPreset === key && !currentUrl
                ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                : "opacity-70 hover:opacity-100"
            )}
          >
            <span className="text-lg select-none">{config.emoji}</span>
            {currentPreset === key && !currentUrl && (
              <div className="absolute -bottom-0.5 -right-0.5 bg-primary rounded-full p-0.5">
                <Check className="w-2.5 h-2.5 text-primary-foreground" />
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="w-3.5 h-3.5" />
          {uploading ? "Uploading..." : "Upload Custom"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              if (file.size > 2 * 1024 * 1024) {
                alert("File too large. Max 2MB.");
                return;
              }
              onUpload(file);
            }
          }}
        />
        {currentUrl && (
          <span className="text-xs text-muted-foreground">Custom avatar active</span>
        )}
      </div>
    </div>
  );
};

export default AvatarPicker;
