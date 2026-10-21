// Computer players, ported from Secret Hitler Online's CpuPlayer. Unlike the original, a bot
// decides only from its own PlayerView, so it knows exactly what a human in its seat would know.
import { type Random, randomInt } from './random';
import type { Policy, Role } from './rules';
import type { Action, PlayerId } from './types';
import type { PlayerView } from './view';

/**
 * What a bot remembers between turns, by round: the two cards it handed the chancellor as
 * president, and the two it received as chancellor. Nobody else ever sees these.
 */
export interface BotNotes {
  passed: Record<number, Policy[]>;
  received?: Record<number, Policy[]>;
}

export function emptyBotNotes(): BotNotes {
  return { passed: {}, received: {} };
}

const MAX_REPUTATION = 5;

/** Weights for choosing a player: by known role, interpolated by reputation when unknown. */
interface Weights {
  fascist: number;
  hitler: number;
  liberal: number;
}

/** What the bot believes about each player: a known role, or a reputation in [-5, 5]. */
interface Beliefs {
  known: Map<PlayerId, Role>;
  reputation: Map<PlayerId, number>;
  /** Elected chancellor with three fascist policies down and the game went on: not Hitler. */
  notHitler: Set<PlayerId>;
}

function clampReputation(value: number): number {
  return Math.max(-MAX_REPUTATION, Math.min(MAX_REPUTATION, value));
}

/**
 * What the bot makes of the game so far, the way a careful player would:
 * - governments that pass fascist policies look suspicious, liberal ones look clean;
 * - as president, a chancellor who picked fascist from a mixed hand is caught red-handed;
 * - as chancellor, a president who handed over two fascists probably discarded a liberal;
 * - players who keep voting in governments that pass fascist policies look suspicious too.
 */
export function beliefsFor(view: PlayerView, notes: BotNotes): Beliefs {
  const me = view.you.id;
  const known = new Map<PlayerId, Role>([[me, view.you.role]]);
  for (const k of view.you.knows) known.set(k.playerId, k.role);
  for (const i of view.you.investigations) {
    if (!known.has(i.targetId))
      known.set(i.targetId, i.party === 'liberal' ? 'liberal' : 'fascist');
  }

  const reputation = new Map<PlayerId, number>(view.players.map((p) => [p.id, 0]));
  const adjust = (id: PlayerId, delta: number) =>
    reputation.set(id, clampReputation((reputation.get(id) ?? 0) + delta));

  const notHitler = new Set<PlayerId>();
  let fascistPolicies = 0;
  let government: {
    presidentId: PlayerId;
    chancellorId: PlayerId;
    round: number;
    votes: Record<PlayerId, boolean>;
  } | null = null;
  for (const entry of view.chronicle) {
    if (entry.type === 'election' && entry.approved) {
      government = { ...entry };
      if (fascistPolicies >= view.board.hitlerChancellorWinsFrom) notHitler.add(entry.chancellorId);
    } else if (entry.type === 'enacted' && !entry.chaos && government?.round === entry.round) {
      const { presidentId, chancellorId, votes } = government;
      const liberal = entry.policy === 'liberal';
      if (!liberal) fascistPolicies += 1;
      if (presidentId === me) {
        const passed = notes.passed[entry.round];
        // We handed over one of each: the chancellor chose.
        if (passed && passed[0] !== passed[1]) adjust(chancellorId, liberal ? 4 : -4);
      } else if (chancellorId === me) {
        const received = notes.received?.[entry.round];
        if (received) {
          const fascists = received.filter((p) => p === 'fascist').length;
          // Two fascists: the president drew three, or threw a liberal away.
          adjust(presidentId, fascists === 2 ? -2 : 1.5);
        }
      } else {
        adjust(presidentId, liberal ? 1 : -1.5);
        adjust(chancellorId, liberal ? 1 : -1.5);
      }
      // Whoever backed the government shares a little of the credit or the blame.
      for (const [voter, yes] of Object.entries(votes)) {
        if (voter === presidentId || voter === chancellorId || voter === me) continue;
        if (yes) adjust(voter, liberal ? 0.25 : -0.5);
      }
    } else if (entry.type === 'veto' && entry.presidentId === me) {
      // We accepted the veto only when it was two fascist policies: a liberal-looking move.
      adjust(entry.chancellorId, 2);
    } else if (entry.type === 'enacted' && entry.chaos && entry.policy === 'fascist') {
      fascistPolicies += 1;
    } else if (entry.type === 'execution' && !known.has(entry.targetId)) {
      // Executions are usually aimed at suspects; the executioner earns a little trust.
      adjust(entry.presidentId, 0.5);
    }
  }
  for (const id of view.deadIds) notHitler.add(id);
  return { known, reputation, notHitler };
}

