import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Wifi,
  WifiOff,
  Copy,
  Share2,
  Users,
  Eye,
  Shield,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { usePokerRoom } from "@/hooks/usePokerRoom";
import { createDefaultSession } from "@/lib/poker/pokerLedger";
import type { PokerLedgerSession } from "@/lib/poker/pokerLedger";
import PokerLedger from "@/pages/PokerLedger";

const PokerLedgerRoom = () => {
  const navigate = useNavigate();
  const { roomCode } = useParams<{ roomCode: string }>();
  const {
    room,
    isCreator,
    isLoading,
    error,
    isConnected,
    joinRoom,
    updateRoomSession,
    leaveRoom,
  } = usePokerRoom();

  const [hasJoined, setHasJoined] = useState(false);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-join room on mount
  useEffect(() => {
    if (roomCode && !hasJoined && !room) {
      joinRoom(roomCode).then((ok) => {
        setHasJoined(true);
        if (!ok) {
          toast({
            title: "Room not found",
            description: `No room with code "${roomCode}" exists.`,
            variant: "destructive",
          });
        }
      });
    }
  }, [roomCode, hasJoined, room, joinRoom]);

  const isCreatorRef = useRef(isCreator);
  isCreatorRef.current = isCreator;
  const roomRef = useRef(room);
  roomRef.current = room;
  const updateRoomSessionRef = useRef(updateRoomSession);
  updateRoomSessionRef.current = updateRoomSession;

  // Debounced sync: creator pushes session changes to Supabase
  const handleSessionChange = useCallback(
    (session: PokerLedgerSession) => {
      if (!isCreatorRef.current || !roomRef.current) return;

      // 200ms debounce: swift live synchronization while avoiding keystroke spam
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      syncTimeoutRef.current = setTimeout(() => {
        updateRoomSessionRef.current(session);
      }, 200);
    },
    []
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, []);

  const handleCopyCode = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.room_code);
    toast({ title: "Copied!", description: `Room code ${room.room_code} copied to clipboard.` });
  };

  const handleShareLink = () => {
    if (!room) return;
    const url = `${window.location.origin}/poker/ledger/room/${room.room_code}`;
    if (navigator.share) {
      navigator.share({
        title: `Join ${room.room_name}`,
        text: `Watch the live poker ledger: ${room.room_name}`,
        url,
      }).catch(() => {
        navigator.clipboard.writeText(url);
        toast({ title: "Link copied!", description: "Share link copied to clipboard." });
      });
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: "Link copied!", description: "Share link copied to clipboard." });
    }
  };

  const handleLeave = () => {
    leaveRoom();
    navigate("/poker/ledger");
  };

  // Loading state
  if (isLoading && !room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-red-500 mx-auto" />
          <p className="text-sm text-muted-foreground">Joining room...</p>
        </div>
      </div>
    );
  }

  // Error state / Room not found
  if (hasJoined && !room && !isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="p-4 rounded-2xl bg-red-500/10 text-red-500 mx-auto w-fit">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Room Not Found</h2>
          <p className="text-sm text-muted-foreground">
            No room with code <span className="font-mono font-bold">{roomCode}</span> exists.
            It may have been deleted or the code is incorrect.
          </p>
          <Button onClick={() => navigate("/poker/ledger")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Lobby
          </Button>
        </div>
      </div>
    );
  }

  if (!room) return null;

  return (
    <div className="relative min-h-screen bg-background">
      {/* Room status banner */}
      <div
        className={cn(
          "sticky top-0 z-50 px-3 py-2 flex items-center justify-between gap-2 border-b backdrop-blur-md",
          isCreator
            ? "bg-red-50/90 dark:bg-red-950/40 border-red-200 dark:border-red-500/30"
            : "bg-blue-50/90 dark:bg-blue-950/40 border-blue-200 dark:border-blue-500/30"
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Connection indicator */}
          <div
            className={cn(
              "w-2 h-2 rounded-full shrink-0",
              isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"
            )}
          />
          <span className="text-xs font-semibold text-foreground truncate">
            {room.room_name}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-muted-foreground shrink-0">
            {room.room_code}
          </span>
          {isCreator ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400 shrink-0">
              <Shield className="w-3 h-3" /> Host
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 dark:text-blue-400 shrink-0">
              <Eye className="w-3 h-3" /> Viewer
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyCode}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title="Copy room code"
          >
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShareLink}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title="Share link"
          >
            <Share2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLeave}
            className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground"
          >
            Leave
          </Button>
        </div>
      </div>

      {/* Viewer read-only overlay notice */}
      {!isCreator && (
        <div className="sticky top-[41px] z-40 px-3 py-1.5 bg-blue-100/80 dark:bg-blue-900/30 border-b border-blue-200 dark:border-blue-500/20 text-center">
          <p className="text-[11px] text-blue-800 dark:text-blue-300 font-medium">
            <Eye className="w-3 h-3 inline mr-1" />
            You're viewing this room in read-only mode. Only the host can make changes.
          </p>
        </div>
      )}

      {/* The actual PokerLedger, with room props */}
      <PokerLedger
        roomMode={true}
        isRoomCreator={isCreator}
        roomSession={room.session_data}
        onRoomSessionChange={handleSessionChange}
        roomCode={room.room_code}
        roomName={room.room_name}
      />
    </div>
  );
};

export default PokerLedgerRoom;
