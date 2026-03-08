import { useNavigate } from "react-router-dom";
import { Crown, Spade, Circle, Layers, Sparkles, Zap, Trophy } from "lucide-react";
import SoundToggle from "@/components/SoundToggle";
import { sounds } from "@/lib/sounds";
import { cn } from "@/lib/utils";

const games = [
  {
    id: "coup",
    name: "Coup",
    tagline: "Bluff & Betray",
    description: "Deception, bluffing, and political intrigue. The last family standing wins.",
    icon: Crown,
    path: "/coup",
    gradient: "from-amber-500/20 via-yellow-500/10 to-transparent",
    iconGradient: "from-amber-400 to-yellow-600",
    glowColor: "45 100% 50%",
    borderHover: "hover:border-amber-500/40",
    available: true,
  },
  {
    id: "poker",
    name: "Poker",
    tagline: "Texas Hold'em",
    description: "The classic card game of skill, strategy, and high-stakes bluffing.",
    icon: Spade,
    path: "/poker",
    gradient: "from-red-500/20 via-rose-500/10 to-transparent",
    iconGradient: "from-red-400 to-rose-600",
    glowColor: "0 72% 51%",
    borderHover: "hover:border-red-500/40",
    available: true,
  },
  {
    id: "blackjack",
    name: "Blackjack",
    tagline: "Beat the Dealer",
    description: "Get closer to 21 than the dealer. Simple rules, endless excitement.",
    icon: Circle,
    path: "/blackjack",
    gradient: "from-emerald-500/20 via-green-500/10 to-transparent",
    iconGradient: "from-emerald-400 to-green-600",
    glowColor: "152 60% 42%",
    borderHover: "hover:border-emerald-500/40",
    available: true,
  },
  {
    id: "rummy",
    name: "Indian Rummy",
    tagline: "Meld & Declare",
    description: "13-card rummy with sets and sequences. Form melds to declare and win!",
    icon: Layers,
    path: "/rummy",
    gradient: "from-purple-500/20 via-violet-500/10 to-transparent",
    iconGradient: "from-purple-400 to-violet-600",
    glowColor: "270 60% 55%",
    borderHover: "hover:border-purple-500/40",
    available: true,
  },
];

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 bg-casino-pattern" />
      <div className="absolute inset-0 bg-diamond-pattern" />

      {/* Decorative floating suits */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {['♠', '♥', '♦', '♣', '♠', '♥'].map((suit, i) => (
          <span
            key={i}
            className="floating-particle absolute text-foreground/[0.03] select-none"
            style={{
              left: `${15 + i * 15}%`,
              fontSize: `${20 + i * 8}px`,
              animationDuration: `${12 + i * 4}s`,
              animationDelay: `${i * 2}s`,
              top: '100%',
            }}
          >
            {suit}
          </span>
        ))}
      </div>

      <SoundToggle />

      <div className="relative z-10 flex flex-col items-center px-4 py-16 md:py-24">
        {/* Hero Section */}
        <div className="text-center space-y-6 mb-16 animate-fade-in">
          {/* Logo icon */}
          <div className="flex justify-center mb-2">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-2xl animate-pulse-glow" />
              <div className="relative p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
            </div>
          </div>

          <h1 className="shimmer-text text-6xl md:text-8xl font-black tracking-wider leading-none">
            gamerzHub
          </h1>

          <div className="separator-diamond text-primary/40 max-w-xs mx-auto">
            <span className="text-primary text-xs">◆</span>
          </div>

          <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed text-lg font-light">
            Premium multiplayer card games.
            <br />
            <span className="text-foreground/80">Choose your table and play.</span>
          </p>
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl w-full">
          {games.map((game, index) => (
            <div
              key={game.id}
              className="animate-fade-in"
              style={{ animationDelay: `${0.1 + index * 0.1}s`, animationFillMode: 'both' }}
            >
              <div
                className={cn(
                  "group relative rounded-2xl overflow-hidden cursor-pointer game-card-glow",
                  "glass-card border border-border/50 transition-all duration-400",
                  game.borderHover,
                  !game.available && "opacity-50 cursor-not-allowed"
                )}
                style={{ '--glow-color': game.glowColor } as React.CSSProperties}
                onClick={() => {
                  if (game.available) {
                    sounds.buttonClick();
                    navigate(game.path);
                  }
                }}
              >
                {/* Top gradient accent */}
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                  game.gradient
                )} />

                <div className="relative p-6 md:p-8 flex gap-5 items-start">
                  {/* Icon */}
                  <div className="shrink-0">
                    <div className={cn(
                      "p-3.5 rounded-xl bg-gradient-to-br shadow-lg transition-transform duration-300 group-hover:scale-110",
                      game.iconGradient
                    )}>
                      <game.icon className="w-7 h-7 text-background" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-foreground tracking-wide">{game.name}</h2>
                    </div>
                    <p className="text-xs font-medium text-primary/80 tracking-widest uppercase">
                      {game.tagline}
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {game.description}
                    </p>
                  </div>

                  {/* Arrow */}
                  <div className="shrink-0 self-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                </div>

                {/* Bottom shine line */}
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {!game.available && (
                  <div className="absolute top-4 right-4 bg-muted/80 text-muted-foreground text-xs px-2.5 py-1 rounded-full backdrop-blur-sm">
                    Coming Soon
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Leaderboard Button */}
        <div className="mt-12 animate-fade-in" style={{ animationDelay: "0.5s", animationFillMode: 'both' }}>
          <div
            className="group glass-card border border-amber-500/20 hover:border-amber-500/40 rounded-2xl p-5 cursor-pointer transition-all duration-400 game-card-glow max-w-md mx-auto"
            style={{ '--glow-color': '45 100% 50%' } as React.CSSProperties}
            onClick={() => { sounds.buttonClick(); navigate('/leaderboard'); }}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Trophy className="w-6 h-6 text-background" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Leaderboard</h3>
                <p className="text-sm text-muted-foreground">View rankings & stats</p>
              </div>
              <Zap className="w-5 h-5 text-primary ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center animate-fade-in" style={{ animationDelay: "0.6s" }}>
          <div className="separator-diamond text-muted-foreground/30 max-w-xs mx-auto mb-4">
            <span className="text-muted-foreground/40 text-xs">◆</span>
          </div>
          <p className="text-muted-foreground/60 text-sm">More games coming soon</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
