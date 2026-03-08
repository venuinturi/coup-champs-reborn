import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePlayerAuth } from "@/hooks/usePlayerAuth";
import { usePlayerProfile, AVATAR_PRESETS, ACCENT_COLORS } from "@/hooks/usePlayerProfile";
import { useGameHistory, GameHistoryEntry } from "@/hooks/useGameHistory";
import PlayerAvatar from "@/components/PlayerAvatar";
import AvatarPicker from "@/components/AvatarPicker";
import AccentColorPicker from "@/components/AccentColorPicker";
import AccessibilitySettings from "@/components/AccessibilitySettings";
import type { FontSize } from "@/hooks/useAccessibilitySettings";
import SoundToggle from "@/components/SoundToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sounds } from "@/lib/sounds";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Trophy, Target, Coins, TrendingUp,
  Gamepad2, Calendar, Crown, Pencil, Check, X,
  Spade, Circle, Layers, Palette, Settings2,
  ChevronDown, User, Brush,
} from "lucide-react";
import { format } from "date-fns";

const gameIcons: Record<string, any> = {
  poker: Spade,
  blackjack: Circle,
  rummy: Layers,
  coup: Crown,
};

const gameColors: Record<string, string> = {
  poker: "text-red-400",
  blackjack: "text-emerald-400",
  rummy: "text-violet-400",
  coup: "text-amber-400",
};

const resultColors: Record<string, string> = {
  win: "text-emerald-400",
  loss: "text-destructive",
  draw: "text-amber-400",
};

/* ─── Collapsible section wrapper ─── */
const Section = ({
  icon: Icon,
  title,
  defaultOpen = false,
  children,
  accentHex,
}: {
  icon: any;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  accentHex?: string;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="glass-card border border-border/50 rounded-2xl overflow-hidden animate-fade-in transition-all duration-300">
      <button
        onClick={() => { setOpen(!open); sounds.buttonClick(); }}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-primary/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: accentHex ? `${accentHex}18` : undefined }}
          >
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-bold text-foreground tracking-wide">{title}</span>
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform duration-300",
            open && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          open ? "max-h-[1200px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="px-5 pb-5 pt-1">{children}</div>
      </div>
    </div>
  );
};

