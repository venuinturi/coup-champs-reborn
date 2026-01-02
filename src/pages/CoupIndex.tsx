import { useNavigate } from "react-router-dom";
import { CrownIcon } from "@/components/CrownIcon";
import { GameStats } from "@/components/GameStats";
import { LobbyCard } from "@/components/LobbyCard";
import { RulesDialog } from "@/components/RulesDialog";
import { Button } from "@/components/ui/button";
import { TestTube, ArrowLeft } from "lucide-react";

const CoupIndex = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      {/* Back Button */}
      <Button
        variant="ghost"
        className="absolute top-4 left-4 gap-2 text-muted-foreground hover:text-foreground"
        onClick={() => navigate("/")}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Hub
      </Button>

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

      {/* Action Buttons */}
      <div className="flex gap-4 mt-8 animate-fade-in" style={{ animationDelay: "0.4s" }}>
        <RulesDialog />
        <Button
          variant="ghost"
          className="gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/test")}
        >
          <TestTube className="w-4 h-4" />
          Test Engine
        </Button>
      </div>
    </div>
  );
};

export default CoupIndex;
