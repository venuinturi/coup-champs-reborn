import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePlayerAuth } from "@/hooks/usePlayerAuth";
import { RummyGameState, Meld } from "@/lib/rummy/rummyTypes";
import { drawFromDeck, drawFromDiscard, discardCard, dropFromGame, declareGame } from "@/lib/rummy/rummyEngine";
import RummyTable from "@/components/rummy/RummyTable";
import { Button } from "@/components/ui/button";

const RummyGame = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { playerId } = usePlayerAuth();
  const [gameState, setGameState] = useState<RummyGameState | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);

  useEffect(() => {
    if (!roomCode) return;

    const fetchGame = async () => {
      const { data } = await supabase.from('game_rooms').select('*').eq('room_code', roomCode).single();
      if (data) {
        setRoomId(data.id);
        setGameState(data.game_state as unknown as RummyGameState);
      }
    };

    fetchGame();

    const channel = supabase
      .channel(`rummy_game_${roomCode}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_rooms', filter: `room_code=eq.${roomCode}` }, (payload) => {
        if (payload.new?.game_state) setGameState(payload.new.game_state as unknown as RummyGameState);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomCode]);

  const updateGameState = useCallback(async (newState: RummyGameState) => {
    if (!roomId) return;
    setGameState(newState);
    await supabase.from('game_rooms').update({ game_state: newState as any }).eq('id', roomId);
  }, [roomId]);

  if (!gameState || !playerId) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <Button variant="ghost" className="mb-4" onClick={() => navigate('/rummy')}>← Leave Game</Button>
      <RummyTable
        gameState={gameState}
        localPlayerId={playerId}
        onDrawDeck={() => updateGameState(drawFromDeck(gameState, playerId))}
        onDrawDiscard={() => updateGameState(drawFromDiscard(gameState, playerId))}
        onDiscard={(i) => updateGameState(discardCard(gameState, playerId, i))}
        onDrop={() => updateGameState(dropFromGame(gameState, playerId))}
        onDeclare={(melds: Meld[]) => updateGameState(declareGame(gameState, playerId, melds))}
      />
    </div>
  );
};

export default RummyGame;
