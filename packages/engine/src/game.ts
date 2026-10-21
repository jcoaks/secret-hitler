import { type Random, shuffle } from './random';
import { boardPowers, type Party, type Policy, rules } from './rules';
import {
  type Action,
  fail,
  type GameState,
  ok,
  type Player,
  type PlayerId,
  type Result,
  type WinReason,
} from './types';

export function isAlive(state: GameState, playerId: PlayerId): boolean {
  return Boolean(state.roles[playerId]) && !state.deadIds.includes(playerId);
}

export function alivePlayers(state: GameState): Player[] {
  return state.players.filter((p) => !state.deadIds.includes(p.id));
}

/** Players the president may nominate right now. */
export function eligibleChancellors(state: GameState): PlayerId[] {
  const limitPresident = alivePlayers(state).length > rules.election.presidentTermLimitAboveAlive;
  return alivePlayers(state)
    .map((p) => p.id)
    .filter(
      (id) =>
        id !== state.presidentId &&
        id !== state.lastElected?.chancellorId &&
        !(limitPresident && id === state.lastElected?.presidentId),
    );
}

export function vetoUnlocked(state: GameState): boolean {
  return state.enacted.fascist >= rules.policies.vetoFrom;
}

/** Applies one player action. Pure: returns a new state and never mutates the input. */
export function applyAction(state: GameState, action: Action, random: Random): Result<GameState> {
  if (state.phase === 'game_over') return fail('game_over', 'La partida ha terminado');
  if (!state.roles[action.playerId]) return fail('unknown_player', 'Jugador desconocido');
  if (!isAlive(state, action.playerId)) {
    return fail('dead_player', 'Los jugadores ejecutados no participan');
  }

  const next = structuredClone(state);
  switch (action.type) {
    case 'nominate':
      return nominate(next, action.playerId, action.targetId);
    case 'vote':
      return vote(next, action.playerId, action.approve, random);
    case 'discard':
      return discard(next, action.playerId, action.index);
    case 'enact':
      return enact(next, action.playerId, action.index, random);
    case 'propose_veto':
      return proposeVeto(next, action.playerId);
    case 'answer_veto':
      return answerVeto(next, action.playerId, action.accept, random);
    case 'investigate':
      return investigate(next, action.playerId, action.targetId);
    case 'end_peek':
      return endPeek(next, action.playerId);
    case 'special_election':
      return specialElection(next, action.playerId, action.targetId);
    case 'execute':
      return execute(next, action.playerId, action.targetId);
  }
}

function nominate(state: GameState, playerId: PlayerId, targetId: PlayerId): Result<GameState> {
  if (state.phase !== 'nomination') return fail('wrong_phase', 'No es momento de nominar');
  if (playerId !== state.presidentId) {
    return fail('not_president', 'Solo el presidente nomina canciller');
  }
  if (!isAlive(state, targetId) || targetId === playerId) {
    return fail('invalid_target', 'No puedes nominar a ese jugador');
  }
  if (!eligibleChancellors(state).includes(targetId)) {
    return fail('term_limited', 'Ese jugador formó parte del último gobierno elegido');
  }
  state.chancellorId = targetId;
  state.votes = {};
  state.phase = 'election';
  return ok(state);
}

function vote(
  state: GameState,
  playerId: PlayerId,
  approve: boolean,
  random: Random,
): Result<GameState> {
  if (state.phase !== 'election') return fail('wrong_phase', 'No hay ninguna votación abierta');
  // A player may change their vote until the last vote arrives.
  state.votes[playerId] = approve;
  const voters = alivePlayers(state);
  if (voters.some((p) => state.votes[p.id] === undefined)) return ok(state);

  const yes = voters.filter((p) => state.votes[p.id]).length;
  const approved = yes * 2 > voters.length;
  const presidentId = state.presidentId;
  const chancellorId = state.chancellorId as PlayerId;
  const votes = { ...state.votes };
  state.votes = {};

  if (!approved) {
    state.chancellorId = null;
    const tracker = (state.electionTracker + 1) % rules.election.maxFailedElections;
    state.chronicle.push({
      type: 'election',
      round: state.round,
      presidentId,
      chancellorId,
      votes,
      approved,
      tracker,
    });
    return ok(failGovernment(state, random));
  }

  state.chronicle.push({
    type: 'election',
    round: state.round,
    presidentId,
    chancellorId,
    votes,
    approved,
    tracker: 0,
  });
  state.electionTracker = 0;
  state.lastElected = { presidentId, chancellorId };
  if (
    state.roles[chancellorId] === 'hitler' &&
    state.enacted.fascist >= rules.policies.hitlerChancellorWinsFrom
  ) {
    return ok(endGame(state, 'fascist', 'hitler_elected'));
  }
  reshuffleIfLow(state, random);
  state.hand = state.drawPile.splice(0, rules.legislative.presidentDraws);
  state.phase = 'legislative_president';
  return ok(state);
}

