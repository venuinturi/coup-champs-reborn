import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    localStorage.setItem("rummySettings", JSON.stringify({
      maxPlayers: parseInt(maxPlayers),
    }));

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
      <div className="text-center space-y-4 mb-8 animate-fade-in">
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg">
            <Layers className="w-12 h-12 text-white" />
          </div>
        </div>
        
        <h1 className="font-display text-5xl md:text-6xl bg-gradient-to-r from-purple-500 to-violet-600 bg-clip-text text-transparent tracking-wider">
          INDIAN RUMMY
        </h1>
        
        <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
          13-card rummy with sequences and sets. Form valid melds to declare and win!
        </p>
      </div>

      {/* Game Options */}
      {mode === "menu" && (
        <div className="flex flex-col gap-4 w-full max-w-sm animate-fade-in">
          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setMode("create")}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 rounded-full bg-primary/20">
                <Plus className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Create Game</h3>
                <p className="text-sm text-muted-foreground">Start a new rummy table</p>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setMode("join")}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 rounded-full bg-primary/20">
                <LogIn className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Join Game</h3>
                <p className="text-sm text-muted-foreground">Enter a room code</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Game Form */}
      {mode === "create" && (
        <Card className="w-full max-w-md animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Create Rummy Game
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxPlayers">Number of Players</Label>
              <Select value={maxPlayers} onValueChange={setMaxPlayers}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Players</SelectItem>
                  <SelectItem value="3">3 Players</SelectItem>
                  <SelectItem value="4">4 Players</SelectItem>
                  <SelectItem value="5">5 Players</SelectItem>
                  <SelectItem value="6">6 Players</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setMode("menu")} className="flex-1">
                Back
              </Button>
              <Button onClick={handleCreateRoom} disabled={loading} className="flex-1">
                {loading ? "Creating..." : "Create Game"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Join Game Form */}
      {mode === "join" && (
        <Card className="w-full max-w-md animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogIn className="w-5 h-5" />
              Join Rummy Game
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="joinName">Your Name</Label>
              <Input
                id="joinName"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="roomCode">Room Code</Label>
              <Input
                id="roomCode"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-character code"
                maxLength={6}
                className="text-center text-2xl tracking-widest"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setMode("menu")} className="flex-1">
                Back
              </Button>
              <Button onClick={handleJoinRoom} disabled={loading} className="flex-1">
                {loading ? "Joining..." : "Join Game"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rules Preview */}
      <div className="mt-8 max-w-lg text-center text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: "0.3s" }}>
        <h3 className="font-medium text-foreground mb-2">Quick Rules</h3>
        <ul className="space-y-1">
          <li>• Each player gets 13 cards</li>
          <li>• Form sets (same rank) and runs (consecutive same suit)</li>
          <li>• Need at least 2 sequences, one must be pure (no joker)</li>
          <li>• Draw and discard until ready to declare</li>
        </ul>
      </div>
    </div>
  );
};

export default RummyIndex;
