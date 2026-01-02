import {
  Card,
  Suit,
  Rank,
  PokerPlayer,
  PokerGameState,
  PokerAction,
  HandRank,
  HAND_RANKINGS,
  RANK_VALUES,
} from './pokerTypes';

// Create a standard 52-card deck
export const createDeck = (): Card[] => {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const deck: Card[] = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank, faceUp: false });
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

// Create initial game state
export const createPokerGame = (
  playerData: { id: string; name: string }[],
  startingChips: number = 1000,
  smallBlind: number = 10,
  bigBlind: number = 20
): PokerGameState => {
  const deck = createDeck();
  
  const players: PokerPlayer[] = playerData.map((p, index) => ({
    id: p.id,
    name: p.name,
    chips: startingChips,
    cards: [],
    currentBet: 0,
    totalBet: 0,
    folded: false,
    isAllIn: false,
    isActive: true,
    isDealer: index === 0,
    isTurn: false,
    hasActed: false,
  }));

  return {
    players,
    deck,
    communityCards: [],
    pot: 0,
    sidePots: [],
    currentBet: 0,
    minRaise: bigBlind,
    dealerIndex: 0,
    currentPlayerIndex: 0,
    bettingRound: 'preflop',
    phase: 'waiting',
    winner: null,
    winningHand: null,
    smallBlind,
    bigBlind,
    lastAction: null,
  };
};

// Deal cards to players
export const dealCards = (state: PokerGameState): PokerGameState => {
  const newState = { ...state, deck: [...state.deck] };
  const activePlayers = newState.players.filter(p => p.isActive);

  // Deal 2 cards to each player
  for (let round = 0; round < 2; round++) {
    for (const player of activePlayers) {
      const card = newState.deck.pop()!;
      const playerIndex = newState.players.findIndex(p => p.id === player.id);
      newState.players[playerIndex] = {
        ...newState.players[playerIndex],
        cards: [...newState.players[playerIndex].cards, { ...card, faceUp: true }],
      };
    }
  }

  return newState;
};

// Post blinds
export const postBlinds = (state: PokerGameState): PokerGameState => {
  const newState = { ...state };
  const activePlayers = newState.players.filter(p => p.isActive && !p.folded);
  
  if (activePlayers.length < 2) return newState;

  const smallBlindIndex = (newState.dealerIndex + 1) % newState.players.length;
  const bigBlindIndex = (newState.dealerIndex + 2) % newState.players.length;

  // Post small blind
  const sbPlayer = newState.players[smallBlindIndex];
  const sbAmount = Math.min(sbPlayer.chips, newState.smallBlind);
  newState.players[smallBlindIndex] = {
    ...sbPlayer,
    chips: sbPlayer.chips - sbAmount,
    currentBet: sbAmount,
    totalBet: sbAmount,
    isAllIn: sbPlayer.chips === sbAmount,
  };
  newState.pot += sbAmount;

  // Post big blind
  const bbPlayer = newState.players[bigBlindIndex];
  const bbAmount = Math.min(bbPlayer.chips, newState.bigBlind);
  newState.players[bigBlindIndex] = {
    ...bbPlayer,
    chips: bbPlayer.chips - bbAmount,
    currentBet: bbAmount,
    totalBet: bbAmount,
    isAllIn: bbPlayer.chips === bbAmount,
  };
  newState.pot += bbAmount;
  newState.currentBet = bbAmount;

  // First to act is after big blind
  const firstToAct = (bigBlindIndex + 1) % newState.players.length;
  newState.currentPlayerIndex = findNextActivePlayer(newState.players, firstToAct);

  return newState;
};

// Find next active player
const findNextActivePlayer = (players: PokerPlayer[], startIndex: number): number => {
  let index = startIndex;
  for (let i = 0; i < players.length; i++) {
    const player = players[index];
    if (player.isActive && !player.folded && !player.isAllIn) {
      return index;
    }
    index = (index + 1) % players.length;
  }
  return startIndex;
};