function discard(state: GameState, playerId: PlayerId, index: number): Result<GameState> {
  if (state.phase !== 'legislative_president') {
    return fail('wrong_phase', 'No es momento de descartar');
  }
  if (playerId !== state.presidentId) return fail('not_president', 'Solo el presidente descarta');
  if (!Number.isInteger(index) || index < 0 || index >= state.hand.length) {
    return fail('invalid_card', 'Esa carta no está en tu mano');
  }
  state.discardPile.push(...state.hand.splice(index, 1));
  state.phase = 'legislative_chancellor';
  return ok(state);
}

function enact(
  state: GameState,
  playerId: PlayerId,
  index: number,
  random: Random,
): Result<GameState> {
  if (state.phase !== 'legislative_chancellor') {
    return fail('wrong_phase', 'No es momento de aprobar una política');
  }
  if (playerId !== state.chancellorId) {
    return fail('not_chancellor', 'Solo el canciller aprueba la política');
  }
  if (!Number.isInteger(index) || index < 0 || index >= state.hand.length) {
    return fail('invalid_card', 'Esa carta no está en tu mano');
  }
  const [policy] = state.hand.splice(index, 1) as [Policy];
  state.discardPile.push(...state.hand);
  state.hand = [];
  return ok(enactPolicy(state, policy, false, random));
}

function proposeVeto(state: GameState, playerId: PlayerId): Result<GameState> {
  if (state.phase !== 'legislative_chancellor') {
    return fail('wrong_phase', 'No es momento de proponer un veto');
  }
  if (playerId !== state.chancellorId)
    return fail('not_chancellor', 'Solo el canciller lo propone');
  if (!vetoUnlocked(state)) {
    return fail('veto_locked', 'El veto se desbloquea con cinco políticas fascistas');
  }
  if (state.vetoDenied) return fail('veto_locked', 'El presidente ya rechazó el veto');
  state.phase = 'veto';
  return ok(state);
}

function answerVeto(
  state: GameState,
  playerId: PlayerId,
  accept: boolean,
  random: Random,
): Result<GameState> {
  if (state.phase !== 'veto') return fail('wrong_phase', 'No hay ningún veto propuesto');
  if (playerId !== state.presidentId) return fail('not_president', 'Solo el presidente responde');
  const { presidentId } = state;

  if (!accept) {
    state.vetoDenied = true;
    state.chronicle.push({ type: 'veto_denied', round: state.round, presidentId });
    state.phase = 'legislative_chancellor';
    return ok(state);
  }

  state.chronicle.push({
    type: 'veto',
    round: state.round,
    presidentId,
    chancellorId: state.chancellorId as PlayerId,
  });
  state.discardPile.push(...state.hand);
  state.hand = [];
  return ok(failGovernment(state, random));
}

function investigate(state: GameState, playerId: PlayerId, targetId: PlayerId): Result<GameState> {
  const check = presidentialPower(state, 'investigate', playerId, targetId);
  if (!check.ok) return check;
  if (state.investigatedIds.includes(targetId)) {
    return fail('invalid_target', 'Ese jugador ya fue investigado');
  }
  const role = state.roles[targetId];
  state.investigatedIds.push(targetId);
  state.investigations.push({
    round: state.round,
    presidentId: playerId,
    targetId,
    party: role === 'liberal' ? 'liberal' : 'fascist',
  });
  state.chronicle.push({
    type: 'investigate',
    round: state.round,
    presidentId: playerId,
    targetId,
  });
  return ok(nextPresidency(state));
}

function endPeek(state: GameState, playerId: PlayerId): Result<GameState> {
  if (state.phase !== 'peek') return fail('wrong_phase', 'No es momento de ver las cartas');
  if (playerId !== state.presidentId) return fail('not_president', 'Solo el presidente mira');
  state.chronicle.push({ type: 'peek', round: state.round, presidentId: playerId });
  return ok(nextPresidency(state));
}

