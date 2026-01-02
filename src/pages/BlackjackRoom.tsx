import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, Check, Crown, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePlayerAuth } from "@/hooks/usePlayerAuth";
import { toast } from "@/hooks/use-toast";
import { BlackjackGameState } from "@/lib/blackjack/blackjackTypes";
import { createBlackjackGame } from "@/lib/blackjack/blackjackEngine";
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
  game_state: BlackjackGameState | null;
}

const BlackjackRoom = () => {
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
  const allReady = players.length >= 1 && players.every(p => p.is_ready);

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
          game_state: roomData.game_state as unknown as BlackjackGameState | null,
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

    const roomChannel = supabase
      .channel(`blackjack_room_${roomCode}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_rooms', filter: `room_code=eq.${roomCode}` }, (payload) => {
        if (payload.new) {
          const newRoom = payload.new as any;
          setRoom({
            ...newRoom,
            game_state: newRoom.game_state as BlackjackGameState | null,
          });
          
          if (newRoom.status === 'playing') {
            navigate(`/blackjack/game/${roomCode}?name=${encodeURIComponent(playerName)}`);
          }
        }
      })
      .subscribe();

    const playersChannel = supabase
      .channel(`blackjack_players_${roomCode}`)
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

  useEffect(() => {
    if (room?.status === 'playing') {
      navigate(`/blackjack/game/${roomCode}?name=${encodeURIComponent(playerName)}`);
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
      const settings = JSON.parse(localStorage.getItem("blackjackSettings") || "{}");
      const startingChips = settings.startingChips || 1000;
      const minBet = settings.minBet || 10;

      const playerData = players.map(p => ({ id: p.player_id, name: p.player_name }));
      const gameState = createBlackjackGame(playerData, startingChips, minBet, minBet * 50);

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

    navigate('/blackjack');
  };

  if (!room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Room not found</h2>
          <Button onClick={() => navigate('/blackjack')}>Back to Blackjack</Button>
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
        <h1 className="font-display text-4xl bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent mb-4">
          Blackjack Room
        </h1>
        
        <div 
          className="flex items-center justify-center gap-2 bg-card rounded-lg px-6 py-3 cursor-pointer hover:bg-muted transition-colors"
          onClick={handleCopyCode}
        >
          <span className="text-3xl font-mono tracking-widest">{roomCode}</span>
          {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-muted-foreground" />}
        </div>
        <p className="text-sm text-muted-foreground mt-2">Share this code with friends</p>
      </div>

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

      <div className="flex gap-4">
        {isHost ? (
          <Button
            size="lg"
            onClick={handleStartGame}
            disabled={!allReady || loading}
            className="bg-gradient-to-r from-emerald-500 to-green-600"
          >
            {loading ? "Starting..." : !allReady ? "Waiting for Ready..." : "Start Game"}
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

export default BlackjackRoom;
