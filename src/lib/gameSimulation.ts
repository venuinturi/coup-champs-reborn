import {
  GameState,
  Player,
  ActionType,
  Character,
  ACTION_CHARACTERS,
  BLOCK_CHARACTERS,
} from './gameTypes';
import {
  createGame,
  startAction,
  challenge,
  block,
  pass,
  getCurrentPlayer,
  getValidActions,
  getValidTargets,
  loseInfluence,
} from './gameEngine';

// AI decision making for simulation
export interface AIDecision {
  type: 'action' | 'challenge' | 'block' | 'pass' | 'lose_influence';
  action?: ActionType;
  targetId?: string;
  character?: Character;
  cardToLose?: Character;
}

// Simple AI that makes random but valid decisions
const makeAIDecision = (state: GameState, playerId: string): AIDecision => {
  const player = state.players.find(p => p.id === playerId)!;
  
  // If we need to lose an influence
  if (state.pendingAction?.phase === 'resolve') {
    return {
      type: 'lose_influence',
      cardToLose: player.influences[Math.floor(Math.random() * player.influences.length)],
    };
  }

  // If it's our turn and no pending action
  if (!state.pendingAction && getCurrentPlayer(state).id === playerId) {
    const validActions = getValidActions(state);
    const action = validActions[Math.floor(Math.random() * validActions.length)];
    const targets = getValidTargets(state, action);
    
    return {
      type: 'action',
      action,
      targetId: targets.length > 0 ? targets[Math.floor(Math.random() * targets.length)].id : undefined,
    };
  }

  // If waiting for our response
  if (state.pendingAction?.waitingForPlayers.includes(playerId)) {
    const { action, phase, blockerCharacter } = state.pendingAction;
    
    // 30% chance to challenge if possible
    if ((phase === 'challenge_action' || phase === 'challenge_block') && Math.random() < 0.3) {
      let targetId: string;
      let claimedChar: Character;
      
      if (phase === 'challenge_action') {
        targetId = action.playerId;
        claimedChar = ACTION_CHARACTERS[action.type]!;
      } else {
        targetId = state.pendingAction.blockerId!;
        claimedChar = blockerCharacter!;
      }
      
      const target = state.players.find(p => p.id === targetId)!;
      // Only challenge if we think they might be bluffing
      if (!player.influences.includes(claimedChar)) {
        return { type: 'challenge' };
      }
    }

    // 40% chance to block if possible
    if (phase === 'block' || phase === 'challenge_action') {
      const blockChars = BLOCK_CHARACTERS[action.type];
      if (blockChars && blockChars.length > 0 && Math.random() < 0.4) {
        // Prefer to block with a card we actually have
        const ownedBlockChar = blockChars.find(c => player.influences.includes(c));
        const blockChar = ownedBlockChar || blockChars[Math.floor(Math.random() * blockChars.length)];
        
        // Only block if we're the target or it affects us
        if (action.targetId === playerId || action.type === 'foreign_aid') {
          return { type: 'block', character: blockChar };
        }
      }
    }

    return { type: 'pass' };
  }

  return { type: 'pass' };
};

// Run a single game simulation
export const simulateGame = (playerNames: string[]): { 
  finalState: GameState; 
  turns: number;
  winner: string;
} => {
  let state = createGame(playerNames);
  let turns = 0;
  const maxTurns = 500; // Prevent infinite loops

  while (!state.winner && turns < maxTurns) {
    turns++;

    // Get current player or waiting players
    if (state.pendingAction) {
      const waitingPlayers = state.pendingAction.waitingForPlayers;
      
      for (const playerId of waitingPlayers) {
        const decision = makeAIDecision(state, playerId);
        
        try {
          switch (decision.type) {
            case 'challenge':
              state = challenge(state, playerId);
              break;
            case 'block':
              state = block(state, playerId, decision.character!);
              break;
            case 'pass':
              state = pass(state, playerId);
              break;
          }
        } catch (e) {
          // Invalid action, try to pass
          try {
            state = pass(state, playerId);
          } catch {
            // Ignore
          }
        }

        if (state.winner || !state.pendingAction) break;
      }
    } else {
      const currentPlayer = getCurrentPlayer(state);
      const decision = makeAIDecision(state, currentPlayer.id);
      
      if (decision.type === 'action' && decision.action) {
        try {
          state = startAction(state, {
            type: decision.action,
            playerId: currentPlayer.id,
            targetId: decision.targetId,
          });
        } catch (e) {
          // If action fails, take income as fallback
          try {
            state = startAction(state, {
              type: 'income',
              playerId: currentPlayer.id,
            });
          } catch {
            // Skip turn
          }
        }
      }
    }
  }

  const winner = state.winner 
    ? state.players.find(p => p.id === state.winner)!.name 
    : 'No winner (timeout)';

  return { finalState: state, turns, winner };
};