function specialElection(
  state: GameState,
  playerId: PlayerId,
  targetId: PlayerId,
): Result<GameState> {
  const check = presidentialPower(state, 'special_election', playerId, targetId);
  if (!check.ok) return check;
  state.specialPresidentId = targetId;
  state.chronicle.push({
    type: 'special_election',
    round: state.round,
    presidentId: playerId,
    targetId,
  });
  return ok(nextPresidency(state));
}

function execute(state: GameState, playerId: PlayerId, targetId: PlayerId): Result<GameState> {
  const check = presidentialPower(state, 'execution', playerId, targetId);
  if (!check.ok) return check;
  state.deadIds.push(targetId);
  state.chronicle.push({ type: 'execution', round: state.round, presidentId: playerId, targetId });
  if (state.roles[targetId] === 'hitler') return ok(endGame(state, 'liberal', 'hitler_executed'));
  return ok(nextPresidency(state));
}

// ---------------------------------------------------------------------------

function presidentialPower(
  state: GameState,
  phase: 'investigate' | 'special_election' | 'execution',
  playerId: PlayerId,
  targetId: PlayerId,
): Result<GameState> {
  if (state.phase !== phase) return fail('wrong_phase', 'Ese poder no está activo');
  if (playerId !== state.presidentId) return fail('not_president', 'Solo el presidente lo usa');
  if (!isAlive(state, targetId) || targetId === playerId) {
    return fail('invalid_target', 'No puedes elegir a ese jugador');
  }
  return ok(state);
}

/** A rejected election or an accepted veto: the tracker advances, and on the third, chaos. */
function failGovernment(state: GameState, random: Random): GameState {
  state.electionTracker += 1;
  if (state.electionTracker < rules.election.maxFailedElections) return nextPresidency(state);

  state.electionTracker = 0;
  state.lastElected = null;
  reshuffleIfLow(state, random);
  const [policy] = state.drawPile.splice(0, 1) as [Policy];
  return enactPolicy(state, policy, true, random);
}

function enactPolicy(state: GameState, policy: Policy, chaos: boolean, random: Random): GameState {
  state.enacted[policy] += 1;
  state.electionTracker = 0;
  state.vetoDenied = false;
  const power =
    !chaos && policy === 'fascist'
      ? (boardPowers(state.players.length)[state.enacted.fascist - 1] ?? null)
      : null;
  state.chronicle.push({ type: 'enacted', round: state.round, policy, chaos, power });

  if (state.enacted.liberal >= rules.policies.liberalToWin) {
    return endGame(state, 'liberal', 'liberal_policies');
  }
  if (state.enacted.fascist >= rules.policies.fascistToWin) {
    return endGame(state, 'fascist', 'fascist_policies');
  }

  reshuffleIfLow(state, random);
  if (power) {
    state.phase = power;
    return state;
  }
  return nextPresidency(state);
}

/** With fewer than three cards left, the discard pile is shuffled back into the draw pile. */
function reshuffleIfLow(state: GameState, random: Random): void {
  if (state.drawPile.length >= rules.legislative.reshuffleBelow) return;
  state.drawPile = shuffle([...state.drawPile, ...state.discardPile], random);
  state.discardPile = [];
  state.chronicle.push({ type: 'reshuffle', round: state.round });
}

/** Ends the current presidency and seats the next president. */
function nextPresidency(state: GameState): GameState {
  state.round += 1;
  state.chancellorId = null;
  state.votes = {};
  state.hand = [];
  state.vetoDenied = false;
  state.phase = 'nomination';

  if (state.specialPresidentId) {
    // The rotation stays with the president who called the special election.
    state.presidentId = state.specialPresidentId;
    state.specialPresidentId = null;
    return state;
  }
  const count = state.players.length;
  for (let step = 1; step <= count; step++) {
    const index = (state.rotationIndex + step) % count;
    const candidate = state.players[index] as Player;
    if (!state.deadIds.includes(candidate.id)) {
      state.rotationIndex = index;
      state.presidentId = candidate.id;
      break;
    }
  }
  return state;
}

function endGame(state: GameState, winner: Party, reason: WinReason): GameState {
  state.phase = 'game_over';
  state.winner = winner;
  state.winReason = reason;
  state.hand = [];
  state.votes = {};
  return state;
}
