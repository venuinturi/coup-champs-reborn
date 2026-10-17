import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Share2,
  Settings2,
  RefreshCw,
  Wallet,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  LedgerPlayer,
  CURRENCY_OPTIONS,
  DEFAULT_AVATARS,
  createNewPlayer,
  calculateSettlement,
  formatSettlementReceipt,
  loadCurrentSession,
  saveCurrentSession,
  loadSessionHistory,
  saveSessionToHistory,
  deleteSessionFromHistory,
  createDefaultSession,
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
  const [editCurrency, setEditCurrency] = useState(session.currency);
  const [editDefaultBuyIn, setEditDefaultBuyIn] = useState(String(session.defaultBuyIn));

  // History list
  const [historyList, setHistoryList] = useState<PokerLedgerSession[]>(loadSessionHistory);

  // Auto-save on change
  useEffect(() => {
    saveCurrentSession(session);
  }, [session]);

  // Compute settlement
  const settlement = useMemo(() => {
    return calculateSettlement(session.players, session.chipValue, session.completedTransactionIds);
  }, [session.players, session.chipValue, session.completedTransactionIds]);

  // Stats
  const totalPot = settlement.totalBuyIns;
  const totalRebuys = useMemo(() => {
    return session.players.reduce((sum, p) => sum + Math.max(0, p.buyIns.length - 1), 0);
  }, [session.players]);

  const avgBuyIn = session.players.length > 0 ? Math.round(totalPot / session.players.length) : 0;

  // Add new player
  const handleAddPlayer = () => {
    if (!newPlayerName.trim()) {
      toast({ title: "Name required", description: "Please enter player name", variant: "destructive" });
      return;
    }

    const buyIn = Number(newPlayerBuyIn) > 0 ? Number(newPlayerBuyIn) : session.defaultBuyIn;
    const player = createNewPlayer(newPlayerName, buyIn, session.players.length);
    player.avatarPreset = newPlayerAvatar;

    setSession((prev) => ({
      ...prev,
      players: [...prev.players, player],
    }));

    setNewPlayerName("");
    setNewPlayerBuyIn("");
    // Pick next avatar
    const nextAvatar = DEFAULT_AVATARS[(session.players.length + 1) % DEFAULT_AVATARS.length];
    setNewPlayerAvatar(nextAvatar);

    sounds.chipPlace();
    triggerHaptic(25);
    toast({ title: "Player Added", description: `${player.name} joined with ${session.currency}${buyIn}` });
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

  // Quick 1x Re-buy
  const handleQuickRebuy = (playerId: string) => {
    const amount = session.defaultBuyIn;
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
    toast({ title: "Re-buy Added!", description: `+${session.currency}${amount} added to stack` });
  };

  // Custom re-buy submit
  const handleCustomRebuySubmit = () => {
    if (!rebuyPlayerId) return;
    const amount = Number(customRebuyAmount);
    if (!amount || amount <= 0) {
      toast({ title: "Invalid amount", description: "Please enter a valid amount", variant: "destructive" });
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
    toast({ title: "Re-buy recorded", description: `+${session.currency}${amount} added` });
  };

  // Update final chips for a player
  const handleFinalChipsChange = (playerId: string, val: string) => {
    const num = val === "" ? null : Math.max(0, Number(val));
    setSession((prev) => ({
      ...prev,
      players: prev.players.map((p) => (p.id === playerId ? { ...p, finalChips: num } : p)),
    }));
  };

  // Quick chip increment
  const handleAddChips = (playerId: string, delta: number) => {
    setSession((prev) => ({
      ...prev,
      players: prev.players.map((p) => {
        if (p.id !== playerId) return p;
        const current = p.finalChips ?? 0;
        return { ...p, finalChips: Math.max(0, current + delta) };
      }),
    }));
    sounds.chipPlace();
    triggerHaptic(15);
  };

  // Set busted ($0)
  const handleSetBusted = (playerId: string) => {
    setSession((prev) => ({
      ...prev,
      players: prev.players.map((p) => (p.id === playerId ? { ...p, finalChips: 0 } : p)),
    }));
    sounds.buttonClick();
    triggerHaptic(20);
  };

  // Auto-balance discrepancy
  const handleAutoBalance = () => {
    if (settlement.isBalanced || session.players.length === 0) return;
    const diff = settlement.discrepancy;
    const adjustmentPerPlayer = Math.round((diff / session.players.length) * 100) / 100;

    setSession((prev) => ({
      ...prev,
      players: prev.players.map((p) => {
        const cur = p.finalChips ?? 0;
        return { ...p, finalChips: Math.max(0, Math.round((cur - adjustmentPerPlayer) * 100) / 100) };
      }),
    }));

    sounds.notification();
    toast({
      title: "Table Auto-Balanced",
      description: `Adjusted each player's stack by ~${session.currency}${Math.abs(adjustmentPerPlayer)} to match pot.`,
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
        description: "Formatted poker settlement ready to paste into WhatsApp / Telegram.",
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

  // Reset or Start New Game
  const handleResetGame = (keepPlayers: boolean) => {
    if (confirm(keepPlayers ? "Start a new session with the same player names?" : "Reset and start completely fresh?")) {
      if (keepPlayers) {
        setSession((prev) => ({
          ...prev,
          id: `session_${Date.now()}`,
          title: `Poker Night ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          completedTransactionIds: [],
          players: prev.players.map((p) => ({
            ...p,
            finalChips: null,
            buyIns: [
              {
                id: `bi_${Date.now()}_0`,
                amount: prev.defaultBuyIn,
                timestamp: Date.now(),
                note: "Initial Buy-in",
              },
            ],
          })),
        }));
      } else {
        setSession(createDefaultSession());
      }
      setActiveTab("banker");
      sounds.notification();
      toast({ title: "New Game Started", description: "Ledger reset and ready for play!" });
    }
  };

  // Save session settings
  const handleSaveSettings = () => {
    const defaultBuyInNum = Number(editDefaultBuyIn) > 0 ? Number(editDefaultBuyIn) : 1000;
    setSession((prev) => ({
      ...prev,
      title: editTitle.trim() || prev.title,
      currency: editCurrency,
      defaultBuyIn: defaultBuyInNum,
    }));
    setIsSettingsOpen(false);
    toast({ title: "Settings Saved", description: "Ledger preferences updated." });
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
    <div className="relative min-h-screen bg-background overflow-hidden flex flex-col px-3 py-6 md:px-8 md:py-10">
      {/* Background patterns */}
      <div className="absolute inset-0 bg-casino-pattern opacity-80 pointer-events-none" />
      <div className="absolute inset-0 bg-diamond-pattern opacity-60 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-red-500/10 via-transparent to-amber-500/5 pointer-events-none" />

      {/* Top Navbar */}
      <div className="relative z-20 flex items-center justify-between w-full max-w-5xl mx-auto mb-6">
        <Button
          variant="ghost"
          className="gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/poker")}
        >
          <ArrowLeft className="w-4 h-4" />
          Poker Menu
        </Button>

        <div className="flex items-center gap-2">
          {/* Settings Trigger */}
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 border-border/50 text-xs">
                <Settings2 className="w-3.5 h-3.5 text-red-400" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-border/60 max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-red-400" />
                  Ledger Configuration
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Session Title</Label>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="e.g. Friday Poker Night"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Currency Symbol</Label>
                  <Select value={editCurrency} onValueChange={setEditCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_OPTIONS.map((c) => (
                        <SelectItem key={c.symbol} value={c.symbol}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Default Initial Buy-In</Label>
                  <Input
                    type="number"
                    value={editDefaultBuyIn}
                    onChange={(e) => setEditDefaultBuyIn(e.target.value)}
                    placeholder="1000"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSaveSettings} className="w-full bg-red-600 hover:bg-red-700">
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <SoundToggle />
        </div>
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-5xl mx-auto flex-1 flex flex-col">
        {/* Header Hero */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold tracking-wider uppercase mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            Home Game Scorekeeper & Settlement
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-wide">
            <span className="bg-gradient-to-r from-red-400 via-rose-300 to-amber-400 bg-clip-text text-transparent">
              {session.title}
            </span>
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm max-w-lg mx-auto">
            Track live buy-ins, re-buys, count final chip stacks, and compute the exact minimum payments between players.
          </p>
        </div>

        {/* Global Summary KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="glass-card rounded-xl p-3.5 border border-red-500/20 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-red-500/20 text-red-400">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase font-medium">Total Pot</p>
              <p className="text-lg md:text-xl font-bold text-foreground">
                {session.currency}
                {totalPot.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="glass-card rounded-xl p-3.5 border border-border/50 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-500/20 text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase font-medium">Players</p>
              <p className="text-lg md:text-xl font-bold text-foreground">{session.players.length}</p>
            </div>
          </div>

          <div className="glass-card rounded-xl p-3.5 border border-border/50 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-400">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase font-medium">Re-buys</p>
              <p className="text-lg md:text-xl font-bold text-foreground">{totalRebuys}</p>
            </div>
          </div>

          <div className="glass-card rounded-xl p-3.5 border border-border/50 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase font-medium">Avg Buy-In</p>
              <p className="text-lg md:text-xl font-bold text-foreground">
                {session.currency}
                {avgBuyIn.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full flex-1 flex flex-col">
          <TabsList className="grid grid-cols-4 w-full max-w-xl mx-auto mb-6 bg-card/60 border border-border/50 p-1">
            <TabsTrigger value="banker" className="text-xs md:text-sm gap-1.5 data-[state=active]:bg-red-600 data-[state=active]:text-white">
              <Coins className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">1. Buy-ins</span>
              <span className="sm:hidden">Buy-ins</span>
            </TabsTrigger>
            <TabsTrigger value="cashout" className="text-xs md:text-sm gap-1.5 data-[state=active]:bg-red-600 data-[state=active]:text-white">
              <DollarSign className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">2. Cash Out</span>
              <span className="sm:hidden">Cash Out</span>
            </TabsTrigger>
            <TabsTrigger value="settlement" className="text-xs md:text-sm gap-1.5 data-[state=active]:bg-red-600 data-[state=active]:text-white">
              <Trophy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">3. Settlement</span>
              <span className="sm:hidden">Settle</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs md:text-sm gap-1.5 data-[state=active]:bg-red-600 data-[state=active]:text-white">
              <History className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">History</span>
              <span className="sm:hidden">Logs</span>
            </TabsTrigger>
          </TabsList>

          {/* ================= TAB 1: BANKER & BUY-INS ================= */}
          <TabsContent value="banker" className="space-y-6 focus-visible:outline-none flex-1">
            {/* Quick Add Player Bar */}
            <div className="glass-card rounded-2xl p-4 md:p-5 border border-border/50 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Plus className="w-4 h-4 text-red-400" />
                Add Player to Table
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                <div className="sm:col-span-5">
                  <Input
                    placeholder="Player Name (e.g. Mike)"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddPlayer()}
                    className="bg-muted/40 border-border/50 text-sm"
                  />
                </div>

                <div className="sm:col-span-3">
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground text-xs">{session.currency}</span>
                    <Input
                      type="number"
                      placeholder={`Buy-in (${session.defaultBuyIn})`}
                      value={newPlayerBuyIn}
                      onChange={(e) => setNewPlayerBuyIn(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddPlayer()}
                      className="pl-8 bg-muted/40 border-border/50 text-sm"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <Select value={newPlayerAvatar} onValueChange={setNewPlayerAvatar}>
                    <SelectTrigger className="bg-muted/40 border-border/50 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEFAULT_AVATARS.map((av) => (
                        <SelectItem key={av} value={av}>
                          <span className="capitalize">{av}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-2">
                  <Button
                    onClick={handleAddPlayer}
                    className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-medium text-xs md:text-sm"
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>

            {/* Players Table / Roster */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Active Players ({session.players.length})
                </h3>
                <span className="text-xs text-muted-foreground">Click "+ Re-buy" when players reload chips</span>
              </div>

              {session.players.length === 0 ? (
                <div className="glass-card rounded-2xl p-10 text-center space-y-2 border-dashed border border-border">
                  <Users className="w-10 h-10 mx-auto text-muted-foreground/60" />
                  <p className="font-semibold text-foreground">No players at the table yet</p>
                  <p className="text-xs text-muted-foreground">Add your first player using the form above to begin.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {session.players.map((player) => {
                    const totalPlayerBuyIn = player.buyIns.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
                    const rebuyCount = Math.max(0, player.buyIns.length - 1);

                    return (
                      <div
                        key={player.id}
                        className="glass-card rounded-xl p-4 border border-border/60 hover:border-red-500/30 transition-all flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <PlayerAvatar preset={player.avatarPreset} size="md" showRing ringColor="ring-red-500/40" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{player.name}</span>
                              {rebuyCount > 0 && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium border border-amber-500/30">
                                  {rebuyCount} {rebuyCount === 1 ? "re-buy" : "re-buys"}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Total Invested:{" "}
                              <span className="font-bold text-foreground">
                                {session.currency}
                                {totalPlayerBuyIn.toLocaleString()}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Quick 1x Rebuy */}
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleQuickRebuy(player.id)}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs gap-1 h-8"
                          >
                            <Plus className="w-3 h-3" />
                            +{session.currency}
                            {session.defaultBuyIn}
                          </Button>

                          {/* Custom Rebuy Trigger */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setRebuyPlayerId(player.id);
                              setCustomRebuyAmount(String(session.defaultBuyIn));
                            }}
                            className="text-xs h-8 text-muted-foreground hover:text-foreground"
                          >
                            Custom
                          </Button>

                          {/* Remove */}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemovePlayer(player.id, player.name)}
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
            </div>

            {/* Bottom Proceed to Step 2 Button */}
            <div className="pt-4 flex justify-end">
              <Button
                onClick={() => setActiveTab("cashout")}
                className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white gap-2 font-medium"
              >
                End Game & Count Cash-Outs
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </TabsContent>

          {/* ================= TAB 2: CASH OUT / CHIP COUNT ================= */}
          <TabsContent value="cashout" className="space-y-6 focus-visible:outline-none flex-1">
            {/* Table Integrity & Discrepancy Card */}
            <div
              className={cn(
                "rounded-2xl p-4 md:p-5 border transition-all duration-300",
                settlement.isBalanced
                  ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-200"
                  : "bg-amber-950/20 border-amber-500/40 text-amber-200"
              )}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {settlement.isBalanced ? (
                    <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-sm md:text-base">
                      {settlement.isBalanced ? "Table is Balanced! (0 Discrepancy)" : "Chip Discrepancy Detected"}
                    </h4>
                    <p className="text-xs opacity-80">
                      Total Buy-ins:{" "}
                      <span className="font-semibold">
                        {session.currency}
                        {settlement.totalBuyIns.toLocaleString()}
                      </span>{" "}
                      | Counted Chips:{" "}
                      <span className="font-semibold">
                        {session.currency}
                        {settlement.totalCashOut.toLocaleString()}
                      </span>
                      {!settlement.isBalanced && (
                        <span>
                          {" "}
                          ({settlement.discrepancy > 0 ? "+" : ""}
                          {session.currency}
                          {settlement.discrepancy.toLocaleString()}{" "}
                          {settlement.discrepancy > 0 ? "surplus" : "missing"})
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {!settlement.isBalanced && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAutoBalance}
                    className="border-amber-500/40 text-amber-300 hover:bg-amber-500/20 text-xs"
                  >
                    Auto-balance Difference
                  </Button>
                )}
              </div>
            </div>

            {/* Cash-out Input Cards for each player */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Final Chip Counts / Cash-Out Stacks
                </h3>
                <span className="text-xs text-muted-foreground">Type final chips or click quick presets</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {session.players.map((player) => {
                  const totalPlayerBuyIn = player.buyIns.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
                  const finalVal = player.finalChips !== null ? player.finalChips : "";
                  const net = (player.finalChips ?? 0) - totalPlayerBuyIn;

                  return (
                    <div
                      key={player.id}
                      className="glass-card rounded-xl p-4 border border-border/60 hover:border-red-500/30 transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <PlayerAvatar preset={player.avatarPreset} size="md" />
                          <div>
                            <span className="font-semibold text-foreground">{player.name}</span>
                            <p className="text-xs text-muted-foreground">
                              Invested: {session.currency}
                              {totalPlayerBuyIn.toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* Live Net Pill */}
                        <div
                          className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1",
                            net > 0
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : net < 0
                              ? "bg-red-500/20 text-red-400 border border-red-500/30"
                              : "bg-slate-500/20 text-slate-400 border border-slate-500/30"
                          )}
                        >
                          {net > 0 ? <TrendingUp className="w-3 h-3" /> : net < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                          {net > 0 ? "+" : ""}
                          {session.currency}
                          {net.toLocaleString()}
                        </div>
                      </div>

                      {/* Input & Quick Buttons */}
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-2.5 text-muted-foreground text-xs">{session.currency}</span>
                          <Input
                            type="number"
                            placeholder="Final Chips"
                            value={finalVal}
                            onChange={(e) => handleFinalChipsChange(player.id, e.target.value)}
                            className="pl-8 bg-muted/40 border-border/50 text-sm font-semibold"
                          />
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddChips(player.id, 100)}
                          className="text-xs h-9 px-2 border-border/50"
                        >
                          +100
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddChips(player.id, 500)}
                          className="text-xs h-9 px-2 border-border/50"
                        >
                          +500
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSetBusted(player.id)}
                          className="text-xs h-9 px-2 text-red-400 hover:bg-red-500/10"
                        >
                          Bust ($0)
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="pt-4 flex items-center justify-between">
              <Button variant="ghost" onClick={() => setActiveTab("banker")} className="gap-2 text-xs md:text-sm">
                <ArrowLeft className="w-4 h-4" />
                Back to Buy-ins
              </Button>

              <Button
                onClick={() => setActiveTab("settlement")}
                className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white gap-2 font-medium"
              >
                View Who Pays Whom
                <Trophy className="w-4 h-4" />
              </Button>
            </div>
          </TabsContent>

          {/* ================= TAB 3: SETTLEMENT & WHO PAYS WHOM ================= */}
          <TabsContent value="settlement" className="space-y-6 focus-visible:outline-none flex-1">
            {/* Top Standings Cards (Shark / Whale) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {settlement.players.length > 0 && (
                <div className="glass-card rounded-xl p-4 border border-amber-500/30 bg-amber-500/5 relative overflow-hidden">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">🦈</div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">The Shark (MVP)</span>
                      <p className="font-bold text-foreground text-base">{settlement.players[0].name}</p>
                      <p className="text-xs text-emerald-400 font-semibold">
                        +{session.currency}
                        {settlement.players[0].net.toLocaleString()} profit
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Total Pot summary */}
              <div className="glass-card rounded-xl p-4 border border-border/50">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Session Pot</span>
                <p className="font-bold text-foreground text-base">
                  {session.currency}
                  {settlement.totalBuyIns.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {settlement.transactions.length} settlement {settlement.transactions.length === 1 ? "transfer" : "transfers"} needed
                </p>
              </div>

              {/* Completion Progress */}
              <div className="glass-card rounded-xl p-4 border border-border/50">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Settlement Progress</span>
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

            {/* WHO PAYS WHOM (MINIMUM DEBT TRANSFERS) */}
            <div className="glass-card rounded-2xl p-5 md:p-6 border border-red-500/30 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-red-400" />
                    Who Pays Whom (Minimum Cash Flow)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Direct, simplified payments that settle everyone to zero with the fewest transactions.
                  </p>
                </div>

                <Button
                  onClick={handleCopyReceipt}
                  className="bg-red-500 hover:bg-red-600 text-white text-xs gap-1.5 h-8 shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy to WhatsApp / Telegram
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
                        "rounded-xl p-3.5 border transition-all cursor-pointer flex items-center justify-between gap-3",
                        tx.isCompleted
                          ? "bg-emerald-950/20 border-emerald-500/30 opacity-70"
                          : "glass-card border-border/70 hover:border-red-500/40"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={tx.isCompleted}
                          onChange={() => {}}
                          className="rounded text-red-500 w-4 h-4 cursor-pointer"
                        />
                        <div className="flex items-center gap-2">
                          <PlayerAvatar preset={tx.fromAvatarPreset} size="sm" />
                          <span className={cn("font-semibold text-sm", tx.isCompleted && "line-through text-muted-foreground")}>
                            {tx.fromPlayerName}
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="flex items-center gap-2">
                          <PlayerAvatar preset={tx.toAvatarPreset} size="sm" />
                          <span className={cn("font-semibold text-sm", tx.isCompleted && "line-through text-muted-foreground")}>
                            {tx.toPlayerName}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={cn(
                            "text-base md:text-lg font-bold font-mono",
                            tx.isCompleted ? "text-muted-foreground line-through" : "text-amber-400"
                          )}
                        >
                          {session.currency}
                          {tx.amount.toLocaleString()}
                        </span>
                        <p className="text-[10px] text-muted-foreground">{tx.isCompleted ? "Settled ✅" : "Click to mark paid"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Full Player Standings Table */}
            <div className="glass-card rounded-2xl p-5 border border-border/50 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Full Game Night Standings & ROI
              </h3>

              <div className="divide-y divide-border/40">
                {settlement.players.map((p, idx) => (
                  <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-muted-foreground w-4">#{idx + 1}</span>
                      <PlayerAvatar preset={p.avatarPreset} size="sm" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm text-foreground">{p.name}</span>
                          {p.isShark && <span className="text-xs">🦈</span>}
                          {p.isWhale && <span className="text-xs">🐳</span>}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Buy-in: {session.currency}
                          {p.totalBuyIn} | Cash-out: {session.currency}
                          {p.finalChips}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={cn(
                          "font-bold text-sm font-mono",
                          p.net > 0 ? "text-emerald-400" : p.net < 0 ? "text-red-400" : "text-muted-foreground"
                        )}
                      >
                        {p.net > 0 ? "+" : ""}
                        {session.currency}
                        {p.net.toLocaleString()}
                      </span>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {p.net > 0 ? "+" : ""}
                        {Math.round(p.roiPercent)}% ROI
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Global Actions */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <Button variant="outline" onClick={handleSaveToHistory} className="border-border/60 text-xs gap-1.5">
                <History className="w-3.5 h-3.5 text-blue-400" />
                Save to Game History
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => handleResetGame(true)}
                  className="text-xs gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Same Players (New Round)
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => handleResetGame(false)}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Reset All
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ================= TAB 4: HISTORY ================= */}
          <TabsContent value="history" className="space-y-4 focus-visible:outline-none flex-1">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Saved Game Night Ledgers ({historyList.length})
              </h3>
            </div>

            {historyList.length === 0 ? (
              <div className="glass-card rounded-2xl p-10 text-center space-y-2 border-dashed border border-border">
                <History className="w-10 h-10 mx-auto text-muted-foreground/60" />
                <p className="font-semibold text-foreground">No past sessions saved</p>
                <p className="text-xs text-muted-foreground">
                  Finish a game and click "Save to Game History" to keep a permanent ledger.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {historyList.map((hist) => {
                  const histSettlement = calculateSettlement(hist.players, hist.chipValue, hist.completedTransactionIds);
                  const dateStr = new Date(hist.updatedAt || hist.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });

                  return (
                    <div
                      key={hist.id}
                      className="glass-card rounded-xl p-4 border border-border/60 flex items-center justify-between gap-3"
                    >
                      <div>
                        <h4 className="font-bold text-sm text-foreground">{hist.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {dateStr} • {hist.players.length} Players • Total Pot: {hist.currency}
                          {histSettlement.totalBuyIns.toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleLoadSession(hist)}
                          className="text-xs h-8"
                        >
                          Load Ledger
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
      </div>

      {/* Custom Re-buy Modal */}
      <Dialog open={!!rebuyPlayerId} onOpenChange={(open) => !open && setRebuyPlayerId(null)}>
        <DialogContent className="glass-card border-border/60 max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Coins className="w-4 h-4 text-red-400" />
              Add Custom Re-buy
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-xs text-muted-foreground">Re-buy Amount ({session.currency})</Label>
            <Input
              type="number"
              value={customRebuyAmount}
              onChange={(e) => setCustomRebuyAmount(e.target.value)}
              placeholder="e.g. 500"
              autoFocus
            />
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="ghost" onClick={() => setRebuyPlayerId(null)} className="flex-1 text-xs">
              Cancel
            </Button>
            <Button onClick={handleCustomRebuySubmit} className="flex-1 bg-red-600 hover:bg-red-700 text-xs">
              Add Re-buy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PokerLedger;
