import { describe, expect, it } from 'vitest';
import { type BotNotes, chooseBotAction, emptyBotNotes } from './bot';
import { applyAction } from './game';
import { seededRandom } from './random';
import { createGame } from './setup';
import { act, elect, FIVE, gameWith, makePlayers, SEVEN } from './test-helpers';
import type { GameState, PlayerId, WinReason } from './types';
import { viewFor } from './view';

/** Every living player that has a move makes it, until the game ends. */
function playBots(state: GameState, seed: number): GameState {
  const random = seededRandom(seed);
  const notes = new Map<PlayerId, BotNotes>();
  let current = state;
  for (let step = 0; current.phase !== 'game_over'; step++) {
    expect(step).toBeLessThan(2000);
    const moved = current.players.some((p) => {
      const choice = chooseBotAction(
        viewFor(current, p.id),
        notes.get(p.id) ?? emptyBotNotes(),
        random,
      );
      if (!choice) return false;
      const result = applyAction(current, choice.action, random);
      if (!result.ok)
        throw new Error(`seed ${seed}: ${choice.action.type} → ${result.error.message}`);
      notes.set(p.id, choice.notes);
      current = result.value;
      return true;
    });
    expect(moved).toBe(true);
  }
  return current;
}

describe('bots', () => {
  it('only make legal moves and finish every game, reaching every ending', () => {
    const endings = new Map<WinReason, number>();
    for (let seed = 0; seed < 600; seed++) {
      const created = createGame({ players: makePlayers(5 + (seed % 6)) }, seededRandom(seed));
      if (!created.ok) throw new Error(created.error.message);
      const end = playBots(created.value, seed);
      endings.set(end.winReason as WinReason, (endings.get(end.winReason as WinReason) ?? 0) + 1);
    }
    expect([...endings.keys()].sort()).toEqual([
      'fascist_policies',
      'hitler_elected',
      'hitler_executed',
      'liberal_policies',
    ]);
  }, 60_000);

  it('only act on their own turn', () => {
    const state = gameWith(FIVE);
    const random = seededRandom(1);
    expect(chooseBotAction(viewFor(state, 'p2'), emptyBotNotes(), random)).toBeNull();
    expect(chooseBotAction(viewFor(state, 'p0'), emptyBotNotes(), random)?.action.type).toBe(
      'nominate',
    );
  });

  it('fascists vote in Hitler once three fascist policies are down', () => {
    const state = gameWith(SEVEN, { president: 1 });
    state.enacted.fascist = 3;
    const voting = act(state, { type: 'nominate', playerId: 'p1', targetId: 'p0' });
    const yes = Array.from({ length: 50 }, (_, i) =>
      chooseBotAction(viewFor(voting, 'p2'), emptyBotNotes(), seededRandom(i)),
    ).filter((c) => c?.action.type === 'vote' && c.action.approve).length;
    expect(yes).toBeGreaterThanOrEqual(48);
  });

  it('a liberal president discards a fascist policy from two fascists and a liberal', () => {
    const state = elect(
      gameWith(FIVE, { president: 2, deck: ['fascist', 'liberal', 'fascist'] }),
      'p3',
    );
    const choice = chooseBotAction(viewFor(state, 'p2'), emptyBotNotes(), seededRandom(1));
    expect(choice?.action).toEqual({ type: 'discard', playerId: 'p2', index: 0 });
    expect(choice?.notes.passed[state.round]).toEqual(['liberal', 'fascist']);
  });

  it('a liberal chancellor enacts the liberal policy', () => {
    let state = elect(
      gameWith(FIVE, { president: 2, deck: ['fascist', 'liberal', 'fascist'] }),
      'p3',
    );
    state = act(state, { type: 'discard', playerId: 'p2', index: 0 });
    const choice = chooseBotAction(viewFor(state, 'p3'), emptyBotNotes(), seededRandom(1));
    expect(choice?.action).toEqual({ type: 'enact', playerId: 'p3', index: 0 });
  });

  it('fascists never execute Hitler when they have a choice', () => {
    const state = gameWith(SEVEN, { president: 1 });
    state.phase = 'execution';
    for (let i = 0; i < 50; i++) {
      const choice = chooseBotAction(viewFor(state, 'p1'), emptyBotNotes(), seededRandom(i));
      expect(choice?.action).toMatchObject({ type: 'execute' });
      expect(choice?.action.type === 'execute' && choice.action.targetId).not.toBe('p0');
    }
  });
});
