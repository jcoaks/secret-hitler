import type { Party, Policy, Power, Role } from './rules';

export type PlayerId = string;

export interface Player {
  id: PlayerId;
  name: string;
}

export type Phase =
  | 'nomination'
  | 'election'
  | 'legislative_president'
  | 'legislative_chancellor'
  | 'veto'
  | 'investigate'
  | 'peek'
  | 'special_election'
  | 'execution'
  | 'game_over';

export type WinReason =
  | 'liberal_policies'
  | 'hitler_executed'
  | 'fascist_policies'
  | 'hitler_elected';

/** Public record of what happened, in order. Investigation results stay out of it. */
export type ChronicleEntry =
  | {
      type: 'election';
      round: number;
      presidentId: PlayerId;
      chancellorId: PlayerId;
      votes: Record<PlayerId, boolean>;
      approved: boolean;
      /** Failed elections in a row after this one (0 when it passed). */
      tracker: number;
    }
  | { type: 'enacted'; round: number; policy: Policy; chaos: boolean; power: Power | null }
  | { type: 'veto'; round: number; presidentId: PlayerId; chancellorId: PlayerId }
  | { type: 'veto_denied'; round: number; presidentId: PlayerId }
  | { type: 'investigate'; round: number; presidentId: PlayerId; targetId: PlayerId }
  | { type: 'peek'; round: number; presidentId: PlayerId }
  | { type: 'special_election'; round: number; presidentId: PlayerId; targetId: PlayerId }
  | { type: 'execution'; round: number; presidentId: PlayerId; targetId: PlayerId }
  | { type: 'reshuffle'; round: number };

export interface Investigation {
  round: number;
  presidentId: PlayerId;
  targetId: PlayerId;
  /** Only ever shown to the president who investigated. */
  party: Party;
}

/** Full authoritative state. Never sent to clients as-is: use `viewFor`. */
export interface GameState {
  players: Player[];
  roles: Record<PlayerId, Role>;
  deadIds: PlayerId[];
  investigatedIds: PlayerId[];
  phase: Phase;
  round: number;
  /** Seat whose turn it is in the normal rotation (unchanged by a special election). */
  rotationIndex: number;
  presidentId: PlayerId;
  /** Nominee during the election, then the sitting chancellor. */
  chancellorId: PlayerId | null;
  /** Term limits: the last government that was elected. */
  lastElected: { presidentId: PlayerId; chancellorId: PlayerId } | null;
  /** Set by a special election: the next president, outside the rotation. */
  specialPresidentId: PlayerId | null;
  electionTracker: number;
  votes: Record<PlayerId, boolean>;
  /** Index 0 is the top of the pile. */
  drawPile: Policy[];
  discardPile: Policy[];
  /** The president's three cards, then the chancellor's two. */
  hand: Policy[];
  vetoDenied: boolean;
  enacted: Record<Policy, number>;
  chronicle: ChronicleEntry[];
  investigations: Investigation[];
  winner: Party | null;
  winReason: WinReason | null;
}

export type Action =
  | { type: 'nominate'; playerId: PlayerId; targetId: PlayerId }
  | { type: 'vote'; playerId: PlayerId; approve: boolean }
  | { type: 'discard'; playerId: PlayerId; index: number }
  | { type: 'enact'; playerId: PlayerId; index: number }
  | { type: 'propose_veto'; playerId: PlayerId }
  | { type: 'answer_veto'; playerId: PlayerId; accept: boolean }
  | { type: 'investigate'; playerId: PlayerId; targetId: PlayerId }
  | { type: 'end_peek'; playerId: PlayerId }
  | { type: 'special_election'; playerId: PlayerId; targetId: PlayerId }
  | { type: 'execute'; playerId: PlayerId; targetId: PlayerId };

export type ErrorCode =
  | 'invalid_player_count'
  | 'duplicate_player'
  | 'game_over'
  | 'wrong_phase'
  | 'unknown_player'
  | 'dead_player'
  | 'not_president'
  | 'not_chancellor'
  | 'invalid_target'
  | 'term_limited'
  | 'invalid_card'
  | 'veto_locked';

export interface GameError {
  code: ErrorCode;
  message: string;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: GameError };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function fail<T>(code: ErrorCode, message: string): Result<T> {
  return { ok: false, error: { code, message } };
}
