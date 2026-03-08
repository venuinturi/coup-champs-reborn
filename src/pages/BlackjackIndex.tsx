import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Circle, Users, Plus, LogIn, Coins } from "lucide-react";
import { useMultiplayer } from "@/hooks/useMultiplayer";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import { toast } from "@/hooks/use-toast";
import AvatarPicker from "@/components/AvatarPicker";
import PlayerAvatar from "@/components/PlayerAvatar";

const BlackjackIndex = () => {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("4");
  const [startingChips, setStartingChips] = useState("1000");
  const [minBet, setMinBet] = useState("10");
  const [mode, setMode] = useState<"menu" | "create" | "join">("menu");
  
  const { createRoom, joinRoom, loading, playerId } = useMultiplayer();
  const { profile, ensureProfile, updateAvatar, uploadAvatar } = usePlayerProfile(playerId);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem("playerName");
    if (savedName) setPlayerName(savedName);
  }, []);

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      toast({ title: "Error", description: "Please enter your name", variant: "destructive" });
      return;
    }

    localStorage.setItem("playerName", playerName);
    await ensureProfile(playerName);
    localStorage.setItem("blackjackSettings", JSON.stringify({
      maxPlayers: parseInt(maxPlayers),
      startingChips: parseInt(startingChips),
      minBet: parseInt(minBet),
    }));

    const code = await createRoom(playerName);
    if (code) {
      navigate(`/blackjack/room/${code}?name=${encodeURIComponent(playerName)}`);
    }
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      toast({ title: "Error", description: "Please enter your name", variant: "destructive" });
      return;
    }
    if (!roomCode.trim()) {
      toast({ title: "Error", description: "Please enter a room code", variant: "destructive" });
      return;
    }

    localStorage.setItem("playerName", playerName);
    await ensureProfile(playerName);
    const success = await joinRoom(roomCode, playerName);
    if (success) {
      navigate(`/blackjack/room/${roomCode.toUpperCase()}?name=${encodeURIComponent(playerName)}`);
    }
  };

  return (
    <div className="relative min-h-screen bg-background overflow-hidden flex flex-col items-center justify-center px-4 py-12">
      <div className="absolute inset-0 bg-casino-pattern" />
      <div className="absolute inset-0 bg-diamond-pattern" />
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent" />

      <Button
        variant="ghost"
        className="absolute top-4 left-4 gap-2 text-muted-foreground hover:text-foreground z-20"
        onClick={() => navigate("/")}
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>

      <div className="relative z-10 flex flex-col items-center w-full max-w-md">
        <div className="text-center space-y-4 mb-10 animate-fade-in">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-emerald-500/20 blur-2xl" />
              <div className="relative p-5 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-600/10 border border-emerald-500/20">
                <Circle className="w-10 h-10 text-emerald-400" />
              </div>
            </div>
          </div>
          
          <h1 className="font-display text-5xl md:text-6xl tracking-wider">
            <span className="bg-gradient-to-b from-emerald-300 via-emerald-400 to-green-600 bg-clip-text text-transparent">
              BLACKJACK
            </span>
          </h1>
          
          <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed font-light">
            Beat the dealer to 21. Classic casino experience.
          </p>
        </div>

        {mode === "menu" && (
          <div className="flex flex-col gap-3 w-full animate-fade-in">
            <div
              className="group glass-card rounded-xl cursor-pointer transition-all duration-300 hover:border-emerald-500/30 game-card-glow"
              style={{ '--glow-color': '152 60% 42%' } as React.CSSProperties}
              onClick={() => setMode("create")}
            >
              <div className="flex items-center gap-4 p-5">
                <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Plus className="w-5 h-5 text-background" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Create Table</h3>
                  <p className="text-sm text-muted-foreground">Start a new blackjack table</p>
                </div>
              </div>
            </div>

            <div
              className="group glass-card rounded-xl cursor-pointer transition-all duration-300 hover:border-emerald-500/30 game-card-glow"
              style={{ '--glow-color': '152 60% 42%' } as React.CSSProperties}
              onClick={() => setMode("join")}
            >
              <div className="flex items-center gap-4 p-5">
                <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <LogIn className="w-5 h-5 text-background" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Join Table</h3>
                  <p className="text-sm text-muted-foreground">Enter a room code</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {mode === "create" && (
          <div className="w-full glass-card rounded-2xl border border-border/50 animate-fade-in">
            <div className="p-6 border-b border-border/50">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                Create Blackjack Table
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <PlayerAvatar preset={profile?.avatar_preset || 'default'} customUrl={profile?.avatar_url} size="lg" />
                <div className="flex-1 space-y-2">
                  <Label className="text-muted-foreground text-sm">Your Name</Label>
                  <Input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Enter your name" className="bg-muted/50 border-border/50" />
                </div>
              </div>
              <AvatarPicker
                currentPreset={profile?.avatar_preset || 'default'}
                currentUrl={profile?.avatar_url}
                onSelectPreset={(preset) => updateAvatar(preset)}
                onUpload={async (file) => { setUploading(true); await uploadAvatar(file); setUploading(false); }}
                uploading={uploading}
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />Players</Label>
                  <Select value={maxPlayers} onValueChange={setMaxPlayers}>
                    <SelectTrigger className="bg-muted/50 border-border/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="6">6</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm flex items-center gap-1.5"><Coins className="w-3.5 h-3.5" />Chips</Label>
                  <Select value={startingChips} onValueChange={setStartingChips}>
                    <SelectTrigger className="bg-muted/50 border-border/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="500">$500</SelectItem>
                      <SelectItem value="1000">$1,000</SelectItem>
                      <SelectItem value="5000">$5,000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Minimum Bet</Label>
                <Select value={minBet} onValueChange={setMinBet}>
                  <SelectTrigger className="bg-muted/50 border-border/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">$5</SelectItem>
                    <SelectItem value="10">$10</SelectItem>
                    <SelectItem value="25">$25</SelectItem>
                    <SelectItem value="50">$50</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setMode("menu")} className="flex-1 border-border/50">Back</Button>
                <Button onClick={handleCreateRoom} disabled={loading} className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-background font-semibold">
                  {loading ? "Creating..." : "Create Table"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {mode === "join" && (
          <div className="w-full glass-card rounded-2xl border border-border/50 animate-fade-in">
            <div className="p-6 border-b border-border/50">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <LogIn className="w-5 h-5 text-emerald-400" />
                Join Blackjack Table
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Your Name</Label>
                <Input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Enter your name" className="bg-muted/50 border-border/50" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Room Code</Label>
                <Input value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} placeholder="XXXXXX" maxLength={6} className="text-center text-2xl tracking-[0.3em] font-mono bg-muted/50 border-border/50 h-14" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setMode("menu")} className="flex-1 border-border/50">Back</Button>
                <Button onClick={handleJoinRoom} disabled={loading} className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-background font-semibold">
                  {loading ? "Joining..." : "Join Table"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlackjackIndex;
