import { describe, expect, it } from 'vitest';
import { applyAction, eligibleChancellors } from './game';
import {
  act,
  elect,
  FIVE,
  gameWith,
  legislate,
  NINE,
  random,
  SEVEN,
  voteAll,
} from './test-helpers';
import type { Action, GameState } from './types';

function errorOf(state: GameState, action: Action): string | null {
  const result = applyAction(state, action, random);
  return result.ok ? null : result.error.code;
}

describe('nomination', () => {
  it('only the president nominates, and never themselves', () => {
    const state = gameWith(FIVE);
    expect(errorOf(state, { type: 'nominate', playerId: 'p1', targetId: 'p2' })).toBe(
      'not_president',
    );
    expect(errorOf(state, { type: 'nominate', playerId: 'p0', targetId: 'p0' })).toBe(
      'invalid_target',
    );
    const next = act(state, { type: 'nominate', playerId: 'p0', targetId: 'p2' });
    expect(next.phase).toBe('election');
    expect(next.chancellorId).toBe('p2');
  });

  it('with more than five alive, the last president and chancellor are term limited', () => {
    let state = gameWith(SEVEN, { deck: ['liberal', 'liberal', 'fascist'] });
    state = legislate(state, 'p3', 'liberal');
    expect(state.presidentId).toBe('p1');
    expect(eligibleChancellors(state)).not.toContain('p0');
    expect(eligibleChancellors(state)).not.toContain('p3');
    expect(errorOf(state, { type: 'nominate', playerId: 'p1', targetId: 'p0' })).toBe(
      'term_limited',
    );
  });

  it('with five alive, only the last chancellor is term limited', () => {
    let state = gameWith(FIVE, { deck: ['liberal', 'liberal', 'fascist'] });
    state = legislate(state, 'p3', 'liberal');
    expect(eligibleChancellors(state)).toContain('p0');
    expect(eligibleChancellors(state)).not.toContain('p3');
  });

  it('a rejected government does not set term limits', () => {
    let state = gameWith(FIVE);
    state = elect(state, 'p3', false);
    expect(state.lastElected).toBeNull();
    expect(eligibleChancellors(state)).toContain('p3');
  });
});

describe('election', () => {
  it('passes only with a strict majority', () => {
    const state = gameWith(SEVEN);
    const nominated = act(state, { type: 'nominate', playerId: 'p0', targetId: 'p3' });
    const tie = { p0: true, p1: true, p2: true, p3: false, p4: false, p5: false, p6: false };
    expect(voteAll(nominated, tie).phase).toBe('nomination');
    const win = { ...tie, p3: true };
    expect(voteAll(nominated, win).phase).toBe('legislative_president');
  });

  it('lets a player change their vote until the last one arrives', () => {
    let state = act(gameWith(FIVE), { type: 'nominate', playerId: 'p0', targetId: 'p2' });
    state = act(state, { type: 'vote', playerId: 'p1', approve: false });
    state = act(state, { type: 'vote', playerId: 'p1', approve: true });
    expect(state.votes.p1).toBe(true);
  });

  it('records the votes in the chronicle', () => {
    const state = elect(gameWith(FIVE), 'p2', { p3: false });
    const entry = state.chronicle.at(-1);
    expect(entry).toMatchObject({ type: 'election', approved: true, presidentId: 'p0' });
    expect(entry?.type === 'election' && entry.votes.p3).toBe(false);
  });

  it('a rejection advances the tracker and the presidency', () => {
    const state = elect(gameWith(FIVE), 'p2', false);
    expect(state.electionTracker).toBe(1);
    expect(state.presidentId).toBe('p1');
    expect(state.phase).toBe('nomination');
  });

  it('three rejections enact the top card without powers and reset term limits', () => {
    let state = gameWith(NINE, { deck: ['liberal', 'liberal', 'fascist'] });
    state = legislate(state, 'p4', 'liberal');
    expect(state.lastElected).not.toBeNull();
    const top = state.drawPile[0];
    state = elect(state, 'p5', false);
    state = elect(state, 'p6', false);
    state = elect(state, 'p7', false);
    expect(state.electionTracker).toBe(0);
    expect(state.lastElected).toBeNull();
    expect(state.phase).toBe('nomination');
    expect(state.chronicle.find((e) => e.type === 'enacted' && e.chaos)).toMatchObject({
      policy: top,
      power: null,
    });
  });

  it('electing Hitler chancellor after three fascist policies wins for the fascists', () => {
    const state = gameWith(FIVE, { president: 1 });
    state.enacted.fascist = 3;
    const next = elect(state, 'p0');
    expect(next.phase).toBe('game_over');
    expect(next.winner).toBe('fascist');
    expect(next.winReason).toBe('hitler_elected');
  });

  it('electing Hitler earlier is just another government', () => {
    const state = gameWith(FIVE, { president: 1 });
    state.enacted.fascist = 2;
    expect(elect(state, 'p0').phase).toBe('legislative_president');
  });
});