// Start a new hand
export const startHand = (state: PokerGameState): PokerGameState => {
  let newState = { ...state };
  
  // Reset player states
  newState.players = newState.players.map(p => ({
    ...p,
    cards: [],
    currentBet: 0,
    totalBet: 0,
    folded: p.chips <= 0,
    isAllIn: false,
    hasActed: false,
    isTurn: false,
    isActive: p.chips > 0,
  }));

  // Reset game state
  newState.deck = createDeck();
  newState.communityCards = [];
  newState.pot = 0;
  newState.sidePots = [];
  newState.currentBet = 0;
  newState.minRaise = newState.bigBlind;
  newState.bettingRound = 'preflop';
  newState.phase = 'dealing';
  newState.winner = null;
  newState.winningHand = null;
  newState.lastAction = null;

  // Move dealer button
  const activePlayers = newState.players.filter(p => p.isActive);
  if (activePlayers.length < 2) {
    newState.phase = 'finished';
    newState.winner = activePlayers[0]?.id || null;
    return newState;
  }

  // Deal cards
  newState = dealCards(newState);
  
  // Post blinds
  newState = postBlinds(newState);
  
  // Set current player turn
  const currentPlayer = newState.players[newState.currentPlayerIndex];
  newState.players = newState.players.map(p => ({
    ...p,
    isTurn: p.id === currentPlayer.id,
  }));

  newState.phase = 'betting';

  return newState;
};

// Process player action
export const processAction = (
  state: PokerGameState,
  playerId: string,
  action: PokerAction,
  raiseAmount?: number
): PokerGameState => {
  let newState = { ...state };
  const playerIndex = newState.players.findIndex(p => p.id === playerId);
  
  if (playerIndex === -1) return state;
  
  const player = newState.players[playerIndex];

  switch (action) {
    case 'fold':
      newState.players[playerIndex] = { ...player, folded: true, hasActed: true };
      newState.lastAction = { playerId, action: 'fold' };
      break;

    case 'check':
      if (player.currentBet < newState.currentBet) return state; // Can't check
      newState.players[playerIndex] = { ...player, hasActed: true };
      newState.lastAction = { playerId, action: 'check' };
      break;

    case 'call':
      const callAmount = Math.min(player.chips, newState.currentBet - player.currentBet);
      newState.players[playerIndex] = {
        ...player,
        chips: player.chips - callAmount,
        currentBet: player.currentBet + callAmount,
        totalBet: player.totalBet + callAmount,
        isAllIn: player.chips === callAmount,
        hasActed: true,
      };
      newState.pot += callAmount;
      newState.lastAction = { playerId, action: 'call', amount: callAmount };
      break;

    case 'raise':
      if (!raiseAmount || raiseAmount < newState.minRaise) return state;
      const totalRaise = newState.currentBet - player.currentBet + raiseAmount;
      const actualBet = Math.min(player.chips, totalRaise);
      
      newState.players[playerIndex] = {
        ...player,
        chips: player.chips - actualBet,
        currentBet: player.currentBet + actualBet,
        totalBet: player.totalBet + actualBet,
        isAllIn: player.chips === actualBet,
        hasActed: true,
      };
      newState.pot += actualBet;
      newState.currentBet = newState.players[playerIndex].currentBet;
      newState.minRaise = raiseAmount;
      
      // Reset hasActed for other players who haven't folded/all-in
      newState.players = newState.players.map(p => 
        p.id === playerId || p.folded || p.isAllIn ? p : { ...p, hasActed: false }
      );
      newState.lastAction = { playerId, action: 'raise', amount: raiseAmount };
      break;

    case 'all-in':
      const allInAmount = player.chips;
      newState.players[playerIndex] = {
        ...player,
        chips: 0,
        currentBet: player.currentBet + allInAmount,
        totalBet: player.totalBet + allInAmount,
        isAllIn: true,
        hasActed: true,
      };
      newState.pot += allInAmount;
      
      if (newState.players[playerIndex].currentBet > newState.currentBet) {
        newState.currentBet = newState.players[playerIndex].currentBet;
        newState.players = newState.players.map(p => 
          p.id === playerId || p.folded || p.isAllIn ? p : { ...p, hasActed: false }
        );
      }
      newState.lastAction = { playerId, action: 'all-in', amount: allInAmount };
      break;
  }

  // Check if round is complete
  newState = checkRoundComplete(newState);

  return newState;
};

