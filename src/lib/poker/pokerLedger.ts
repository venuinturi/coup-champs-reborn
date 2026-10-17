export interface BuyInRecord {
  id: string;
  amount: number; // in chips
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
  chipAmount: number; // amount in chips
  rupeeAmount: number; // amount in rupees (chipAmount * chipRateRupees)
  isCompleted: boolean;
}

export interface PlayerSettlementSummary {
  id: string;
  name: string;
  avatarPreset: string;
  totalBuyIn: number; // chips
  totalBuyInRupees: number; // ₹
  rebuyCount: number;
  finalChips: number; // chips
  finalRupees: number; // ₹
  netChips: number; // chips
  netRupees: number; // ₹
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
  currency: string;
  chipRateRupees: number; // rupees per chip (default: 0.5)
  defaultBuyIn: number; // chips per buy-in (default: 400)
  players: LedgerPlayer[];
  completedTransactionIds: string[];
}

export interface SettlementResult {
  totalBuyIns: number; // chips
  totalBuyInsRupees: number; // ₹
  totalCashOut: number; // chips
  totalCashOutRupees: number; // ₹
  discrepancy: number; // chips: totalCashOut - totalBuyIns
  discrepancyRupees: number; // ₹
  isBalanced: boolean;
  players: PlayerSettlementSummary[];
  transactions: SettlementTransaction[];
}

export const DEFAULT_BUY_IN = 400; // 400 chips
export const DEFAULT_CHIP_RATE_RUPEES = 0.5; // 1 chip = 0.5 rupees (50 paise)

export const formatChips = (
  amount: number,
  options: { includeSign?: boolean; showUnit?: boolean } = {}
): string => {
  const { includeSign = false, showUnit = true } = options;
  const num = Math.round(amount * 100) / 100;
  const absFormatted = Math.abs(num).toLocaleString();
  const sign = includeSign ? (num > 0 ? "+" : num < 0 ? "-" : "") : (num < 0 ? "-" : "");
  const unit = showUnit ? " chips" : "";
  return `${sign}${absFormatted}${unit}`;
};

export const formatRupees = (
  amount: number,
  options: { includeSign?: boolean } = {}
): string => {
  const { includeSign = false } = options;
  const num = Math.round(amount * 100) / 100;
  const absFormatted = Math.abs(num).toLocaleString("en-IN", {
    minimumFractionDigits: num % 1 !== 0 ? 2 : 0,
    maximumFractionDigits: 2,
  });
  const sign = includeSign ? (num > 0 ? "+" : num < 0 ? "-" : "") : (num < 0 ? "-" : "");
  return `${sign}₹${absFormatted}`;
};

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

