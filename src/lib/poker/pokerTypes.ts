export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

export interface PokerPlayer {
  id: string;
  name: string;
  chips: number;
  cards: Card[];
  currentBet: number;
  totalBet: number;
  folded: boolean;
  isAllIn: boolean;
  isActive: boolean;
  isDealer: boolean;
  isTurn: boolean;
  hasActed: boolean;
}

export type BettingRound = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
export type GamePhase = 'waiting' | 'dealing' | 'betting' | 'showdown' | 'finished';

export interface PokerGameState {
  players: PokerPlayer[];
  deck: Card[];
  communityCards: Card[];
  pot: number;
  sidePots: { amount: number; eligiblePlayerIds: string[] }[];
  currentBet: number;
  minRaise: number;
  dealerIndex: number;
  currentPlayerIndex: number;
  bettingRound: BettingRound;
  phase: GamePhase;
  winner: string | null;
  winningHand: string | null;
  smallBlind: number;
  bigBlind: number;
  lastAction: { playerId: string; action: string; amount?: number } | null;
}

export type PokerAction = 'fold' | 'check' | 'call' | 'raise' | 'all-in';

export interface HandRank {
  rank: number;
  name: string;
  highCards: number[];
}

export const HAND_RANKINGS = {
  ROYAL_FLUSH: 10,
  STRAIGHT_FLUSH: 9,
  FOUR_OF_A_KIND: 8,
  FULL_HOUSE: 7,
  FLUSH: 6,
  STRAIGHT: 5,
  THREE_OF_A_KIND: 4,
  TWO_PAIR: 3,
  ONE_PAIR: 2,
  HIGH_CARD: 1,
};

export const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};
