import { describe, expect, it } from 'vitest';
import { applyAction } from './game';
import { randomInt, seededRandom } from './random';
import { createGame } from './setup';
import { makePlayers } from './test-helpers';
import type { Action, GameState, WinReason } from './types';
import { viewFor } from './view';

/** A legal action for whoever has to act, chosen at random from that player's view. */
function randomAction(state: GameState, pick: (n: number) => number): Action {
  const president = state.presidentId;
  const view = viewFor(state, president);
  const alive = state.players.map((p) => p.id).filter((id) => !state.deadIds.includes(id));
  const others = alive.filter((id) => id !== president);
  const choose = <T>(items: T[]): T => items[pick(items.length)] as T;

  switch (state.phase) {
    case 'nomination':
      return {
        type: 'nominate',
        playerId: president,
        targetId: choose(view.eligibleChancellorIds),
      };
    case 'election': {
      const voter = alive.find((id) => state.votes[id] === undefined) as string;
      return { type: 'vote', playerId: voter, approve: pick(3) > 0 };
    }
    case 'legislative_president':
      return { type: 'discard', playerId: president, index: pick(3) };
    case 'legislative_chancellor': {
      const chancellor = state.chancellorId as string;
      if (view.vetoUnlocked && !state.vetoDenied && pick(3) === 0) {
        return { type: 'propose_veto', playerId: chancellor };
      }
      return { type: 'enact', playerId: chancellor, index: pick(2) };
    }
    case 'veto':
      return { type: 'answer_veto', playerId: president, accept: pick(2) === 0 };
    case 'investigate': {
      const targets = others.filter((id) => !state.investigatedIds.includes(id));
      return { type: 'investigate', playerId: president, targetId: choose(targets) };
    }
    case 'peek':
      return { type: 'end_peek', playerId: president };
    case 'special_election':
      return { type: 'special_election', playerId: president, targetId: choose(others) };
    case 'execution':
      return { type: 'execute', playerId: president, targetId: choose(others) };
    case 'game_over':
      throw new Error('La partida ya terminó');
  }
}

describe('random games', () => {
  it('always end, keep the deck whole and reach every ending', () => {
    const endings = new Set<WinReason>();
    for (let seed = 0; seed < 1800; seed++) {
      const random = seededRandom(seed);
      const pick = (n: number) => randomInt(random, n);
      const players = makePlayers(5 + (seed % 6));
      const created = createGame({ players }, random);
      if (!created.ok) throw new Error(created.error.message);
      let state = created.value;

      for (let step = 0; state.phase !== 'game_over'; step++) {
        expect(step).toBeLessThan(2000);
        const result = applyAction(state, randomAction(state, pick), random);
        if (!result.ok) throw new Error(`seed ${seed}: ${result.error.message}`);
        state = result.value;
        const cards =
          state.drawPile.length +
          state.discardPile.length +
          state.hand.length +
          state.enacted.liberal +
          state.enacted.fascist;
        expect(cards).toBe(17);
      }
      endings.add(state.winReason as WinReason);
    }
    expect([...endings].sort()).toEqual([
      'fascist_policies',
      'hitler_elected',
      'hitler_executed',
      'liberal_policies',
    ]);
  });
});
