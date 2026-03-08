import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, Medal, Crown, Coins, Target, TrendingUp, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGameHistory, LeaderboardEntry, GameType } from "@/hooks/useGameHistory";
import { usePlayerAuth } from "@/hooks/usePlayerAuth";
import { usePlayersProfiles } from "@/hooks/usePlayerProfile";
import PlayerAvatar from "@/components/PlayerAvatar";
import { cn } from "@/lib/utils";

const gameFilters: { label: string; value: GameType | 'all' }[] = [
  { label: "All Games", value: "all" },
  { label: "Poker", value: "poker" },
  { label: "Blackjack", value: "blackjack" },
  { label: "Rummy", value: "rummy" },
  { label: "Coup", value: "coup" },
];

const gameColors: Record<string, string> = {
  poker: "text-red-400",
  blackjack: "text-emerald-400",
  rummy: "text-purple-400",
  coup: "text-amber-400",
};

const Leaderboard = () => {
  const navigate = useNavigate();
  const { fetchLeaderboard, fetchPlayerStats } = useGameHistory();
  const { playerId } = usePlayerAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameType | 'all'>('all');
  const [playerStats, setPlayerStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await fetchLeaderboard(selectedGame === 'all' ? undefined : selectedGame);
      setLeaderboard(data);
      setLoading(false);
    };
    load();
  }, [selectedGame, fetchLeaderboard]);

  useEffect(() => {
    if (playerId) {
      fetchPlayerStats(playerId).then(setPlayerStats);
    }
  }, [playerId, fetchPlayerStats]);

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="w-5 h-5 text-amber-400" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-300" />;
    if (index === 2) return <Medal className="w-5 h-5 text-amber-700" />;
    return <span className="w-5 h-5 text-center text-sm text-muted-foreground font-mono">{index + 1}</span>;
  };

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <div className="absolute inset-0 bg-casino-pattern" />
      <div className="absolute inset-0 bg-diamond-pattern" />

      <div className="relative z-10 px-4 py-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>

        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-amber-500/20 blur-2xl animate-pulse-glow" />
              <div className="relative p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/20">
                <Trophy className="w-8 h-8 text-amber-400" />
              </div>
            </div>
          </div>
          <h1 className="shimmer-text text-4xl md:text-5xl font-black tracking-wider mb-2">
            Leaderboard
          </h1>
          <p className="text-muted-foreground">Top players across all games</p>
        </div>

        {/* Your Stats Card */}
        {playerStats && playerStats.totalGames > 0 && (
          <div className="glass-card border border-primary/20 rounded-2xl p-6 mb-8">
            <h3 className="text-sm font-medium text-primary/80 tracking-widest uppercase mb-4">Your Stats</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Gamepad2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-2xl font-bold text-foreground">{playerStats.totalGames}</span>
                </div>
                <span className="text-xs text-muted-foreground">Games</span>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span className="text-2xl font-bold text-foreground">{playerStats.wins}</span>
                </div>
                <span className="text-xs text-muted-foreground">Wins</span>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Target className="w-4 h-4 text-emerald-400" />
                  <span className="text-2xl font-bold text-foreground">{playerStats.winRate}%</span>
                </div>
                <span className="text-xs text-muted-foreground">Win Rate</span>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <span className="text-2xl font-bold text-foreground">{playerStats.totalCoins.toLocaleString()}</span>
                </div>
                <span className="text-xs text-muted-foreground">Coins Won</span>
              </div>
            </div>
          </div>
        )}

        {/* Game Filter */}
        <div className="flex flex-wrap gap-2 mb-6 justify-center">
          {gameFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setSelectedGame(filter.value)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                selectedGame === filter.value
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "glass-card border border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Leaderboard Table */}
        <div className="glass-card border border-border/50 rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-4 md:px-6 py-3 border-b border-border/30 text-xs font-medium text-muted-foreground tracking-wider uppercase">
            <div className="col-span-1">#</div>
            <div className="col-span-4">Player</div>
            <div className="col-span-2 text-center">Wins</div>
            <div className="col-span-2 text-center">Games</div>
            <div className="col-span-1 text-center hidden md:block">Rate</div>
            <div className="col-span-2 text-right">Coins</div>
          </div>

          {loading ? (
            <div className="px-6 py-12 text-center text-muted-foreground">
              Loading...
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Gamepad2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">No games played yet</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Play a game to appear on the leaderboard!</p>
            </div>
          ) : (
            leaderboard.map((entry, index) => (
              <div
                key={entry.player_id}
                className={cn(
                  "grid grid-cols-12 gap-2 px-4 md:px-6 py-4 border-b border-border/10 items-center transition-colors hover:bg-foreground/[0.02]",
                  entry.player_id === playerId && "bg-primary/[0.05] border-l-2 border-l-primary"
                )}
              >
                <div className="col-span-1 flex items-center">
                  {getRankIcon(index)}
                </div>
                <div className="col-span-4">
                  <span className="font-medium text-foreground truncate block">
                    {entry.player_name}
                  </span>
                  {entry.player_id === playerId && (
                    <span className="text-[10px] text-primary/70 uppercase tracking-wider">You</span>
                  )}
                </div>
                <div className="col-span-2 text-center font-semibold text-foreground">
                  {entry.total_wins}
                </div>
                <div className="col-span-2 text-center text-muted-foreground">
                  {entry.total_games}
                </div>
                <div className="col-span-1 text-center hidden md:block">
                  <span className={cn(
                    "text-sm font-medium",
                    entry.win_rate >= 60 ? "text-emerald-400" : entry.win_rate >= 40 ? "text-amber-400" : "text-muted-foreground"
                  )}>
                    {entry.win_rate}%
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-sm font-medium text-yellow-400/80 flex items-center justify-end gap-1">
                    <Coins className="w-3 h-3" />
                    {entry.total_coins.toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Recent Games */}
        {playerStats?.recentGames?.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-medium text-muted-foreground tracking-widest uppercase mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Your Recent Games
            </h3>
            <div className="space-y-2">
              {playerStats.recentGames.map((game: any) => (
                <div
                  key={game.id}
                  className="glass-card border border-border/30 rounded-xl px-4 py-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className={cn("text-sm font-medium capitalize", gameColors[game.game_type] || "text-foreground")}>
                      {game.game_type}
                    </span>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      game.result === 'win'
                        ? "bg-emerald-500/10 text-emerald-400"
                        : game.result === 'loss'
                        ? "bg-red-500/10 text-red-400"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {game.result}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {game.coins_won > 0 && (
                      <span className="text-sm text-yellow-400/80 flex items-center gap-1">
                        <Coins className="w-3 h-3" />
                        +{game.coins_won}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(game.played_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
