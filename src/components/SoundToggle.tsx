import { useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleSound, isSoundEnabled, sounds } from "@/lib/sounds";

export const SoundToggle = () => {
  const [enabled, setEnabled] = useState(isSoundEnabled());

  const handleToggle = () => {
    const newState = toggleSound();
    setEnabled(newState);
    if (newState) sounds.buttonClick();
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      className="fixed top-4 right-4 z-50 bg-card/80 backdrop-blur-sm hover:bg-card"
      title={enabled ? "Mute sounds" : "Enable sounds"}
    >
      {enabled ? (
        <Volume2 className="w-5 h-5 text-primary" />
      ) : (
        <VolumeX className="w-5 h-5 text-muted-foreground" />
      )}
    </Button>
  );
};

export default SoundToggle;
