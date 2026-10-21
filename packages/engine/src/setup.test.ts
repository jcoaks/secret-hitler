import { describe, expect, it } from 'vitest';
import { seededRandom } from './random';
import { createGame, roleList } from './setup';
import { makePlayers } from './test-helpers';

describe('setup', () => {
  it.each([
    [5, 3, 1],
    [6, 4, 1],
    [7, 4, 2],
    [8, 5, 2],
    [9, 5, 3],
    [10, 6, 3],
  ])('%i players: %i liberals, %i fascists and Hitler', (count, liberals, fascists) => {
    const roles = roleList(count);
    expect(roles.filter((r) => r === 'liberal')).toHaveLength(liberals);
    expect(roles.filter((r) => r === 'fascist')).toHaveLength(fascists);
    expect(roles.filter((r) => r === 'hitler')).toHaveLength(1);
  });

  it('deals every role, shuffles 6 liberal and 11 fascist policies and seats a president', () => {
    const created = createGame({ players: makePlayers(7) }, seededRandom(3));
    if (!created.ok) throw new Error(created.error.message);
    const state = created.value;
    expect(Object.values(state.roles).sort()).toEqual([...roleList(7)].sort());
    expect(state.drawPile.filter((p) => p === 'liberal')).toHaveLength(6);
    expect(state.drawPile.filter((p) => p === 'fascist')).toHaveLength(11);
    expect(state.players.map((p) => p.id)).toContain(state.presidentId);
    expect(state.phase).toBe('nomination');
  });

  it('rejects bad player counts and duplicates', () => {
    expect(createGame({ players: makePlayers(4) }, seededRandom(1)).ok).toBe(false);
    const twice = [...makePlayers(4), { id: 'p0', name: 'Otra' }];
    expect(createGame({ players: twice }, seededRandom(1))).toMatchObject({
      ok: false,
      error: { code: 'duplicate_player' },
    });
  });
});
