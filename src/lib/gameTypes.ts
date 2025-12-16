// Character types in COUP
export type Character = 'Duke' | 'Assassin' | 'Captain' | 'Ambassador' | 'Contessa';

// All possible actions
export type ActionType = 
  | 'income'      // Take 1 coin (unblockable)
  | 'foreign_aid' // Take 2 coins (blocked by Duke)
  | 'coup'        // Pay 7 coins to eliminate (unblockable)
  | 'tax'         // Take 3 coins (Duke)
  | 'assassinate' // Pay 3 coins to eliminate (Assassin, blocked by Contessa)
  | 'steal'       // Take 2 coins from target (Captain, blocked by Captain/Ambassador)
  | 'exchange';   // Exchange cards with deck (Ambassador)

// Player state
export interface Player {
  id: string;
  name: string;
  coins: number;
  influences: Character[];  // Face-down cards
  revealedInfluences: Character[]; // Face-up (lost) cards
  isAlive: boolean;
}

// Game action
export interface GameAction {
  type: ActionType;
  playerId: string;
  targetId?: string;
  claimedCharacter?: Character;
}

// Pending action state
export interface PendingAction {
  action: GameAction;
  phase: 'action' | 'challenge_action' | 'block' | 'challenge_block' | 'resolve';
  blockerId?: string;
  blockerCharacter?: Character;
  challengerId?: string;
  waitingForPlayers: string[];
}

// Game state
export interface GameState {
  id: string;
  players: Player[];
  deck: Character[];
  currentPlayerIndex: number;
  pendingAction: PendingAction | null;
  winner: string | null;
  logs: GameLog[];
  phase: 'lobby' | 'playing' | 'finished';
}

// Game log entry
export interface GameLog {
  timestamp: number;
  message: string;
  type: 'action' | 'challenge' | 'block' | 'reveal' | 'system';
}

// Action requirements
export const ACTION_COSTS: Record<ActionType, number> = {
  income: 0,
  foreign_aid: 0,
  coup: 7,
  tax: 0,
  assassinate: 3,
  steal: 0,
  exchange: 0,
};

export const ACTION_CHARACTERS: Record<ActionType, Character | null> = {
  income: null,
  foreign_aid: null,
  coup: null,
  tax: 'Duke',
  assassinate: 'Assassin',
  steal: 'Captain',
  exchange: 'Ambassador',
};

export const BLOCK_CHARACTERS: Partial<Record<ActionType, Character[]>> = {
  foreign_aid: ['Duke'],
  assassinate: ['Contessa'],
  steal: ['Captain', 'Ambassador'],
};

export const CHARACTER_DESCRIPTIONS: Record<Character, string> = {
  Duke: 'Tax: Take 3 coins. Blocks Foreign Aid.',
  Assassin: 'Assassinate: Pay 3 coins to eliminate an influence.',
  Captain: 'Steal: Take 2 coins from another player. Blocks stealing.',
  Ambassador: 'Exchange: Swap cards with the deck. Blocks stealing.',
  Contessa: 'Blocks assassination attempts.',
};
