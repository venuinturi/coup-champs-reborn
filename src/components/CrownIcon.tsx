import { Crown } from "lucide-react";

export const CrownIcon = () => {
  return (
    <div className="relative">
      {/* Glow effect behind crown */}
      <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl scale-150" />
      
      {/* Crown container */}
      <div className="relative w-24 h-24 rounded-full bg-card border border-border flex items-center justify-center animate-pulse-glow">
        <Crown className="w-12 h-12 text-primary" strokeWidth={1.5} />
      </div>
    </div>
  );
};
