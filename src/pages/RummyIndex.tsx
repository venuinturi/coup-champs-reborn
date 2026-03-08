import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Layers, Users, Plus, LogIn } from "lucide-react";
import { useMultiplayer } from "@/hooks/useMultiplayer";
import { toast } from "@/hooks/use-toast";

const RummyIndex = () => {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("4");
  const [mode, setMode] = useState<"menu" | "create" | "join">("menu");
  
  const { createRoom, joinRoom, loading } = useMultiplayer();

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
    localStorage.setItem("rummySettings", JSON.stringify({ maxPlayers: parseInt(maxPlayers) }));

    const code = await createRoom(playerName);
    if (code) {
      navigate(`/rummy/room/${code}?name=${encodeURIComponent(playerName)}`);
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
    const success = await joinRoom(roomCode, playerName);
    if (success) {
      navigate(`/rummy/room/${roomCode.toUpperCase()}?name=${encodeURIComponent(playerName)}`);
    }
  };

  return (
    <div className="relative min-h-screen bg-background overflow-hidden flex flex-col items-center justify-center px-4 py-12">
      <div className="absolute inset-0 bg-casino-pattern" />
      <div className="absolute inset-0 bg-diamond-pattern" />
      <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-transparent" />

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
              <div className="absolute inset-0 rounded-2xl bg-purple-500/20 blur-2xl" />
              <div className="relative p-5 rounded-2xl bg-gradient-to-br from-purple-500/20 to-violet-600/10 border border-purple-500/20">
                <Layers className="w-10 h-10 text-purple-400" />
              </div>
            </div>
          </div>
          
          <h1 className="font-display text-5xl md:text-6xl tracking-wider">
            <span className="bg-gradient-to-b from-purple-300 via-purple-400 to-violet-600 bg-clip-text text-transparent">
              INDIAN RUMMY
            </span>
          </h1>
          
          <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed font-light">
            13-card rummy. Form melds to declare and win!
          </p>
        </div>

        {mode === "menu" && (
          <div className="flex flex-col gap-3 w-full animate-fade-in">
            <div
              className="group glass-card rounded-xl cursor-pointer transition-all duration-300 hover:border-purple-500/30 game-card-glow"
              style={{ '--glow-color': '270 60% 55%' } as React.CSSProperties}
              onClick={() => setMode("create")}
            >
              <div className="flex items-center gap-4 p-5">
                <div className="p-3 rounded-xl bg-gradient-to-br from-purple-400 to-violet-600 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Plus className="w-5 h-5 text-background" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Create Game</h3>
                  <p className="text-sm text-muted-foreground">Start a new rummy table</p>
                </div>
              </div>
            </div>

            <div
              className="group glass-card rounded-xl cursor-pointer transition-all duration-300 hover:border-purple-500/30 game-card-glow"
              style={{ '--glow-color': '270 60% 55%' } as React.CSSProperties}
              onClick={() => setMode("join")}
            >
              <div className="flex items-center gap-4 p-5">
                <div className="p-3 rounded-xl bg-gradient-to-br from-purple-400 to-violet-600 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <LogIn className="w-5 h-5 text-background" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Join Game</h3>
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
                <Users className="w-5 h-5 text-purple-400" />
                Create Rummy Game
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Your Name</Label>
                <Input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Enter your name" className="bg-muted/50 border-border/50" />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />Number of Players</Label>
                <Select value={maxPlayers} onValueChange={setMaxPlayers}>
                  <SelectTrigger className="bg-muted/50 border-border/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 Players</SelectItem>
                    <SelectItem value="3">3 Players</SelectItem>
                    <SelectItem value="4">4 Players</SelectItem>
                    <SelectItem value="5">5 Players</SelectItem>
                    <SelectItem value="6">6 Players</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setMode("menu")} className="flex-1 border-border/50">Back</Button>
                <Button onClick={handleCreateRoom} disabled={loading} className="flex-1 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-background font-semibold">
                  {loading ? "Creating..." : "Create Game"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {mode === "join" && (
          <div className="w-full glass-card rounded-2xl border border-border/50 animate-fade-in">
            <div className="p-6 border-b border-border/50">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <LogIn className="w-5 h-5 text-purple-400" />
                Join Rummy Game
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
                <Button onClick={handleJoinRoom} disabled={loading} className="flex-1 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-background font-semibold">
                  {loading ? "Joining..." : "Join Game"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Rules Preview */}
        <div className="mt-10 glass-card rounded-xl border border-border/30 p-5 w-full animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <h3 className="font-semibold text-foreground mb-3 text-sm neon-underline inline-block">Quick Rules</h3>
          <ul className="space-y-1.5 text-sm text-muted-foreground mt-4">
            <li className="flex items-start gap-2"><span className="text-purple-400 mt-0.5">◆</span> Each player gets 13 cards</li>
            <li className="flex items-start gap-2"><span className="text-purple-400 mt-0.5">◆</span> Form sets (same rank) and runs (consecutive same suit)</li>
            <li className="flex items-start gap-2"><span className="text-purple-400 mt-0.5">◆</span> Need at least 2 sequences, one must be pure</li>
            <li className="flex items-start gap-2"><span className="text-purple-400 mt-0.5">◆</span> Draw and discard until ready to declare</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RummyIndex;
