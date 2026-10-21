import { applyAction } from './game';
import { seededRandom } from './random';
import type { Policy, Role } from './rules';
import { createGame } from './setup';
import type { Action, GameState, Player, PlayerId } from './types';

const NAMES = ['Ana', 'Beto', 'Carla', 'Dani', 'Eva', 'Fede', 'Gala', 'Hugo', 'Inés', 'Juan'];

export const random = seededRandom(7);

export function makePlayers(count: number): Player[] {
  return NAMES.slice(0, count).map((name, i) => ({ id: `p${i}`, name }));
}

/**
 * A game where seat i has roles[i] and p0 is the first president.
 * `deck` sets the top of the draw pile (the rest of the deck follows).
 */
export function gameWith(roles: Role[], options: { deck?: Policy[]; president?: number } = {}) {
  const players = makePlayers(roles.length);
  const created = createGame({ players }, seededRandom(1));
  if (!created.ok) throw new Error(created.error.message);
  const state = created.value;
  state.roles = Object.fromEntries(players.map((p, i) => [p.id, roles[i] as Role]));
  state.rotationIndex = options.president ?? 0;
  state.presidentId = (players[state.rotationIndex] as Player).id;
  if (options.deck) {
    // Move the chosen cards to the top, keeping the deck at 17.
    const rest = [...state.drawPile];
    for (const card of options.deck) rest.splice(rest.indexOf(card), 1);
    state.drawPile = [...options.deck, ...rest];
  }
  return state;
}

/** Five players: p0 Hitler, p1 fascist, p2–p4 liberals. */
export const FIVE: Role[] = ['hitler', 'fascist', 'liberal', 'liberal', 'liberal'];
/** Seven players: p0 Hitler, p1–p2 fascists, p3–p6 liberals. */
export const SEVEN: Role[] = [
  'hitler',
  'fascist',
  'fascist',
  'liberal',
  'liberal',
  'liberal',
  'liberal',
];
/** Nine players: p0 Hitler, p1–p3 fascists, p4–p8 liberals. */
export const NINE: Role[] = [
  'hitler',
  'fascist',
  'fascist',
  'fascist',
  'liberal',
  'liberal',
  'liberal',
  'liberal',
  'liberal',
];

export function act(state: GameState, action: Action): GameState {
  const result = applyAction(state, action, random);
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.value;
}

/** Every living player votes `approve` (or per-player overrides). */
export function voteAll(
  state: GameState,
  approve: boolean | Record<PlayerId, boolean> = true,
): GameState {
  let next = state;
  for (const p of state.players) {
    if (state.deadIds.includes(p.id)) continue;
    const value = typeof approve === 'boolean' ? approve : (approve[p.id] ?? true);
    next = act(next, { type: 'vote', playerId: p.id, approve: value });
  }
  return next;
}

/** The president nominates `chancellorId` and everyone votes. */
export function elect(
  state: GameState,
  chancellorId: PlayerId,
  approve: boolean | Record<PlayerId, boolean> = true,
): GameState {
  const nominated = act(state, {
    type: 'nominate',
    playerId: state.presidentId,
    targetId: chancellorId,
  });
  return voteAll(nominated, approve);
}

/**
 * Elects a government and passes `policy` if the hand allows it: the president discards a card of
 * the other kind when there is one, and the chancellor enacts `policy`.
 */
export function legislate(state: GameState, chancellorId: PlayerId, policy: Policy): GameState {
  let next = elect(state, chancellorId);
  const other: Policy = policy === 'liberal' ? 'fascist' : 'liberal';
  const discardIndex = Math.max(0, next.hand.indexOf(other));
  next = act(next, { type: 'discard', playerId: next.presidentId, index: discardIndex });
  const enactIndex = Math.max(0, next.hand.indexOf(policy));
  return act(next, { type: 'enact', playerId: chancellorId, index: enactIndex });
}

/** A chancellor eligible in `state` who is not `exclude`. */
export function someChancellor(state: GameState, exclude: PlayerId[] = []): PlayerId {
  const limitPresident = state.players.length - state.deadIds.length > 5;
  const candidate = state.players.find(
    (p) =>
      p.id !== state.presidentId &&
      !state.deadIds.includes(p.id) &&
      p.id !== state.lastElected?.chancellorId &&
      !(limitPresident && p.id === state.lastElected?.presidentId) &&
      !exclude.includes(p.id),
  );
  if (!candidate) throw new Error('No hay canciller posible');
  return candidate.id;
}
