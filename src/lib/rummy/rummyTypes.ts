export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  rank: Rank;
  isJoker?: boolean;
}

export interface RummyPlayer {
  id: string;
  name: string;
  cards: Card[];
  points: number;
  hasDropped: boolean;
  hasDeclared: boolean;
  isActive: boolean;
  isTurn: boolean;
  melds: Meld[];
}

export interface Meld {
  cards: Card[];
  type: 'set' | 'run';
  isPure: boolean; // No jokers used
}

export type GamePhase = 'waiting' | 'playing' | 'declaring' | 'finished';

export interface RummyGameState {
  players: RummyPlayer[];
  deck: Card[];
  discardPile: Card[];
  openJoker: Card | null;
  currentPlayerIndex: number;
  phase: GamePhase;
  winner: string | null;
  roundNumber: number;
  message: string;
  lastAction: { playerId: string; action: string; card?: Card } | null;
  hasDrawn: boolean; // Whether current player has drawn
}

export type RummyAction = 'draw-deck' | 'draw-discard' | 'discard' | 'declare' | 'drop';

export const RANK_VALUES: Record<Rank, number> = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 10, 'Q': 10, 'K': 10,
};

export const RANK_ORDER: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