const Profile = () => {
  const navigate = useNavigate();
  const { playerId, loading: authLoading } = usePlayerAuth();
  const { profile, loading: profileLoading, ensureProfile, updateAvatar, uploadAvatar, updateAccentColor, updateFontSize, updateReducedMotion } = usePlayerProfile(playerId);
  const { fetchPlayerStats } = useGameHistory();

  const [stats, setStats] = useState<{
    totalGames: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
    totalCoins: number;
    recentGames: GameHistoryEntry[];
  } | null>(null);

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!playerId) return;
    const load = async () => {
      const data = await fetchPlayerStats(playerId);
      setStats(data);
      setStatsLoading(false);
    };
    load();
  }, [playerId, fetchPlayerStats]);

  useEffect(() => {
    if (playerId && !profile && !profileLoading) {
      ensureProfile("Player");
    }
  }, [playerId, profile, profileLoading, ensureProfile]);

  useEffect(() => {
    if (profile) setNameInput(profile.player_name);
  }, [profile]);

  const handleSaveName = async () => {
    if (!nameInput.trim() || !playerId) return;
    await ensureProfile(nameInput.trim());
    setEditingName(false);
    sounds.buttonClick();
  };

  const handleSelectPreset = async (preset: string) => {
    await updateAvatar(preset);
    sounds.buttonClick();
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    await uploadAvatar(file);
    setUploading(false);
  };

  const handleSelectAccent = async (accentHsl: string | null) => {
    await updateAccentColor(accentHsl);
    sounds.buttonClick();
  };

  const handleFontSizeChange = async (size: FontSize) => {
    await updateFontSize(size);
    sounds.buttonClick();
  };

  const handleReducedMotionChange = async (enabled: boolean) => {
    await updateReducedMotion(enabled);
    sounds.buttonClick();
  };

  const loading = authLoading || profileLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  const currentAccentHex = ACCENT_COLORS.find((c) => c.hsl === profile?.accent_color)?.preview ?? "#FFD700";

  const statCards = [
    { label: "Games Played", value: stats?.totalGames ?? 0, icon: Gamepad2, color: "text-primary" },
    { label: "Wins", value: stats?.wins ?? 0, icon: Trophy, color: "text-emerald-400" },
    { label: "Win Rate", value: `${stats?.winRate ?? 0}%`, icon: Target, color: "text-violet-400" },
    { label: "Total Coins", value: stats?.totalCoins ?? 0, icon: Coins, color: "text-amber-400" },
  ];

  const gameBreakdown = (stats?.recentGames ?? []).reduce<Record<string, { wins: number; games: number }>>((acc, g) => {
    if (!acc[g.game_type]) acc[g.game_type] = { wins: 0, games: 0 };
    acc[g.game_type].games++;
    if (g.result === "win") acc[g.game_type].wins++;
    return acc;
  }, {});

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <div className="absolute inset-0 bg-casino-pattern" />
      <div className="absolute inset-0 bg-diamond-pattern" />
      <SoundToggle />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { sounds.buttonClick(); navigate("/"); }}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-display font-bold text-foreground tracking-wide">Profile</h1>
        </div>

        {/* Hero Card — Avatar + Name + Quick Stats */}
        <div
          className="glass-card border border-border/50 rounded-2xl p-6 mb-4 animate-fade-in relative overflow-hidden"
        >
          {/* Subtle accent gradient overlay */}
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at top left, ${currentAccentHex}, transparent 70%)`,
            }}
          />

          <div className="relative flex items-center gap-5">
            <div className="relative">
              <PlayerAvatar
                preset={profile?.avatar_preset}
                customUrl={profile?.avatar_url}
                size="xl"
              />
              {/* Glow ring */}
              <div
                className="absolute inset-0 rounded-full opacity-20 blur-md"
                style={{ backgroundColor: currentAccentHex }}
              />
            </div>
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="max-w-[200px]"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                  />
                  <Button size="icon" variant="ghost" onClick={handleSaveName}>
                    <Check className="w-4 h-4 text-emerald-400" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setEditingName(false)}>
                    <X className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-foreground truncate">
                    {profile?.player_name || "Player"}
                  </h2>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="shrink-0 opacity-60 hover:opacity-100"
                    onClick={() => setEditingName(true)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                Player since {profile ? format(new Date(), "MMM yyyy") : "—"}
              </p>

              {/* Inline mini stats */}
              <div className="flex items-center gap-4 mt-3">
                {[
                  { icon: Trophy, value: stats?.wins ?? 0, label: "wins", color: "text-emerald-400" },
                  { icon: Target, value: `${stats?.winRate ?? 0}%`, label: "rate", color: "text-violet-400" },
                  { icon: Coins, value: stats?.totalCoins ?? 0, label: "coins", color: "text-amber-400" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-1.5">
                    <s.icon className={cn("w-3.5 h-3.5", s.color)} />
                    <span className="text-xs font-bold text-foreground">{s.value}</span>
                    <span className="text-[10px] text-muted-foreground">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Customization Sections */}
        <div className="space-y-3 mb-6">
          <Section icon={User} title="Avatar" defaultOpen={true} accentHex={currentAccentHex}>
            <AvatarPicker
              currentPreset={profile?.avatar_preset || "default"}
              currentUrl={profile?.avatar_url}
              onSelectPreset={handleSelectPreset}
              onUpload={handleUpload}
              uploading={uploading}
            />
          </Section>

          <Section icon={Palette} title="Theme & Colors" defaultOpen={true} accentHex={currentAccentHex}>
            <AccentColorPicker
              currentAccent={profile?.accent_color ?? null}
              onSelectAccent={handleSelectAccent}
            />
          </Section>

          <Section icon={Settings2} title="Accessibility" defaultOpen={false} accentHex={currentAccentHex}>
            <AccessibilitySettings
              fontSize={(profile?.font_size as FontSize) || 'medium'}
              reducedMotion={profile?.reduced_motion ?? false}
              onFontSizeChange={handleFontSizeChange}
              onReducedMotionChange={handleReducedMotionChange}
            />
          </Section>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {statCards.map((stat, i) => (
            <div
              key={stat.label}
              className="glass-card border border-border/50 rounded-xl p-4 text-center animate-fade-in"
              style={{ animationDelay: `${i * 0.08}s`, animationFillMode: "both" }}
            >
              <stat.icon className={cn("w-5 h-5 mx-auto mb-2", stat.color)} />
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Game Breakdown */}
        {Object.keys(gameBreakdown).length > 0 && (
          <div className="glass-card border border-border/50 rounded-2xl p-5 mb-4 animate-fade-in" style={{ animationDelay: "0.3s", animationFillMode: "both" }}>
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Per-Game Stats
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(gameBreakdown).map(([type, data]) => {
                const Icon = gameIcons[type] || Gamepad2;
                const wr = data.games > 0 ? Math.round((data.wins / data.games) * 100) : 0;
                return (
                  <div key={type} className="flex items-center gap-3 bg-background/40 rounded-lg p-3">
                    <Icon className={cn("w-5 h-5", gameColors[type] || "text-muted-foreground")} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground capitalize">{type}</div>
                      <div className="text-xs text-muted-foreground">
                        {data.wins}W / {data.games}G · {wr}%
                      </div>
                    </div>
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${wr}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Games */}
        <div className="glass-card border border-border/50 rounded-2xl p-5 animate-fade-in" style={{ animationDelay: "0.4s", animationFillMode: "both" }}>
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Recent Games
          </h3>

          {statsLoading ? (
            <div className="text-center py-8 text-muted-foreground animate-pulse">Loading...</div>
          ) : (stats?.recentGames?.length ?? 0) === 0 ? (
            <div className="text-center py-8">
              <Gamepad2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No games played yet</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => navigate("/")}
              >
                Play a Game
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {stats!.recentGames.map((game) => {
                const Icon = gameIcons[game.game_type] || Gamepad2;
                return (
                  <div
                    key={game.id}
                    className="flex items-center gap-3 bg-background/40 rounded-lg px-4 py-3 hover:bg-background/60 transition-colors"
                  >
                    <Icon className={cn("w-4 h-4 shrink-0", gameColors[game.game_type] || "text-muted-foreground")} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground capitalize">{game.game_type}</span>
                      {game.room_code && (
                        <span className="text-xs text-muted-foreground ml-2">#{game.room_code}</span>
                      )}
                    </div>
                    <span className={cn("text-sm font-bold uppercase", resultColors[game.result] || "text-muted-foreground")}>
                      {game.result}
                    </span>
                    {game.coins_won !== 0 && (
                      <span className={cn(
                        "text-xs font-medium",
                        game.coins_won > 0 ? "text-emerald-400" : "text-destructive"
                      )}>
                        {game.coins_won > 0 ? "+" : ""}{game.coins_won}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground shrink-0">
                      {format(new Date(game.played_at), "MMM d")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
