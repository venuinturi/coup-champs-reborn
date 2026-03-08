import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { GameChat } from "@/components/game/GameChat";
import { supabase } from "@/integrations/supabase/client";
import { usePlayerAuth } from "@/hooks/usePlayerAuth";
import { useGameHistory } from "@/hooks/useGameHistory";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import { BlackjackGameState, BlackjackAction } from "@/lib/blackjack/blackjackTypes";
import { placeBet, startDealing, playerAction, startNewRound } from "@/lib/blackjack/blackjackEngine";
import BlackjackTable from "@/components/blackjack/BlackjackTable";
import { Button } from "@/components/ui/button";

const BlackjackGame = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const playerName = searchParams.get("name") || "Player";
  const isSpectator = searchParams.get("spectator") === "true";
  const { playerId } = usePlayerAuth();
  const [gameState, setGameState] = useState<BlackjackGameState | null>(null);
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

  // Record game result when round ends
  useEffect(() => {
    if (gameState?.phase === 'results' && playerId && !recordedRef.current) {
      recordedRef.current = true;
      const player = gameState.players.find(p => p.id === playerId);
      if (player?.result) {
        const isWin = player.result === 'win' || player.result === 'blackjack';
        const isDraw = player.result === 'push';
        recordGame(playerId, playerName, 'blackjack', isWin ? 'win' : isDraw ? 'draw' : 'loss', roomCode, isWin ? player.currentBet * 2 : 0);
      }
    }
  }, [gameState?.phase, playerId]);

  useEffect(() => {
    if (gameState?.phase === 'betting') recordedRef.current = false;
  }, [gameState?.phase]);

  if (!gameState || !playerId) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  return (
    <>
      <div className="min-h-screen bg-background p-4">
        <Button variant="ghost" className="mb-4" onClick={() => navigate('/blackjack')}>← Leave Game</Button>
        {isSpectator && (
          <div className="mb-4 flex items-center justify-center gap-2 text-muted-foreground bg-muted/30 rounded-lg py-2 px-4 mx-auto w-fit">
            <span>👁️ Spectator Mode</span>
          </div>
        )}
        <BlackjackTable
          gameState={gameState}
          localPlayerId={playerId}
          onAction={isSpectator ? () => {} : handleAction}
          onPlaceBet={isSpectator ? () => {} : handlePlaceBet}
          onStartRound={isSpectator ? () => {} : () => updateGameState(startDealing(gameState))}
          onNewRound={isSpectator ? () => {} : () => updateGameState(startNewRound(gameState))}
          isSpectator={isSpectator}
          tableFelt={profile?.table_felt}
        />
      </div>
      {roomId && <GameChat roomId={roomId} playerId={playerId} playerName={playerName} />}
    </>
  );
};

export default BlackjackGame;
