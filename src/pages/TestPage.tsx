import { useNavigate } from "react-router-dom";
import { SimulationPanel } from "@/components/game/SimulationPanel";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const TestPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-display text-2xl text-gold-gradient">
              Game Engine Tests
            </h1>
            <p className="text-muted-foreground text-sm">
              Verify all game mechanics work correctly
            </p>
          </div>
        </div>

        {/* Simulation Panel */}
        <SimulationPanel />

        {/* Back to Home */}
        <div className="text-center">
          <Button variant="gold-outline" onClick={() => navigate("/")}>
            Back to Lobby
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TestPage;
