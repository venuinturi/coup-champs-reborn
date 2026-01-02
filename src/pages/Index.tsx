import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, Spade, Circle, Layers } from "lucide-react";

const games = [
  {
    id: "coup",
    name: "Coup",
    description: "A game of deception, bluffing, and political intrigue. The last family standing wins.",
    icon: Crown,
    path: "/coup",
    color: "from-amber-500 to-yellow-600",
    available: true,
  },
  {
    id: "poker",
    name: "Poker",
    description: "Texas Hold'em - The classic card game of skill and strategy.",
    icon: Spade,
    path: "/poker",
    color: "from-red-500 to-rose-600",
    available: true,
  },
  {
    id: "blackjack",
    name: "Blackjack",
    description: "Beat the dealer to 21. Simple rules, endless excitement.",
    icon: Circle,
    path: "/blackjack",
    color: "from-emerald-500 to-green-600",
    available: true,
  },
  {
    id: "rummy",
    name: "Indian Rummy",
    description: "13-card rummy with sets and sequences. Form melds to declare and win!",
    icon: Layers,
    path: "/rummy",
    color: "from-purple-500 to-violet-600",
    available: true,
  },
];

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-12">
      {/* Hero Section */}
      <div className="text-center space-y-4 mb-12 animate-fade-in">
        <h1 className="font-display text-5xl md:text-7xl tracking-wider bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
          gamerzHub
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto leading-relaxed text-lg">
          Your destination for multiplayer card games.
          <br />
          Choose a game and start playing!
        </p>
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl w-full animate-fade-in" style={{ animationDelay: "0.2s" }}>
        {games.map((game) => (
          <Card
            key={game.id}
            className={`group relative overflow-hidden border-2 transition-all duration-300 ${
              game.available
                ? "cursor-pointer hover:border-primary hover:shadow-xl hover:scale-105"
                : "opacity-60 cursor-not-allowed"
            }`}
            onClick={() => game.available && navigate(game.path)}
          >
            <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
              <div className={`p-4 rounded-full bg-gradient-to-br ${game.color} shadow-lg`}>
                <game.icon className="w-10 h-10 text-white" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">{game.name}</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {game.description}
                </p>
              </div>
              {!game.available && (
                <span className="absolute top-3 right-3 bg-muted text-muted-foreground text-xs px-2 py-1 rounded-full">
                  Coming Soon
                </span>
              )}
              {game.available && (
                <span className="text-primary text-sm font-medium group-hover:underline">
                  Play Now →
                </span>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-16 text-center text-muted-foreground text-sm animate-fade-in" style={{ animationDelay: "0.4s" }}>
        <p>More games coming soon!</p>
      </div>
    </div>
  );
};

export default Index;
