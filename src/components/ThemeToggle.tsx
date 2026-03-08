import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useState } from "react";
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

  const handleToggle = useCallback(async () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    
    // Persist to database if user has a profile
    if (playerId) {
      await updateTheme(newTheme as 'light' | 'dark');
    }
  }, [theme, setTheme, playerId, updateTheme]);

  // Keyboard shortcut (Ctrl+D) to toggle theme
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        handleToggle();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggle]);

  if (!mounted) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      className="fixed top-4 right-16 z-50 bg-card/80 backdrop-blur-sm hover:bg-card"
      title={theme === "dark" ? "Switch to light mode (Ctrl+D)" : "Switch to dark mode (Ctrl+D)"}
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
