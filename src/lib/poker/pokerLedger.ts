export interface BuyInRecord {
  id: string;
  amount: number;
  timestamp: number;
  note?: string;
}

export interface LedgerPlayer {
  id: string;
  name: string;
  avatarPreset: string;
  buyIns: BuyInRecord[];
  finalChips: number | null;
}

export interface SettlementTransaction {
  id: string;
  fromPlayerId: string;
  fromPlayerName: string;
  fromAvatarPreset: string;
  toPlayerId: string;
  toPlayerName: string;
  toAvatarPreset: string;
  amount: number;
  isCompleted: boolean;
}

export interface PlayerSettlementSummary {
  id: string;
  name: string;
  avatarPreset: string;
  totalBuyIn: number;
  rebuyCount: number;
  finalChips: number;
  net: number;
  roiPercent: number;
  isWinner: boolean;
  isShark: boolean;
  isWhale: boolean;
  isEven: boolean;
}

export interface PokerLedgerSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  currency: string; // '$', '₹', '€', '£', '🪙'
  chipValue: number; // currency per chip
  defaultBuyIn: number;
  players: LedgerPlayer[];
  completedTransactionIds: string[];
}

export interface SettlementResult {
  totalBuyIns: number;
  totalCashOut: number;
  discrepancy: number; // totalCashOut - totalBuyIns
  isBalanced: boolean;
  players: PlayerSettlementSummary[];
  transactions: SettlementTransaction[];
}

export const CURRENCY_OPTIONS = [
  { symbol: "$", label: "USD / Dollar ($)" },
  { symbol: "₹", label: "INR / Rupee (₹)" },
  { symbol: "€", label: "EUR / Euro (€)" },
  { symbol: "£", label: "GBP / Pound (£)" },
  { symbol: "🪙", label: "Chips (No Currency)" },
];

export const DEFAULT_AVATARS = [
  "shark",
  "crown",
  "fire",
  "star",
  "diamond",
  "robot",
  "ninja",
  "wolf",
  "dragon",
  "cat",
];

export const createNewPlayer = (name: string, initialBuyIn: number, avatarIndex: number): LedgerPlayer => {
  const avatar = DEFAULT_AVATARS[avatarIndex % DEFAULT_AVATARS.length];
  return {
    id: `player_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim(),
    avatarPreset: avatar,
    buyIns: [
      {
        id: `bi_${Date.now()}_0`,
        amount: initialBuyIn,
        timestamp: Date.now(),
        note: "Initial Buy-in",
      },
    ],
    finalChips: null,
  };
};

export const createDefaultSession = (): PokerLedgerSession => {
  const initialBuyIn = 1000;
  return {
    id: `session_${Date.now()}`,
    title: `Poker Night ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    currency: "$",
    chipValue: 1,
    defaultBuyIn: initialBuyIn,
    players: [
      createNewPlayer("Alex", initialBuyIn, 0),
      createNewPlayer("Sam", initialBuyIn, 1),
      createNewPlayer("Jordan", initialBuyIn, 2),
      createNewPlayer("Taylor", initialBuyIn, 3),
    ],
    completedTransactionIds: [],
  };
};

/**
 * Calculate player net totals, integrity check, and greedy minimum-transaction settlements.
 */
