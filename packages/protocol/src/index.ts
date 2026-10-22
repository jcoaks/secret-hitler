import { type ErrorCode as EngineErrorCode, type PlayerView, rules } from '@sh/engine';
import type { z } from 'zod';
import type { clientMessageSchema, createRoomSchema, gameActionSchema } from './schema';

// ---------------------------------------------------------------------------
// Room codes: "KX7M". No 0/O or 1/I, so they can be read aloud.

export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 4;

/** Uppercases and strips separators; returns null if it cannot be a room code. */
export function normalizeRoomCode(input: string): string | null {
  const raw = input.toUpperCase().replace(/[\s-]/g, '');
  if (raw.length !== ROOM_CODE_LENGTH) return null;
  for (const char of raw) if (!ROOM_CODE_ALPHABET.includes(char)) return null;
  return raw;
}

// ---------------------------------------------------------------------------
// Limits

export const [NAME_MIN_LENGTH, NAME_MAX_LENGTH] = rules.session.playerNameLength;
export const HOST_CAN_END_AFTER_MS = rules.session.hostCanEndAfterSeconds * 1000;
export const MAX_MESSAGE_BYTES = 2048;
export const SEAT_TOKEN_PATTERN = /^[0-9a-f]{32}$/;

/** Player portraits are numbered 1..PORTRAIT_COUNT. */
export const PORTRAIT_COUNT = 20;

// biome-ignore lint/suspicious/noControlCharactersInRegex: matching them is the point
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

/** Collapses whitespace and strips control characters before length checks. */
export function cleanName(name: string): string {
  return name.replace(CONTROL_CHARS, '').replace(/\s+/g, ' ').trim();
}

// Message types are inferred from the Zod schemas in ./schema, imported type-only
// so that browsers using this module do not bundle Zod.
export type GameActionMessage = z.infer<typeof gameActionSchema>;
export type ClientMessage = z.infer<typeof clientMessageSchema>;
export type CreateRoomRequest = z.infer<typeof createRoomSchema>;

// ---------------------------------------------------------------------------
// Server → client

export type RoomErrorCode =
  | EngineErrorCode
  | 'bad_message'
  | 'rate_limited'
  | 'not_joined'
  | 'already_joined'
  | 'invalid_seat'
  | 'name_taken'
  | 'room_full'
  | 'game_in_progress'
  | 'not_host'
  | 'not_in_lobby'
  | 'not_playing'
  | 'not_everyone_ready'
  | 'game_paused'
  | 'not_paused_long_enough'
  | 'room_not_found'
  | 'room_exists'
  | 'portrait_taken';

export type RoomStatus = 'lobby' | 'playing' | 'ended';

export interface RoomPlayer {
  id: string;
  name: string;
  ready: boolean;
  connected: boolean;
  portrait: number;
  /** A computer player added by the host. */
  bot: boolean;
  /** Left a game in progress; their seat stays until the game ends. */
  left: boolean;
}

/** Something a bot said at the table. */
export interface ChatLine {
  id: number;
  playerId: string;
  text: string;
  /** Chronicle length right after the event it comments on, to place it in the history. */
  chronicle: number;
  /** A farewell once the game is over, shown on the end screen. */
  final?: boolean;
}

export interface RoomView {
  code: string;
  status: RoomStatus;
  you: { id: string; isHost: boolean };
  hostId: string | null;
  players: RoomPlayer[];
  /** Whether the table has a playable number of players. */
  setup: { ok: true } | { ok: false; code: RoomErrorCode; message: string };
  canStart: boolean;
  game: PlayerView | null;
  /** The latest bot remarks, oldest first. */
  chat: ChatLine[];
  pause: { disconnectedIds: string[]; since: number; hostCanEndAt: number } | null;
}

export interface RoomInfo {
  code: string;
  status: RoomStatus;
  playerCount: number;
  joinable: boolean;
  /** Names at the table, for the invitation screen (anyone with the code can see them). */
  playerNames: string[];
  hostName: string | null;
}

export type ServerMessage =
  | { type: 'welcome'; playerId: string; seatToken: string }
  | { type: 'room'; room: RoomView }
  | { type: 'error'; code: RoomErrorCode; message: string }
  | { type: 'kicked' };

/** WebSocket close codes used by the room. */
export const CLOSE_CODES = {
  replaced: 4000,
  kicked: 4001,
  left: 4002,
  roomClosed: 4003,
  badJoin: 4004,
} as const;