describe('legislative session', () => {
  it('the president discards one of three and the chancellor enacts one of two', () => {
    let state = elect(gameWith(FIVE, { deck: ['liberal', 'fascist', 'fascist'] }), 'p2');
    expect(state.hand).toEqual(['liberal', 'fascist', 'fascist']);
    expect(errorOf(state, { type: 'discard', playerId: 'p2', index: 0 })).toBe('not_president');
    state = act(state, { type: 'discard', playerId: 'p0', index: 1 });
    expect(state.hand).toEqual(['liberal', 'fascist']);
    expect(errorOf(state, { type: 'enact', playerId: 'p0', index: 0 })).toBe('not_chancellor');
    expect(errorOf(state, { type: 'enact', playerId: 'p2', index: 2 })).toBe('invalid_card');
    state = act(state, { type: 'enact', playerId: 'p2', index: 0 });
    expect(state.enacted).toEqual({ liberal: 1, fascist: 0 });
    expect(state.discardPile).toEqual(['fascist', 'fascist']);
    expect(state.presidentId).toBe('p1');
  });

  it('five liberal policies win for the liberals', () => {
    const state = gameWith(FIVE, { deck: ['liberal', 'liberal', 'liberal'] });
    state.enacted.liberal = 4;
    const next = legislate(state, 'p2', 'liberal');
    expect(next.winner).toBe('liberal');
    expect(next.winReason).toBe('liberal_policies');
  });

  it('six fascist policies win for the fascists', () => {
    const state = gameWith(FIVE, { deck: ['fascist', 'fascist', 'fascist'] });
    state.enacted.fascist = 5;
    const next = legislate(state, 'p2', 'fascist');
    expect(next.winner).toBe('fascist');
    expect(next.winReason).toBe('fascist_policies');
  });

  it('shuffles the discard pile back in when fewer than three cards remain', () => {
    const state = gameWith(FIVE);
    state.drawPile = ['liberal', 'liberal', 'fascist', 'fascist'];
    state.discardPile = Array(13).fill('fascist');
    const next = legislate(state, 'p2', 'liberal');
    expect(next.drawPile.length + next.discardPile.length).toBe(16);
    expect(next.discardPile).toEqual([]);
    expect(next.chronicle.some((e) => e.type === 'reshuffle')).toBe(true);
  });
});

describe('veto', () => {
  function chancellorPhase(fascist: number): GameState {
    const state = gameWith(FIVE, { deck: ['fascist', 'fascist', 'fascist'] });
    state.enacted.fascist = fascist;
    const elected = elect(state, 'p2');
    return act(elected, { type: 'discard', playerId: 'p0', index: 0 });
  }

  it('is locked until five fascist policies', () => {
    expect(errorOf(chancellorPhase(4), { type: 'propose_veto', playerId: 'p2' })).toBe(
      'veto_locked',
    );
  });

  it('accepted: both cards are discarded and the tracker advances', () => {
    let state = act(chancellorPhase(5), { type: 'propose_veto', playerId: 'p2' });
    expect(state.phase).toBe('veto');
    expect(errorOf(state, { type: 'answer_veto', playerId: 'p2', accept: true })).toBe(
      'not_president',
    );
    state = act(state, { type: 'answer_veto', playerId: 'p0', accept: true });
    expect(state.enacted.fascist).toBe(5);
    expect(state.electionTracker).toBe(1);
    expect(state.phase).toBe('nomination');
    expect(state.presidentId).toBe('p1');
  });

  it('denied: the chancellor must enact and cannot propose again', () => {
    let state = act(chancellorPhase(5), { type: 'propose_veto', playerId: 'p2' });
    state = act(state, { type: 'answer_veto', playerId: 'p0', accept: false });
    expect(state.phase).toBe('legislative_chancellor');
    expect(errorOf(state, { type: 'propose_veto', playerId: 'p2' })).toBe('veto_locked');
    state = act(state, { type: 'enact', playerId: 'p2', index: 0 });
    expect(state.winner).toBe('fascist');
  });
});