/** Effective reputation: known liberals are fully trusted, known fascists fully distrusted. */
function trust(beliefs: Beliefs, id: PlayerId): number {
  const role = beliefs.known.get(id);
  if (role) return role === 'liberal' ? MAX_REPUTATION : -MAX_REPUTATION;
  return beliefs.reputation.get(id) ?? 0;
}

function weightFor(beliefs: Beliefs, id: PlayerId, weights: Weights): number {
  const role = beliefs.known.get(id);
  if (role) return weights[role];
  const t = ((beliefs.reputation.get(id) ?? 0) + MAX_REPUTATION) / (2 * MAX_REPUTATION);
  return t * weights.liberal + (1 - t) * weights.fascist;
}

/** Weighted random pick among `candidates`; falls back to a uniform pick if all weights are 0. */
function pickWeighted(
  candidates: PlayerId[],
  beliefs: Beliefs,
  weights: Weights,
  random: Random,
): PlayerId | null {
  if (candidates.length === 0) return null;
  const scored = candidates.map((id) => ({ id, w: Math.max(0, weightFor(beliefs, id, weights)) }));
  const total = scored.reduce((sum, s) => sum + s.w, 0);
  if (total <= 0) return candidates[randomInt(random, candidates.length)] as PlayerId;
  let t = random() * total;
  for (const s of scored) {
    t -= s.w;
    if (t < 0) return s.id;
  }
  return (scored.at(-1) as { id: PlayerId }).id;
}

function aliveOthers(view: PlayerView): PlayerId[] {
  return view.players
    .map((p) => p.id)
    .filter((id) => id !== view.you.id && !view.deadIds.includes(id));
}

function indexOf(hand: Policy[], policy: Policy): number {
  return Math.max(0, hand.indexOf(policy));
}

/**
 * The bot's move for this view, or null when it has nothing to do. Also returns its updated
 * notes (it remembers what it passes as president).
 */
