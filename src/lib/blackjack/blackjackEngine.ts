import {
  Card,
  Suit,
  Rank,
  BlackjackPlayer,
  DealerHand,
  BlackjackGameState,
  BlackjackAction,
  CARD_VALUES,
} from './blackjackTypes';

// Create a standard deck (use 6 decks for casino-style)
export const createDeck = (numDecks: number = 6): Card[] => {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const deck: Card[] = [];

  for (let d = 0; d < numDecks; d++) {
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({ suit, rank, faceUp: true });
      }
    }
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

// Calculate hand value
export const calculateHandValue = (cards: Card[]): number => {
  let value = 0;
  let aces = 0;

  for (const card of cards) {
    if (!card.faceUp) continue;
    
    if (card.rank === 'A') {
      aces++;
      value += 11;
    } else {
      value += CARD_VALUES[card.rank][0];
    }
  }

  // Adjust for aces
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }

  return value;
};

// Check if hand is blackjack
const isBlackjack = (cards: Card[]): boolean => {
  return cards.length === 2 && calculateHandValue(cards) === 21;
};

// Create initial game state
export const createBlackjackGame = (
  playerData: { id: string; name: string }[],
  startingChips: number = 1000,
  minBet: number = 10,
  maxBet: number = 500
): BlackjackGameState => {
  const deck = createDeck();
  
  const players: BlackjackPlayer[] = playerData.map((p) => ({
    id: p.id,
    name: p.name,
    chips: startingChips,
    cards: [],
    currentBet: 0,
    handValue: 0,
    isBusted: false,
    isStanding: false,
    hasBlackjack: false,
    isActive: true,
    isTurn: false,
    result: null,
  }));

  return {
    players,
    dealer: {
      cards: [],
      handValue: 0,
      isBusted: false,
      isStanding: false,
      hasBlackjack: false,
    },
    deck,
    currentPlayerIndex: 0,
    phase: 'betting',
    minBet,
    maxBet,
    roundNumber: 1,
    message: 'Place your bets!',
  };
};

// Place bet
export const placeBet = (state: BlackjackGameState, playerId: string, amount: number): BlackjackGameState => {
  if (state.phase !== 'betting') return state;
  
  const newState = { ...state };
  const playerIndex = newState.players.findIndex(p => p.id === playerId);
  
  if (playerIndex === -1) return state;
  
  const player = newState.players[playerIndex];
  
  if (amount < newState.minBet || amount > newState.maxBet || amount > player.chips) {
    return state;
  }

  newState.players[playerIndex] = {
    ...player,
    currentBet: amount,
    chips: player.chips - amount,
  };

  return newState;
};

// Check if all bets are placed
export const allBetsPlaced = (state: BlackjackGameState): boolean => {
  const activePlayers = state.players.filter(p => p.isActive);
  return activePlayers.every(p => p.currentBet > 0);
};

// Start dealing
export const startDealing = (state: BlackjackGameState): BlackjackGameState => {
  if (state.phase !== 'betting' || !allBetsPlaced(state)) return state;

  let newState: BlackjackGameState = { ...state, deck: [...state.deck], phase: 'dealing' };
  const activePlayers = newState.players.filter(p => p.isActive && p.currentBet > 0);

  // Deal 2 cards to each player
  for (let round = 0; round < 2; round++) {
    for (const player of activePlayers) {
      const card = newState.deck.pop()!;
      const playerIndex = newState.players.findIndex(p => p.id === player.id);
      newState.players[playerIndex] = {
        ...newState.players[playerIndex],
        cards: [...newState.players[playerIndex].cards, card],
      };
    }
    
    // Deal to dealer
    const dealerCard = newState.deck.pop()!;
    newState.dealer = {
      ...newState.dealer,
      cards: [...newState.dealer.cards, { ...dealerCard, faceUp: round === 0 }],
    };
  }

  // Calculate hand values
  newState.players = newState.players.map(p => ({
    ...p,
    handValue: calculateHandValue(p.cards),
    hasBlackjack: isBlackjack(p.cards),
  }));

  newState.dealer = {
    ...newState.dealer,
    handValue: calculateHandValue(newState.dealer.cards),
    hasBlackjack: isBlackjack(newState.dealer.cards),
  };

  // Check for dealer blackjack
  if (newState.dealer.hasBlackjack) {
    // Reveal dealer's hole card
    newState.dealer.cards = newState.dealer.cards.map(c => ({ ...c, faceUp: true }));
    newState.dealer.handValue = calculateHandValue(newState.dealer.cards);
    newState = resolveResults(newState);
    return newState;
  }

  // Find first player to act
  const firstPlayerIndex = newState.players.findIndex(p => 
    p.isActive && p.currentBet > 0 && !p.hasBlackjack
  );

  if (firstPlayerIndex === -1) {
    // All players have blackjack, go to dealer
    newState.phase = 'dealer';
    newState = playDealer(newState);
    return newState;
  }

  newState.currentPlayerIndex = firstPlayerIndex;
  newState.players = newState.players.map((p, i) => ({
    ...p,
    isTurn: i === firstPlayerIndex,
  }));
  newState.phase = 'playing';
  newState.message = `${newState.players[firstPlayerIndex].name}'s turn`;

  return newState;
};

