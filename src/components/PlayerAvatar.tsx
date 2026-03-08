import { AVATAR_PRESETS } from "@/hooks/usePlayerProfile";
import { cn } from "@/lib/utils";

interface PlayerAvatarProps {
  preset?: string;
  customUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showRing?: boolean;
  ringColor?: string;
}

const sizeClasses = {
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-lg",
  lg: "w-14 h-14 text-2xl",
  xl: "w-20 h-20 text-4xl",
};

const PlayerAvatar = ({
  preset = "default",
  customUrl,
  size = "md",
  className,
  showRing = false,
  ringColor = "ring-primary",
}: PlayerAvatarProps) => {
  const avatarConfig = AVATAR_PRESETS[preset] || AVATAR_PRESETS.default;

  if (customUrl) {
    return (
      <div
        className={cn(
          "rounded-full overflow-hidden shrink-0 bg-muted",
          sizeClasses[size],
          showRing && `ring-2 ${ringColor}`,
          className
        )}
      >
        <img
          src={customUrl}
          alt="Avatar"
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to preset on error
            (e.target as HTMLImageElement).style.display = 'none';
            (e.target as HTMLImageElement).parentElement!.classList.add('flex', 'items-center', 'justify-center');
            const span = document.createElement('span');
            span.textContent = avatarConfig.emoji;
            (e.target as HTMLImageElement).parentElement!.appendChild(span);
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-full shrink-0 flex items-center justify-center bg-gradient-to-br select-none",
        sizeClasses[size],
        avatarConfig.bg,
        showRing && `ring-2 ${ringColor}`,
        className
      )}
    >
      {avatarConfig.emoji}
    </div>
  );
};

export default PlayerAvatar;
