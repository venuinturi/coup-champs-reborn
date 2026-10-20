import { supabase } from "@/integrations/supabase/client";
import { getBrowserId } from "./browserId";

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
  finalChips: number | string | null;
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
  isEnded?: boolean;
  roomCode?: string;
  cloudRoomId?: string;
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
  const buyIn = initialBuyIn && initialBuyIn !== 1000 ? initialBuyIn : DEFAULT_BUY_IN;
  return {
    id: `player_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim(),
    avatarPreset: avatar,
    buyIns: [
      {
        id: `bi_${Date.now()}_0`,
        amount: buyIn,
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
    const parsedFinal = p.finalChips !== null && p.finalChips !== "" ? Number(p.finalChips) : 0;
    const finalChips = isNaN(parsedFinal) ? 0 : parsedFinal;
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
      `${rank}. *${p.name}*: ${netRupeeStr} (${netChipsStr})${badge}\n   └ In: ${p.totalBuyIn} chips | Out: ${formatChips(p.finalChips)}`
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

// Storage keys - bumped to v4 to ensure clean slate with zero past/default players
const STORAGE_CURRENT_SESSION = "coup_champs_poker_active_table_v4";
const STORAGE_SESSION_HISTORY = "coup_champs_poker_ledger_history";

export const clearActiveSession = (): void => {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.removeItem(STORAGE_CURRENT_SESSION);
      localStorage.removeItem("coup_champs_poker_current_ledger");
      localStorage.removeItem("coup_champs_poker_current_ledger_v2");
      localStorage.removeItem("coup_champs_poker_current_ledger_v3");
    }
  } catch (e) {
    console.error("Failed to clear current poker session", e);
  }
};

export const loadCurrentSession = (): PokerLedgerSession => {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      // Purge any stale legacy keys immediately
      localStorage.removeItem("coup_champs_poker_current_ledger");
      localStorage.removeItem("coup_champs_poker_current_ledger_v2");
      localStorage.removeItem("coup_champs_poker_current_ledger_v3");
    }

    const raw = localStorage.getItem(STORAGE_CURRENT_SESSION);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.players)) {
        // If the session was finished/ended, do NOT restore past players to active table!
        if (parsed.isEnded) {
          clearActiveSession();
          return createDefaultSession();
        }

        // Filter out any dummy placeholder names
        const bannedNames = new Set(["alex", "sam", "jordan", "taylor", "player 1", "player 2", "player 3", "player 4"]);
        parsed.players = parsed.players.filter(
          (p: any) => p && p.name && !bannedNames.has(String(p.name).trim().toLowerCase())
        );

        // Normalize defaultBuyIn to 400 (if empty or stale 1000)
        if (!parsed.defaultBuyIn || parsed.defaultBuyIn === 1000) {
          parsed.defaultBuyIn = DEFAULT_BUY_IN;
        }

        // Normalize any player buyIns that were stored with stale 1000
        parsed.players = parsed.players.map((p: any) => ({
          ...p,
          buyIns: (p.buyIns || []).map((b: any) => ({
            ...b,
            amount: b.amount === 1000 ? DEFAULT_BUY_IN : b.amount,
          })),
        }));

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
    // If the game has ended or players array is empty, wipe from active table storage
    if (session.isEnded || session.players.length === 0) {
      clearActiveSession();
      return;
    }
    localStorage.setItem(
      STORAGE_CURRENT_SESSION,
      JSON.stringify({ ...session, updatedAt: Date.now() })
    );
  } catch (e) {
    console.error("Failed to save current poker session", e);
  }
};

const STORAGE_DELETED_SNAPSHOTS = "poker_ledger_deleted_snapshots_v1";

export const getDeletedSnapshotIds = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_DELETED_SNAPSHOTS);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return list;
    }
  } catch {}
  return [];
};

export const markSnapshotAsDeletedLocally = (
  id?: string,
  roomCode?: string,
  cloudRoomId?: string
) => {
  try {
    const existing = getDeletedSnapshotIds();
    const set = new Set(existing);
    if (id) set.add(id);
    if (roomCode) set.add(roomCode);
    if (cloudRoomId) set.add(cloudRoomId);
    localStorage.setItem(STORAGE_DELETED_SNAPSHOTS, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.error("Failed to mark snapshot as deleted", e);
  }
};

export const loadSessionHistory = (): PokerLedgerSession[] => {
  try {
    const raw = localStorage.getItem(STORAGE_SESSION_HISTORY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        const deletedIds = new Set(getDeletedSnapshotIds());
        return list.filter(
          (s) =>
            !deletedIds.has(s.id) &&
            (!s.roomCode || !deletedIds.has(s.roomCode)) &&
            (!s.cloudRoomId || !deletedIds.has(s.cloudRoomId))
        );
      }
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
    const sessionToSave = { ...session, isEnded: true, updatedAt: Date.now() };

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

export const deleteSessionFromHistory = (
  sessionId: string,
  roomCode?: string,
  cloudRoomId?: string
): PokerLedgerSession[] => {
  try {
    markSnapshotAsDeletedLocally(sessionId, roomCode, cloudRoomId);
    const history = loadSessionHistory();
    const filtered = history.filter(
      (s) =>
        s.id !== sessionId &&
        (!roomCode || s.roomCode !== roomCode) &&
        (!cloudRoomId || s.cloudRoomId !== cloudRoomId)
    );
    localStorage.setItem(STORAGE_SESSION_HISTORY, JSON.stringify(filtered));
    return filtered;
  } catch (e) {
    console.error("Failed to delete session from history", e);
    return [];
  }
};

// Permanently delete or tombstone snapshot from Supabase game_rooms
export const deleteSnapshotFromCloud = async (
  sessionId: string,
  roomCode?: string,
  cloudRoomId?: string
): Promise<boolean> => {
  try {
    markSnapshotAsDeletedLocally(sessionId, roomCode, cloudRoomId);

    // 1. Delete or mark deleted by cloudRoomId (the UUID primary key in game_rooms)
    if (cloudRoomId) {
      const { error: delErr } = await supabase.from("game_rooms").delete().eq("id", cloudRoomId);
      if (delErr) {
        // Fallback update to status: 'deleted' if direct delete is blocked by RLS
        await supabase
          .from("game_rooms")
          .update({
            status: "deleted",
            game_state: { type: "poker_ledger", is_deleted: true } as any,
            updated_at: new Date().toISOString(),
          })
          .eq("id", cloudRoomId);
      }
    }

    // 2. Delete or mark deleted by roomCode
    if (roomCode) {
      const { error: codeErr } = await supabase.from("game_rooms").delete().eq("room_code", roomCode);
      if (codeErr) {
        await supabase
          .from("game_rooms")
          .update({
            status: "deleted",
            game_state: { type: "poker_ledger", is_deleted: true } as any,
            updated_at: new Date().toISOString(),
          })
          .eq("room_code", roomCode);
      }
    }

    // 3. Fallback: if sessionId is UUID and distinct
    if (sessionId && sessionId !== cloudRoomId && !sessionId.startsWith("session_") && !sessionId.startsWith("sess_")) {
      await supabase.from("game_rooms").delete().eq("id", sessionId);
    }

    return true;
  } catch (err) {
    console.error("Failed to delete snapshot from cloud:", err);
    return false;
  }
};

// Save snapshot to Supabase game_rooms so it's accessible to all users across devices
export const saveSnapshotToCloud = async (
  session: PokerLedgerSession,
  existingRoomCode?: string
): Promise<string | null> => {
  try {
    const code = existingRoomCode || session.roomCode;
    const sessionToSave: PokerLedgerSession = {
      ...session,
      isEnded: true,
      updatedAt: Date.now(),
      roomCode: code || session.roomCode,
    };

    // If game has a room code, update that room in game_rooms
    if (code) {
      const { error } = await supabase
        .from("game_rooms")
        .update({
          host_name: session.title,
          status: "finished",
          game_state: {
            type: "poker_ledger",
            room_name: session.title,
            session_data: sessionToSave,
            is_snapshot: true,
          } as any,
          updated_at: new Date().toISOString(),
        })
        .eq("room_code", code);

      if (!error) return code;
    }

    // Otherwise create a new snapshot room record in game_rooms
    let uid = getBrowserId();
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (authSession?.user?.id) uid = authSession.user.id;
    } catch {}

    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let snapCode = "PK";
    for (let i = 0; i < 4; i++) snapCode += chars[Math.floor(Math.random() * chars.length)];

    const snapSession = { ...sessionToSave, roomCode: snapCode };
    const { data: newRoom, error: insertError } = await supabase
      .from("game_rooms")
      .insert({
        room_code: snapCode,
        host_id: uid,
        host_name: session.title,
        status: "finished",
        max_players: 20,
        game_state: {
          type: "poker_ledger",
          room_name: session.title,
          session_data: snapSession,
          is_snapshot: true,
        } as any,
      })
      .select()
      .single();

    if (!insertError && newRoom) {
      return snapCode;
    }
  } catch (err) {
    console.error("Failed to save snapshot to cloud:", err);
  }
  return null;
};

// Fetch all saved cloud snapshots from game_rooms for public access
export const fetchSavedSnapshots = async (): Promise<PokerLedgerSession[]> => {
  try {
    const deletedIds = new Set(getDeletedSnapshotIds());

    const { data, error } = await supabase
      .from("game_rooms")
      .select("*")
      .neq("status", "deleted")
      .order("updated_at", { ascending: false })
      .limit(50);

    if (error || !data) {
      return loadSessionHistory();
    }

    const cloudSessions: PokerLedgerSession[] = [];
    for (const row of data) {
      if (row.status === "deleted") continue;
      if (deletedIds.has(row.id) || (row.room_code && deletedIds.has(row.room_code))) continue;

      const state = (row.game_state || {}) as any;
      if (state.is_deleted) continue;

      if (state.type === "poker_ledger" && state.session_data) {
        const sess = state.session_data as PokerLedgerSession;
        if (deletedIds.has(sess.id) || (sess.roomCode && deletedIds.has(sess.roomCode))) continue;

        if (sess && Array.isArray(sess.players) && sess.players.length > 0) {
          cloudSessions.push({
            ...sess,
            id: sess.id || row.id,
            title: sess.title || state.room_name || row.host_name || "Poker Game",
            roomCode: sess.roomCode || row.room_code,
            cloudRoomId: row.id,
            updatedAt: new Date(row.updated_at || row.created_at).getTime(),
          });
        }
      }
    }

    // Merge with local history cache
    const local = loadSessionHistory();
    const merged = [...cloudSessions];
    for (const loc of local) {
      if (deletedIds.has(loc.id) || (loc.roomCode && deletedIds.has(loc.roomCode))) continue;
      const exists = merged.some(
        (m) =>
          m.id === loc.id ||
          (m.cloudRoomId && loc.cloudRoomId && m.cloudRoomId === loc.cloudRoomId) ||
          (m.roomCode && loc.roomCode && m.roomCode === loc.roomCode)
      );
      if (!exists) merged.push(loc);
    }

    merged.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
    return merged;
  } catch (err) {
    console.warn("Failed to fetch cloud snapshots:", err);
    return loadSessionHistory();
  }
};
