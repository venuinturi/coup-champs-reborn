import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { GameChat } from "@/components/game/GameChat";
import { supabase } from "@/integrations/supabase/client";
import { usePlayerAuth } from "@/hooks/usePlayerAuth";
import { useGameHistory } from "@/hooks/useGameHistory";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import { PokerGameState, PokerAction } from "@/lib/poker/pokerTypes";
import { processAction, nextHand } from "@/lib/poker/pokerEngine";
import PokerTable from "@/components/poker/PokerTable";
import { Button } from "@/components/ui/button";

const PokerGame = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const playerName = searchParams.get("name") || "Player";
  const isSpectator = searchParams.get("spectator") === "true";
  const { playerId } = usePlayerAuth();
  const [gameState, setGameState] = useState<PokerGameState | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const { recordGame } = useGameHistory();
  const { profile } = usePlayerProfile(playerId);
  const recordedRef = useRef(false);

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

  // Record game result when a hand finishes
  useEffect(() => {
    if (gameState?.phase === 'finished' && gameState.winner && playerId && !recordedRef.current) {
      recordedRef.current = true;
      const isWinner = gameState.winner === playerId;
      const player = gameState.players.find(p => p.id === playerId);
      recordGame(playerId, playerName, 'poker', isWinner ? 'win' : 'loss', roomCode, isWinner ? (gameState.pot || 0) : 0);
    }
  }, [gameState?.phase, gameState?.winner, playerId]);

  // Reset recorded flag when new hand starts
  useEffect(() => {
    if (gameState?.phase === 'betting') {
      recordedRef.current = false;
    }
  }, [gameState?.phase]);

  if (!gameState || !playerId) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  return (
    <>
      <div className="min-h-screen bg-background p-4">
        <Button variant="ghost" className="mb-4" onClick={() => navigate('/poker')}>← Leave Game</Button>
        {isSpectator && (
          <div className="mb-4 flex items-center justify-center gap-2 text-muted-foreground bg-muted/30 rounded-lg py-2 px-4 mx-auto w-fit">
            <span>👁️ Spectator Mode</span>
          </div>
        )}
        <PokerTable 
          gameState={gameState} 
          localPlayerId={playerId} 
          onAction={isSpectator ? () => {} : handleAction} 
          isSpectator={isSpectator}
          tableFelt={profile?.table_felt}
          cardBack={(profile as any)?.card_back}
          chipStyle={(profile as any)?.chip_style}
        />
        {gameState.phase === 'finished' && !isSpectator && (
          <div className="text-center mt-4">
            <Button onClick={() => updateGameState(nextHand(gameState))}>Next Hand</Button>
          </div>
        )}
      </div>
      {roomId && <GameChat roomId={roomId} playerId={playerId} playerName={playerName} />}
    </>
  );
};

export default PokerGame;