export function chooseBotAction(
  view: PlayerView,
  notes: BotNotes,
  random: Random,
): { action: Action; notes: BotNotes } | null {
  const me = view.you.id;
  const role = view.you.role;
  if (!view.you.alive || view.phase === 'game_over') return null;

  const beliefs = beliefsFor(view, notes);
  const isPresident = view.presidentId === me;
  const hitlerCanWin = view.enacted.fascist >= view.board.hitlerChancellorWinsFrom;
  const fascistsInDanger = view.enacted.liberal >= view.board.liberalToWin - 1;
  const liberalsInDanger = view.enacted.fascist >= view.board.fascistToWin - 1;
  const done = (action: Action, next: BotNotes = notes) => ({ action, notes: next });

  switch (view.phase) {
    case 'nomination': {
      if (!isPresident) return null;
      const weights: Weights =
        role === 'fascist'
          ? hitlerCanWin
            ? { fascist: 0.2, hitler: 20, liberal: 0.1 }
            : { fascist: 1, hitler: 0.25, liberal: 0.5 }
          : role === 'hitler'
            ? { fascist: 0.5, hitler: 0, liberal: 1 }
            : { fascist: 0.01, hitler: 0, liberal: 1 };
      let candidates = view.eligibleChancellorIds;
      if (role === 'liberal' && hitlerCanWin) {
        // Once Hitler wins by election, a confirmed non-Hitler is worth more than any hunch.
        const safe = candidates.filter(
          (id) => beliefs.notHitler.has(id) && trust(beliefs, id) > -2,
        );
        if (safe.length) candidates = safe;
      }
      const target = pickWeighted(candidates, beliefs, weights, random);
      return target ? done({ type: 'nominate', playerId: me, targetId: target }) : null;
    }

    case 'election': {
      if (view.votedPlayerIds.includes(me)) return null;
      const presidentId = view.presidentId;
      const chancellorId = view.chancellorId as PlayerId;
      let presidentRep = trust(beliefs, presidentId);
      let chancellorRep = trust(beliefs, chancellorId);
      // Hitler trusts governments it sits in, as a liberal would.
      if (role === 'hitler' && presidentId === me) presidentRep = MAX_REPUTATION;
      if (role === 'hitler' && chancellorId === me) chancellorRep = MAX_REPUTATION;
      const combined = presidentRep + chancellorRep;
      const t = (combined + 2 * MAX_REPUTATION) / (4 * MAX_REPUTATION);

      let yes: number;
      if (role !== 'liberal' && hitlerCanWin && beliefs.known.get(chancellorId) === 'hitler') {
        yes = 0.99;
      } else if (role === 'fascist' || (role === 'hitler' && fascistsInDanger)) {
        const forFascists = fascistsInDanger ? 0.9 : 0.8;
        const forLiberals = fascistsInDanger ? 0.25 : 0.6;
        yes = t * forLiberals + (1 - t) * forFascists;
      } else {
        const minEach = hitlerCanWin ? -2 : -3;
        const minCombined = hitlerCanWin ? -1 : -2;
        const untrusted =
          presidentRep < minEach || chancellorRep < minEach || combined < minCombined;
        // f(t) = 2t − t²: neutral or unknown governments are usually accepted.
        yes = untrusted ? 0.05 : 2 * t - t * t;
        // The third rejection forces a random policy: liberals take the risk less often.
        if (view.electionTracker === view.maxFailedElections - 1) yes = Math.max(yes, 0.6);
        // An unconfirmed chancellor could be Hitler: only well-trusted ones get the benefit.
        if (hitlerCanWin && !beliefs.notHitler.has(chancellorId) && chancellorId !== me) {
          yes = Math.min(yes, chancellorRep >= 3 ? 0.6 : chancellorRep >= 1 ? 0.3 : 0.1);
        }
      }
      return done({ type: 'vote', playerId: me, approve: random() < yes });
    }

    case 'legislative_president': {
      const hand = view.you.hand;
      if (!hand) return null;
      const fascists = hand.filter((p) => p === 'fascist').length;
      const teammate = beliefs.known.get(view.chancellorId as PlayerId);
      const chancellorIsFascist =
        role !== 'liberal' && (teammate === 'fascist' || teammate === 'hitler');
      let discard: number;
      if (fascists === 0 || fascists === hand.length) {
        discard = 0;
      } else if (role === 'liberal') {
        // Liberals keep the liberals: the chancellor gets the best hand possible.
        discard = indexOf(hand, 'fascist');
      } else if (chancellorIsFascist || fascistsInDanger || liberalsInDanger) {
        // A teammate will enact the fascist; near the end there is no room for subtlety.
        discard = indexOf(hand, 'liberal');
      } else if (role === 'hitler') {
        // Hitler plays the model liberal to be trusted later.
        discard = indexOf(hand, 'fascist');
      } else {
        // Handing a liberal chancellor two fascists gives us away: sometimes pass a mixed hand.
        discard =
          fascists === 2 && random() < 0.5 ? indexOf(hand, 'fascist') : indexOf(hand, 'liberal');
      }
      const passed = hand.filter((_, i) => i !== discard);
      return done(
        { type: 'discard', playerId: me, index: discard },
        { ...notes, passed: { ...notes.passed, [view.round]: passed } },
      );
    }

    case 'legislative_chancellor': {
      const hand = view.you.hand;
      if (!hand) return null;
      const remembered = { ...notes, received: { ...notes.received, [view.round]: hand } };
      const canVeto = view.vetoUnlocked && !view.vetoDenied;
      if (hand[0] === hand[1]) {
        const policy = hand[0] as Policy;
        if (canVeto && policy === 'fascist' && role === 'liberal') {
          return done({ type: 'propose_veto', playerId: me }, remembered);
        }
        const presidentRole = beliefs.known.get(view.presidentId);
        if (
          canVeto &&
          policy === 'liberal' &&
          role !== 'liberal' &&
          (presidentRole === 'fascist' || presidentRole === 'hitler')
        ) {
          return done({ type: 'propose_veto', playerId: me }, remembered);
        }
        return done({ type: 'enact', playerId: me, index: 0 }, remembered);
      }
      const early = view.enacted.liberal <= 2 && view.enacted.fascist <= 2;
      const presidentRole = beliefs.known.get(view.presidentId);
      const withTeammate = presidentRole === 'fascist' || presidentRole === 'hitler';
      let prefer: Policy = 'liberal';
      if (role === 'fascist' || (role === 'hitler' && fascistsInDanger)) {
        // Early on, with a liberal president watching, a liberal policy now buys trust for later.
        prefer =
          early && !withTeammate && !liberalsInDanger && random() < 0.3 ? 'liberal' : 'fascist';
      }
      return done({ type: 'enact', playerId: me, index: indexOf(hand, prefer) }, remembered);
    }

    case 'veto': {
      if (!isPresident) return null;
      const passed = notes.passed[view.round];
      const allFascist = passed?.every((p) => p === 'fascist') ?? false;
      const allLiberal = passed?.every((p) => p === 'liberal') ?? false;
      const accept = role === 'liberal' ? allFascist : allLiberal;
      return done({ type: 'answer_veto', playerId: me, accept });
    }

    case 'peek':
      return isPresident ? done({ type: 'end_peek', playerId: me }) : null;

    case 'investigate': {
      if (!isPresident) return null;
      const candidates = aliveOthers(view).filter(
        (id) => !view.investigatedIds.includes(id) && !beliefs.known.has(id),
      );
      const pool = candidates.length
        ? candidates
        : aliveOthers(view).filter((id) => !view.investigatedIds.includes(id));
      const weights: Weights =
        role === 'liberal'
          ? { fascist: 1, hitler: 1, liberal: 0.1 }
          : { fascist: 1, hitler: 1, liberal: 1 };
      const target = pickWeighted(pool, beliefs, weights, random);
      return target ? done({ type: 'investigate', playerId: me, targetId: target }) : null;
    }

    case 'special_election': {
      if (!isPresident) return null;
      const weights: Weights =
        role === 'liberal'
          ? { fascist: 0.05, hitler: 0.05, liberal: 1 }
          : { fascist: 1, hitler: 1, liberal: 0.5 };
      const target = pickWeighted(aliveOthers(view), beliefs, weights, random);
      return target ? done({ type: 'special_election', playerId: me, targetId: target }) : null;
    }

    case 'execution': {
      if (!isPresident) return null;
      const weights: Weights =
        role === 'liberal'
          ? { fascist: 1, hitler: 1, liberal: 0.05 }
          : { fascist: 0.2, hitler: 0, liberal: 1 };
      const target = pickWeighted(aliveOthers(view), beliefs, weights, random);
      return target ? done({ type: 'execute', playerId: me, targetId: target }) : null;
    }
  }
}
