import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Spade, Users, Plus, LogIn, Coins, Eye } from "lucide-react";
import { useMultiplayer } from "@/hooks/useMultiplayer";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AvatarPicker from "@/components/AvatarPicker";
import PlayerAvatar from "@/components/PlayerAvatar";

const PokerIndex = () => {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("6");
  const [startingChips, setStartingChips] = useState("1000");
  const [blinds, setBlinds] = useState("10/20");
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
    const code = await createRoom(playerName);
    if (code) {
      const settings = {
        config: {
          startingChips: parseInt(startingChips),
          blinds,
          maxPlayers: parseInt(maxPlayers),
        },
      };

      const { data: roomData } = await supabase
        .from('game_rooms')
        .select('id')
        .eq('room_code', code)
        .single();

      if (roomData) {
        await supabase
          .from('game_rooms')
          .update({ game_state: settings as any, max_players: parseInt(maxPlayers) })
          .eq('id', roomData.id);
      }

      navigate(`/poker/room/${code}?name=${encodeURIComponent(playerName)}`);
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
      navigate(`/poker/room/${roomCode.toUpperCase()}?name=${encodeURIComponent(playerName)}`);
    }
  };

  return (
    <div className="relative min-h-screen bg-background overflow-hidden flex flex-col items-center justify-center px-4 py-12">
      {/* Background */}
      <div className="absolute inset-0 bg-casino-pattern" />
      <div className="absolute inset-0 bg-diamond-pattern" />
      <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 via-transparent to-transparent" />

      {/* Back Button */}
      <Button
        variant="ghost"
        className="absolute top-4 left-4 gap-2 text-muted-foreground hover:text-foreground z-20"
        onClick={() => navigate("/")}
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>

      <div className="relative z-10 flex flex-col items-center w-full max-w-md">
        {/* Hero Section */}
        <div className="text-center space-y-4 mb-10 animate-fade-in">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-red-500/20 blur-2xl" />
              <div className="relative p-5 rounded-2xl bg-gradient-to-br from-red-500/20 to-rose-600/10 border border-red-500/20">
                <Spade className="w-10 h-10 text-red-400" />
              </div>
            </div>
          </div>
          
          <h1 className="font-display text-5xl md:text-6xl tracking-wider">
            <span className="bg-gradient-to-b from-red-300 via-red-400 to-rose-600 bg-clip-text text-transparent">
              TEXAS HOLD'EM
            </span>
          </h1>
          
          <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed font-light">
            Bet, bluff, and win big with friends.
          </p>
        </div>

        {/* Game Options */}
        {mode === "menu" && (
          <div className="flex flex-col gap-3 w-full animate-fade-in">
            <div
              className="group glass-card rounded-xl cursor-pointer transition-all duration-300 hover:border-red-500/30 game-card-glow"
              style={{ '--glow-color': '0 72% 51%' } as React.CSSProperties}
              onClick={() => setMode("create")}
            >
              <div className="flex items-center gap-4 p-5">
                <div className="p-3 rounded-xl bg-gradient-to-br from-red-400 to-rose-600 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Plus className="w-5 h-5 text-background" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Create Game</h3>
                  <p className="text-sm text-muted-foreground">Start a new poker table</p>
                </div>
              </div>
            </div>

            <div
              className="group glass-card rounded-xl cursor-pointer transition-all duration-300 hover:border-red-500/30 game-card-glow"
              style={{ '--glow-color': '0 72% 51%' } as React.CSSProperties}
              onClick={() => setMode("join")}
            >
              <div className="flex items-center gap-4 p-5">
                <div className="p-3 rounded-xl bg-gradient-to-br from-red-400 to-rose-600 shadow-lg group-hover:scale-110 transition-transform duration-300">
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

        {/* Create Game Form */}
        {mode === "create" && (
          <div className="w-full glass-card rounded-2xl border border-border/50 animate-fade-in">
            <div className="p-6 border-b border-border/50">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Users className="w-5 h-5 text-red-400" />
                Create Poker Game
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-muted-foreground text-sm">Your Name</Label>
                <Input
                  id="name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  className="bg-muted/50 border-border/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Players
                  </Label>
                  <Select value={maxPlayers} onValueChange={setMaxPlayers}>
                    <SelectTrigger className="bg-muted/50 border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="6">6</SelectItem>
                      <SelectItem value="8">8</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5" />
                    Chips
                  </Label>
                  <Select value={startingChips} onValueChange={setStartingChips}>
                    <SelectTrigger className="bg-muted/50 border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="500">$500</SelectItem>
                      <SelectItem value="1000">$1,000</SelectItem>
                      <SelectItem value="5000">$5,000</SelectItem>
                      <SelectItem value="10000">$10,000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  Blinds
                </Label>
                <Select value={blinds} onValueChange={setBlinds}>
                  <SelectTrigger className="bg-muted/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5/10">$5 / $10</SelectItem>
                    <SelectItem value="10/20">$10 / $20</SelectItem>
                    <SelectItem value="25/50">$25 / $50</SelectItem>
                    <SelectItem value="50/100">$50 / $100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setMode("menu")} className="flex-1 border-border/50">
                  Back
                </Button>
                <Button 
                  onClick={handleCreateRoom} 
                  disabled={loading} 
                  className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-background font-semibold"
                >
                  {loading ? "Creating..." : "Create Game"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Join Game Form */}
        {mode === "join" && (
          <div className="w-full glass-card rounded-2xl border border-border/50 animate-fade-in">
            <div className="p-6 border-b border-border/50">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <LogIn className="w-5 h-5 text-red-400" />
                Join Poker Game
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="joinName" className="text-muted-foreground text-sm">Your Name</Label>
                <Input
                  id="joinName"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  className="bg-muted/50 border-border/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="roomCode" className="text-muted-foreground text-sm">Room Code</Label>
                <Input
                  id="roomCode"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="XXXXXX"
                  maxLength={6}
                  className="text-center text-2xl tracking-[0.3em] font-mono bg-muted/50 border-border/50 h-14"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setMode("menu")} className="flex-1 border-border/50">
                  Back
                </Button>
                <Button 
                  onClick={handleJoinRoom} 
                  disabled={loading} 
                  className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-background font-semibold"
                >
                  {loading ? "Joining..." : "Join Game"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PokerIndex;
