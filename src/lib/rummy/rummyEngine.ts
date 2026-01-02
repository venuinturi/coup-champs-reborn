import {
  Card,
  Suit,
  Rank,
  RummyPlayer,
  Meld,
  RummyGameState,
  RANK_VALUES,
  RANK_ORDER,
} from './rummyTypes';

// Create deck with 2 standard decks + jokers (Indian Rummy style)
export const createDeck = (): Card[] => {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck: Card[] = [];

  // 2 standard decks
  for (let d = 0; d < 2; d++) {
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({ suit, rank });
      }
    }
  }

  // Add printed jokers (4 total for 2 decks)
  for (let i = 0; i < 4; i++) {
    deck.push({ suit: 'spades', rank: 'A', isJoker: true });
  }

  return shuffleDeck(deck);
};

// Fisher-Yates shuffle
export const shuffleDeck = (deck: Card[]): Card[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

// Create initial game state
export const createRummyGame = (
  playerData: { id: string; name: string }[]
): RummyGameState => {
  let deck = createDeck();
  
  // Draw open joker (wild card)
  const openJoker = deck.pop()!;

  const players: RummyPlayer[] = playerData.map((p) => ({
    id: p.id,
    name: p.name,
    cards: [],
    points: 0,
    hasDropped: false,
    hasDeclared: false,
    isActive: true,
    isTurn: false,
    melds: [],
  }));

  // Deal 13 cards to each player
  for (let i = 0; i < 13; i++) {
    for (const player of players) {
      const card = deck.pop()!;
      const playerIndex = players.findIndex(p => p.id === player.id);
      players[playerIndex].cards.push(card);
    }
  }

  // Put one card in discard pile
  const firstDiscard = deck.pop()!;

  // First player starts
  players[0].isTurn = true;

  return {
    players,
    deck,
    discardPile: [firstDiscard],
    openJoker,
    currentPlayerIndex: 0,
    phase: 'playing',
    winner: null,
    roundNumber: 1,
    message: `${players[0].name}'s turn - Draw a card`,
    lastAction: null,
    hasDrawn: false,
  };
};

// Check if a card is a joker (printed or wild)
export const isJoker = (card: Card, openJoker: Card | null): boolean => {
  if (card.isJoker) return true;
  if (!openJoker) return false;
  
  // All cards of the same rank as the open joker are wild
  return card.rank === openJoker.rank;
};

// Validate a set (3-4 cards of same rank, different suits)
export const isValidSet = (cards: Card[], openJoker: Card | null): { valid: boolean; isPure: boolean } => {
  if (cards.length < 3 || cards.length > 4) return { valid: false, isPure: false };

  const nonJokerCards = cards.filter(c => !isJoker(c, openJoker));
  const jokerCount = cards.length - nonJokerCards.length;

  if (nonJokerCards.length === 0) return { valid: false, isPure: false };

  // All non-joker cards must have same rank
  const rank = nonJokerCards[0].rank;
  if (!nonJokerCards.every(c => c.rank === rank)) return { valid: false, isPure: false };

  // All non-joker cards must have different suits
  const suits = new Set(nonJokerCards.map(c => c.suit));
  if (suits.size !== nonJokerCards.length) return { valid: false, isPure: false };

  return { valid: true, isPure: jokerCount === 0 };
};

// Validate a run/sequence (3+ consecutive cards of same suit)
export const isValidRun = (cards: Card[], openJoker: Card | null): { valid: boolean; isPure: boolean } => {
  if (cards.length < 3) return { valid: false, isPure: false };

  const nonJokerCards = cards.filter(c => !isJoker(c, openJoker));
  const jokerCount = cards.length - nonJokerCards.length;

  if (nonJokerCards.length === 0) return { valid: false, isPure: false };

  // All non-joker cards must have same suit
  const suit = nonJokerCards[0].suit;
  if (!nonJokerCards.every(c => c.suit === suit)) return { valid: false, isPure: false };

  // Get positions in rank order
  const positions = nonJokerCards.map(c => RANK_ORDER.indexOf(c.rank)).sort((a, b) => a - b);

  // Check if consecutive with jokers filling gaps
  let jokersNeeded = 0;
  for (let i = 1; i < positions.length; i++) {
    const gap = positions[i] - positions[i - 1] - 1;
    if (gap < 0) return { valid: false, isPure: false }; // Duplicate
    jokersNeeded += gap;
  }

  // Check if we have enough jokers
  if (jokersNeeded > jokerCount) return { valid: false, isPure: false };

  return { valid: true, isPure: jokerCount === 0 };
};

// Validate a meld (either set or run)
export const validateMeld = (cards: Card[], openJoker: Card | null): { valid: boolean; type: 'set' | 'run' | null; isPure: boolean } => {
  const setResult = isValidSet(cards, openJoker);
  if (setResult.valid) {
    return { valid: true, type: 'set', isPure: setResult.isPure };
  }

  const runResult = isValidRun(cards, openJoker);
  if (runResult.valid) {
    return { valid: true, type: 'run', isPure: runResult.isPure };
  }

  return { valid: false, type: null, isPure: false };
};

// Calculate points for cards in hand (unmelded cards)
export const calculatePoints = (cards: Card[], openJoker: Card | null): number => {
  return cards.reduce((total, card) => {
    if (isJoker(card, openJoker)) return total; // Jokers are 0 points
    return total + RANK_VALUES[card.rank];
  }, 0);
};

// Check if a declaration is valid
export const isValidDeclaration = (melds: Meld[], cards: Card[], openJoker: Card | null): { valid: boolean; reason: string } => {
  // All cards must be in melds
  const meldedCardCount = melds.reduce((sum, m) => sum + m.cards.length, 0);
  if (meldedCardCount !== cards.length) {
    return { valid: false, reason: 'All cards must be in valid melds' };
  }

  // Must have at least 2 runs (sequences)
  const runs = melds.filter(m => m.type === 'run');
  if (runs.length < 2) {
    return { valid: false, reason: 'Need at least 2 sequences (runs)' };
  }

  // Must have at least 1 pure run (no jokers)
  const pureRuns = runs.filter(m => m.isPure);
  if (pureRuns.length < 1) {
    return { valid: false, reason: 'Need at least 1 pure sequence (no jokers)' };
  }

  // All melds must be valid
  for (const meld of melds) {
    const result = validateMeld(meld.cards, openJoker);
    if (!result.valid) {
      return { valid: false, reason: 'Invalid meld detected' };
    }
  }

  return { valid: true, reason: 'Valid declaration' };
};

// Draw from deck
export const drawFromDeck = (state: RummyGameState, playerId: string): RummyGameState => {
  if (state.phase !== 'playing') return state;
  if (state.hasDrawn) return state;

  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1 || !state.players[playerIndex].isTurn) return state;

  let newState = { ...state, deck: [...state.deck] };
  
  // Reshuffle discard pile if deck is empty
  if (newState.deck.length === 0) {
    const topDiscard = newState.discardPile.pop()!;
    newState.deck = shuffleDeck(newState.discardPile);
    newState.discardPile = [topDiscard];
  }

  const card = newState.deck.pop()!;
  newState.players[playerIndex] = {
    ...newState.players[playerIndex],
    cards: [...newState.players[playerIndex].cards, card],
  };

  newState.hasDrawn = true;
  newState.message = `${state.players[playerIndex].name} drew from deck - now discard a card`;
  newState.lastAction = { playerId, action: 'draw-deck' };

  return newState;
};

