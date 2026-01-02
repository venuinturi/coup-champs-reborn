export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

export interface BlackjackPlayer {
  id: string;
  name: string;
  chips: number;
  cards: Card[];
  currentBet: number;
  handValue: number;
  isBusted: boolean;
  isStanding: boolean;
  hasBlackjack: boolean;
  isActive: boolean;
  isTurn: boolean;
  result: 'win' | 'lose' | 'push' | 'blackjack' | null;
}

export interface DealerHand {
  cards: Card[];
  handValue: number;
  isBusted: boolean;
  isStanding: boolean;
  hasBlackjack: boolean;
}

export type GamePhase = 'betting' | 'dealing' | 'playing' | 'dealer' | 'results' | 'waiting';

export interface BlackjackGameState {
  players: BlackjackPlayer[];
  dealer: DealerHand;
  deck: Card[];
  currentPlayerIndex: number;
  phase: GamePhase;
  minBet: number;
  maxBet: number;
  roundNumber: number;
  message: string;
}

export type BlackjackAction = 'hit' | 'stand' | 'double' | 'split';

export const CARD_VALUES: Record<Rank, number[]> = {
  '2': [2], '3': [3], '4': [4], '5': [5], '6': [6], '7': [7], '8': [8], '9': [9], '10': [10],
  'J': [10], 'Q': [10], 'K': [10], 'A': [1, 11],
};
