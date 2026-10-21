import { describe, expect, it } from 'vitest';
import { act, elect, FIVE, gameWith, legislate, SEVEN } from './test-helpers';
import { viewFor } from './view';

describe('what each player knows', () => {
  it('liberals know nobody', () => {
    expect(viewFor(gameWith(SEVEN), 'p3').you.knows).toEqual([]);
  });

  it('fascists know Hitler and each other', () => {
    expect(viewFor(gameWith(SEVEN), 'p1').you.knows).toEqual([
      { playerId: 'p0', role: 'hitler' },
      { playerId: 'p2', role: 'fascist' },
    ]);
  });

  it('Hitler knows the fascist only with five or six players', () => {
    expect(viewFor(gameWith(FIVE), 'p0').you.knows).toEqual([{ playerId: 'p1', role: 'fascist' }]);
    expect(viewFor(gameWith(SEVEN), 'p0').you.knows).toEqual([]);
  });

  it('no one sees other roles until the game ends', () => {
    const state = gameWith(FIVE);
    expect(viewFor(state, 'p2').roles).toBeNull();
    state.phase = 'game_over';
    expect(viewFor(state, 'p2').roles).toEqual(state.roles);
  });
});

describe('hidden information', () => {
  it('only the card holder sees the hand', () => {
    let state = elect(gameWith(FIVE), 'p2');
    expect(viewFor(state, 'p0').you.hand).toHaveLength(3);
    for (const id of ['p1', 'p2', 'p3', 'p4']) expect(viewFor(state, id).you.hand).toBeNull();

    state = act(state, { type: 'discard', playerId: 'p0', index: 0 });
    expect(viewFor(state, 'p2').you.hand).toHaveLength(2);
    for (const id of ['p0', 'p1', 'p3', 'p4']) expect(viewFor(state, id).you.hand).toBeNull();
  });

  it('votes stay secret until everyone has voted', () => {
    let state = act(gameWith(FIVE), { type: 'nominate', playerId: 'p0', targetId: 'p2' });
    state = act(state, { type: 'vote', playerId: 'p1', approve: false });
    const view = viewFor(state, 'p3');
    expect(view.votedPlayerIds).toEqual(['p1']);
    expect(view.you.vote).toBeNull();
    expect(viewFor(state, 'p1').you.vote).toBe(false);
    expect(JSON.stringify(view)).not.toContain('"p1":false');
  });

  it('only the president sees the peek', () => {
    const state = gameWith(FIVE, { deck: ['fascist', 'fascist', 'fascist'] });
    state.enacted.fascist = 2;
    const peeking = legislate(state, 'p2', 'fascist');
    expect(peeking.phase).toBe('peek');
    expect(viewFor(peeking, 'p0').you.peek).toEqual(peeking.drawPile.slice(0, 3));
    expect(viewFor(peeking, 'p1').you.peek).toBeNull();
  });

  it('only the investigating president sees the result', () => {
    const state = gameWith(SEVEN, { deck: ['fascist', 'fascist', 'fascist'] });
    state.enacted.fascist = 1;
    const done = act(legislate(state, 'p4', 'fascist'), {
      type: 'investigate',
      playerId: 'p0',
      targetId: 'p6',
    });
    expect(viewFor(done, 'p0').you.investigations).toHaveLength(1);
    expect(viewFor(done, 'p6').you.investigations).toEqual([]);
    expect(viewFor(done, 'p6').investigatedIds).toEqual(['p6']);
    expect(viewFor(done, 'p3').you.investigations).toEqual([]);
    expect(JSON.stringify(viewFor(done, 'p3').chronicle)).not.toContain('party');
  });

  it('never leaks the draw pile order or the discards', () => {
    const view = viewFor(elect(gameWith(FIVE), 'p2'), 'p3');
    expect(view).not.toHaveProperty('drawPile');
    expect(view).not.toHaveProperty('discardPile');
    expect(view.drawCount).toBe(14);
  });
});