export const calculateSettlement = (
  players: LedgerPlayer[],
  chipValue: number = 1,
  completedTxIds: string[] = []
): SettlementResult => {
  const completedSet = new Set(completedTxIds);
  let totalBuyIns = 0;
  let totalCashOut = 0;

  // 1. Calculate totals for each player
  const rawPlayerSummaries = players.map((p) => {
    const totalBuyIn = p.buyIns.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
    const finalChips = p.finalChips !== null ? Number(p.finalChips) : 0;
    const net = finalChips - totalBuyIn;
    const rebuyCount = Math.max(0, p.buyIns.length - 1);
    const roiPercent = totalBuyIn > 0 ? (net / totalBuyIn) * 100 : 0;

    totalBuyIns += totalBuyIn;
    totalCashOut += finalChips;

    return {
      id: p.id,
      name: p.name,
      avatarPreset: p.avatarPreset || "default",
      totalBuyIn,
      rebuyCount,
      finalChips,
      net,
      roiPercent,
      isWinner: net > 0,
      isEven: net === 0,
      isShark: false,
      isWhale: false,
    };
  });

  const discrepancy = Math.round((totalCashOut - totalBuyIns) * 100) / 100;
  const isBalanced = Math.abs(discrepancy) < 0.01;

  // Determine highest winner (Shark) and biggest buy-in / donor (Whale)
  let maxNet = 0;
  let maxBuyIn = 0;
  rawPlayerSummaries.forEach((p) => {
    if (p.net > maxNet) maxNet = p.net;
    if (p.totalBuyIn > maxBuyIn) maxBuyIn = p.totalBuyIn;
  });

  const playerSummaries: PlayerSettlementSummary[] = rawPlayerSummaries.map((p) => ({
    ...p,
    isShark: maxNet > 0 && p.net === maxNet,
    isWhale: p.totalBuyIn === maxBuyIn && (p.rebuyCount > 0 || p.net < 0),
  }));

  // Sort by net earnings descending
  playerSummaries.sort((a, b) => b.net - a.net);

  // 2. Minimum Cash Flow Algorithm (Who Pays Whom)
  interface Balancer {
    id: string;
    name: string;
    avatarPreset: string;
    amount: number; // positive = creditor (receives), negative = debtor (pays)
  }

  const creditors: Balancer[] = [];
  const debtors: Balancer[] = [];

  playerSummaries.forEach((p) => {
    const roundedNet = Math.round(p.net * 100) / 100;
    if (roundedNet > 0.009) {
      creditors.push({ id: p.id, name: p.name, avatarPreset: p.avatarPreset, amount: roundedNet });
    } else if (roundedNet < -0.009) {
      debtors.push({ id: p.id, name: p.name, avatarPreset: p.avatarPreset, amount: Math.abs(roundedNet) });
    }
  });

  // Sort descending by amount
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transactions: SettlementTransaction[] = [];

  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const payAmount = Math.min(debtor.amount, creditor.amount);
    const roundedPay = Math.round(payAmount * 100) / 100;

    if (roundedPay > 0.009) {
      const txId = `tx_${debtor.id}_${creditor.id}_${roundedPay}`;
      transactions.push({
        id: txId,
        fromPlayerId: debtor.id,
        fromPlayerName: debtor.name,
        fromAvatarPreset: debtor.avatarPreset,
        toPlayerId: creditor.id,
        toPlayerName: creditor.name,
        toAvatarPreset: creditor.avatarPreset,
        amount: roundedPay,
        isCompleted: completedSet.has(txId),
      });
    }

    debtor.amount = Math.round((debtor.amount - payAmount) * 100) / 100;
    creditor.amount = Math.round((creditor.amount - payAmount) * 100) / 100;

    if (debtor.amount <= 0.009) dIdx++;
    if (creditor.amount <= 0.009) cIdx++;
  }

  return {
    totalBuyIns,
    totalCashOut,
    discrepancy,
    isBalanced,
    players: playerSummaries,
    transactions,
  };
};

/**
 * Format settlement results into a clean, copyable WhatsApp / Telegram / Discord text message.
 */
