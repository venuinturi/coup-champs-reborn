import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  Wifi,
  WifiOff,
  Plus,
  LogIn,
  ArrowLeft,
  Sparkles,
  Users,
  Eye,
  Shield,
  Sun,
  Moon,
  Loader2,
  History,
  ArrowRight,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { usePokerRoom } from "@/hooks/usePokerRoom";
import {
  createDefaultSession,
  fetchSavedSnapshots,
  saveCurrentSession,
  formatRupees,
  formatChips,
  type PokerLedgerSession,
} from "@/lib/poker/pokerLedger";

const PokerLedgerEntry = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { createRoom, joinRoom, isLoading, error } = usePokerRoom();

  // Create Room Dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [roomName, setRoomName] = useState("");

  // Join Room Dialog
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  // Saved Games / Snapshots state
  const [savedSnapshots, setSavedSnapshots] = useState<PokerLedgerSession[]>([]);
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(true);

  // Load cloud snapshots on mount
  useEffect(() => {
    fetchSavedSnapshots().then((list) => {
      setSavedSnapshots(list || []);
      setIsLoadingSnapshots(false);
    });
  }, []);

  const handleOpenSnapshot = (snap: PokerLedgerSession) => {
    if (snap.roomCode) {
      navigate(`/poker/ledger/room/${snap.roomCode}`);
    } else {
      saveCurrentSession(snap);
      navigate("/poker/ledger/offline");
    }
  };

  const handleCreateRoom = async () => {
    const name = roomName.trim();
    if (!name) {
      toast({ title: "Room name required", variant: "destructive" });
      return;
    }

    const session = createDefaultSession();
    session.title = name;
    const code = await createRoom(name, session);

    if (code) {
      setIsCreateOpen(false);
      setRoomName("");
      navigate(`/poker/ledger/room/${code}`);
    } else {
      toast({ title: "Failed to create room", description: error || "Try again", variant: "destructive" });
    }
  };

  const handleJoinRoom = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      toast({ title: "Room code required", variant: "destructive" });
      return;
    }

    const success = await joinRoom(code);
    if (success) {
      setIsJoinOpen(false);
      setJoinCode("");
      navigate(`/poker/ledger/room/${code}`);
    } else {
      toast({ title: "Room not found", description: "Check the code and try again.", variant: "destructive" });
    }
  };

  const handleOffline = () => {
    navigate("/poker/ledger/offline");
  };

  return (
    <div className="relative min-h-screen bg-background overflow-x-hidden flex flex-col items-center justify-center px-4 py-8">
      {/* Background patterns */}
      <div className="absolute inset-0 bg-casino-pattern opacity-10 dark:opacity-80 pointer-events-none" />
      <div className="absolute inset-0 bg-diamond-pattern opacity-5 dark:opacity-60 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 via-transparent to-amber-500/5 dark:from-red-500/10 dark:to-amber-500/5 pointer-events-none" />

      {/* Top nav */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground text-xs"
          onClick={() => navigate("/poker")}
        >
          <ArrowLeft className="w-4 h-4" />
          Poker Menu
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="h-8 w-8 p-0 border-border/60 rounded-lg"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </Button>
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Poker Ledger & Settlement
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
            Choose Your Mode
          </h1>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
            Create a shared room for live scoring, or play offline with local storage.
          </p>
        </div>

        {/* Mode Cards */}
        <div className="space-y-3">
          {/* Create Room Card */}
          <button
            onClick={() => setIsCreateOpen(true)}
            className={cn(
              "w-full text-left rounded-2xl p-5 border-2 transition-all duration-200",
              "bg-gradient-to-br from-red-50 to-amber-50 dark:from-red-950/30 dark:to-amber-950/20",
              "border-red-200 dark:border-red-500/30",
              "hover:border-red-400 dark:hover:border-red-400/50 hover:shadow-lg hover:shadow-red-500/10",
              "active:scale-[0.98]"
            )}
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 shrink-0">
                <Plus className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 min-w-0">
                <h3 className="font-bold text-foreground text-base">Create Room</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Start a live scoring room. Share the room code with friends so they can watch updates in real-time.
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                    <Wifi className="w-3 h-3" /> Live Sync
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-blue-700 dark:text-blue-400 font-medium">
                    <Users className="w-3 h-3" /> Shareable
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                    <Shield className="w-3 h-3" /> You Control
                  </span>
                </div>
              </div>
            </div>
          </button>

          {/* Join Room Card */}
          <button
            onClick={() => setIsJoinOpen(true)}
            className={cn(
              "w-full text-left rounded-2xl p-5 border-2 transition-all duration-200",
              "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20",
              "border-blue-200 dark:border-blue-500/30",
              "hover:border-blue-400 dark:hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/10",
              "active:scale-[0.98]"
            )}
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 shrink-0">
                <LogIn className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 min-w-0">
                <h3 className="font-bold text-foreground text-base">Join Room</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Enter a room code to watch a live poker session. View-only — only the host can make changes.
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                    <Wifi className="w-3 h-3" /> Real-time
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-purple-700 dark:text-purple-400 font-medium">
                    <Eye className="w-3 h-3" /> View Only
                  </span>
                </div>
              </div>
            </div>
          </button>

          {/* Offline Card */}
          <button
            onClick={handleOffline}
            className={cn(
              "w-full text-left rounded-2xl p-5 border-2 transition-all duration-200",
              "bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-950/30 dark:to-gray-950/20",
              "border-slate-200 dark:border-slate-500/30",
              "hover:border-slate-400 dark:hover:border-slate-400/50 hover:shadow-lg hover:shadow-slate-500/10",
              "active:scale-[0.98]"
            )}
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-slate-500/10 dark:bg-slate-500/20 text-slate-600 dark:text-slate-400 shrink-0">
                <WifiOff className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 min-w-0">
                <h3 className="font-bold text-foreground text-base">Play Offline</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Classic mode — data stays on your device only. No sharing, no internet needed.
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <span className="inline-flex items-center gap-1 text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                    <WifiOff className="w-3 h-3" /> Local Only
                  </span>
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Saved Games & Snapshots Section (Public Cloud Access) */}
        <div className="space-y-3 pt-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-amber-500" />
              Saved Games & Snapshots
            </h2>
            <span className="text-[11px] text-muted-foreground">
              {isLoadingSnapshots ? "Loading..." : `${savedSnapshots.length} saved`}
            </span>
          </div>

          {isLoadingSnapshots ? (
            <div className="p-6 text-center text-xs text-muted-foreground glass-card rounded-2xl flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
              Loading saved games...
            </div>
          ) : savedSnapshots.length === 0 ? (
            <div className="glass-card rounded-2xl p-5 text-center text-xs text-muted-foreground border-dashed border border-border/70 space-y-1">
              <p className="font-semibold text-foreground">No saved games yet</p>
              <p className="text-[11px] text-muted-foreground">
                When a game snapshot is saved, it will appear here for all players to view anytime.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {savedSnapshots.map((snap) => {
                const totalChips = snap.players.reduce(
                  (sum, p) => sum + p.buyIns.reduce((s, b) => s + (Number(b.amount) || 0), 0),
                  0
                );
                const totalRupees = Math.round(totalChips * (snap.chipRateRupees ?? 0.5) * 100) / 100;
                const dateStr = new Date(snap.updatedAt || snap.createdAt || Date.now()).toLocaleDateString("en-IN", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });

                return (
                  <div
                    key={snap.id}
                    onClick={() => handleOpenSnapshot(snap)}
                    className="glass-card rounded-2xl p-4 border border-border/70 hover:border-amber-500/40 transition-all flex items-center justify-between gap-3 shadow-sm cursor-pointer group active:scale-[0.99]"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-sm truncate">{snap.title}</span>
                        {snap.roomCode && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold border border-amber-500/20">
                            {snap.roomCode}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <span>{dateStr}</span>
                        <span>•</span>
                        <span>{snap.players.length} Players</span>
                        <span>•</span>
                        <span>
                          Pot: <strong className="text-amber-600 dark:text-amber-400">{formatRupees(totalRupees)}</strong>
                        </span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="border-amber-500/30 text-amber-700 dark:text-amber-400 group-hover:bg-amber-500/10 text-xs font-semibold h-9 px-3 rounded-xl shrink-0 gap-1"
                    >
                      <span>View</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Room Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Plus className="w-5 h-5 text-red-500" />
              Create Poker Room
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="room-name" className="text-sm font-medium">
                Room Name
              </Label>
              <Input
                id="room-name"
                placeholder="e.g. Friday Night Poker"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateRoom()}
                className="h-11"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                This name will be visible to everyone who joins.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateRoom}
              disabled={isLoading || !roomName.trim()}
              className="bg-red-600 hover:bg-red-700 text-white gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Create Room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Join Room Dialog */}
      <Dialog open={isJoinOpen} onOpenChange={setIsJoinOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <LogIn className="w-5 h-5 text-blue-500" />
              Join Poker Room
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="join-code" className="text-sm font-medium">
                Room Code
              </Label>
              <Input
                id="join-code"
                placeholder="e.g. PKR-A3F7K"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
                className="h-11 font-mono text-center text-lg tracking-widest uppercase"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                Ask the room host for the code, or open the shared link.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsJoinOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleJoinRoom}
              disabled={isLoading || !joinCode.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              Join Room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PokerLedgerEntry;
