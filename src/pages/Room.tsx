import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CrownIcon } from '@/components/CrownIcon';
import { useMultiplayer, RoomPlayer } from '@/hooks/useMultiplayer';
import { createGame } from '@/lib/gameEngine';
import { toast } from '@/hooks/use-toast';
import { Copy, Crown, Users, Check, ArrowLeft, Play } from 'lucide-react';

const Room = () => {
  const navigate = useNavigate();
  const { roomCode } = useParams<{ roomCode: string }>();
  const [searchParams] = useSearchParams();
  const playerName = searchParams.get('name') || 'Player';
  
  const {
    room,
    players,
    playerId,
    loading,
    subscribeToRoom,
    toggleReady,
    startGame,
    leaveRoom,
  } = useMultiplayer();

  // Subscribe to room updates - only run once on mount
  useEffect(() => {
    if (!roomCode) return;
    
    console.log('Room component mounting, subscribing to:', roomCode);
    const unsubscribe = subscribeToRoom(roomCode);
    
    return () => {
      console.log('Room component unmounting, cleaning up');
      if (unsubscribe) unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]); // Only depend on roomCode, not subscribeToRoom

  // Navigate to game when it starts
  useEffect(() => {
    if (room?.status === 'playing' && room.game_state) {
      navigate(`/multiplayer?room=${roomCode}&name=${encodeURIComponent(playerName)}`);
    }
  }, [room?.status, room?.game_state, roomCode, playerName, navigate]);

  const handleCopyCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      toast({
        title: 'Copied!',
        description: 'Room code copied to clipboard',
      });
    }
  };

  const handleLeave = async () => {
    await leaveRoom();
    navigate('/');
  };

  const handleStartGame = async () => {
    if (players.length < 2) {
      toast({
        title: 'Not enough players',
        description: 'Need at least 2 players to start',
        variant: 'destructive',
      });
      return;
    }

    const allReady = players.every(p => p.is_ready);
    if (!allReady) {
      toast({
        title: 'Players not ready',
        description: 'All players must be ready to start',
        variant: 'destructive',
      });
      return;
    }

    // Create game with player names
    const playerNames = players.map(p => p.player_name);
    const gameState = createGame(playerNames);
    
    // Map player IDs correctly
    gameState.players = gameState.players.map((p, index) => ({
      ...p,
      id: players[index].player_id,
    }));

    const success = await startGame(gameState);
    if (success) {
      toast({
        title: 'Game Started!',
        description: 'The game is beginning...',
      });
    }
  };

  const isHost = room?.host_id === playerId;
  const currentPlayer = players.find(p => p.player_id === playerId);
  const isReady = currentPlayer?.is_ready ?? false;
  const allReady = players.every(p => p.is_ready);

  if (!room && !loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <h1 className="font-display text-2xl text-foreground mb-4">Room Not Found</h1>
        <p className="text-muted-foreground mb-6">This room doesn't exist or the game has ended.</p>
        <Button variant="gold" onClick={() => navigate('/')}>
          Back to Lobby
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <CrownIcon />
          <h1 className="font-display text-4xl text-gold-gradient">COUP</h1>
          <p className="text-muted-foreground">Waiting for players...</p>
        </div>

        {/* Room Code */}
        <div className="bg-card border border-border rounded-xl p-6 text-center">
          <p className="text-sm text-muted-foreground mb-2">Room Code</p>
          <div className="flex items-center justify-center gap-3">
            <span className="font-display text-4xl tracking-widest text-primary">
              {roomCode}
            </span>
            <Button variant="ghost" size="icon" onClick={handleCopyCode}>
              <Copy className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Share this code with friends to join
          </p>
        </div>

        {/* Players List */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="font-display text-lg text-foreground">
              Players ({players.length}/6)
            </h3>
          </div>

          <div className="space-y-3">
            {players.map((player) => (
              <PlayerRow
                key={player.id}
                player={player}
                isCurrentPlayer={player.player_id === playerId}
              />
            ))}

            {players.length < 6 && (
              <div className="flex items-center gap-3 py-2 px-3 rounded-lg border border-dashed border-border">
                <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
                  <Users className="w-5 h-5 text-muted-foreground" />
                </div>
                <span className="text-muted-foreground">Waiting for players...</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {isHost ? (
            <Button
              variant="gold"
              size="lg"
              className="w-full"
              onClick={handleStartGame}
              disabled={players.length < 2 || !allReady}
            >
              <Play className="w-5 h-5 mr-2" />
              {players.length < 2
                ? 'Need 2+ Players'
                : !allReady
                ? 'Waiting for Ready'
                : 'Start Game'}
            </Button>
          ) : (
            <Button
              variant={isReady ? 'outline' : 'gold'}
              size="lg"
              className="w-full"
              onClick={toggleReady}
            >
              {isReady ? (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Ready!
                </>
              ) : (
                'Ready Up'
              )}
            </Button>
          )}

          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={handleLeave}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Leave Room
          </Button>
        </div>
      </div>
    </div>
  );
};

// Player row component
const PlayerRow = ({
  player,
  isCurrentPlayer,
}: {
  player: RoomPlayer;
  isCurrentPlayer: boolean;
}) => {
  return (
    <div
      className={`flex items-center gap-3 py-2 px-3 rounded-lg ${
        isCurrentPlayer ? 'bg-primary/10 border border-primary/30' : 'bg-muted/30'
      }`}
    >
      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
        <span className="font-display text-primary">
          {player.player_name.charAt(0).toUpperCase()}
        </span>
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{player.player_name}</span>
          {player.is_host && (
            <Crown className="w-4 h-4 text-primary" />
          )}
          {isCurrentPlayer && (
            <span className="text-xs text-primary">(You)</span>
          )}
        </div>
      </div>

      <div
        className={`px-2 py-1 rounded text-xs font-medium ${
          player.is_ready
            ? 'bg-green-500/20 text-green-400'
            : 'bg-muted text-muted-foreground'
        }`}
      >
        {player.is_ready ? 'Ready' : 'Not Ready'}
      </div>
    </div>
  );
};

export default Room;
