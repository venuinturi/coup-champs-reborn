import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
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