// Draw from discard pile
export const drawFromDiscard = (state: RummyGameState, playerId: string): RummyGameState => {
  if (state.phase !== 'playing') return state;
  if (state.hasDrawn) return state;
  if (state.discardPile.length === 0) return state;

  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1 || !state.players[playerIndex].isTurn) return state;

  const newState = { ...state, discardPile: [...state.discardPile] };
  const card = newState.discardPile.pop()!;
  
  newState.players[playerIndex] = {
    ...newState.players[playerIndex],
    cards: [...newState.players[playerIndex].cards, card],
  };

  newState.hasDrawn = true;
  newState.message = `${state.players[playerIndex].name} picked up ${card.rank} of ${card.suit} - now discard a card`;
  newState.lastAction = { playerId, action: 'draw-discard', card };

  return newState;
};

// Discard a card
export const discardCard = (state: RummyGameState, playerId: string, cardIndex: number): RummyGameState => {
  if (state.phase !== 'playing') return state;
  if (!state.hasDrawn) return state;

  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1 || !state.players[playerIndex].isTurn) return state;

  const player = state.players[playerIndex];
  if (cardIndex < 0 || cardIndex >= player.cards.length) return state;

  const newState = { ...state, discardPile: [...state.discardPile] };
  const discardedCard = player.cards[cardIndex];
  
  const newCards = [...player.cards];
  newCards.splice(cardIndex, 1);

  newState.players[playerIndex] = {
    ...player,
    cards: newCards,
  };
  newState.discardPile.push(discardedCard);

  // Move to next player
  newState.hasDrawn = false;
  newState.players = newState.players.map(p => ({ ...p, isTurn: false }));
  
  const nextPlayerIndex = findNextActivePlayer(newState.players, playerIndex);
  newState.currentPlayerIndex = nextPlayerIndex;
  newState.players[nextPlayerIndex] = {
    ...newState.players[nextPlayerIndex],
    isTurn: true,
  };

  newState.message = `${newState.players[nextPlayerIndex].name}'s turn - Draw a card`;
  newState.lastAction = { playerId, action: 'discard', card: discardedCard };

  return newState;
};

