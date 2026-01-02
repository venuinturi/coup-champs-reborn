import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, Check, Crown, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePlayerAuth } from "@/hooks/usePlayerAuth";
import { toast } from "@/hooks/use-toast";
import { PokerGameState } from "@/lib/poker/pokerTypes";
import { createPokerGame, startHand } from "@/lib/poker/pokerEngine";
import { cn } from "@/lib/utils";

interface RoomPlayer {
  id: string;
  player_id: string;
  player_name: string;
  is_host: boolean;
  is_ready: boolean;
}

interface GameRoom {
  id: string;
  room_code: string;
  host_id: string;
  status: string;
  game_state: PokerGameState | null;
}

const PokerRoom = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const playerName = searchParams.get("name") || "Player";
  
  const { playerId } = usePlayerAuth();
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const isHost = room?.host_id === playerId;
  const currentPlayer = players.find(p => p.player_id === playerId);
  const allReady = players.length >= 2 && players.every(p => p.is_ready);

  // Fetch room and subscribe to updates
  useEffect(() => {
    if (!roomCode) return;

    const fetchRoom = async () => {
      const { data: roomData } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('room_code', roomCode)
        .single();

      if (roomData) {
        setRoom({
          ...roomData,
          game_state: roomData.game_state as unknown as PokerGameState | null,
        });

        const { data: playersData } = await supabase
          .from('room_players')
          .select('*')
          .eq('room_id', roomData.id);

        if (playersData) {
          setPlayers(playersData);
        }
      }
    };

    fetchRoom();

    // Subscribe to room changes
    const roomChannel = supabase
      .channel(`poker_room_${roomCode}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_rooms', filter: `room_code=eq.${roomCode}` }, (payload) => {
        if (payload.new) {
          const newRoom = payload.new as any;
          setRoom({
            ...newRoom,
            game_state: newRoom.game_state as PokerGameState | null,
          });
          
          // Navigate to game if status changed to playing
          if (newRoom.status === 'playing') {
            navigate(`/poker/game/${roomCode}?name=${encodeURIComponent(playerName)}`);
          }
        }
      })
      .subscribe();

    // Subscribe to player changes
    const playersChannel = supabase
      .channel(`poker_players_${roomCode}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players' }, async () => {
        if (room?.id) {
          const { data: playersData } = await supabase
            .from('room_players')
            .select('*')
            .eq('room_id', room.id);
          if (playersData) setPlayers(playersData);
        } else {
          fetchRoom();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
      supabase.removeChannel(playersChannel);
    };
  }, [roomCode, room?.id, navigate, playerName]);

  // Navigate to game when status changes
  useEffect(() => {
    if (room?.status === 'playing') {
      navigate(`/poker/game/${roomCode}?name=${encodeURIComponent(playerName)}`);
    }
  }, [room?.status, roomCode, navigate, playerName]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleReady = async () => {
    if (!room || !currentPlayer) return;

    await supabase
      .from('room_players')
      .update({ is_ready: !currentPlayer.is_ready })
      .eq('id', currentPlayer.id);
  };

  const handleStartGame = async () => {
    if (!room || !isHost || !allReady) return;
    setLoading(true);

    try {
      // Get settings from localStorage
      const settings = JSON.parse(localStorage.getItem("pokerSettings") || "{}");
      const startingChips = settings.startingChips || 1000;
      const blindsStr = settings.blinds || "10/20";
      const [smallBlind, bigBlind] = blindsStr.split("/").map(Number);

      // Create game state
      const playerData = players.map(p => ({ id: p.player_id, name: p.player_name }));
      let gameState = createPokerGame(playerData, startingChips, smallBlind, bigBlind);
      gameState = startHand(gameState);

      // Update room
      await supabase
        .from('game_rooms')
        .update({
          status: 'playing',
          game_state: gameState as any,
        })
        .eq('id', room.id);

    } catch (error) {
      toast({ title: "Error", description: "Failed to start game", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!room || !currentPlayer) return;

    await supabase
      .from('room_players')
      .delete()
      .eq('id', currentPlayer.id);

    navigate('/poker');
  };

  if (!room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Room not found</h2>
          <Button onClick={() => navigate('/poker')}>Back to Poker</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-8">
      <Button
        variant="ghost"
        className="absolute top-4 left-4 gap-2"
        onClick={handleLeave}
      >
        <ArrowLeft className="w-4 h-4" />
        Leave Room
      </Button>

      <div className="text-center mb-8">
        <h1 className="font-display text-4xl bg-gradient-to-r from-red-500 to-rose-600 bg-clip-text text-transparent mb-4">
          Poker Room
        </h1>
        
        {/* Room Code */}
        <div 
          className="flex items-center justify-center gap-2 bg-card rounded-lg px-6 py-3 cursor-pointer hover:bg-muted transition-colors"
          onClick={handleCopyCode}
        >
          <span className="text-3xl font-mono tracking-widest">{roomCode}</span>
          {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-muted-foreground" />}
        </div>
        <p className="text-sm text-muted-foreground mt-2">Share this code with friends</p>
      </div>

      {/* Players List */}
      <div className="w-full max-w-md space-y-3 mb-8">
        <div className="flex items-center gap-2 text-muted-foreground mb-4">
          <Users className="w-4 h-4" />
          <span>Players ({players.length})</span>
        </div>

        {players.map((player) => (
          <div
            key={player.id}
            className={cn(
              "flex items-center justify-between p-4 rounded-lg bg-card border-2 transition-colors",
              player.is_ready ? "border-green-500/50" : "border-border"
            )}
          >
            <div className="flex items-center gap-3">
              {player.is_host && <Crown className="w-5 h-5 text-primary" />}
              <span className="font-medium">{player.player_name}</span>
              {player.player_id === playerId && (
                <span className="text-xs text-muted-foreground">(You)</span>
              )}
            </div>
            <span className={cn(
              "text-sm font-medium",
              player.is_ready ? "text-green-500" : "text-muted-foreground"
            )}>
              {player.is_ready ? "Ready" : "Not Ready"}
            </span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        {isHost ? (
          <Button
            size="lg"
            onClick={handleStartGame}
            disabled={!allReady || loading}
            className="bg-gradient-to-r from-red-500 to-rose-600"
          >
            {loading ? "Starting..." : players.length < 2 ? "Need 2+ Players" : !allReady ? "Waiting for Ready..." : "Start Game"}
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={handleToggleReady}
            variant={currentPlayer?.is_ready ? "outline" : "default"}
          >
            {currentPlayer?.is_ready ? "Cancel Ready" : "Ready Up"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default PokerRoom;
