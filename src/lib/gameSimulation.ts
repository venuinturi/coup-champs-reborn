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
  chooseCardToLose,
  getCurrentPlayer,
  getValidActions,
  getValidTargets,
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
  if (state.pendingAction?.phase === 'lose_influence' && 
      state.pendingAction.playerLosingInfluence === playerId) {
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
      let claimedChar: Character;
      
      if (phase === 'challenge_action') {
        claimedChar = ACTION_CHARACTERS[action.type]!;
      } else {
        claimedChar = blockerCharacter!;
      }
      
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

    // Handle lose_influence phase
    if (state.pendingAction?.phase === 'lose_influence') {
      const playerId = state.pendingAction.playerLosingInfluence!;
      const decision = makeAIDecision(state, playerId);
      
      if (decision.type === 'lose_influence' && decision.cardToLose) {
        try {
          state = chooseCardToLose(state, playerId, decision.cardToLose);
        } catch (e) {
          // Try with first card as fallback
          const player = state.players.find(p => p.id === playerId);
          if (player && player.influences.length > 0) {
            try {
              state = chooseCardToLose(state, playerId, player.influences[0]);
            } catch {
              // Skip
            }
          }
        }
      }
      continue;
    }

    // Get current player or waiting players
    if (state.pendingAction) {
      const waitingPlayers = [...state.pendingAction.waitingForPlayers];
      
      for (const playerId of waitingPlayers) {
        if (!state.pendingAction) break;
        
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

// Test specific game scenarios - comprehensive rule testing
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

  // Test 4: Coup eliminates one influence and prompts card selection
  try {
    let state = createGame(['Alice', 'Bob']);
    state.players[0].coins = 7;
    state.players[1].influences = ['Duke', 'Assassin']; // Two influences
    state = startAction(state, { type: 'coup', playerId: state.players[0].id, targetId: state.players[1].id });
    
    const passed = state.pendingAction?.phase === 'lose_influence' && 
                   state.pendingAction?.playerLosingInfluence === state.players[1].id;
    results.push({
      scenario: 'Coup prompts target to choose card',
      passed,
      details: passed ? 'Target must choose which card to lose' : `Phase: ${state.pendingAction?.phase}`,
    });
  } catch (e) {
    results.push({ scenario: 'Coup prompts target to choose card', passed: false, details: String(e) });
  }

  // Test 5: Player can choose which card to lose
  try {
    let state = createGame(['Alice', 'Bob']);
    state.players[0].coins = 7;
    state.players[1].influences = ['Duke', 'Assassin'];
    state = startAction(state, { type: 'coup', playerId: state.players[0].id, targetId: state.players[1].id });
    
    // Bob chooses to lose Duke
    state = chooseCardToLose(state, state.players[1].id, 'Duke');
    
    const passed = state.players[1].influences.length === 1 && 
                   state.players[1].influences[0] === 'Assassin' &&
                   state.players[1].revealedInfluences.includes('Duke');
    results.push({
      scenario: 'Player can choose which card to lose',
      passed,
      details: passed ? 'Correct card was revealed' : `Remaining: ${state.players[1].influences.join(', ')}`,
    });
  } catch (e) {
    results.push({ scenario: 'Player can choose which card to lose', passed: false, details: String(e) });
  }

  // Test 6: Player elimination when last influence lost
  try {
    let state = createGame(['Alice', 'Bob']);
    state.players[0].coins = 7;
    state.players[1].influences = ['Duke']; // Only one influence
    state = startAction(state, { type: 'coup', playerId: state.players[0].id, targetId: state.players[1].id });
    
    // With 1 influence, should auto-lose and game should end
    const passed = !state.players[1].isAlive && state.winner === state.players[0].id;
    results.push({
      scenario: 'Player eliminated with last influence lost',
      passed,
      details: passed ? 'Player eliminated and winner declared' : 'Player not properly eliminated',
    });
  } catch (e) {
    results.push({ scenario: 'Player eliminated with last influence lost', passed: false, details: String(e) });
  }

  // Test 7: Challenge mechanics - successful challenge
  try {
    let state = createGame(['Alice', 'Bob']);
    // Ensure Alice doesn't have Duke
    state.players[0].influences = ['Captain', 'Ambassador'];
    state.players[1].influences = ['Duke', 'Assassin'];
    
    state = startAction(state, { type: 'tax', playerId: state.players[0].id });
    state = challenge(state, state.players[1].id);
    
    // Alice should need to choose a card to lose (challenge succeeded)
    const passed = state.pendingAction?.phase === 'lose_influence' &&
                   state.pendingAction?.playerLosingInfluence === state.players[0].id;
    results.push({
      scenario: 'Successful challenge - liar loses influence',
      passed,
      details: passed ? 'Challenged player must choose card to lose' : `Phase: ${state.pendingAction?.phase}`,
    });
  } catch (e) {
    results.push({ scenario: 'Successful challenge - liar loses influence', passed: false, details: String(e) });
  }

  // Test 8: Challenge mechanics - failed challenge
  try {
    let state = createGame(['Alice', 'Bob']);
    // Ensure Alice has Duke
    state.players[0].influences = ['Duke', 'Ambassador'];
    state.players[1].influences = ['Captain', 'Assassin'];
    
    state = startAction(state, { type: 'tax', playerId: state.players[0].id });
    state = challenge(state, state.players[1].id);
    
    // Bob should need to choose a card to lose (challenge failed)
    const passed = state.pendingAction?.phase === 'lose_influence' &&
                   state.pendingAction?.playerLosingInfluence === state.players[1].id;
    results.push({
      scenario: 'Failed challenge - challenger loses influence',
      passed,
      details: passed ? 'Challenger must choose card to lose' : `Phase: ${state.pendingAction?.phase}`,
    });
  } catch (e) {
    results.push({ scenario: 'Failed challenge - challenger loses influence', passed: false, details: String(e) });
  }

  // Test 9: Foreign aid can be blocked by Duke
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

  // Test 10: Assassination costs 3 coins
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

  // Test 11: Steal takes up to 2 coins
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

  // Test 12: Contessa blocks assassination
  try {
    let state = createGame(['Alice', 'Bob']);
    state.players[0].coins = 3;
    state = startAction(state, { type: 'assassinate', playerId: state.players[0].id, targetId: state.players[1].id });
    
    // Pass challenge phase
    state = pass(state, state.players[1].id);
    
    // Bob blocks with Contessa
    state = block(state, state.players[1].id, 'Contessa');
    
    const passed = state.pendingAction?.blockerCharacter === 'Contessa' &&
                   state.pendingAction?.phase === 'challenge_block';
    results.push({
      scenario: 'Contessa blocks assassination',
      passed,
      details: passed ? 'Block initiated correctly' : `Phase: ${state.pendingAction?.phase}`,
    });
  } catch (e) {
    results.push({ scenario: 'Contessa blocks assassination', passed: false, details: String(e) });
  }

  // Test 13: Captain/Ambassador blocks steal
  try {
    let state = createGame(['Alice', 'Bob']);
    state.players[1].coins = 3;
    state = startAction(state, { type: 'steal', playerId: state.players[0].id, targetId: state.players[1].id });
    
    // Pass challenge phase
    state = pass(state, state.players[1].id);
    
    // Bob blocks with Captain
    state = block(state, state.players[1].id, 'Captain');
    
    const passed = state.pendingAction?.blockerCharacter === 'Captain' &&
                   state.pendingAction?.phase === 'challenge_block';
    results.push({
      scenario: 'Captain blocks steal',
      passed,
      details: passed ? 'Block initiated correctly' : `Phase: ${state.pendingAction?.phase}`,
    });
  } catch (e) {
    results.push({ scenario: 'Captain blocks steal', passed: false, details: String(e) });
  }

  // Test 14: Tax gives 3 coins
  try {
    let state = createGame(['Alice', 'Bob']);
    const initialCoins = state.players[0].coins;
    state = startAction(state, { type: 'tax', playerId: state.players[0].id });
    
    // Pass all responses
    while (state.pendingAction?.waitingForPlayers.length) {
      const waitingPlayer = state.pendingAction.waitingForPlayers[0];
      state = pass(state, waitingPlayer);
    }
    
    const passed = state.players[0].coins === initialCoins + 3;
    results.push({
      scenario: 'Tax gives 3 coins',
      passed,
      details: passed ? 'Coins added correctly' : `Expected ${initialCoins + 3}, got ${state.players[0].coins}`,
    });
  } catch (e) {
    results.push({ scenario: 'Tax gives 3 coins', passed: false, details: String(e) });
  }

  // Test 15: Foreign aid gives 2 coins when unchallenged/unblocked
  try {
    let state = createGame(['Alice', 'Bob']);
    const initialCoins = state.players[0].coins;
    state = startAction(state, { type: 'foreign_aid', playerId: state.players[0].id });
    
    // Pass all responses
    while (state.pendingAction?.waitingForPlayers.length) {
      const waitingPlayer = state.pendingAction.waitingForPlayers[0];
      state = pass(state, waitingPlayer);
    }
    
    const passed = state.players[0].coins === initialCoins + 2;
    results.push({
      scenario: 'Foreign aid gives 2 coins',
      passed,
      details: passed ? 'Coins added correctly' : `Expected ${initialCoins + 2}, got ${state.players[0].coins}`,
    });
  } catch (e) {
    results.push({ scenario: 'Foreign aid gives 2 coins', passed: false, details: String(e) });
  }

  // Test 16: Exchange action works correctly
  try {
    let state = createGame(['Alice', 'Bob']);
    state = startAction(state, { type: 'exchange', playerId: state.players[0].id });
    
    // Pass all responses
    while (state.pendingAction?.waitingForPlayers.length) {
      const waitingPlayer = state.pendingAction.waitingForPlayers[0];
      state = pass(state, waitingPlayer);
    }
    
    // After exchange, player should still have 2 influences
    const passed = state.players[0].influences.length === 2;
    results.push({
      scenario: 'Exchange maintains influence count',
      passed,
      details: passed ? 'Player still has 2 influences' : `Has ${state.players[0].influences.length} influences`,
    });
  } catch (e) {
    results.push({ scenario: 'Exchange maintains influence count', passed: false, details: String(e) });
  }

  // Test 17: Steal from player with 1 coin only takes 1
  try {
    let state = createGame(['Alice', 'Bob']);
    state.players[1].coins = 1;
    state = startAction(state, { type: 'steal', playerId: state.players[0].id, targetId: state.players[1].id });
    
    // Pass all responses
    while (state.pendingAction?.waitingForPlayers.length) {
      const waitingPlayer = state.pendingAction.waitingForPlayers[0];
      state = pass(state, waitingPlayer);
    }
    
    const passed = state.players[0].coins === 3 && state.players[1].coins === 0;
    results.push({
      scenario: 'Steal from player with 1 coin takes 1',
      passed,
      details: passed ? 'Coins transferred correctly' : `Alice: ${state.players[0].coins}, Bob: ${state.players[1].coins}`,
    });
  } catch (e) {
    results.push({ scenario: 'Steal from player with 1 coin takes 1', passed: false, details: String(e) });
  }

  // Test 18: Cannot steal from player with 0 coins
  try {
    let state = createGame(['Alice', 'Bob']);
    state.players[1].coins = 0;
    let passed = false;
    try {
      state = startAction(state, { type: 'steal', playerId: state.players[0].id, targetId: state.players[1].id });
    } catch (e) {
      passed = true;
    }
    results.push({
      scenario: 'Cannot steal from player with 0 coins',
      passed,
      details: passed ? 'Correctly prevented steal' : 'Allowed stealing from player with 0 coins',
    });
  } catch (e) {
    results.push({ scenario: 'Cannot steal from player with 0 coins', passed: false, details: String(e) });
  }

  // Test 19: Turn advances to next player after action
  try {
    let state = createGame(['Alice', 'Bob']);
    state = startAction(state, { type: 'income', playerId: state.players[0].id });
    const passed = state.currentPlayerIndex === 1;
    results.push({
      scenario: 'Turn advances after income',
      passed,
      details: passed ? 'Turn advanced to Bob' : `Turn is player index ${state.currentPlayerIndex}`,
    });
  } catch (e) {
    results.push({ scenario: 'Turn advances after income', passed: false, details: String(e) });
  }

  // Test 20: Turn skips eliminated players
  try {
    let state = createGame(['Alice', 'Bob', 'Charlie']);
    state.players[1].isAlive = false;
    state.players[1].influences = [];
    state = startAction(state, { type: 'income', playerId: state.players[0].id });
    const passed = state.currentPlayerIndex === 2; // Should skip Bob (index 1)
    results.push({
      scenario: 'Turn skips eliminated players',
      passed,
      details: passed ? 'Correctly skipped to Charlie' : `Turn is player index ${state.currentPlayerIndex}`,
    });
  } catch (e) {
    results.push({ scenario: 'Turn skips eliminated players', passed: false, details: String(e) });
  }

  // Test 21: Block challenge - blocker has the card (block succeeds)
  try {
    let state = createGame(['Alice', 'Bob']);
    state.players[1].coins = 5;
    state.players[1].influences = ['Captain', 'Duke'];
    
    state = startAction(state, { type: 'steal', playerId: state.players[0].id, targetId: state.players[1].id });
    state = pass(state, state.players[1].id); // Pass challenge
    state = block(state, state.players[1].id, 'Captain');
    
    // Alice challenges the block
    state = challenge(state, state.players[0].id);
    
    // Bob has Captain, so Alice loses influence
    const passed = state.pendingAction?.phase === 'lose_influence' &&
                   state.pendingAction?.playerLosingInfluence === state.players[0].id;
    results.push({
      scenario: 'Block challenge - blocker has card, challenger loses',
      passed,
      details: passed ? 'Challenger must lose influence' : `Phase: ${state.pendingAction?.phase}`,
    });
  } catch (e) {
    results.push({ scenario: 'Block challenge - blocker has card, challenger loses', passed: false, details: String(e) });
  }

  // Test 22: Block challenge - blocker doesn't have the card (action proceeds)
  try {
    let state = createGame(['Alice', 'Bob']);
    state.players[1].coins = 5;
    state.players[1].influences = ['Duke', 'Assassin']; // No Captain
    
    state = startAction(state, { type: 'steal', playerId: state.players[0].id, targetId: state.players[1].id });
    state = pass(state, state.players[1].id); // Pass challenge
    state = block(state, state.players[1].id, 'Captain');
    
    // Alice challenges the block
    state = challenge(state, state.players[0].id);
    
    // Bob doesn't have Captain, so Bob loses influence
    const passed = state.pendingAction?.phase === 'lose_influence' &&
                   state.pendingAction?.playerLosingInfluence === state.players[1].id;
    results.push({
      scenario: 'Block challenge - blocker bluffing, blocker loses',
      passed,
      details: passed ? 'Blocker must lose influence' : `Phase: ${state.pendingAction?.phase}`,
    });
  } catch (e) {
    results.push({ scenario: 'Block challenge - blocker bluffing, blocker loses', passed: false, details: String(e) });
  }

  // Test 23: Complete flow - successful challenge on action stops the action
  try {
    let state = createGame(['Alice', 'Bob']);
    state.players[0].influences = ['Captain', 'Ambassador']; // No Duke
    state.players[0].coins = 2;
    
    state = startAction(state, { type: 'tax', playerId: state.players[0].id });
    state = challenge(state, state.players[1].id);
    
    // Alice doesn't have Duke, challenge succeeds
    // Alice must choose card to lose
    state = chooseCardToLose(state, state.players[0].id, 'Captain');
    
    // Turn should advance, Alice should NOT get 3 coins
    const passed = state.players[0].coins === 2 && state.currentPlayerIndex === 1;
    results.push({
      scenario: 'Successful challenge cancels action',
      passed,
      details: passed ? 'Action cancelled, turn advanced' : `Coins: ${state.players[0].coins}, Turn: ${state.currentPlayerIndex}`,
    });
  } catch (e) {
    results.push({ scenario: 'Successful challenge cancels action', passed: false, details: String(e) });
  }

  // Test 24: Complete flow - failed challenge lets action proceed
  try {
    let state = createGame(['Alice', 'Bob']);
    state.players[0].influences = ['Duke', 'Ambassador']; // Has Duke
    state.players[1].influences = ['Captain', 'Assassin'];
    state.players[0].coins = 2;
    
    state = startAction(state, { type: 'tax', playerId: state.players[0].id });
    state = challenge(state, state.players[1].id);
    
    // Alice has Duke, challenge fails
    // Bob must choose card to lose
    state = chooseCardToLose(state, state.players[1].id, 'Captain');
    
    // Alice should get 3 coins
    const passed = state.players[0].coins === 5;
    results.push({
      scenario: 'Failed challenge lets action proceed',
      passed,
      details: passed ? 'Action completed, coins received' : `Coins: ${state.players[0].coins}`,
    });
  } catch (e) {
    results.push({ scenario: 'Failed challenge lets action proceed', passed: false, details: String(e) });
  }

  // Test 25: Three player game - correct turn order
  try {
    let state = createGame(['Alice', 'Bob', 'Charlie']);
    state = startAction(state, { type: 'income', playerId: state.players[0].id });
    state = startAction(state, { type: 'income', playerId: state.players[1].id });
    state = startAction(state, { type: 'income', playerId: state.players[2].id });
    
    const passed = state.currentPlayerIndex === 0; // Back to Alice
    results.push({
      scenario: 'Three player turn order wraps correctly',
      passed,
      details: passed ? 'Turn wrapped to Alice' : `Turn is player index ${state.currentPlayerIndex}`,
    });
  } catch (e) {
    results.push({ scenario: 'Three player turn order wraps correctly', passed: false, details: String(e) });
  }

  return results;
};
