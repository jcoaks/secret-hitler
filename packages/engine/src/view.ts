import { eligibleChancellors, vetoUnlocked } from './game';
import {
  type BoardId,
  boardPowers,
  countRules,
  type Party,
  type Policy,
  type Power,
  partyOf,
  type Role,
  rules,
} from './rules';
import type {
  ChronicleEntry,
  GameState,
  Investigation,
  Phase,
  Player,
  PlayerId,
  WinReason,
} from './types';

export interface KnownPlayer {
  playerId: PlayerId;
  role: Role;
}

export interface PlayerView {
  you: {
    id: PlayerId;
    role: Role;
    party: Party;
    alive: boolean;
    tip: string;
    /** Teammates whose roles you know from the start. */
    knows: KnownPlayer[];
    /** Your cards, only while they are in your hand. */
    hand: Policy[] | null;
    /** The top three cards, only for the president using the peek. */
    peek: Policy[] | null;
    /** Your own vote in the open election, if you already voted. */
    vote: boolean | null;
    /** Results of your own investigations. */
    investigations: Investigation[];
  };
  players: Player[];
  deadIds: PlayerId[];
  investigatedIds: PlayerId[];
  phase: Phase;
  round: number;
  presidentId: PlayerId;
  chancellorId: PlayerId | null;
  /** Who the president may nominate (only during the nomination). */
  eligibleChancellorIds: PlayerId[];
  lastElected: { presidentId: PlayerId; chancellorId: PlayerId } | null;
  electionTracker: number;
  maxFailedElections: number;
  /** Who has voted in the open election — never how. */
  votedPlayerIds: PlayerId[];
  enacted: Record<Policy, number>;
  board: {
    id: BoardId;
    powers: (Power | null)[];
    liberalToWin: number;
    fascistToWin: number;
    hitlerChancellorWinsFrom: number;
  };
  vetoUnlocked: boolean;
  vetoDenied: boolean;
  drawCount: number;
  discardCount: number;
  chronicle: ChronicleEntry[];
  winner: Party | null;
  winReason: WinReason | null;
  /** Every role, only once the game is over. */
  roles: Record<PlayerId, Role> | null;
}

/** The roles `viewerId` knows from the start of the game. */
export function knownPlayers(state: GameState, viewerId: PlayerId): KnownPlayer[] {
  const role = state.roles[viewerId];
  const seesTeam =
    role === 'fascist' ||
    (role === 'hitler' && countRules(state.players.length).hitlerKnowsFascists);
  if (!seesTeam) return [];
  return state.players
    .filter((p) => p.id !== viewerId && state.roles[p.id] !== 'liberal')
    .map((p) => ({ playerId: p.id, role: state.roles[p.id] as Role }));
}

function handFor(state: GameState, viewerId: PlayerId): Policy[] | null {
  const holds =
    (state.phase === 'legislative_president' && viewerId === state.presidentId) ||
    ((state.phase === 'legislative_chancellor' || state.phase === 'veto') &&
      viewerId === state.chancellorId);
  return holds ? [...state.hand] : null;
}

export function viewFor(state: GameState, viewerId: PlayerId): PlayerView {
  const role = state.roles[viewerId];
  if (!role) throw new RangeError(`Jugador desconocido: ${viewerId}`);
  const over = state.phase === 'game_over';
  const { board } = countRules(state.players.length);

  return {
    you: {
      id: viewerId,
      role,
      party: partyOf(role),
      alive: !state.deadIds.includes(viewerId),
      tip: rules.roleTips[role],
      knows: knownPlayers(state, viewerId),
      hand: handFor(state, viewerId),
      peek:
        state.phase === 'peek' && viewerId === state.presidentId
          ? state.drawPile.slice(0, 3)
          : null,
      vote: state.phase === 'election' ? (state.votes[viewerId] ?? null) : null,
      investigations: state.investigations
        .filter((i) => i.presidentId === viewerId)
        .map((i) => ({ ...i })),
    },
    players: state.players.map((p) => ({ ...p })),
    deadIds: [...state.deadIds],
    investigatedIds: [...state.investigatedIds],
    phase: state.phase,
    round: state.round,
    presidentId: state.presidentId,
    chancellorId: state.chancellorId,
    eligibleChancellorIds: state.phase === 'nomination' ? eligibleChancellors(state) : [],
    lastElected: state.lastElected ? { ...state.lastElected } : null,
    electionTracker: state.electionTracker,
    maxFailedElections: rules.election.maxFailedElections,
    votedPlayerIds: Object.keys(state.votes),
    enacted: { ...state.enacted },
    board: {
      id: board,
      powers: [...boardPowers(state.players.length)],
      liberalToWin: rules.policies.liberalToWin,
      fascistToWin: rules.policies.fascistToWin,
      hitlerChancellorWinsFrom: rules.policies.hitlerChancellorWinsFrom,
    },
    vetoUnlocked: vetoUnlocked(state),
    vetoDenied: state.vetoDenied,
    drawCount: state.drawPile.length,
    discardCount: state.discardPile.length,
    chronicle: structuredClone(state.chronicle),
    winner: state.winner,
    winReason: state.winReason,
    roles: over ? { ...state.roles } : null,
  };
}
