import { useState } from "react";
import { Button } from "@/components/ui/button";
import { runSimulations, testScenarios } from "@/lib/gameSimulation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, XCircle, PlayCircle, TestTube } from "lucide-react";

export const SimulationPanel = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [simulationResults, setSimulationResults] = useState<{
    gamesPlayed: number;
    winsByPlayer: Record<string, number>;
    averageTurns: number;
    errors: string[];
  } | null>(null);
  const [testResults, setTestResults] = useState<
    { scenario: string; passed: boolean; details: string }[]
  >([]);

  const runTests = () => {
    setIsRunning(true);
    setTimeout(() => {
      const results = testScenarios();
      setTestResults(results);
      setIsRunning(false);
    }, 100);
  };

  const runSims = () => {
    setIsRunning(true);
    setTimeout(() => {
      const results = runSimulations(100, ["Alice", "Bob", "Charlie", "Diana"]);
      setSimulationResults(results);
      setIsRunning(false);
    }, 100);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-6">
      <div>
        <h2 className="font-display text-xl text-foreground mb-2">
          Game Engine Tests
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Run unit tests and simulations to verify game mechanics.
        </p>

        <div className="flex gap-3">
          <Button
            variant="gold-outline"
            onClick={runTests}
            disabled={isRunning}
          >
            <TestTube className="w-4 h-4 mr-2" />
            Run Unit Tests
          </Button>
          <Button
            variant="gold"
            onClick={runSims}
            disabled={isRunning}
          >
            <PlayCircle className="w-4 h-4 mr-2" />
            Run 100 Simulations
          </Button>
        </div>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div>
          <h3 className="font-display text-lg text-foreground mb-3">
            Test Results
          </h3>
          <div className="space-y-2">
            {testResults.map((result, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg"
              >
                {result.passed ? (
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-medium text-foreground">
                    {result.scenario}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {result.details}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-sm">
            <span className="text-green-500">
              {testResults.filter((r) => r.passed).length} passed
            </span>
            {" / "}
            <span className="text-destructive">
              {testResults.filter((r) => !r.passed).length} failed
            </span>
          </div>
        </div>
      )}

      {/* Simulation Results */}
      {simulationResults && (
        <div>
          <h3 className="font-display text-lg text-foreground mb-3">
            Simulation Results (100 games)
          </h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-primary">
                {simulationResults.gamesPlayed}
              </div>
              <div className="text-sm text-muted-foreground">Games Completed</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-primary">
                {simulationResults.averageTurns.toFixed(1)}
              </div>
              <div className="text-sm text-muted-foreground">Avg. Turns/Game</div>
            </div>
          </div>

          <h4 className="font-medium text-foreground mb-2">Win Distribution</h4>
          <div className="space-y-2">
            {Object.entries(simulationResults.winsByPlayer).map(([name, wins]) => (
              <div key={name} className="flex items-center gap-3">
                <span className="w-20 text-sm text-foreground">{name}</span>
                <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all"
                    style={{
                      width: `${(wins / simulationResults.gamesPlayed) * 100}%`,
                    }}
                  />
                </div>
                <span className="w-16 text-sm text-muted-foreground text-right">
                  {wins} ({((wins / simulationResults.gamesPlayed) * 100).toFixed(0)}%)
                </span>
              </div>
            ))}
          </div>

          {simulationResults.errors.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-destructive mb-2">
                Errors ({simulationResults.errors.length})
              </h4>
              <ScrollArea className="h-24">
                {simulationResults.errors.slice(0, 10).map((error, idx) => (
                  <div key={idx} className="text-sm text-muted-foreground">
                    {error}
                  </div>
                ))}
              </ScrollArea>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
