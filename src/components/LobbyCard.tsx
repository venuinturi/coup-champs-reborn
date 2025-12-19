import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useMultiplayer } from "@/hooks/useMultiplayer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export const LobbyCard = () => {
  const navigate = useNavigate();
  const { createRoom, joinRoom, loading } = useMultiplayer();
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [numBots, setNumBots] = useState("3");
  const [mode, setMode] = useState<"menu" | "local" | "online">("menu");

  const handleStartLocalGame = () => {
    if (!playerName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name to play.",
        variant: "destructive",
      });
      return;
    }
    navigate(`/game?name=${encodeURIComponent(playerName)}&bots=${numBots}`);
  };

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name to create a room.",
        variant: "destructive",
      });
      return;
    }
    
    const code = await createRoom(playerName);
    if (code) {
      navigate(`/room/${code}?name=${encodeURIComponent(playerName)}`);
    }
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name to join a room.",
        variant: "destructive",
      });
      return;
    }
    if (!roomCode.trim()) {
      toast({
        title: "Room Code Required",
        description: "Please enter a room code to join.",
        variant: "destructive",
      });
      return;
    }
    
    const success = await joinRoom(roomCode, playerName);
    if (success) {
      navigate(`/room/${roomCode.toUpperCase()}?name=${encodeURIComponent(playerName)}`);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-card border border-border rounded-xl p-8 shadow-2xl">
        <h2 className="font-display text-xl text-center text-foreground mb-6">
          Enter the Court
        </h2>

        <div className="space-y-4">
          {/* Player Name */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Your Name</label>
            <Input
              placeholder="Lord Varys"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
          </div>

          {mode === "menu" && (
            <>
              {/* Mode Selection */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="gold"
                  size="lg"
                  onClick={() => setMode("online")}
                  disabled={loading}
                >
                  Play Online
                </Button>
                <Button
                  variant="gold-outline"
                  size="lg"
                  onClick={() => setMode("local")}
                >
                  Play vs Bots
                </Button>
              </div>
            </>
          )}

          {mode === "local" && (
            <>
              {/* Number of Bots */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Opponents</label>
                <Select value={numBots} onValueChange={setNumBots}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select opponents" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Bot</SelectItem>
                    <SelectItem value="2">2 Bots</SelectItem>
                    <SelectItem value="3">3 Bots</SelectItem>
                    <SelectItem value="4">4 Bots</SelectItem>
                    <SelectItem value="5">5 Bots</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="gold"
                size="lg"
                className="w-full"
                onClick={handleStartLocalGame}
              >
                Start Game
              </Button>

              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => setMode("menu")}
              >
                ← Back
              </Button>
            </>
          )}

          {mode === "online" && (
            <>
              {/* Create Room */}
              <Button
                variant="gold"
                size="lg"
                className="w-full"
                onClick={handleCreateRoom}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Room'
                )}
              </Button>

              {/* Divider */}
              <div className="flex items-center gap-4 py-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  or
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Join Room */}
              <div className="flex gap-3">
                <Input
                  placeholder="ROOM CODE"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="uppercase tracking-widest"
                />
                <Button 
                  variant="gold-outline" 
                  onClick={handleJoinRoom}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Join'}
                </Button>
              </div>

              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => setMode("menu")}
              >
                ← Back
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
