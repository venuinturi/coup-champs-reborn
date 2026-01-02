import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePlayerAuth } from "@/hooks/usePlayerAuth";
import { PokerGameState, PokerAction } from "@/lib/poker/pokerTypes";
import { processAction, nextHand } from "@/lib/poker/pokerEngine";
import PokerTable from "@/components/poker/PokerTable";
import { Button } from "@/components/ui/button";

const PokerGame = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { playerId } = usePlayerAuth();
  const [gameState, setGameState] = useState<PokerGameState | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);

  useEffect(() => {
    if (!roomCode) return;

    const fetchGame = async () => {
      const { data } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('room_code', roomCode)
        .single();

      if (data) {
        setRoomId(data.id);
        setGameState(data.game_state as unknown as PokerGameState);
      }
    };

    fetchGame();

    const channel = supabase
      .channel(`poker_game_${roomCode}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_rooms', filter: `room_code=eq.${roomCode}` }, (payload) => {
        if (payload.new?.game_state) {
          setGameState(payload.new.game_state as unknown as PokerGameState);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomCode]);

  const updateGameState = useCallback(async (newState: PokerGameState) => {
    if (!roomId) return;
    setGameState(newState);
    await supabase.from('game_rooms').update({ game_state: newState as any }).eq('id', roomId);
  }, [roomId]);

  const handleAction = useCallback((action: PokerAction, amount?: number) => {
    if (!gameState || !playerId) return;
    const newState = processAction(gameState, playerId, action, amount);
    updateGameState(newState);
  }, [gameState, playerId, updateGameState]);

  if (!gameState || !playerId) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <Button variant="ghost" className="mb-4" onClick={() => navigate('/poker')}>← Leave Game</Button>
      <PokerTable gameState={gameState} localPlayerId={playerId} onAction={handleAction} />
      {gameState.phase === 'finished' && (
        <div className="text-center mt-4">
          <Button onClick={() => updateGameState(nextHand(gameState))}>Next Hand</Button>
        </div>
      )}
    </div>
  );
};

export default PokerGame;