describe('presidential powers', () => {
  function afterFascist(roles: typeof FIVE, alreadyEnacted: number): GameState {
    const state = gameWith(roles, { deck: ['fascist', 'fascist', 'fascist'] });
    state.enacted.fascist = alreadyEnacted;
    return legislate(state, roles.length > 5 ? 'p4' : 'p2', 'fascist');
  }

  it('follows each board', () => {
    expect(afterFascist(FIVE, 0).phase).toBe('nomination');
    expect(afterFascist(FIVE, 2).phase).toBe('peek');
    expect(afterFascist(FIVE, 3).phase).toBe('execution');
    expect(afterFascist(SEVEN, 0).phase).toBe('nomination');
    expect(afterFascist(SEVEN, 1).phase).toBe('investigate');
    expect(afterFascist(SEVEN, 2).phase).toBe('special_election');
    expect(afterFascist(NINE, 0).phase).toBe('investigate');
    expect(afterFascist(NINE, 4).phase).toBe('execution');
  });

  it('peek: the president acknowledges and the term ends', () => {
    const state = afterFascist(FIVE, 2);
    expect(errorOf(state, { type: 'end_peek', playerId: 'p1' })).toBe('not_president');
    const next = act(state, { type: 'end_peek', playerId: 'p0' });
    expect(next.phase).toBe('nomination');
    expect(next.presidentId).toBe('p1');
  });

  it('investigate: reveals the party (Hitler is fascist) once per player', () => {
    let state = afterFascist(SEVEN, 1);
    state = act(state, { type: 'investigate', playerId: 'p0', targetId: 'p6' });
    expect(state.investigations.at(-1)).toMatchObject({ targetId: 'p6', party: 'liberal' });

    const other = afterFascist(SEVEN, 1);
    other.presidentId = 'p3';
    const hitler = act(other, { type: 'investigate', playerId: 'p3', targetId: 'p0' });
    expect(hitler.investigations.at(-1)?.party).toBe('fascist');

    const again = afterFascist(SEVEN, 1);
    again.investigatedIds = ['p6'];
    expect(errorOf(again, { type: 'investigate', playerId: 'p0', targetId: 'p6' })).toBe(
      'invalid_target',
    );
  });

  it('special election: the chosen player presides, then the rotation resumes', () => {
    let state = afterFascist(SEVEN, 2);
    state = act(state, { type: 'special_election', playerId: 'p0', targetId: 'p5' });
    expect(state.presidentId).toBe('p5');
    state = elect(state, 'p3', false);
    expect(state.presidentId).toBe('p1');
  });

  it('execution: the dead are skipped and cannot act', () => {
    let state = afterFascist(FIVE, 3);
    state = act(state, { type: 'execute', playerId: 'p0', targetId: 'p1' });
    expect(state.deadIds).toEqual(['p1']);
    expect(state.presidentId).toBe('p2');
    expect(errorOf(state, { type: 'vote', playerId: 'p1', approve: true })).toBe('dead_player');
    state = act(state, { type: 'nominate', playerId: 'p2', targetId: 'p3' });
    expect(errorOf(state, { type: 'vote', playerId: 'p1', approve: true })).toBe('dead_player');
    // Four living voters: two yes is not a majority.
    state = voteAll(state, { p0: true, p2: true, p3: false, p4: false });
    expect(state.electionTracker).toBe(1);
  });

  it('executing Hitler wins for the liberals', () => {
    const state = afterFascist(FIVE, 3);
    const next = act(state, { type: 'execute', playerId: 'p0', targetId: 'p4' });
    expect(next.winner).toBeNull();
    const other = afterFascist(FIVE, 3);
    other.presidentId = 'p2';
    const won = act(other, { type: 'execute', playerId: 'p2', targetId: 'p0' });
    expect(won.winner).toBe('liberal');
    expect(won.winReason).toBe('hitler_executed');
  });
});

describe('purity', () => {
  it('never mutates the input state', () => {
    const state = gameWith(FIVE);
    const before = structuredClone(state);
    act(state, { type: 'nominate', playerId: 'p0', targetId: 'p2' });
    expect(state).toEqual(before);
  });

  it('rejects actions once the game is over', () => {
    const state = gameWith(FIVE);
    state.phase = 'game_over';
    expect(errorOf(state, { type: 'nominate', playerId: 'p0', targetId: 'p2' })).toBe('game_over');
  });
});
