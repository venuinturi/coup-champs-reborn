import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePlayerAuth } from "@/hooks/usePlayerAuth";
import { BlackjackGameState, BlackjackAction } from "@/lib/blackjack/blackjackTypes";
import { placeBet, startDealing, playerAction, startNewRound } from "@/lib/blackjack/blackjackEngine";
import BlackjackTable from "@/components/blackjack/BlackjackTable";
import { Button } from "@/components/ui/button";

const BlackjackGame = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { playerId } = usePlayerAuth();
  const [gameState, setGameState] = useState<BlackjackGameState | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);

  useEffect(() => {
    if (!roomCode) return;

    const fetchGame = async () => {
      const { data } = await supabase.from('game_rooms').select('*').eq('room_code', roomCode).single();
      if (data) {
        setRoomId(data.id);
        setGameState(data.game_state as unknown as BlackjackGameState);
      }
    };

    fetchGame();

    const channel = supabase
      .channel(`blackjack_game_${roomCode}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_rooms', filter: `room_code=eq.${roomCode}` }, (payload) => {
        if (payload.new?.game_state) setGameState(payload.new.game_state as unknown as BlackjackGameState);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomCode]);

  const updateGameState = useCallback(async (newState: BlackjackGameState) => {
    if (!roomId) return;
    setGameState(newState);
    await supabase.from('game_rooms').update({ game_state: newState as any }).eq('id', roomId);
  }, [roomId]);

  const handleAction = (action: BlackjackAction) => {
    if (!gameState || !playerId) return;
    updateGameState(playerAction(gameState, playerId, action));
  };

  const handlePlaceBet = (amount: number) => {
    if (!gameState || !playerId) return;
    updateGameState(placeBet(gameState, playerId, amount));
  };

  if (!gameState || !playerId) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <Button variant="ghost" className="mb-4" onClick={() => navigate('/blackjack')}>← Leave Game</Button>
      <BlackjackTable
        gameState={gameState}
        localPlayerId={playerId}
        onAction={handleAction}
        onPlaceBet={handlePlaceBet}
        onStartRound={() => updateGameState(startDealing(gameState))}
        onNewRound={() => updateGameState(startNewRound(gameState))}
      />
    </div>
  );
};

export default BlackjackGame;