// Player action
export const playerAction = (
  state: BlackjackGameState,
  playerId: string,
  action: BlackjackAction
): BlackjackGameState => {
  if (state.phase !== 'playing') return state;

  let newState = { ...state, deck: [...state.deck] };
  const playerIndex = newState.players.findIndex(p => p.id === playerId);
  
  if (playerIndex === -1 || !newState.players[playerIndex].isTurn) return state;

  const player = newState.players[playerIndex];

  switch (action) {
    case 'hit':
      const card = newState.deck.pop()!;
      const newCards = [...player.cards, card];
      const newValue = calculateHandValue(newCards);
      const isBusted = newValue > 21;

      newState.players[playerIndex] = {
        ...player,
        cards: newCards,
        handValue: newValue,
        isBusted,
        isStanding: isBusted,
      };

      if (isBusted) {
        newState.message = `${player.name} busts!`;
        newState = moveToNextPlayer(newState);
      }
      break;

    case 'stand':
      newState.players[playerIndex] = {
        ...player,
        isStanding: true,
      };
      newState = moveToNextPlayer(newState);
      break;

    case 'double':
      if (player.cards.length !== 2 || player.chips < player.currentBet) return state;
      
      const doubleCard = newState.deck.pop()!;
      const doubleCards = [...player.cards, doubleCard];
      const doubleValue = calculateHandValue(doubleCards);
      const doubleBusted = doubleValue > 21;

      newState.players[playerIndex] = {
        ...player,
        cards: doubleCards,
        handValue: doubleValue,
        isBusted: doubleBusted,
        isStanding: true,
        currentBet: player.currentBet * 2,
        chips: player.chips - player.currentBet,
      };

      if (doubleBusted) {
        newState.message = `${player.name} doubles and busts!`;
      } else {
        newState.message = `${player.name} doubles down`;
      }
      newState = moveToNextPlayer(newState);
      break;
  }

  return newState;
};

// Move to next player
const moveToNextPlayer = (state: BlackjackGameState): BlackjackGameState => {
  let newState = { ...state };
  
  // Find next player who hasn't acted
  let nextIndex = newState.currentPlayerIndex + 1;
  while (nextIndex < newState.players.length) {
    const player = newState.players[nextIndex];
    if (player.isActive && player.currentBet > 0 && !player.isStanding && !player.isBusted && !player.hasBlackjack) {
      break;
    }
    nextIndex++;
  }

  if (nextIndex >= newState.players.length) {
    // All players done, dealer's turn
    newState.phase = 'dealer';
    newState.players = newState.players.map(p => ({ ...p, isTurn: false }));
    newState = playDealer(newState);
    return newState;
  }

  newState.currentPlayerIndex = nextIndex;
  newState.players = newState.players.map((p, i) => ({
    ...p,
    isTurn: i === nextIndex,
  }));
  newState.message = `${newState.players[nextIndex].name}'s turn`;

  return newState;
};