// Check if betting round is complete
const checkRoundComplete = (state: PokerGameState): PokerGameState => {
  let newState = { ...state };
  
  const activePlayers = newState.players.filter(p => !p.folded && p.isActive);
  const playersToAct = activePlayers.filter(p => !p.isAllIn && (!p.hasActed || p.currentBet < newState.currentBet));

  // Check for winner by everyone folding
  if (activePlayers.length === 1) {
    newState.winner = activePlayers[0].id;
    newState.players = newState.players.map(p => 
      p.id === activePlayers[0].id ? { ...p, chips: p.chips + newState.pot } : p
    );
    newState.pot = 0;
    newState.phase = 'finished';
    return newState;
  }

  // If everyone has acted and bets are equal, move to next round
  if (playersToAct.length === 0) {
    newState = advanceRound(newState);
  } else {
    // Move to next player
    newState.currentPlayerIndex = findNextActivePlayer(
      newState.players,
      (newState.currentPlayerIndex + 1) % newState.players.length
    );
    newState.players = newState.players.map((p, i) => ({
      ...p,
      isTurn: i === newState.currentPlayerIndex,
    }));
  }

  return newState;
};

// Advance to next betting round
const advanceRound = (state: PokerGameState): PokerGameState => {
  let newState = { ...state };

  // Reset current bets
  newState.players = newState.players.map(p => ({
    ...p,
    currentBet: 0,
    hasActed: false,
    isTurn: false,
  }));
  newState.currentBet = 0;

  switch (newState.bettingRound) {
    case 'preflop':
      // Deal flop (3 cards)
      for (let i = 0; i < 3; i++) {
        const card = newState.deck.pop()!;
        newState.communityCards.push({ ...card, faceUp: true });
      }
      newState.bettingRound = 'flop';
      break;

    case 'flop':
      // Deal turn (1 card)
      const turnCard = newState.deck.pop()!;
      newState.communityCards.push({ ...turnCard, faceUp: true });
      newState.bettingRound = 'turn';
      break;

    case 'turn':
      // Deal river (1 card)
      const riverCard = newState.deck.pop()!;
      newState.communityCards.push({ ...riverCard, faceUp: true });
      newState.bettingRound = 'river';
      break;

    case 'river':
      // Go to showdown
      newState.bettingRound = 'showdown';
      newState.phase = 'showdown';
      newState = determineWinner(newState);
      return newState;
  }

  // Set first to act (after dealer)
  const firstToAct = findNextActivePlayer(
    newState.players,
    (newState.dealerIndex + 1) % newState.players.length
  );
  newState.currentPlayerIndex = firstToAct;
  newState.players = newState.players.map((p, i) => ({
    ...p,
    isTurn: i === firstToAct && !p.folded && !p.isAllIn,
  }));

  // Check if only one player can act
  const canAct = newState.players.filter(p => !p.folded && !p.isAllIn && p.isActive);
  if (canAct.length <= 1) {
    return advanceRound(newState);
  }

  return newState;
};

