import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { usePlayerAuth } from "@/hooks/usePlayerAuth";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { playerId } = usePlayerAuth();
  const { profile, updateTheme } = usePlayerProfile(playerId);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load theme from profile on initial load
  useEffect(() => {
    if (profile?.theme_preference && mounted) {
      setTheme(profile.theme_preference);
    }
  }, [profile?.theme_preference, mounted, setTheme]);

  const handleToggle = async () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    
    // Persist to database if user has a profile
    if (playerId) {
      await updateTheme(newTheme as 'light' | 'dark');
    }
  };

  if (!mounted) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      className="fixed top-4 right-16 z-50 bg-card/80 backdrop-blur-sm hover:bg-card"
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? (
        <Sun className="w-5 h-5 text-primary" />
      ) : (
        <Moon className="w-5 h-5 text-primary" />
      )}
    </Button>
  );
};

export default ThemeToggle;
