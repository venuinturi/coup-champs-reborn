import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

export const LobbyCard = () => {
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name to create a room.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Room Created!",
      description: `Welcome, ${playerName}! Your room is ready.`,
    });
  };

  const handleJoinRoom = () => {
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
    toast({
      title: "Joining Room...",
      description: `Looking for room ${roomCode.toUpperCase()}...`,
    });
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

          {/* Create Room Button */}
          <Button
            variant="gold"
            size="lg"
            className="w-full"
            onClick={handleCreateRoom}
          >
            Create Room
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
            <Button variant="gold-outline" onClick={handleJoinRoom}>
              Join
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
