import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  ArrowLeft,
  Coins,
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  Copy,
  RotateCcw,
  Sparkles,
  Trophy,
  History,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Settings2,
  RefreshCw,
  Wallet,
  ArrowRight,
  IndianRupee,
  UserPlus,
  Clock,
  Pencil,
  Calendar,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import PlayerAvatar from "@/components/PlayerAvatar";
import SoundToggle from "@/components/SoundToggle";
import { sounds } from "@/lib/sounds";
import { cn } from "@/lib/utils";
import {
  PokerLedgerSession,
  DEFAULT_AVATARS,
  createNewPlayer,
  calculateSettlement,
  formatSettlementReceipt,
  formatChips,
  formatRupees,
  loadCurrentSession,
  saveCurrentSession,
  loadSessionHistory,
  saveSessionToHistory,
  deleteSessionFromHistory,
  createDefaultSession,
  clearActiveSession,
} from "@/lib/poker/pokerLedger";

const triggerHaptic = (duration: number = 20) => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate?.(duration);
    } catch (e) {
      // Ignore vibration error
    }
  }
};

const PokerLedger = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [session, setSession] = useState<PokerLedgerSession>(loadCurrentSession);
  const [activeTab, setActiveTab] = useState<"banker" | "cashout" | "settlement" | "history">("banker");

  // Quick Add Player state
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerBuyIn, setNewPlayerBuyIn] = useState<string>("");
  const [newPlayerAvatar, setNewPlayerAvatar] = useState("shark");

  // Custom Re-buy dialog state
  const [rebuyPlayerId, setRebuyPlayerId] = useState<string | null>(null);
  const [customRebuyAmount, setCustomRebuyAmount] = useState<string>("");

  // Session settings dialog state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(session.title);
  const [editChipRateRupees, setEditChipRateRupees] = useState(String(session.chipRateRupees ?? 0.5));
  const [editDefaultBuyIn, setEditDefaultBuyIn] = useState(String(session.defaultBuyIn ?? 400));

  // End Game confirmation dialog state
  const [isEndGameDialogOpen, setIsEndGameDialogOpen] = useState(false);

  // Edit Buy-in / Re-buy entry state
  const [editingLogItem, setEditingLogItem] = useState<{
    playerId: string;
    buyInId: string;
    playerName: string;
    currentAmount: number;
    newAmount: string;
    note?: string;
  } | null>(null);

  // History list
  const [historyList, setHistoryList] = useState<PokerLedgerSession[]>(loadSessionHistory);

  // Normalize defaultBuyIn if it was 1000
  useEffect(() => {
    if (session.defaultBuyIn === 1000) {
      setSession((prev) => ({ ...prev, defaultBuyIn: 400 }));
    }
  }, [session.defaultBuyIn]);

  // Auto-save on change
  useEffect(() => {
    saveCurrentSession(session);
  }, [session]);

  // Compute settlement
  const settlement = useMemo(() => {
    return calculateSettlement(session.players, session.chipRateRupees, session.completedTransactionIds);
  }, [session.players, session.chipRateRupees, session.completedTransactionIds]);

  // Flattened and chronological list of all buy-ins & re-buys across all players
  const allBuyInLogs = useMemo(() => {
    const list: Array<{
      playerId: string;
      playerName: string;
      playerAvatar: string;
      buyInId: string;
      amount: number;
      timestamp: number;
      note?: string;
      isInitial: boolean;
      rebuyIndex?: number;
    }> = [];

    session.players.forEach((p) => {
      p.buyIns.forEach((b, idx) => {
        list.push({
          playerId: p.id,
          playerName: p.name,
          playerAvatar: p.avatarPreset,
          buyInId: b.id,
          amount: b.amount,
          timestamp: b.timestamp || session.createdAt,
          note: b.note || (idx === 0 ? "Initial Buy-in" : `Re-buy #${idx}`),
          isInitial: idx === 0,
          rebuyIndex: idx,
        });
      });
    });

    // Sort newest first
    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [session.players, session.createdAt]);

  // Stats
  const totalPotChips = settlement.totalBuyIns;
  const totalPotRupees = settlement.totalBuyInsRupees;
  const totalRebuys = useMemo(() => {
    return session.players.reduce((sum, p) => sum + Math.max(0, p.buyIns.length - 1), 0);
  }, [session.players]);

  const avgBuyInChips = session.players.length > 0 ? Math.round(totalPotChips / session.players.length) : 0;
  const avgBuyInRupees = Math.round(avgBuyInChips * (session.chipRateRupees ?? 0.5) * 100) / 100;

  // Add new player
  const handleAddPlayer = () => {
    if (!newPlayerName.trim()) {
      toast({ title: "Name required", description: "Please enter player name", variant: "destructive" });
      return;
    }

    const defaultBuyInVal = (session.defaultBuyIn && session.defaultBuyIn !== 1000) ? session.defaultBuyIn : 400;
    const buyIn = Number(newPlayerBuyIn) > 0 ? Number(newPlayerBuyIn) : defaultBuyInVal;
    const player = createNewPlayer(newPlayerName, buyIn, session.players.length);
    player.avatarPreset = newPlayerAvatar;

    setSession((prev) => ({
      ...prev,
      players: [...prev.players, player],
    }));

    setNewPlayerName("");
    setNewPlayerBuyIn("");
    const nextAvatar = DEFAULT_AVATARS[(session.players.length + 1) % DEFAULT_AVATARS.length];
    setNewPlayerAvatar(nextAvatar);

    sounds.chipPlace();
    triggerHaptic(25);
    toast({
      title: "Player Added!",
      description: `${player.name} joined with ${formatChips(buyIn)} (${formatRupees(buyIn * session.chipRateRupees)})`,
    });
  };

  // Remove player
  const handleRemovePlayer = (id: string, name: string) => {
    setSession((prev) => ({
      ...prev,
      players: prev.players.filter((p) => p.id !== id),
    }));
    triggerHaptic(15);
    toast({ title: "Player removed", description: `${name} has been removed` });
  };

  // Quick 1x Re-buy (default 400 chips)
  const handleQuickRebuy = (playerId: string) => {
    const amount = (session.defaultBuyIn && session.defaultBuyIn !== 1000) ? session.defaultBuyIn : 400;
    setSession((prev) => ({
      ...prev,
      players: prev.players.map((p) => {
        if (p.id !== playerId) return p;
        const rebuyNum = p.buyIns.length;
        return {
          ...p,
          buyIns: [
            ...p.buyIns,
            {
              id: `bi_${Date.now()}_${rebuyNum}`,
              amount,
              timestamp: Date.now(),
              note: `Re-buy #${rebuyNum}`,
            },
          ],
        };
      }),
    }));

    sounds.chipStack();
    triggerHaptic(30);
    toast({
      title: "Re-buy Added!",
      description: `+${formatChips(amount)} (${formatRupees(amount * session.chipRateRupees)}) added to stack`,
    });
  };

  // Custom re-buy submit
  const handleCustomRebuySubmit = () => {
    if (!rebuyPlayerId) return;
    const amount = Number(customRebuyAmount);
    if (!amount || amount <= 0) {
      toast({ title: "Invalid chips", description: "Please enter a valid chip amount", variant: "destructive" });
      return;
    }

    setSession((prev) => ({
      ...prev,
      players: prev.players.map((p) => {
        if (p.id !== rebuyPlayerId) return p;
        const rebuyNum = p.buyIns.length;
        return {
          ...p,
          buyIns: [
            ...p.buyIns,
            {
              id: `bi_${Date.now()}_${rebuyNum}`,
              amount,
              timestamp: Date.now(),
              note: `Custom Re-buy #${rebuyNum}`,
            },
          ],
        };
      }),
    }));

    setRebuyPlayerId(null);
    setCustomRebuyAmount("");
    sounds.chipStack();
    triggerHaptic(30);
    toast({
      title: "Re-buy recorded",
      description: `+${formatChips(amount)} (${formatRupees(amount * session.chipRateRupees)}) added`,
    });
  };

  // Update final chips for a player (supports negative numbers & typing minus sign)
  const handleFinalChipsChange = (playerId: string, val: string) => {
    const trimmed = val.trim();
    if (trimmed === "") {
      setSession((prev) => ({
        ...prev,
        players: prev.players.map((p) => (p.id === playerId ? { ...p, finalChips: null } : p)),
      }));
      return;
    }
    // Allow single minus sign while typing or valid integers/decimals (including negative)
    if (trimmed === "-" || /^-?\d*\.?\d*$/.test(trimmed)) {
      setSession((prev) => ({
        ...prev,
        players: prev.players.map((p) => (p.id === playerId ? { ...p, finalChips: trimmed } : p)),
      }));
    }
  };

  // Auto-balance discrepancy with exact chip balancing and support for negative final chips
  const handleAutoBalance = () => {
    if (settlement.isBalanced || session.players.length === 0) return;
    const totalDiff = Math.round(settlement.discrepancy * 100) / 100;
    const n = session.players.length;
    if (n === 0 || Math.abs(totalDiff) < 0.001) return;

    // Convert to cents to guarantee exact integer distribution without precision leaks
    const totalCents = Math.round(totalDiff * 100);
    const baseCents = Math.trunc(totalCents / n);
    let remCents = totalCents - (baseCents * n);

    setSession((prev) => ({
      ...prev,
      players: prev.players.map((p) => {
        const cur = (p.finalChips !== null && p.finalChips !== "" && !isNaN(Number(p.finalChips)))
          ? Number(p.finalChips)
          : 0;
        let extra = 0;
        if (remCents > 0) {
          extra = 1;
          remCents--;
        } else if (remCents < 0) {
          extra = -1;
          remCents++;
        }
        const adj = (baseCents + extra) / 100;
        const newFinal = Math.round((cur - adj) * 100) / 100;
        return { ...p, finalChips: newFinal };
      }),
    }));

    sounds.notification();
    toast({
      title: "Table Auto-Balanced",
      description: `Adjusted each player's stack by ~${formatChips(Math.round(Math.abs(totalDiff / n) * 100) / 100)} to match pot. Discrepancy resolved.`,
    });
  };

  // Toggle transaction completed
  const handleToggleTransaction = (txId: string) => {
    setSession((prev) => {
      const exists = prev.completedTransactionIds.includes(txId);
      const nextIds = exists
        ? prev.completedTransactionIds.filter((id) => id !== txId)
        : [...prev.completedTransactionIds, txId];
      return { ...prev, completedTransactionIds: nextIds };
    });

    sounds.notification();
    triggerHaptic(25);
  };

  // Copy WhatsApp Receipt
  const handleCopyReceipt = async () => {
    const text = formatSettlementReceipt(session, settlement);
    try {
      await navigator.clipboard.writeText(text);
      sounds.win();
      triggerHaptic(40);
      toast({
        title: "Copied to Clipboard! 📋",
        description: "Formatted Rupee settlement ready to paste into WhatsApp / Telegram.",
      });
    } catch (e) {
      toast({ title: "Copy failed", description: "Please copy text manually", variant: "destructive" });
    }
  };

  // Save session to history
  const handleSaveToHistory = () => {
    const updated = saveSessionToHistory(session);
    setHistoryList(updated);
    sounds.win();
    triggerHaptic(35);
    toast({
      title: "Session Saved! 💾",
      description: `"${session.title}" saved to your past games history.`,
    });
  };

  // Clear all players from the active table
  const handleClearTable = () => {
    if (session.players.length === 0) return;
    if (confirm("Remove all players and clear the table?")) {
      clearActiveSession();
      setSession(createDefaultSession());
      triggerHaptic(20);
      sounds.notification();
      toast({
        title: "Table Cleared",
        description: "All players have been removed.",
      });
    }
  };

  // Prompt modal confirmation to end game
  const handleEndGameClick = () => {
    if (session.players.length === 0) {
      toast({ title: "Table is empty", description: "No players currently at the table." });
      return;
    }
    setIsEndGameDialogOpen(true);
  };

  // Confirm End Game from dialog - archives to history and ensures zero past players remain
  const confirmEndGameAndClearTable = () => {
    // 1. Archive to history with isEnded: true
    const finalizedSession = {
      ...session,
      isEnded: true,
      updatedAt: Date.now(),
    };
    const updatedHistory = saveSessionToHistory(finalizedSession);
    setHistoryList(updatedHistory);

    // 2. Clear active table storage and state completely
    clearActiveSession();
    setSession(createDefaultSession());

    // 3. Switch back to Tab 1 (clean table)
    setActiveTab("banker");
    setIsEndGameDialogOpen(false);

    sounds.win();
    triggerHaptic(40);
    toast({
      title: "Game Ended & Archived! 🏆",
      description: "Settlement saved in History. Table is completely cleared with zero players for the next match.",
    });
  };

  // Save edited buy-in amount from Audit Log
  const handleSaveEditedBuyIn = () => {
    if (!editingLogItem) return;
    const amountNum = Number(editingLogItem.newAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid chip amount greater than 0.",
        variant: "destructive",
      });
      return;
    }

    setSession((prev) => ({
      ...prev,
      players: prev.players.map((p) => {
        if (p.id !== editingLogItem.playerId) return p;
        return {
          ...p,
          buyIns: p.buyIns.map((b) =>
            b.id === editingLogItem.buyInId ? { ...b, amount: amountNum } : b
          ),
        };
      }),
    }));

    sounds.chipStack();
    triggerHaptic(25);
    toast({
      title: "Buy-in Updated! ✏️",
      description: `${editingLogItem.playerName}'s ${editingLogItem.note || "buy-in"} corrected from ${editingLogItem.currentAmount} to ${amountNum} chips (${formatRupees(amountNum * (session.chipRateRupees ?? 0.5))}).`,
    });

    setEditingLogItem(null);
  };

  // Delete an accidental re-buy from Audit Log
  const handleDeleteBuyIn = (
    playerId: string,
    buyInId: string,
    playerName: string,
    isInitial: boolean
  ) => {
    if (isInitial) {
      toast({
        title: "Cannot delete initial buy-in",
        description: "To remove this player completely from the table, tap 'Remove' on their card above.",
        variant: "destructive",
      });
      return;
    }

    if (confirm(`Delete this re-buy entry for ${playerName}?`)) {
      setSession((prev) => ({
        ...prev,
        players: prev.players.map((p) => {
          if (p.id !== playerId) return p;
          return {
            ...p,
            buyIns: p.buyIns.filter((b) => b.id !== buyInId),
          };
        }),
      }));
      sounds.notification();
      triggerHaptic(20);
      toast({
        title: "Re-buy Deleted",
        description: `Re-buy record removed for ${playerName}.`,
      });
    }
  };

  // Reset table completely
  const handleResetGame = () => {
    if (confirm("Reset table completely and remove all players?")) {
      clearActiveSession();
      setSession(createDefaultSession());
      setActiveTab("banker");
      sounds.notification();
      toast({ title: "Table Reset", description: "Table cleared. Add players fresh for a new game." });
    }
  };

  // Save session settings
  const handleSaveSettings = () => {
    const defaultBuyInNum = Number(editDefaultBuyIn) > 0 ? Number(editDefaultBuyIn) : 400;
    const rateNum = Number(editChipRateRupees) > 0 ? Number(editChipRateRupees) : 0.5;
    setSession((prev) => ({
      ...prev,
      title: editTitle.trim() || prev.title,
      chipRateRupees: rateNum,
      defaultBuyIn: defaultBuyInNum,
    }));
    setIsSettingsOpen(false);
    toast({ title: "Settings Saved", description: `1 chip = ₹${rateNum} | Buy-in = ${defaultBuyInNum} chips` });
  };

  // Load from history
  const handleLoadSession = (savedSession: PokerLedgerSession) => {
    setSession(savedSession);
    setActiveTab("settlement");
    toast({ title: "Session Loaded", description: `Loaded "${savedSession.title}".` });
  };

  // Delete from history
  const handleDeleteHistory = (sessionId: string) => {
    const updated = deleteSessionFromHistory(sessionId);
    setHistoryList(updated);
    toast({ title: "Deleted", description: "Session removed from history." });
  };

  return (
    <div className="relative min-h-screen bg-background overflow-x-hidden flex flex-col px-3 py-4 md:px-8 md:py-8">
      {/* Background patterns */}
      <div className="absolute inset-0 bg-casino-pattern opacity-10 dark:opacity-80 pointer-events-none" />
      <div className="absolute inset-0 bg-diamond-pattern opacity-5 dark:opacity-60 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 via-transparent to-amber-500/5 dark:from-red-500/10 dark:to-amber-500/5 pointer-events-none" />

      {/* Top Mobile-Friendly Navbar */}
      <div className="relative z-20 flex items-center justify-between w-full max-w-4xl mx-auto mb-4">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground text-xs md:text-sm -ml-2"
          onClick={() => navigate("/poker")}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Poker Menu</span>
          <span className="sm:hidden">Poker</span>
        </Button>

        {/* Stakes pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 text-amber-800 dark:text-amber-300 text-[11px] font-semibold">
          <Coins className="w-3.5 h-3.5" />
          <span>1 chip = ₹{session.chipRateRupees ?? 0.5}</span>
          <span className="hidden sm:inline opacity-70">
            • Buy-in: {session.defaultBuyIn ?? 400} chips ({formatRupees((session.defaultBuyIn ?? 400) * (session.chipRateRupees ?? 0.5))})
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Direct Theme Toggle (Sun/Moon) */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-8 w-8 p-0 border-border/60 text-muted-foreground hover:text-foreground rounded-lg"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </Button>

          {/* Settings Trigger */}
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 border-border/60 text-xs h-8 px-2.5">
                <Settings2 className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
                <span className="hidden sm:inline">Settings</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-border/60 max-w-sm w-[92vw] rounded-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <Coins className="w-5 h-5 text-red-500 dark:text-red-400" />
                  Poker Stakes & Chip Settings
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Session Title</Label>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="e.g. Saturday Home Game"
                    className="text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Rupee Value per Coin (₹)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-semibold">₹</span>
                    <Input
                      type="number"
                      step="0.1"
                      value={editChipRateRupees}
                      onChange={(e) => setEditChipRateRupees(e.target.value)}
                      placeholder="0.5"
                      className="pl-8 text-sm"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Default is ₹0.50 (50 paise per coin). 400 chips = ₹200.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Default Starting Buy-In (Chips)</Label>
                  <div className="relative">
                    <Coins className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={editDefaultBuyIn}
                      onChange={(e) => setEditDefaultBuyIn(e.target.value)}
                      placeholder="400"
                      className="pl-9 text-sm"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Every player will start with this many chips ({formatRupees(Number(editDefaultBuyIn || 400) * Number(editChipRateRupees || 0.5))}).
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSaveSettings} className="w-full bg-red-600 hover:bg-red-700 text-white text-sm">
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <SoundToggle />
        </div>
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-4xl mx-auto flex-1 flex flex-col">
        {/* Header Hero */}
        <div className="text-center space-y-1 mb-4">
          <div className="flex items-center justify-center gap-2">
            <h1 className="font-display text-2xl md:text-4xl font-bold tracking-wide">
              <span className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 dark:from-red-400 dark:via-rose-300 dark:to-amber-400 bg-clip-text text-transparent font-extrabold">
                {session.title}
              </span>
            </h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSettingsOpen(true)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
              title="Edit game title, date, or stakes"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs md:text-sm text-muted-foreground flex-wrap">
            <span className="px-2 py-0.5 rounded-md bg-muted/60 text-foreground font-medium flex items-center gap-1">
              <Calendar className="w-3 h-3 text-red-500 dark:text-red-400" />
              {new Date(session.createdAt || Date.now()).toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <span>•</span>
            <span>400 chips buy-in ({formatRupees(400 * (session.chipRateRupees ?? 0.5))})</span>
            <span>•</span>
            <span>₹{(session.chipRateRupees ?? 0.5).toFixed(2)} per chip</span>
          </div>
        </div>

        {/* Global Summary KPI Bar (Mobile friendly 2x2 grid) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
          <div className="glass-card rounded-2xl p-3 border border-red-500/20 shadow-sm flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 shrink-0">
              <Coins className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase font-medium truncate">Total Pot</p>
              <p className="text-sm md:text-base font-bold text-foreground truncate">
                {totalPotChips.toLocaleString()} <span className="text-[10px] text-muted-foreground font-normal">chips</span>
              </p>
              <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 truncate">
                {formatRupees(totalPotRupees)}
              </p>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-3 border border-border/60 shadow-sm flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 shrink-0">
              <Users className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase font-medium truncate">Players</p>
              <p className="text-sm md:text-base font-bold text-foreground truncate">{session.players.length}</p>
              <p className="text-[11px] text-muted-foreground truncate">At table</p>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-3 border border-border/60 shadow-sm flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
              <RefreshCw className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase font-medium truncate">Re-buys</p>
              <p className="text-sm md:text-base font-bold text-foreground truncate">{totalRebuys}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {formatChips(totalRebuys * (session.defaultBuyIn ?? 400))}
              </p>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-3 border border-border/60 shadow-sm flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Wallet className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase font-medium truncate">Avg Stack</p>
              <p className="text-sm md:text-base font-bold text-foreground truncate">
                {avgBuyInChips.toLocaleString()} <span className="text-[10px] text-muted-foreground font-normal">chips</span>
              </p>
              <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 truncate">
                {formatRupees(avgBuyInRupees)}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation - Touch Optimized */}
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full flex-1 flex flex-col">
          <TabsList className="grid grid-cols-4 w-full mx-auto mb-4 bg-muted/60 dark:bg-card/70 border border-border/60 p-1 rounded-2xl h-11 shadow-sm">
            <TabsTrigger
              value="banker"
              className="text-xs md:text-sm font-semibold rounded-xl data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
            >
              <Coins className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
              1. Buy-in
            </TabsTrigger>
            <TabsTrigger
              value="cashout"
              className="text-xs md:text-sm font-semibold rounded-xl data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
            >
              2. Cash Out
            </TabsTrigger>
            <TabsTrigger
              value="settlement"
              className="text-xs md:text-sm font-semibold rounded-xl data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
            >
              <IndianRupee className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
              3. Settle (₹)
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="text-xs md:text-sm font-semibold rounded-xl data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
            >
              <History className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
              Logs
            </TabsTrigger>
          </TabsList>

          {/* ================= TAB 1: BANKER & BUY-INS ================= */}
          <TabsContent value="banker" className="space-y-4 focus-visible:outline-none flex-1">
            {/* Quick Add Player Bar */}
            <div className="glass-card rounded-2xl p-3.5 md:p-5 border border-border/50 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <UserPlus className="w-4 h-4 text-red-400" />
                  Add Player to Table
                </h3>
                <span className="text-[11px] text-muted-foreground">
                  Starts with <strong className="text-foreground">{(session.defaultBuyIn && session.defaultBuyIn !== 1000) ? session.defaultBuyIn : 400} chips</strong> ({formatRupees(((session.defaultBuyIn && session.defaultBuyIn !== 1000) ? session.defaultBuyIn : 400) * (session.chipRateRupees ?? 0.5))})
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                <div className="sm:col-span-6">
                  <Input
                    placeholder="Enter player name (e.g. Rahul)"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddPlayer()}
                    className="bg-muted/40 border-border/50 text-sm h-11"
                  />
                </div>

                <div className="sm:col-span-3">
                  <div className="relative">
                    <Coins className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder={`Chips (${(session.defaultBuyIn && session.defaultBuyIn !== 1000) ? session.defaultBuyIn : 400})`}
                      value={newPlayerBuyIn}
                      onChange={(e) => setNewPlayerBuyIn(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddPlayer()}
                      className="pl-9 bg-muted/40 border-border/50 text-sm h-11 font-medium"
                    />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <Button
                    onClick={handleAddPlayer}
                    className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-semibold text-sm h-11 gap-1.5 shadow-md shadow-red-500/10"
                  >
                    <Plus className="w-4 h-4" />
                    Add Player
                  </Button>
                </div>
              </div>
            </div>

            {/* Players Table / Roster */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Players at Table ({session.players.length})
                </h3>
                <div className="flex items-center gap-2">
                  {session.players.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearTable}
                      className="text-xs text-muted-foreground hover:text-destructive h-7 px-2 gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear Table
                    </Button>
                  )}
                  <span className="text-[11px] text-muted-foreground hidden sm:inline">Tap "+ Re-buy" for {session.defaultBuyIn} chips</span>
                </div>
              </div>

              {session.players.length === 0 ? (
                <div className="glass-card rounded-2xl p-8 md:p-12 text-center space-y-3 border-dashed border border-border/60">
                  <div className="p-3 rounded-full bg-red-500/10 text-red-400 w-12 h-12 mx-auto flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-foreground text-base">No players added yet</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    Type a player name above to add your friends to the table. Each player starts with{" "}
                    <strong>{session.defaultBuyIn} chips ({formatRupees(session.defaultBuyIn * (session.chipRateRupees ?? 0.5))})</strong>.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {session.players.map((player) => {
                    const totalPlayerChips = player.buyIns.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
                    const totalPlayerRupees = Math.round(totalPlayerChips * (session.chipRateRupees ?? 0.5) * 100) / 100;
                    const rebuyCount = Math.max(0, player.buyIns.length - 1);

                    return (
                      <div
                        key={player.id}
                        className="glass-card rounded-2xl p-3 md:p-3.5 border border-border/70 hover:border-red-500/40 transition-all flex items-center justify-between gap-2.5 shadow-sm"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <PlayerAvatar preset={player.avatarPreset} size="md" showRing ringColor="ring-red-500/40" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-foreground text-sm truncate">{player.name}</span>
                              {rebuyCount > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-semibold border border-amber-500/30 shrink-0">
                                  {rebuyCount} {rebuyCount === 1 ? "re-buy" : "re-buys"}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              Invested: <strong className="text-foreground">{totalPlayerChips.toLocaleString()} chips</strong>{" "}
                              <span className="text-amber-700 dark:text-amber-400 font-bold">({formatRupees(totalPlayerRupees)})</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {/* Quick 1x Rebuy (+400 chips) */}
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleQuickRebuy(player.id)}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-500/30 text-xs font-bold gap-1 h-9 px-2.5 rounded-xl"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            {(session.defaultBuyIn && session.defaultBuyIn !== 1000) ? session.defaultBuyIn : 400}
                          </Button>

                          {/* Custom Rebuy */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setRebuyPlayerId(player.id);
                              setCustomRebuyAmount(String((session.defaultBuyIn && session.defaultBuyIn !== 1000) ? session.defaultBuyIn : 400));
                            }}
                            className="text-xs h-9 px-2 text-muted-foreground hover:text-foreground rounded-xl"
                          >
                            Custom
                          </Button>

                          {/* Remove */}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemovePlayer(player.id, player.name)}
                            className="h-9 w-9 text-muted-foreground hover:text-destructive rounded-xl"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Proceed to Step 2 */}
            {session.players.length > 0 && (
              <div className="pt-2 flex justify-end">
                <Button
                  onClick={() => setActiveTab("cashout")}
                  className="w-full sm:w-auto bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white gap-2 font-semibold text-sm h-11"
                >
                  End Game & Count Cash-Outs
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </TabsContent>

          {/* ================= TAB 2: CASH OUT / CHIP COUNT ================= */}
          <TabsContent value="cashout" className="space-y-4 focus-visible:outline-none flex-1">
            {/* Table Integrity & Discrepancy Card */}
            <div
              className={cn(
                "rounded-2xl p-3.5 md:p-4 border transition-all duration-300 shadow-sm",
                settlement.isBalanced
                  ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-500/40 text-emerald-900 dark:text-emerald-200"
                  : "bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200"
              )}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  {settlement.isBalanced ? (
                    <div className="p-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="p-2 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-sm">
                      {settlement.isBalanced ? "Table is Balanced! (0 Discrepancy)" : "Chip Discrepancy Detected"}
                    </h4>
                    <p className="text-xs opacity-90 leading-relaxed">
                      Pot: <span className="font-semibold">{settlement.totalBuyIns.toLocaleString()} chips</span> ({formatRupees(settlement.totalBuyInsRupees)}) | Stacks: <span className="font-semibold">{settlement.totalCashOut.toLocaleString()} chips</span> ({formatRupees(settlement.totalCashOutRupees)})
                      {!settlement.isBalanced && (
                        <span>
                          {" "}
                          ({settlement.discrepancy > 0 ? "+" : ""}
                          {settlement.discrepancy} chips / {formatRupees(settlement.discrepancyRupees, { includeSign: true })} {settlement.discrepancy > 0 ? "surplus" : "missing"})
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {!settlement.isBalanced && session.players.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAutoBalance}
                    className="w-full sm:w-auto border-amber-500/40 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 text-xs h-8 rounded-xl font-semibold"
                  >
                    Auto-balance Difference
                  </Button>
                )}
              </div>
            </div>

            {/* Cash-out Input Cards for each player */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Final Chip Counts ({session.players.length} players)
                </h3>
                <span className="text-[11px] text-muted-foreground">Enter final chip count</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {session.players.map((player) => {
                  const totalPlayerChips = player.buyIns.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
                  const finalVal = player.finalChips !== null ? player.finalChips : "";
                  const playerFinalNum =
                    player.finalChips !== null && player.finalChips !== "" && !isNaN(Number(player.finalChips))
                      ? Number(player.finalChips)
                      : 0;
                  const netChips = playerFinalNum - totalPlayerChips;
                  const netRupees = Math.round(netChips * (session.chipRateRupees ?? 0.5) * 100) / 100;

                  return (
                    <div
                      key={player.id}
                      className="glass-card rounded-2xl p-3 md:p-4 border border-border/70 hover:border-red-500/30 transition-all space-y-2.5 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <PlayerAvatar preset={player.avatarPreset} size="md" />
                          <div className="min-w-0">
                            <span className="font-bold text-foreground text-sm truncate block">{player.name}</span>
                            <p className="text-xs text-muted-foreground">
                              In: {totalPlayerChips} chips ({formatRupees(totalPlayerChips * (session.chipRateRupees ?? 0.5))})
                            </p>
                          </div>
                        </div>

                        {/* Live Net Pill in RUPEES + CHIPS */}
                        <div
                          className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 shrink-0",
                            netChips > 0
                              ? "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30"
                              : netChips < 0
                              ? "bg-red-500/10 dark:bg-red-500/20 text-red-800 dark:text-red-300 border border-red-500/30"
                              : "bg-slate-500/10 dark:bg-slate-500/20 text-slate-800 dark:text-slate-300 border border-slate-500/30"
                          )}
                        >
                          {netChips > 0 ? <TrendingUp className="w-3 h-3" /> : netChips < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                          <span>{formatRupees(netRupees, { includeSign: true })}</span>
                          <span className="text-[10px] opacity-75 font-normal">
                            ({netChips > 0 ? "+" : ""}{netChips})
                          </span>
                        </div>
                      </div>

                      {/* Final Chips Input */}
                      <div className="relative">
                        <Coins className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="Final Chips"
                          value={finalVal}
                          onChange={(e) => handleFinalChipsChange(player.id, e.target.value)}
                          className="pl-9 bg-muted/40 border-border/50 text-sm font-semibold h-10"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="pt-2 flex items-center justify-between gap-2">
              <Button variant="ghost" size="sm" onClick={() => setActiveTab("banker")} className="gap-1.5 text-xs md:text-sm">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>

              <Button
                onClick={() => setActiveTab("settlement")}
                className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white gap-2 font-semibold text-sm h-11 px-4"
              >
                Calculate Rupee Settlement
                <IndianRupee className="w-4 h-4" />
              </Button>
            </div>
          </TabsContent>

          {/* ================= TAB 3: SETTLEMENT & WHO PAYS WHOM ================= */}
          <TabsContent value="settlement" className="space-y-4 focus-visible:outline-none flex-1">
            {/* Top Standings Cards (Shark / Whale) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {settlement.players.length > 0 && (
                <div className="glass-card rounded-2xl p-3.5 border border-amber-500/30 bg-amber-500/5 relative overflow-hidden flex items-center gap-3 shadow-sm">
                  <div className="text-3xl">🦈</div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-800 dark:text-amber-400 block">Shark (Top Winner)</span>
                    <p className="font-bold text-foreground text-base break-words">{settlement.players[0].name}</p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold">
                      +{formatRupees(settlement.players[0].netRupees)} (+{settlement.players[0].netChips} chips)
                    </p>
                  </div>
                </div>
              )}

              {/* Total Pot summary */}
              <div className="glass-card rounded-2xl p-3.5 border border-border/70 shadow-sm">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Session Pot</span>
                <p className="font-bold text-foreground text-base">
                  {formatRupees(settlement.totalBuyInsRupees)}{" "}
                  <span className="text-xs text-muted-foreground font-normal">({settlement.totalBuyIns.toLocaleString()} chips)</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Rate: 1 coin = ₹{session.chipRateRupees ?? 0.5}
                </p>
              </div>

              {/* Completion Progress */}
              <div className="glass-card rounded-2xl p-3.5 border border-border/70 shadow-sm">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Settlement Progress</span>
                <p className="font-bold text-foreground text-base">
                  {session.completedTransactionIds.length} of {settlement.transactions.length} Paid
                </p>
                <div className="w-full bg-muted/50 rounded-full h-2 mt-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{
                      width: `${
                        settlement.transactions.length > 0
                          ? (session.completedTransactionIds.length / settlement.transactions.length) * 100
                          : 100
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* WHO PAYS WHOM (MINIMUM CASH FLOW IN RUPEES) */}
            <div className="glass-card rounded-2xl p-4 md:p-5 border border-red-500/30 space-y-3.5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-border/50 pb-3">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <IndianRupee className="w-5 h-5 text-red-500 dark:text-red-400" />
                    Who Pays Whom (Direct Rupee Settlement)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Direct UPI / cash transfers to settle everyone with the minimum number of payments.
                  </p>
                </div>

                <Button
                  onClick={handleCopyReceipt}
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white text-xs font-semibold gap-1.5 h-9 shrink-0 shadow-sm rounded-xl"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy WhatsApp / Telegram Receipt
                </Button>
              </div>

              {settlement.transactions.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  🎉 All players broke even or settled! No transactions required.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {settlement.transactions.map((tx) => (
                    <div
                      key={tx.id}
                      onClick={() => handleToggleTransaction(tx.id)}
                      className={cn(
                        "rounded-2xl p-3 md:p-3.5 border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-sm",
                        tx.isCompleted
                          ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300/60 dark:border-emerald-500/30 opacity-70"
                          : "glass-card border-border/70 hover:border-red-500/40"
                      )}
                    >
                      {/* Left: Checkbox + Transfer Flow Badges */}
                      <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={tx.isCompleted}
                          onChange={() => {}}
                          className="rounded text-red-500 w-4 h-4 cursor-pointer shrink-0 mt-1 sm:mt-0"
                        />

                        {/* Transfer flow badges with avatars and full names */}
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0 flex-1">
                          {/* Debtor (Who pays) */}
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-red-500/10 border border-red-500/20">
                            <PlayerAvatar preset={tx.fromAvatarPreset} size="sm" />
                            <span
                              className={cn(
                                "font-bold text-xs sm:text-sm text-foreground break-words",
                                tx.isCompleted && "line-through text-muted-foreground"
                              )}
                            >
                              {tx.fromPlayerName}
                            </span>
                          </div>

                          {/* Action indicator */}
                          <div className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground uppercase px-1 shrink-0">
                            <span className="hidden xs:inline text-[10px] tracking-wider">pays</span>
                            <ArrowRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                          </div>

                          {/* Creditor (Who receives) */}
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                            <PlayerAvatar preset={tx.toAvatarPreset} size="sm" />
                            <span
                              className={cn(
                                "font-bold text-xs sm:text-sm text-foreground break-words",
                                tx.isCompleted && "line-through text-muted-foreground"
                              )}
                            >
                              {tx.toPlayerName}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right / Mobile bottom: Rupee & Chip Amount */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 pl-6 sm:pl-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40 shrink-0">
                        <span className="text-[11px] text-muted-foreground sm:hidden font-medium">
                          {tx.chipAmount.toLocaleString()} chips • {tx.isCompleted ? "Paid ✅" : "Tap to mark paid"}
                        </span>
                        <div className="text-right shrink-0">
                          <span
                            className={cn(
                              "text-base sm:text-lg font-bold font-mono block",
                              tx.isCompleted ? "text-muted-foreground line-through" : "text-amber-700 dark:text-amber-400"
                            )}
                          >
                            {formatRupees(tx.rupeeAmount)}
                          </span>
                          <p className="text-[10px] text-muted-foreground hidden sm:block">
                            {tx.chipAmount.toLocaleString()} chips • {tx.isCompleted ? "Paid ✅" : "Tap to mark paid"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Full Player Standings Table */}
            <div className="glass-card rounded-2xl p-4 md:p-5 border border-border/70 space-y-3 shadow-sm">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Full Game Standings (Rupees & Chips)
              </h3>

              <div className="divide-y divide-border/40">
                {settlement.players.map((p, idx) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono text-xs font-bold text-muted-foreground w-4">#{idx + 1}</span>
                      <PlayerAvatar preset={p.avatarPreset} size="sm" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="font-bold text-sm text-foreground break-words">{p.name}</span>
                          {p.isShark && <span className="text-xs">🦈</span>}
                          {p.isWhale && <span className="text-xs">🐳</span>}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          In: {p.totalBuyIn} chips ({formatRupees(p.totalBuyInRupees)}) • Out: {formatChips(p.finalChips)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={cn(
                          "font-bold text-sm font-mono block",
                          p.netChips > 0 ? "text-emerald-700 dark:text-emerald-400 font-bold" : p.netChips < 0 ? "text-red-700 dark:text-red-400 font-bold" : "text-muted-foreground"
                        )}
                      >
                        {formatRupees(p.netRupees, { includeSign: true })}
                      </span>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {p.netChips > 0 ? "+" : ""}{p.netChips} chips ({Math.round(p.roiPercent)}% ROI)
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Actions for Mobile */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <Button
                size="sm"
                onClick={handleEndGameClick}
                className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-bold text-xs md:text-sm gap-2 h-11 px-5 shadow-lg shadow-red-900/30"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                End Game & Clear Table
              </Button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveToHistory}
                  className="flex-1 sm:flex-none border-border/60 text-xs gap-1.5 h-10"
                >
                  <History className="w-3.5 h-3.5 text-blue-400" />
                  Save Snapshot
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetGame}
                  className="text-xs text-muted-foreground hover:text-destructive h-10 px-3 gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear Table
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ================= TAB 4: HISTORY ================= */}
          <TabsContent value="history" className="space-y-3.5 focus-visible:outline-none flex-1">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Saved Game Night Ledgers ({historyList.length})
              </h3>
            </div>

            {historyList.length === 0 ? (
              <div className="glass-card rounded-2xl p-8 text-center space-y-2 border-dashed border border-border">
                <History className="w-8 h-8 mx-auto text-muted-foreground/60" />
                <p className="font-semibold text-foreground text-sm">No past sessions saved</p>
                <p className="text-xs text-muted-foreground">
                  Finish a game and click "Save to Game History" to keep a permanent ledger.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {historyList.map((hist) => {
                  const histSettlement = calculateSettlement(hist.players, hist.chipRateRupees, hist.completedTransactionIds);
                  const dateStr = new Date(hist.updatedAt || hist.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });

                  return (
                    <div
                      key={hist.id}
                      className="glass-card rounded-xl p-3.5 border border-border/60 flex items-center justify-between gap-2.5"
                    >
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-foreground truncate">{hist.title}</h4>
                        <p className="text-xs text-muted-foreground truncate">
                          {dateStr} • {hist.players.length} Players • Pot:{" "}
                          <strong className="text-amber-400">{formatRupees(histSettlement.totalBuyInsRupees)}</strong>{" "}
                          ({histSettlement.totalBuyIns.toLocaleString()} chips)
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleLoadSession(hist)}
                          className="text-xs h-8 px-2.5"
                        >
                          Load
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteHistory(hist.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* ================= RE-BUY & BUY-IN AUDIT LOG ================= */}
        <div className="mt-8 pt-6 border-t border-border/50 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 px-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-foreground">
                Re-buys & Buy-in Activity Log
              </h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground font-mono">
                {allBuyInLogs.length} {allBuyInLogs.length === 1 ? "entry" : "entries"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Tap <span className="text-amber-700 dark:text-amber-400 font-semibold">✏️ Edit</span> to correct any wrong amounts or misclicks
            </p>
          </div>

          {allBuyInLogs.length === 0 ? (
            <div className="glass-card rounded-2xl p-6 text-center text-xs text-muted-foreground border-dashed border border-border/70 shadow-sm">
              No buy-ins or re-buys recorded yet. When players join or take re-buys, their exact timestamps and amounts will appear here.
            </div>
          ) : (
            <div className="glass-card rounded-2xl border border-border/70 overflow-hidden divide-y divide-border/40 shadow-sm">
              {allBuyInLogs.map((item) => {
                const dateObj = new Date(item.timestamp);
                const timeStr = dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                const rupeeValue = Math.round(item.amount * (session.chipRateRupees ?? 0.5) * 100) / 100;

                return (
                  <div
                    key={`${item.playerId}_${item.buyInId}`}
                    className="p-3 md:p-3.5 flex items-center justify-between gap-2.5 hover:bg-muted/40 transition-colors"
                  >
                    {/* Left: Avatar + Player Info + Type Badge */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <PlayerAvatar preset={item.playerAvatar} size="sm" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs md:text-sm text-foreground truncate">
                            {item.playerName}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded-full font-semibold border shrink-0",
                              item.isInitial
                                ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20"
                                : "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30"
                            )}
                          >
                            {item.note || (item.isInitial ? "Initial Buy-in" : `Re-buy #${item.rebuyIndex}`)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                          <Clock className="w-3 h-3 text-muted-foreground/70" />
                          <span>{timeStr}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount & Edit / Delete Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-xs md:text-sm font-bold font-mono text-foreground block">
                          {item.amount.toLocaleString()} <span className="text-[10px] text-muted-foreground font-normal">chips</span>
                        </span>
                        <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 font-mono">
                          {formatRupees(rupeeValue)}
                        </span>
                      </div>

                      {/* Edit Button */}
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() =>
                          setEditingLogItem({
                            playerId: item.playerId,
                            buyInId: item.buyInId,
                            playerName: item.playerName,
                            currentAmount: item.amount,
                            newAmount: String(item.amount),
                            note: item.note,
                          })
                        }
                        className="h-8 w-8 text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                        title="Edit / Correct Amount"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>

                      {/* Delete Button (only for re-buys) */}
                      {!item.isInitial && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteBuyIn(item.playerId, item.buyInId, item.playerName, item.isInitial)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Delete Re-buy"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* End Game Confirmation Modal */}
      <Dialog open={isEndGameDialogOpen} onOpenChange={setIsEndGameDialogOpen}>
        <DialogContent className="glass-card border-border/60 max-w-sm w-[92vw] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2 text-red-400">
              <Trophy className="w-5 h-5 text-amber-400" />
              End Game & Settle Table?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs md:text-sm text-muted-foreground">
            <p className="leading-relaxed">
              Are you sure you want to finalize and end <strong className="text-foreground">{session.title}</strong>?
            </p>
            <div className="rounded-xl bg-muted/40 p-3 border border-border/50 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span>Total Pot:</span>
                <strong className="text-amber-400">{formatRupees(totalPotRupees)} ({totalPotChips.toLocaleString()} chips)</strong>
              </div>
              <div className="flex justify-between">
                <span>Players at Table:</span>
                <strong className="text-foreground">{session.players.length} players</strong>
              </div>
              <div className="flex justify-between">
                <span>Settlement Integrity:</span>
                <strong className={settlement.isBalanced ? "text-emerald-400" : "text-amber-400"}>
                  {settlement.isBalanced ? "Balanced ✅" : "Unbalanced ⚠️"}
                </strong>
              </div>
            </div>
            <div className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg leading-relaxed space-y-1">
              <p>✅ All final chip balances and Rupee settlements will be permanently saved to <strong>Game History</strong>.</p>
              <p>🧹 All player names will be cleared so your next game starts completely fresh.</p>
            </div>
          </div>
          <DialogFooter className="flex flex-row gap-2 pt-1">
            <Button
              variant="outline"
              onClick={() => setIsEndGameDialogOpen(false)}
              className="flex-1 text-xs h-10 border-border/60"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmEndGameAndClearTable}
              className="flex-1 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-bold text-xs h-10 gap-1.5 shadow-md shadow-red-900/30"
            >
              <CheckCircle2 className="w-4 h-4" />
              Yes, End Game
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Buy-In Amount Modal */}
      <Dialog open={!!editingLogItem} onOpenChange={(open) => !open && setEditingLogItem(null)}>
        <DialogContent className="glass-card border-border/60 max-w-sm w-[92vw] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Pencil className="w-4 h-4 text-amber-400" />
              Correct Buy-in / Re-buy Amount
            </DialogTitle>
          </DialogHeader>
          {editingLogItem && (
            <div className="space-y-3.5 py-2">
              <div className="p-3 rounded-xl bg-muted/40 border border-border/50 text-xs space-y-1">
                <p className="text-muted-foreground">
                  Player: <strong className="text-foreground">{editingLogItem.playerName}</strong>
                </p>
                <p className="text-muted-foreground">
                  Entry: <span className="font-semibold text-amber-300">{editingLogItem.note || "Buy-in"}</span>
                </p>
                <p className="text-muted-foreground">
                  Currently recorded: <strong className="text-foreground">{editingLogItem.currentAmount} chips</strong> ({formatRupees(editingLogItem.currentAmount * (session.chipRateRupees ?? 0.5))})
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Corrected Chip Amount (1 chip = ₹{session.chipRateRupees ?? 0.5})
                </Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={editingLogItem.newAmount}
                  onChange={(e) =>
                    setEditingLogItem((prev) => (prev ? { ...prev, newAmount: e.target.value } : null))
                  }
                  placeholder="e.g. 400"
                  autoFocus
                  className="text-base font-bold font-mono h-11"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-medium">Quick Presets</p>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setEditingLogItem((prev) => (prev ? { ...prev, newAmount: "400" } : null))
                    }
                    className="text-xs h-8 border-border/60"
                  >
                    400 (Std)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setEditingLogItem((prev) => (prev ? { ...prev, newAmount: "200" } : null))
                    }
                    className="text-xs h-8 border-border/60"
                  >
                    200
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setEditingLogItem((prev) => (prev ? { ...prev, newAmount: "800" } : null))
                    }
                    className="text-xs h-8 border-border/60"
                  >
                    800
                  </Button>
                </div>
              </div>

              {Number(editingLogItem.newAmount) > 0 && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-300 flex items-center justify-between">
                  <span>Converts to:</span>
                  <span className="font-mono text-sm">
                    {formatRupees(Number(editingLogItem.newAmount) * (session.chipRateRupees ?? 0.5))}
                  </span>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex flex-row gap-2">
            <Button
              variant="ghost"
              onClick={() => setEditingLogItem(null)}
              className="flex-1 text-xs h-10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEditedBuyIn}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs h-10"
            >
              Update Buy-in
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Re-buy Modal */}
      <Dialog open={!!rebuyPlayerId} onOpenChange={(open) => !open && setRebuyPlayerId(null)}>
        <DialogContent className="glass-card border-border/60 max-w-xs w-[92vw] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Coins className="w-4 h-4 text-red-400" />
              Add Custom Re-buy
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-xs text-muted-foreground">
              Re-buy Chips (1 chip = ₹{session.chipRateRupees ?? 0.5})
            </Label>
            <Input
              type="number"
              inputMode="numeric"
              value={customRebuyAmount}
              onChange={(e) => setCustomRebuyAmount(e.target.value)}
              placeholder="e.g. 400"
              autoFocus
              className="text-sm font-semibold"
            />
            {Number(customRebuyAmount) > 0 && (
              <p className="text-xs text-amber-400 font-semibold">
                = {formatRupees(Number(customRebuyAmount) * (session.chipRateRupees ?? 0.5))}
              </p>
            )}
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="ghost" onClick={() => setRebuyPlayerId(null)} className="flex-1 text-xs h-10">
              Cancel
            </Button>
            <Button onClick={handleCustomRebuySubmit} className="flex-1 bg-red-600 hover:bg-red-700 text-xs h-10 font-semibold">
              Add Re-buy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PokerLedger;
