import { CrownIcon } from "@/components/CrownIcon";
import { GameStats } from "@/components/GameStats";
import { LobbyCard } from "@/components/LobbyCard";
import { RulesDialog } from "@/components/RulesDialog";

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      {/* Hero Section */}
      <div className="text-center space-y-6 mb-10 animate-fade-in">
        <CrownIcon />
        
        <h1 className="font-display text-6xl md:text-7xl text-gold-gradient tracking-wider">
          COUP
        </h1>
        
        <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
          A game of deception, bluffing, and political intrigue.
          <br />
          The last family standing wins.
        </p>

        <GameStats />
      </div>

      {/* Lobby Card */}
      <div className="w-full animate-fade-in" style={{ animationDelay: "0.2s" }}>
        <LobbyCard />
      </div>

      {/* Rules Button */}
      <div className="mt-8 animate-fade-in" style={{ animationDelay: "0.4s" }}>
        <RulesDialog />
      </div>
    </div>
  );
};

export default Index;