// Play dealer's hand
const playDealer = (state: BlackjackGameState): BlackjackGameState => {
  let newState = { ...state, deck: [...state.deck] };
  
  // Reveal hole card
  newState.dealer.cards = newState.dealer.cards.map(c => ({ ...c, faceUp: true }));
  newState.dealer.handValue = calculateHandValue(newState.dealer.cards);

  // Check if any player is still in (not busted, not blackjack)
  const playersToResolve = newState.players.filter(p => 
    p.isActive && p.currentBet > 0 && !p.isBusted && !p.hasBlackjack
  );

  if (playersToResolve.length === 0) {
    // No players to play against, just resolve
    return resolveResults(newState);
  }

  // Dealer hits on 16 and below, stands on 17+
  while (newState.dealer.handValue < 17) {
    const card = newState.deck.pop()!;
    newState.dealer.cards.push(card);
    newState.dealer.handValue = calculateHandValue(newState.dealer.cards);
  }

  if (newState.dealer.handValue > 21) {
    newState.dealer.isBusted = true;
    newState.message = 'Dealer busts!';
  }

  return resolveResults(newState);
};

// Resolve results and payouts
const resolveResults = (state: BlackjackGameState): BlackjackGameState => {
  const newState = { ...state, phase: 'results' as const };
  const dealerValue = newState.dealer.handValue;
  const dealerBusted = newState.dealer.isBusted;
  const dealerBlackjack = newState.dealer.hasBlackjack;

  newState.players = newState.players.map(player => {
    if (!player.isActive || player.currentBet === 0) return player;

    let result: 'win' | 'lose' | 'push' | 'blackjack' | null = null;
    let winnings = 0;

    if (player.isBusted) {
      result = 'lose';
      // Bet already deducted
    } else if (player.hasBlackjack) {
      if (dealerBlackjack) {
        result = 'push';
        winnings = player.currentBet; // Return bet
      } else {
        result = 'blackjack';
        winnings = player.currentBet + (player.currentBet * 1.5); // 3:2 payout
      }
    } else if (dealerBlackjack) {
      result = 'lose';
    } else if (dealerBusted) {
      result = 'win';
      winnings = player.currentBet * 2;
    } else if (player.handValue > dealerValue) {
      result = 'win';
      winnings = player.currentBet * 2;
    } else if (player.handValue < dealerValue) {
      result = 'lose';
    } else {
      result = 'push';
      winnings = player.currentBet;
    }

    return {
      ...player,
      result,
      chips: player.chips + winnings,
    };
  });

  newState.message = 'Round complete!';

  return newState;
};

// Start new round
export const startNewRound = (state: BlackjackGameState): BlackjackGameState => {
  const newState = { ...state };
  
  // Check deck size, reshuffle if needed
  if (newState.deck.length < 52) {
    newState.deck = createDeck();
  }

  // Reset player states
  newState.players = newState.players.map(p => ({
    ...p,
    cards: [],
    currentBet: 0,
    handValue: 0,
    isBusted: false,
    isStanding: false,
    hasBlackjack: false,
    isTurn: false,
    result: null,
    isActive: p.chips > 0,
  }));

  // Reset dealer
  newState.dealer = {
    cards: [],
    handValue: 0,
    isBusted: false,
    isStanding: false,
    hasBlackjack: false,
  };

  newState.currentPlayerIndex = 0;
  newState.phase = 'betting';
  newState.roundNumber += 1;
  newState.message = 'Place your bets!';

  return newState;
};

// Get available actions for a player
export const getAvailableActions = (state: BlackjackGameState, playerId: string): BlackjackAction[] => {
  if (state.phase !== 'playing') return [];
  
  const player = state.players.find(p => p.id === playerId);
  if (!player || !player.isTurn || player.isBusted || player.isStanding) return [];

  const actions: BlackjackAction[] = ['hit', 'stand'];

  // Can double if first two cards and enough chips
  if (player.cards.length === 2 && player.chips >= player.currentBet) {
    actions.push('double');
  }

  return actions;
};