// Run multiple simulations and gather statistics
export const runSimulations = (numGames: number, playerNames: string[]): {
  gamesPlayed: number;
  winsByPlayer: Record<string, number>;
  averageTurns: number;
  averageGameLength: number;
  errors: string[];
} => {
  const results = {
    gamesPlayed: 0,
    winsByPlayer: {} as Record<string, number>,
    averageTurns: 0,
    averageGameLength: 0,
    errors: [] as string[],
  };

  let totalTurns = 0;

  playerNames.forEach(name => {
    results.winsByPlayer[name] = 0;
  });

  for (let i = 0; i < numGames; i++) {
    try {
      const { winner, turns } = simulateGame(playerNames);
      results.gamesPlayed++;
      totalTurns += turns;
      
      if (winner !== 'No winner (timeout)') {
        results.winsByPlayer[winner] = (results.winsByPlayer[winner] || 0) + 1;
      }
    } catch (e) {
      results.errors.push(`Game ${i + 1}: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  results.averageTurns = results.gamesPlayed > 0 ? totalTurns / results.gamesPlayed : 0;

  return results;
};

// Test specific game scenarios
export const testScenarios = (): { 
  scenario: string; 
  passed: boolean; 
  details: string;
}[] => {
  const results: { scenario: string; passed: boolean; details: string }[] = [];

  // Test 1: Income action
  try {
    let state = createGame(['Alice', 'Bob']);
    const player = getCurrentPlayer(state);
    const initialCoins = player.coins;
    state = startAction(state, { type: 'income', playerId: player.id });
    const passed = state.players[0].coins === initialCoins + 1;
    results.push({
      scenario: 'Income adds 1 coin',
      passed,
      details: passed ? 'Coins increased correctly' : `Expected ${initialCoins + 1}, got ${state.players[0].coins}`,
    });
  } catch (e) {
    results.push({ scenario: 'Income adds 1 coin', passed: false, details: String(e) });
  }

  // Test 2: Coup requires 7 coins
  try {
    let state = createGame(['Alice', 'Bob']);
    let passed = false;
    try {
      state = startAction(state, { type: 'coup', playerId: state.players[0].id, targetId: state.players[1].id });
    } catch (e) {
      passed = true; // Should fail because player only has 2 coins
    }
    results.push({
      scenario: 'Coup requires 7 coins',
      passed,
      details: passed ? 'Correctly prevented coup without enough coins' : 'Coup was allowed without 7 coins',
    });
  } catch (e) {
    results.push({ scenario: 'Coup requires 7 coins', passed: false, details: String(e) });
  }

  // Test 3: Must coup with 10+ coins
  try {
    let state = createGame(['Alice', 'Bob']);
    state.players[0].coins = 10;
    const validActions = getValidActions(state);
    const passed = validActions.length === 1 && validActions[0] === 'coup';
    results.push({
      scenario: 'Must coup with 10+ coins',
      passed,
      details: passed ? 'Only coup is available' : `Available actions: ${validActions.join(', ')}`,
    });
  } catch (e) {
    results.push({ scenario: 'Must coup with 10+ coins', passed: false, details: String(e) });
  }

  // Test 4: Player elimination
  try {
    let state = createGame(['Alice', 'Bob']);
    state.players[0].coins = 7;
    state.players[1].influences = ['Duke']; // Only one influence
    state = startAction(state, { type: 'coup', playerId: state.players[0].id, targetId: state.players[1].id });
    const passed = !state.players[1].isAlive && state.winner === state.players[0].id;
    results.push({
      scenario: 'Coup eliminates player with 1 influence',
      passed,
      details: passed ? 'Player eliminated and winner declared' : 'Player not properly eliminated',
    });
  } catch (e) {
    results.push({ scenario: 'Coup eliminates player with 1 influence', passed: false, details: String(e) });
  }

  // Test 5: Challenge mechanics
  try {
    let state = createGame(['Alice', 'Bob']);
    state = startAction(state, { type: 'tax', playerId: state.players[0].id });
    
    // Store original influences
    const aliceHadDuke = state.players[0].influences.includes('Duke');
    
    state = challenge(state, state.players[1].id);
    
    let passed: boolean;
    if (aliceHadDuke) {
      // Alice had Duke, Bob should lose an influence
      passed = state.players[1].influences.length < 2 || state.players[1].revealedInfluences.length > 0;
    } else {
      // Alice didn't have Duke, Alice should lose an influence
      passed = state.players[0].influences.length < 2 || state.players[0].revealedInfluences.length > 0;
    }
    
    results.push({
      scenario: 'Challenge resolves correctly',
      passed,
      details: passed ? 'Challenge resolved with correct player losing influence' : 'Challenge resolution incorrect',
    });
  } catch (e) {
    results.push({ scenario: 'Challenge resolves correctly', passed: false, details: String(e) });
  }

  // Test 6: Foreign aid can be blocked by Duke
  try {
    let state = createGame(['Alice', 'Bob']);
    state = startAction(state, { type: 'foreign_aid', playerId: state.players[0].id });
    
    // Check that we're in a state where blocking is possible
    const canBlock = state.pendingAction && 
      (state.pendingAction.phase === 'challenge_action' || state.pendingAction.phase === 'block');
    
    if (canBlock) {
      state = block(state, state.players[1].id, 'Duke');
      const passed = state.pendingAction?.blockerCharacter === 'Duke';
      results.push({
        scenario: 'Duke can block foreign aid',
        passed,
        details: passed ? 'Block initiated correctly' : 'Block not set up correctly',
      });
    } else {
      results.push({
        scenario: 'Duke can block foreign aid',
        passed: false,
        details: 'Foreign aid did not allow blocking phase',
      });
    }
  } catch (e) {
    results.push({ scenario: 'Duke can block foreign aid', passed: false, details: String(e) });
  }

  // Test 7: Assassination costs 3 coins
  try {
    let state = createGame(['Alice', 'Bob']);
    state.players[0].coins = 3;
    const initialCoins = state.players[0].coins;
    state = startAction(state, { type: 'assassinate', playerId: state.players[0].id, targetId: state.players[1].id });
    const passed = state.players[0].coins === initialCoins - 3;
    results.push({
      scenario: 'Assassination costs 3 coins',
      passed,
      details: passed ? 'Coins deducted correctly' : `Expected ${initialCoins - 3}, got ${state.players[0].coins}`,
    });
  } catch (e) {
    results.push({ scenario: 'Assassination costs 3 coins', passed: false, details: String(e) });
  }

  // Test 8: Steal takes up to 2 coins
  try {
    let state = createGame(['Alice', 'Bob']);
    state.players[1].coins = 5;
    state = startAction(state, { type: 'steal', playerId: state.players[0].id, targetId: state.players[1].id });
    
    // Pass all challenges and blocks
    while (state.pendingAction?.waitingForPlayers.length) {
      const waitingPlayer = state.pendingAction.waitingForPlayers[0];
      state = pass(state, waitingPlayer);
    }
    
    const passed = state.players[0].coins === 4 && state.players[1].coins === 3;
    results.push({
      scenario: 'Steal takes 2 coins',
      passed,
      details: passed ? 'Coins transferred correctly' : `Alice: ${state.players[0].coins}, Bob: ${state.players[1].coins}`,
    });
  } catch (e) {
    results.push({ scenario: 'Steal takes 2 coins', passed: false, details: String(e) });
  }

  return results;
};
