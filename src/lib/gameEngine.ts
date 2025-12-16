import { 
  Character, 
  GameState, 
  Player, 
  GameAction, 
  ActionType,
  PendingAction,
  GameLog,
  ACTION_COSTS,
  ACTION_CHARACTERS,
  BLOCK_CHARACTERS
} from './gameTypes';

// Create initial deck (3 of each character)
export const createDeck = (): Character[] => {
  const characters: Character[] = ['Duke', 'Assassin', 'Captain', 'Ambassador', 'Contessa'];
  const deck: Character[] = [];
  characters.forEach(char => {
    for (let i = 0; i < 3; i++) {
      deck.push(char);
    }
  });
  return shuffleDeck(deck);
};

// Fisher-Yates shuffle
export const shuffleDeck = (deck: Character[]): Character[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Create a new player
export const createPlayer = (id: string, name: string): Player => ({
  id,
  name,
  coins: 2,
  influences: [],
  revealedInfluences: [],
  isAlive: true,
});

// Create initial game state
export const createGame = (playerNames: string[]): GameState => {
  if (playerNames.length < 2 || playerNames.length > 6) {
    throw new Error('COUP requires 2-6 players');
  }

  const deck = createDeck();
  const players: Player[] = playerNames.map((name, index) => {
    const player = createPlayer(`player_${index}`, name);
    // Deal 2 cards to each player
    player.influences = [deck.pop()!, deck.pop()!];
    return player;
  });

  return {
    id: `game_${Date.now()}`,
    players,
    deck,
    currentPlayerIndex: 0,
    pendingAction: null,
    winner: null,
    logs: [{ timestamp: Date.now(), message: 'Game started!', type: 'system' }],
    phase: 'playing',
  };
};

// Add log entry
export const addLog = (state: GameState, message: string, type: GameLog['type']): GameState => ({
  ...state,
  logs: [...state.logs, { timestamp: Date.now(), message, type }],
});

// Get current player
export const getCurrentPlayer = (state: GameState): Player => {
  return state.players[state.currentPlayerIndex];
};

// Get player by ID
export const getPlayer = (state: GameState, playerId: string): Player | undefined => {
  return state.players.find(p => p.id === playerId);
};

// Check if action is valid
export const canPerformAction = (state: GameState, action: GameAction): { valid: boolean; reason?: string } => {
  const player = getPlayer(state, action.playerId);
  if (!player) return { valid: false, reason: 'Player not found' };
  if (!player.isAlive) return { valid: false, reason: 'Player is eliminated' };
  if (state.currentPlayerIndex !== state.players.indexOf(player)) {
    return { valid: false, reason: 'Not your turn' };
  }
  if (state.pendingAction) return { valid: false, reason: 'Action already pending' };

  const cost = ACTION_COSTS[action.type];
  if (player.coins < cost) return { valid: false, reason: `Not enough coins (need ${cost})` };

  // Must coup with 10+ coins
  if (player.coins >= 10 && action.type !== 'coup') {
    return { valid: false, reason: 'Must coup when you have 10+ coins' };
  }

  // Target validation
  if (['coup', 'assassinate', 'steal'].includes(action.type)) {
    if (!action.targetId) return { valid: false, reason: 'Target required' };
    const target = getPlayer(state, action.targetId);
    if (!target) return { valid: false, reason: 'Target not found' };
    if (!target.isAlive) return { valid: false, reason: 'Target is eliminated' };
    if (action.targetId === action.playerId) return { valid: false, reason: 'Cannot target yourself' };
    
    // Steal requires target to have coins
    if (action.type === 'steal' && target.coins === 0) {
      return { valid: false, reason: 'Target has no coins to steal' };
    }
  }

  return { valid: true };
};

// Start an action
export const startAction = (state: GameState, action: GameAction): GameState => {
  const validation = canPerformAction(state, action);
  if (!validation.valid) {
    throw new Error(validation.reason);
  }

  const player = getPlayer(state, action.playerId)!;
  const target = action.targetId ? getPlayer(state, action.targetId) : null;
  const character = ACTION_CHARACTERS[action.type];
  
  let message = `${player.name} `;
  switch (action.type) {
    case 'income':
      message += 'takes income (1 coin)';
      break;
    case 'foreign_aid':
      message += 'attempts foreign aid (2 coins)';
      break;
    case 'coup':
      message += `coups ${target!.name}`;
      break;
    case 'tax':
      message += 'claims Duke and takes tax (3 coins)';
      break;
    case 'assassinate':
      message += `claims Assassin and attempts to assassinate ${target!.name}`;
      break;
    case 'steal':
      message += `claims Captain and attempts to steal from ${target!.name}`;
      break;
    case 'exchange':
      message += 'claims Ambassador and exchanges cards';
      break;
  }

  const newState = addLog(state, message, 'action');
  
  // Deduct cost immediately for coup and assassinate
  if (action.type === 'coup' || action.type === 'assassinate') {
    const playerIndex = state.players.findIndex(p => p.id === action.playerId);
    newState.players = [...newState.players];
    newState.players[playerIndex] = {
      ...newState.players[playerIndex],
      coins: newState.players[playerIndex].coins - ACTION_COSTS[action.type],
    };
  }

  // Income and coup resolve immediately
  if (action.type === 'income' || action.type === 'coup') {
    return resolveAction(newState, action);
  }

  // Other actions can be challenged/blocked
  const otherPlayers = state.players
    .filter(p => p.isAlive && p.id !== action.playerId)
    .map(p => p.id);

  return {
    ...newState,
    pendingAction: {
      action,
      phase: character ? 'challenge_action' : 'block',
      waitingForPlayers: otherPlayers,
    },
  };
};

// Challenge an action or block
export const challenge = (state: GameState, challengerId: string): GameState => {
  if (!state.pendingAction) throw new Error('No pending action');
  
  const challenger = getPlayer(state, challengerId);
  if (!challenger || !challenger.isAlive) throw new Error('Invalid challenger');

  const { action, phase, blockerId, blockerCharacter } = state.pendingAction;
  
  let targetId: string;
  let claimedCharacter: Character;
  
  if (phase === 'challenge_action') {
    targetId = action.playerId;
    claimedCharacter = ACTION_CHARACTERS[action.type]!;
  } else if (phase === 'challenge_block') {
    targetId = blockerId!;
    claimedCharacter = blockerCharacter!;
  } else {
    throw new Error('Cannot challenge in this phase');
  }

  const target = getPlayer(state, targetId)!;
  let newState = addLog(state, `${challenger.name} challenges ${target.name}'s claim of ${claimedCharacter}`, 'challenge');

  // Check if target has the character
  const hasCharacter = target.influences.includes(claimedCharacter);

  if (hasCharacter) {
    // Challenge fails - challenger loses influence
    newState = addLog(newState, `${target.name} reveals ${claimedCharacter}! Challenge failed.`, 'reveal');
    newState = loseInfluence(newState, challengerId, null);
    
    // Target shuffles revealed card back and draws new one
    const targetIndex = newState.players.findIndex(p => p.id === targetId);
    const cardIndex = newState.players[targetIndex].influences.indexOf(claimedCharacter);
    
    newState.deck = shuffleDeck([...newState.deck, claimedCharacter]);
    const newCard = newState.deck.pop()!;
    
    newState.players = [...newState.players];
    newState.players[targetIndex] = {
      ...newState.players[targetIndex],
      influences: [
        ...newState.players[targetIndex].influences.slice(0, cardIndex),
        newCard,
        ...newState.players[targetIndex].influences.slice(cardIndex + 1),
      ],
    };

    // If challenge was on action, action proceeds
    if (phase === 'challenge_action') {
      return resolveAction(newState, action);
    } else {
      // Block succeeds
      return nextTurn(newState);
    }
  } else {
    // Challenge succeeds - target loses influence
    newState = addLog(newState, `${target.name} doesn't have ${claimedCharacter}! Challenge succeeded.`, 'reveal');
    newState = loseInfluence(newState, targetId, null);

    if (phase === 'challenge_action') {
      // Action fails
      return nextTurn(newState);
    } else {
      // Block fails, action proceeds
      return resolveAction(newState, action);
    }
  }
};

// Block an action
export const block = (state: GameState, blockerId: string, character: Character): GameState => {
  if (!state.pendingAction) throw new Error('No pending action');
  
  const blocker = getPlayer(state, blockerId);
  if (!blocker || !blocker.isAlive) throw new Error('Invalid blocker');

  const { action, phase } = state.pendingAction;
  
  if (phase !== 'block' && phase !== 'challenge_action') {
    throw new Error('Cannot block in this phase');
  }

  const blockableBy = BLOCK_CHARACTERS[action.type];
  if (!blockableBy || !blockableBy.includes(character)) {
    throw new Error(`${character} cannot block ${action.type}`);
  }

  const newState = addLog(state, `${blocker.name} claims ${character} and blocks!`, 'block');
  
  const otherPlayers = state.players
    .filter(p => p.isAlive && p.id !== blockerId)
    .map(p => p.id);

  return {
    ...newState,
    pendingAction: {
      ...state.pendingAction,
      phase: 'challenge_block',
      blockerId,
      blockerCharacter: character,
      waitingForPlayers: otherPlayers,
    },
  };
};

// Pass on challenging/blocking
export const pass = (state: GameState, playerId: string): GameState => {
  if (!state.pendingAction) throw new Error('No pending action');
  
  const { waitingForPlayers, phase, action } = state.pendingAction;
  
  if (!waitingForPlayers.includes(playerId)) {
    throw new Error('Not waiting for this player');
  }

  const newWaiting = waitingForPlayers.filter(id => id !== playerId);

  if (newWaiting.length === 0) {
    // Everyone passed
    if (phase === 'challenge_action') {
      // Move to block phase if blockable
      const blockableBy = BLOCK_CHARACTERS[action.type];
      if (blockableBy && blockableBy.length > 0) {
        const canBlockPlayers = state.players
          .filter(p => p.isAlive && p.id !== action.playerId)
          .map(p => p.id);
        
        return {
          ...state,
          pendingAction: {
            ...state.pendingAction,
            phase: 'block',
            waitingForPlayers: canBlockPlayers,
          },
        };
      }
      return resolveAction(state, action);
    } else if (phase === 'block') {
      // No one blocked, resolve action
      return resolveAction(state, action);
    } else if (phase === 'challenge_block') {
      // No one challenged the block, block succeeds
      return nextTurn(addLog(state, 'Block successful!', 'system'));
    }
  }

  return {
    ...state,
    pendingAction: {
      ...state.pendingAction,
      waitingForPlayers: newWaiting,
    },
  };
};

// Resolve an action
export const resolveAction = (state: GameState, action: GameAction): GameState => {
  const playerIndex = state.players.findIndex(p => p.id === action.playerId);
  let newState = { ...state, players: [...state.players] };

  switch (action.type) {
    case 'income':
      newState.players[playerIndex] = {
        ...newState.players[playerIndex],
        coins: newState.players[playerIndex].coins + 1,
      };
      break;

    case 'foreign_aid':
      newState.players[playerIndex] = {
        ...newState.players[playerIndex],
        coins: newState.players[playerIndex].coins + 2,
      };
      break;

    case 'tax':
      newState.players[playerIndex] = {
        ...newState.players[playerIndex],
        coins: newState.players[playerIndex].coins + 3,
      };
      break;

    case 'coup':
    case 'assassinate':
      newState = loseInfluence(newState, action.targetId!, null);
      break;

    case 'steal': {
      const targetIndex = newState.players.findIndex(p => p.id === action.targetId);
      const stolen = Math.min(2, newState.players[targetIndex].coins);
      newState.players[targetIndex] = {
        ...newState.players[targetIndex],
        coins: newState.players[targetIndex].coins - stolen,
      };
      newState.players[playerIndex] = {
        ...newState.players[playerIndex],
        coins: newState.players[playerIndex].coins + stolen,
      };
      break;
    }

    case 'exchange':
      // Exchange is handled separately
      const newCards = [newState.deck.pop()!, newState.deck.pop()!];
      const allCards = [...newState.players[playerIndex].influences, ...newCards];
      
      // For simulation, just keep the first N cards
      const numToKeep = newState.players[playerIndex].influences.length;
      newState.players[playerIndex] = {
        ...newState.players[playerIndex],
        influences: allCards.slice(0, numToKeep),
      };
      newState.deck = shuffleDeck([...newState.deck, ...allCards.slice(numToKeep)]);
      break;
  }

  newState = addLog(newState, `${newState.players[playerIndex].name}'s action resolved.`, 'system');
  return nextTurn({ ...newState, pendingAction: null });
};

// Lose an influence (reveal a card)
export const loseInfluence = (state: GameState, playerId: string, cardToLose: Character | null): GameState => {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  const player = state.players[playerIndex];
  
  if (player.influences.length === 0) return state;

  // If no specific card, lose the first one (for AI/simulation)
  const card = cardToLose || player.influences[0];
  const cardIndex = player.influences.indexOf(card);
  
  if (cardIndex === -1) return state;

  const newInfluences = [
    ...player.influences.slice(0, cardIndex),
    ...player.influences.slice(cardIndex + 1),
  ];
  
  const newRevealedInfluences = [...player.revealedInfluences, card];
  const isAlive = newInfluences.length > 0;

  let newState: GameState = {
    ...state,
    players: [...state.players],
  };

  newState.players[playerIndex] = {
    ...player,
    influences: newInfluences,
    revealedInfluences: newRevealedInfluences,
    isAlive,
  };

  if (!isAlive) {
    newState = addLog(newState, `${player.name} has been eliminated!`, 'system');
  } else {
    newState = addLog(newState, `${player.name} loses ${card}.`, 'reveal');
  }

  return checkWinner(newState);
};

// Move to next turn
export const nextTurn = (state: GameState): GameState => {
  if (state.winner) return state;

  let nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
  
  // Skip eliminated players
  while (!state.players[nextIndex].isAlive) {
    nextIndex = (nextIndex + 1) % state.players.length;
  }

  return {
    ...state,
    currentPlayerIndex: nextIndex,
    pendingAction: null,
  };
};

// Check for winner
export const checkWinner = (state: GameState): GameState => {
  const alivePlayers = state.players.filter(p => p.isAlive);
  
  if (alivePlayers.length === 1) {
    return {
      ...state,
      winner: alivePlayers[0].id,
      phase: 'finished',
      logs: [...state.logs, { 
        timestamp: Date.now(), 
        message: `${alivePlayers[0].name} wins!`, 
        type: 'system' 
      }],
    };
  }

  return state;
};

// Get valid actions for current player
export const getValidActions = (state: GameState): ActionType[] => {
  const player = getCurrentPlayer(state);
  const actions: ActionType[] = [];

  if (player.coins >= 10) {
    return ['coup']; // Must coup
  }

  actions.push('income', 'foreign_aid', 'tax', 'exchange');
  
  if (player.coins >= 3) {
    actions.push('assassinate');
  }
  
  if (player.coins >= 7) {
    actions.push('coup');
  }

  // Steal only if there's a target with coins
  const hasStealTarget = state.players.some(p => 
    p.isAlive && p.id !== player.id && p.coins > 0
  );
  if (hasStealTarget) {
    actions.push('steal');
  }

  return actions;
};

// Get valid targets for an action
export const getValidTargets = (state: GameState, actionType: ActionType): Player[] => {
  const currentPlayer = getCurrentPlayer(state);
  
  if (!['coup', 'assassinate', 'steal'].includes(actionType)) {
    return [];
  }

  return state.players.filter(p => {
    if (!p.isAlive || p.id === currentPlayer.id) return false;
    if (actionType === 'steal' && p.coins === 0) return false;
    return true;
  });
};
