import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Circle, Construction } from "lucide-react";

const BlackjackIndex = () => {
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
      <div className="text-center space-y-6 animate-fade-in">
        <div className="flex justify-center">
          <div className="p-6 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg">
            <Circle className="w-16 h-16 text-white" />
          </div>
        </div>
        
        <h1 className="font-display text-6xl md:text-7xl bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent tracking-wider">
          BLACKJACK
        </h1>
        
        <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
          Beat the dealer to 21.
          <br />
          Simple rules, endless excitement.
        </p>

        <div className="flex items-center justify-center gap-2 text-muted-foreground mt-8">
          <Construction className="w-5 h-5" />
          <span className="text-lg">Coming Soon</span>
        </div>

        <p className="text-muted-foreground/60 text-sm max-w-sm mx-auto">
          We're working hard to bring you an amazing Blackjack experience. Stay tuned!
        </p>
      </div>
    </div>
  );
};

export default BlackjackIndex;