// Find next active player
const findNextActivePlayer = (players: RummyPlayer[], currentIndex: number): number => {
  let index = (currentIndex + 1) % players.length;
  for (let i = 0; i < players.length; i++) {
    if (players[index].isActive && !players[index].hasDropped) {
      return index;
    }
    index = (index + 1) % players.length;
  }
  return currentIndex;
};

// Drop from game (first turn = 20 points, middle drop = 40 points)
export const dropFromGame = (state: RummyGameState, playerId: string): RummyGameState => {
  if (state.phase !== 'playing') return state;

  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1 || !state.players[playerIndex].isTurn) return state;

  const newState = { ...state };
  const isFirstTurn = !state.hasDrawn && state.lastAction === null;
  const dropPoints = isFirstTurn ? 20 : 40;

  newState.players[playerIndex] = {
    ...newState.players[playerIndex],
    hasDropped: true,
    points: dropPoints,
    isTurn: false,
  };

  // Check if only one player left
  const activePlayers = newState.players.filter(p => p.isActive && !p.hasDropped);
  if (activePlayers.length === 1) {
    newState.winner = activePlayers[0].id;
    newState.phase = 'finished';
    newState.message = `${activePlayers[0].name} wins!`;
    return newState;
  }

  // Move to next player
  const nextPlayerIndex = findNextActivePlayer(newState.players, playerIndex);
  newState.currentPlayerIndex = nextPlayerIndex;
  newState.players[nextPlayerIndex] = {
    ...newState.players[nextPlayerIndex],
    isTurn: true,
  };

  newState.hasDrawn = false;
  newState.message = `${state.players[playerIndex].name} dropped (${dropPoints} points) - ${newState.players[nextPlayerIndex].name}'s turn`;
  newState.lastAction = { playerId, action: 'drop' };

  return newState;
};

// Declare (attempt to show cards and win)
export const declareGame = (state: RummyGameState, playerId: string, melds: Meld[]): RummyGameState => {
  if (state.phase !== 'playing') return state;

  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1 || !state.players[playerIndex].isTurn) return state;
  if (!state.hasDrawn) return state; // Must draw before declaring

  const player = state.players[playerIndex];
  const validationResult = isValidDeclaration(melds, player.cards, state.openJoker);

  const newState = { ...state };

  if (validationResult.valid) {
    // Valid declaration - player wins
    newState.winner = playerId;
    newState.phase = 'finished';
    newState.players[playerIndex] = {
      ...player,
      hasDeclared: true,
      melds,
      points: 0,
    };

    // Calculate points for other players
    newState.players = newState.players.map(p => {
      if (p.id === playerId || p.hasDropped) return p;
      const points = Math.min(80, calculatePoints(p.cards, state.openJoker));
      return { ...p, points };
    });

    newState.message = `${player.name} declares and wins!`;
  } else {
    // Invalid declaration - penalty (80 points)
    newState.players[playerIndex] = {
      ...player,
      hasDeclared: true,
      hasDropped: true,
      points: 80,
    };

    // Check if only one player left
    const activePlayers = newState.players.filter(p => p.isActive && !p.hasDropped);
    if (activePlayers.length === 1) {
      newState.winner = activePlayers[0].id;
      newState.phase = 'finished';
      newState.message = `Invalid declaration! ${player.name} gets 80 points. ${activePlayers[0].name} wins!`;
    } else {
      // Move to next player
      const nextPlayerIndex = findNextActivePlayer(newState.players, playerIndex);
      newState.currentPlayerIndex = nextPlayerIndex;
      newState.players[nextPlayerIndex] = {
        ...newState.players[nextPlayerIndex],
        isTurn: true,
      };
      newState.hasDrawn = false;
      newState.message = `Invalid declaration! ${validationResult.reason}. ${player.name} gets 80 points.`;
    }
  }

  newState.lastAction = { playerId, action: 'declare' };

  return newState;
};

// Sort cards for display (by suit, then by rank)
export const sortCards = (cards: Card[], openJoker: Card | null): Card[] => {
  return [...cards].sort((a, b) => {
    // Jokers first
    const aIsJoker = isJoker(a, openJoker);
    const bIsJoker = isJoker(b, openJoker);
    if (aIsJoker && !bIsJoker) return -1;
    if (!aIsJoker && bIsJoker) return 1;

    // Then by suit
    const suitOrder = ['hearts', 'diamonds', 'clubs', 'spades'];
    const suitDiff = suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
    if (suitDiff !== 0) return suitDiff;

    // Then by rank
    return RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank);
  });
};

// Get available actions for a player
export const getAvailableActions = (state: RummyGameState, playerId: string): string[] => {
  if (state.phase !== 'playing') return [];
  
  const player = state.players.find(p => p.id === playerId);
  if (!player || !player.isTurn) return [];

  const actions: string[] = ['drop'];

  if (!state.hasDrawn) {
    actions.push('draw-deck', 'draw-discard');
  } else {
    actions.push('discard', 'declare');
  }

  return actions;
};
