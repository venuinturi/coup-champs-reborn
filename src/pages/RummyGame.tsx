import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { GameChat } from "@/components/game/GameChat";
import { supabase } from "@/integrations/supabase/client";
import { usePlayerAuth } from "@/hooks/usePlayerAuth";
import { useGameHistory } from "@/hooks/useGameHistory";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import { RummyGameState, Meld } from "@/lib/rummy/rummyTypes";
import { drawFromDeck, drawFromDiscard, discardCard, dropFromGame, declareGame } from "@/lib/rummy/rummyEngine";
import RummyTable from "@/components/rummy/RummyTable";
import { Button } from "@/components/ui/button";

const RummyGame = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const playerName = searchParams.get("name") || "Player";
  const isSpectator = searchParams.get("spectator") === "true";
  const { playerId } = usePlayerAuth();
  const [gameState, setGameState] = useState<RummyGameState | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const { recordGame } = useGameHistory();
  const { profile } = usePlayerProfile(playerId);
  const recordedRef = useRef(false);

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

  // Record game result
  useEffect(() => {
    if (gameState?.phase === 'finished' && gameState.winner && playerId && !recordedRef.current) {
      recordedRef.current = true;
      const isWinner = gameState.winner === playerId;
      recordGame(playerId, playerName, 'rummy', isWinner ? 'win' : 'loss', roomCode);
    }
  }, [gameState?.phase, gameState?.winner, playerId]);

  if (!gameState || !playerId) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  return (
    <>
      <div className="min-h-screen bg-background p-4">
        <Button variant="ghost" className="mb-4" onClick={() => navigate('/rummy')}>← Leave Game</Button>
        {isSpectator && (
          <div className="mb-4 flex items-center justify-center gap-2 text-muted-foreground bg-muted/30 rounded-lg py-2 px-4 mx-auto w-fit">
            <span>👁️ Spectator Mode</span>
          </div>
        )}
        <RummyTable
          gameState={gameState}
          localPlayerId={playerId}
          onDrawDeck={isSpectator ? () => {} : () => updateGameState(drawFromDeck(gameState, playerId))}
          onDrawDiscard={isSpectator ? () => {} : () => updateGameState(drawFromDiscard(gameState, playerId))}
          onDiscard={isSpectator ? () => {} : (i) => updateGameState(discardCard(gameState, playerId, i))}
          onDrop={isSpectator ? () => {} : () => updateGameState(dropFromGame(gameState, playerId))}
          onDeclare={isSpectator ? () => {} : (melds: Meld[]) => updateGameState(declareGame(gameState, playerId, melds))}
          isSpectator={isSpectator}
          tableFelt={profile?.table_felt}
          cardBack={(profile as any)?.card_back}
        />
      </div>
      {roomId && <GameChat roomId={roomId} playerId={playerId} playerName={playerName} />}
    </>
  );
};

export default RummyGame;