// Evaluate a poker hand
export const evaluateHand = (cards: Card[]): HandRank => {
  const allCards = [...cards];
  const ranks = allCards.map(c => RANK_VALUES[c.rank]).sort((a, b) => b - a);
  const suits = allCards.map(c => c.suit);

  // Check for flush
  const suitCounts = suits.reduce((acc, s) => {
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const flushSuit = Object.entries(suitCounts).find(([_, count]) => count >= 5)?.[0];
  const isFlush = !!flushSuit;

  // Get flush cards if applicable
  const flushCards = isFlush
    ? allCards.filter(c => c.suit === flushSuit).map(c => RANK_VALUES[c.rank]).sort((a, b) => b - a)
    : [];

  // Check for straight
  const uniqueRanks = [...new Set(ranks)].sort((a, b) => b - a);
  let isStraight = false;
  let straightHigh = 0;

  for (let i = 0; i <= uniqueRanks.length - 5; i++) {
    if (uniqueRanks[i] - uniqueRanks[i + 4] === 4) {
      isStraight = true;
      straightHigh = uniqueRanks[i];
      break;
    }
  }

  // Check for wheel (A-2-3-4-5)
  if (!isStraight && uniqueRanks.includes(14) && uniqueRanks.includes(2) && 
      uniqueRanks.includes(3) && uniqueRanks.includes(4) && uniqueRanks.includes(5)) {
    isStraight = true;
    straightHigh = 5;
  }

  // Count rank occurrences
  const rankCounts = ranks.reduce((acc, r) => {
    acc[r] = (acc[r] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const counts = Object.entries(rankCounts)
    .map(([rank, count]) => ({ rank: parseInt(rank), count }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);

  // Royal Flush
  if (isFlush && isStraight && straightHigh === 14 && flushCards.slice(0, 5).join() === '14,13,12,11,10') {
    return { rank: HAND_RANKINGS.ROYAL_FLUSH, name: 'Royal Flush', highCards: [14] };
  }

  // Straight Flush
  if (isFlush) {
    const flushUnique = [...new Set(flushCards)];
    for (let i = 0; i <= flushUnique.length - 5; i++) {
      if (flushUnique[i] - flushUnique[i + 4] === 4) {
        return { rank: HAND_RANKINGS.STRAIGHT_FLUSH, name: 'Straight Flush', highCards: [flushUnique[i]] };
      }
    }
    // Check wheel in flush
    if (flushUnique.includes(14) && flushUnique.includes(2) && flushUnique.includes(3) && 
        flushUnique.includes(4) && flushUnique.includes(5)) {
      return { rank: HAND_RANKINGS.STRAIGHT_FLUSH, name: 'Straight Flush', highCards: [5] };
    }
  }

  // Four of a Kind
  if (counts[0].count === 4) {
    const kicker = counts.find(c => c.count !== 4)?.rank || 0;
    return { rank: HAND_RANKINGS.FOUR_OF_A_KIND, name: 'Four of a Kind', highCards: [counts[0].rank, kicker] };
  }

  // Full House
  if (counts[0].count === 3 && counts.length > 1 && counts[1].count >= 2) {
    return { rank: HAND_RANKINGS.FULL_HOUSE, name: 'Full House', highCards: [counts[0].rank, counts[1].rank] };
  }

  // Flush
  if (isFlush) {
    return { rank: HAND_RANKINGS.FLUSH, name: 'Flush', highCards: flushCards.slice(0, 5) };
  }

  // Straight
  if (isStraight) {
    return { rank: HAND_RANKINGS.STRAIGHT, name: 'Straight', highCards: [straightHigh] };
  }

  // Three of a Kind
  if (counts[0].count === 3) {
    const kickers = counts.filter(c => c.count !== 3).slice(0, 2).map(c => c.rank);
    return { rank: HAND_RANKINGS.THREE_OF_A_KIND, name: 'Three of a Kind', highCards: [counts[0].rank, ...kickers] };
  }

  // Two Pair
  if (counts[0].count === 2 && counts.length > 1 && counts[1].count === 2) {
    const kicker = counts.find(c => c.count === 1)?.rank || 0;
    return { rank: HAND_RANKINGS.TWO_PAIR, name: 'Two Pair', highCards: [counts[0].rank, counts[1].rank, kicker] };
  }

  // One Pair
  if (counts[0].count === 2) {
    const kickers = counts.filter(c => c.count !== 2).slice(0, 3).map(c => c.rank);
    return { rank: HAND_RANKINGS.ONE_PAIR, name: 'One Pair', highCards: [counts[0].rank, ...kickers] };
  }

  // High Card
  return { rank: HAND_RANKINGS.HIGH_CARD, name: 'High Card', highCards: ranks.slice(0, 5) };
};

// Get best 5-card hand from 7 cards
const getBestHand = (holeCards: Card[], communityCards: Card[]): HandRank => {
  const allCards = [...holeCards, ...communityCards];
  let bestHand: HandRank = { rank: 0, name: '', highCards: [] };

  // Generate all 5-card combinations
  for (let i = 0; i < allCards.length - 4; i++) {
    for (let j = i + 1; j < allCards.length - 3; j++) {
      for (let k = j + 1; k < allCards.length - 2; k++) {
        for (let l = k + 1; l < allCards.length - 1; l++) {
          for (let m = l + 1; m < allCards.length; m++) {
            const hand = [allCards[i], allCards[j], allCards[k], allCards[l], allCards[m]];
            const result = evaluateHand(hand);
            if (result.rank > bestHand.rank || 
                (result.rank === bestHand.rank && compareHighCards(result.highCards, bestHand.highCards) > 0)) {
              bestHand = result;
            }
          }
        }
      }
    }
  }

  return bestHand;
};

// Compare high cards
const compareHighCards = (a: number[], b: number[]): number => {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
};

// Determine winner at showdown
const determineWinner = (state: PokerGameState): PokerGameState => {
  const newState = { ...state };
  const activePlayers = newState.players.filter(p => !p.folded && p.isActive);

  if (activePlayers.length === 1) {
    newState.winner = activePlayers[0].id;
    newState.players = newState.players.map(p => 
      p.id === activePlayers[0].id ? { ...p, chips: p.chips + newState.pot } : p
    );
    newState.pot = 0;
    newState.phase = 'finished';
    return newState;
  }

  // Evaluate all hands
  const playerHands = activePlayers.map(p => ({
    player: p,
    hand: getBestHand(p.cards, newState.communityCards),
  }));

  // Sort by hand rank
  playerHands.sort((a, b) => {
    if (a.hand.rank !== b.hand.rank) return b.hand.rank - a.hand.rank;
    return compareHighCards(b.hand.highCards, a.hand.highCards);
  });

  const winner = playerHands[0];
  newState.winner = winner.player.id;
  newState.winningHand = winner.hand.name;
  
  // Award pot to winner (simplified - no side pots for now)
  newState.players = newState.players.map(p => 
    p.id === winner.player.id ? { ...p, chips: p.chips + newState.pot } : p
  );
  newState.pot = 0;
  newState.phase = 'finished';

  return newState;
};

// Move dealer button and start new hand
export const nextHand = (state: PokerGameState): PokerGameState => {
  let newState = { ...state };
  
  // Move dealer
  const activePlayers = newState.players.filter(p => p.isActive);
  if (activePlayers.length < 2) {
    newState.phase = 'finished';
    return newState;
  }

  // Find next dealer among active players
  let nextDealerIndex = (newState.dealerIndex + 1) % newState.players.length;
  while (!newState.players[nextDealerIndex].isActive) {
    nextDealerIndex = (nextDealerIndex + 1) % newState.players.length;
  }
  
  newState.dealerIndex = nextDealerIndex;
  newState.players = newState.players.map((p, i) => ({ ...p, isDealer: i === nextDealerIndex }));

  return startHand(newState);
};

// Get available actions for a player
export const getAvailableActions = (state: PokerGameState, playerId: string): PokerAction[] => {
  const player = state.players.find(p => p.id === playerId);
  if (!player || !player.isTurn || player.folded || player.isAllIn) return [];

  const actions: PokerAction[] = ['fold'];

  if (player.currentBet >= state.currentBet) {
    actions.push('check');
  } else {
    actions.push('call');
  }

  if (player.chips > state.currentBet - player.currentBet + state.minRaise) {
    actions.push('raise');
  }

  if (player.chips > 0) {
    actions.push('all-in');
  }

  return actions;
};