export const createNewPlayer = (name: string, initialBuyIn: number = DEFAULT_BUY_IN, avatarIndex: number = 0): LedgerPlayer => {
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
  return {
    id: `session_${Date.now()}`,
    title: `Poker Night ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    currency: "chips",
    chipRateRupees: DEFAULT_CHIP_RATE_RUPEES,
    defaultBuyIn: DEFAULT_BUY_IN,
    players: [], // NO hardcoded players: user adds their friends!
    completedTransactionIds: [],
  };
};

/**
 * Calculate player net totals, convert to Rupees at chipRateRupees,
 * verify integrity, and calculate greedy minimum-transaction settlements in Rupees.
 */
export const calculateSettlement = (
  players: LedgerPlayer[],
  chipRateRupees: number = DEFAULT_CHIP_RATE_RUPEES,
  completedTxIds: string[] = []
): SettlementResult => {
  const completedSet = new Set(completedTxIds);
  let totalBuyIns = 0;
  let totalCashOut = 0;

  // 1. Calculate totals for each player in chips & rupees
  const rawPlayerSummaries = players.map((p) => {
    const totalBuyIn = p.buyIns.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
    const finalChips = p.finalChips !== null ? Number(p.finalChips) : 0;
    const netChips = finalChips - totalBuyIn;
    const totalBuyInRupees = Math.round(totalBuyIn * chipRateRupees * 100) / 100;
    const finalRupees = Math.round(finalChips * chipRateRupees * 100) / 100;
    const netRupees = Math.round(netChips * chipRateRupees * 100) / 100;
    const rebuyCount = Math.max(0, p.buyIns.length - 1);
    const roiPercent = totalBuyIn > 0 ? (netChips / totalBuyIn) * 100 : 0;

    totalBuyIns += totalBuyIn;
    totalCashOut += finalChips;

    return {
      id: p.id,
      name: p.name,
      avatarPreset: p.avatarPreset || "default",
      totalBuyIn,
      totalBuyInRupees,
      rebuyCount,
      finalChips,
      finalRupees,
      netChips,
      netRupees,
      roiPercent,
      isWinner: netChips > 0,
      isEven: netChips === 0,
      isShark: false,
      isWhale: false,
    };
  });

  const totalBuyInsRupees = Math.round(totalBuyIns * chipRateRupees * 100) / 100;
  const totalCashOutRupees = Math.round(totalCashOut * chipRateRupees * 100) / 100;
  const discrepancy = Math.round((totalCashOut - totalBuyIns) * 100) / 100;
  const discrepancyRupees = Math.round(discrepancy * chipRateRupees * 100) / 100;
  const isBalanced = Math.abs(discrepancy) < 0.01;

  // Determine highest winner (Shark) and biggest buy-in / donor (Whale)
  let maxNetChips = 0;
  let maxBuyInChips = 0;
  rawPlayerSummaries.forEach((p) => {
    if (p.netChips > maxNetChips) maxNetChips = p.netChips;
    if (p.totalBuyIn > maxBuyInChips) maxBuyInChips = p.totalBuyIn;
  });

  const playerSummaries: PlayerSettlementSummary[] = rawPlayerSummaries.map((p) => ({
    ...p,
    isShark: maxNetChips > 0 && p.netChips === maxNetChips,
    isWhale: p.totalBuyIn === maxBuyInChips && (p.rebuyCount > 0 || p.netChips < 0),
  }));

  // Sort by net earnings descending
  playerSummaries.sort((a, b) => b.netChips - a.netChips);

  // 2. Minimum Cash Flow Algorithm (Who Pays Whom)
  interface Balancer {
    id: string;
    name: string;
    avatarPreset: string;
    chipsAmount: number; // positive = creditor (receives), negative = debtor (pays)
  }

  const creditors: Balancer[] = [];
  const debtors: Balancer[] = [];

  playerSummaries.forEach((p) => {
    const roundedNet = Math.round(p.netChips * 100) / 100;
    if (roundedNet > 0.009) {
      creditors.push({ id: p.id, name: p.name, avatarPreset: p.avatarPreset, chipsAmount: roundedNet });
    } else if (roundedNet < -0.009) {
      debtors.push({ id: p.id, name: p.name, avatarPreset: p.avatarPreset, chipsAmount: Math.abs(roundedNet) });
    }
  });

  // Sort descending by amount
  creditors.sort((a, b) => b.chipsAmount - a.chipsAmount);
  debtors.sort((a, b) => b.chipsAmount - a.chipsAmount);

  const transactions: SettlementTransaction[] = [];

  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const payChips = Math.min(debtor.chipsAmount, creditor.chipsAmount);
    const roundedChips = Math.round(payChips * 100) / 100;
    const roundedRupees = Math.round(roundedChips * chipRateRupees * 100) / 100;

    if (roundedChips > 0.009) {
      const txId = `tx_${debtor.id}_${creditor.id}_${roundedChips}`;
      transactions.push({
        id: txId,
        fromPlayerId: debtor.id,
        fromPlayerName: debtor.name,
        fromAvatarPreset: debtor.avatarPreset,
        toPlayerId: creditor.id,
        toPlayerName: creditor.name,
        toAvatarPreset: creditor.avatarPreset,
        chipAmount: roundedChips,
        rupeeAmount: roundedRupees,
        isCompleted: completedSet.has(txId),
      });
    }

    debtor.chipsAmount = Math.round((debtor.chipsAmount - payChips) * 100) / 100;
    creditor.chipsAmount = Math.round((creditor.chipsAmount - payChips) * 100) / 100;

    if (debtor.chipsAmount <= 0.009) dIdx++;
    if (creditor.chipsAmount <= 0.009) cIdx++;
  }

  return {
    totalBuyIns,
    totalBuyInsRupees,
    totalCashOut,
    totalCashOutRupees,
    discrepancy,
    discrepancyRupees,
    isBalanced,
    players: playerSummaries,
    transactions,
  };
};

/**
 * Format settlement results into a clean, copyable WhatsApp / Telegram / UPI settlement text.
 */
export const formatSettlementReceipt = (
  session: PokerLedgerSession,
  settlement: SettlementResult
): string => {
  const { title, chipRateRupees } = session;
  const dateStr = new Date(session.updatedAt || session.createdAt).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const lines: string[] = [];
  lines.push(`🎰 *${title.toUpperCase()}* ♠️`);
  lines.push(`📅 ${dateStr}`);
  lines.push(`🪙 Rate: 1 chip = ₹${chipRateRupees} | Default Buy-in: ${session.defaultBuyIn} chips`);
  lines.push(`💰 Total Pot: ${settlement.totalBuyIns.toLocaleString()} chips (${formatRupees(settlement.totalBuyInsRupees)})`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━`);

  lines.push(`🏆 *FINAL STANDINGS & NET (RUPEES):*`);
  settlement.players.forEach((p, idx) => {
    const rank = idx + 1;
    let badge = "";
    if (p.isShark) badge = " 🦈 Shark";
    else if (p.isWhale) badge = " 🐳 Sponsor";
    else if (p.isEven) badge = " ⚖️ Even";

    const netRupeeStr = formatRupees(p.netRupees, { includeSign: true });
    const netChipsStr = formatChips(p.netChips, { includeSign: true });

    lines.push(
      `${rank}. *${p.name}*: ${netRupeeStr} (${netChipsStr})${badge}\n   └ In: ${p.totalBuyIn} chips | Out: ${p.finalChips} chips`
    );
  });

  lines.push(`━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`💸 *WHO PAYS WHOM (SETTLE VIA UPI / CASH):*`);

  if (settlement.transactions.length === 0) {
    lines.push(`All players broke even or settled! No transactions needed.`);
  } else {
    settlement.transactions.forEach((tx) => {
      const check = tx.isCompleted ? "✅ [PAID]" : "⏳ [PENDING]";
      lines.push(`${check} *${tx.fromPlayerName}* ➡️ pays *${tx.toPlayerName}*: *${formatRupees(tx.rupeeAmount)}* (${formatChips(tx.chipAmount)})`);
    });
  }

  if (!settlement.isBalanced) {
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(
      `⚠️ Note: Pot discrepancy of ${formatChips(Math.abs(settlement.discrepancy))} (${formatRupees(Math.abs(settlement.discrepancyRupees))}) (${
        settlement.discrepancy > 0 ? "Surplus chips" : "Missing chips"
      })`
    );
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`⚡ Coup Champs Poker Ledger`);

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
      if (parsed && Array.isArray(parsed.players)) {
        // If stored session had the hardcoded placeholder players ("Alex", "Sam", "Jordan", "Taylor"), clear them!
        const dummyNames = new Set(["Alex", "Sam", "Jordan", "Taylor"]);
        const hasOnlyDummy =
          parsed.players.length === 4 &&
          parsed.players.every((p: any) => dummyNames.has(p.name));

        if (hasOnlyDummy) {
          parsed.players = [];
        }

        parsed.defaultBuyIn = parsed.defaultBuyIn || DEFAULT_BUY_IN;
        parsed.chipRateRupees = parsed.chipRateRupees !== undefined ? parsed.chipRateRupees : DEFAULT_CHIP_RATE_RUPEES;
        parsed.currency = "chips";
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
      updatedHistory = [sessionToSave, ...history].slice(0, 30);
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