export const formatSettlementReceipt = (
  session: PokerLedgerSession,
  settlement: SettlementResult
): string => {
  const { currency, title } = session;
  const dateStr = new Date(session.updatedAt || session.createdAt).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const lines: string[] = [];
  lines.push(`🎰 *${title.toUpperCase()}* ♠️`);
  lines.push(`📅 ${dateStr}`);
  lines.push(`💰 Total Pot: ${currency}${settlement.totalBuyIns.toLocaleString()}`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━`);

  lines.push(`🏆 *FINAL STANDINGS & NET:*`);
  settlement.players.forEach((p, idx) => {
    const rank = idx + 1;
    const sign = p.net > 0 ? "+" : "";
    let badge = "";
    if (p.isShark) badge = " 🦈 Shark";
    else if (p.isWhale) badge = " 🐳 Sponsor";
    else if (p.isEven) badge = " ⚖️ Even";

    lines.push(
      `${rank}. *${p.name}*: ${sign}${currency}${p.net.toLocaleString()} (In: ${currency}${p.totalBuyIn} | Out: ${currency}${p.finalChips})${badge}`
    );
  });

  lines.push(`━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`💸 *WHO PAYS WHOM (MINIMUM TRANSFERS):*`);

  if (settlement.transactions.length === 0) {
    lines.push(`All players broke even or settled! No transactions needed.`);
  } else {
    settlement.transactions.forEach((tx) => {
      const check = tx.isCompleted ? "✅ [PAID]" : "⏳ [PENDING]";
      lines.push(`${check} *${tx.fromPlayerName}* ➡️ pays *${tx.toPlayerName}*: ${currency}${tx.amount.toLocaleString()}`);
    });
  }

  if (!settlement.isBalanced) {
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(
      `⚠️ Note: Pot discrepancy of ${currency}${Math.abs(settlement.discrepancy).toLocaleString()} (${
        settlement.discrepancy > 0 ? "Surplus chips" : "Missing chips"
      })`
    );
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`⚡ Generated by Coup Champs Reborn`);

  return lines.join("\n");
};

// Storage keys
const STORAGE_CURRENT_SESSION = "coup_champs_poker_current_ledger";
const STORAGE_SESSION_HISTORY = "coup_champs_poker_ledger_history";

export const loadCurrentSession = (): PokerLedgerSession => {
  try {
    const raw = localStorage.getItem(STORAGE_CURRENT_SESSION);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.players) && parsed.players.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to load current poker session", e);
  }
  return createDefaultSession();
};

export const saveCurrentSession = (session: PokerLedgerSession): void => {
  try {
    localStorage.setItem(
      STORAGE_CURRENT_SESSION,
      JSON.stringify({ ...session, updatedAt: Date.now() })
    );
  } catch (e) {
    console.error("Failed to save current poker session", e);
  }
};

export const loadSessionHistory = (): PokerLedgerSession[] => {
  try {
    const raw = localStorage.getItem(STORAGE_SESSION_HISTORY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return list;
    }
  } catch (e) {
    console.error("Failed to load poker session history", e);
  }
  return [];
};

export const saveSessionToHistory = (session: PokerLedgerSession): PokerLedgerSession[] => {
  try {
    const history = loadSessionHistory();
    const existingIndex = history.findIndex((s) => s.id === session.id);
    const sessionToSave = { ...session, updatedAt: Date.now() };

    let updatedHistory: PokerLedgerSession[];
    if (existingIndex >= 0) {
      updatedHistory = [...history];
      updatedHistory[existingIndex] = sessionToSave;
    } else {
      updatedHistory = [sessionToSave, ...history].slice(0, 30); // keep last 30 sessions
    }

    localStorage.setItem(STORAGE_SESSION_HISTORY, JSON.stringify(updatedHistory));
    return updatedHistory;
  } catch (e) {
    console.error("Failed to save session to history", e);
    return [];
  }
};

export const deleteSessionFromHistory = (sessionId: string): PokerLedgerSession[] => {
  try {
    const history = loadSessionHistory();
    const filtered = history.filter((s) => s.id !== sessionId);
    localStorage.setItem(STORAGE_SESSION_HISTORY, JSON.stringify(filtered));
    return filtered;
  } catch (e) {
    console.error("Failed to delete session from history", e);
    return [];
  }
};
