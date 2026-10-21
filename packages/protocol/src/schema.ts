// Zod schemas for validating client input. Server-only: browsers import the
// lightweight types and helpers from '@sh/protocol' instead.
import { z } from 'zod';
import {
  type ClientMessage,
  cleanName,
  MAX_MESSAGE_BYTES,
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
  PORTRAIT_COUNT,
  SEAT_TOKEN_PATTERN,
} from './index';

const playerName = z
  .string()
  .max(100)
  .transform(cleanName)
  .pipe(z.string().min(NAME_MIN_LENGTH).max(NAME_MAX_LENGTH));

const playerId = z.string().min(1).max(64);
const cardIndex = z.number().int().min(0).max(2);

// ---------------------------------------------------------------------------
// Client → server

export const gameActionSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('nominate'), targetId: playerId }),
  z.strictObject({ type: z.literal('vote'), approve: z.boolean() }),
  z.strictObject({ type: z.literal('discard'), index: cardIndex }),
  z.strictObject({ type: z.literal('enact'), index: cardIndex }),
  z.strictObject({ type: z.literal('propose_veto') }),
  z.strictObject({ type: z.literal('answer_veto'), accept: z.boolean() }),
  z.strictObject({ type: z.literal('investigate'), targetId: playerId }),
  z.strictObject({ type: z.literal('end_peek') }),
  z.strictObject({ type: z.literal('special_election'), targetId: playerId }),
  z.strictObject({ type: z.literal('execute'), targetId: playerId }),
]);

export const clientMessageSchema = z.discriminatedUnion('type', [
  /** First message on every connection: a new seat by name, or an existing seat by token. */
  z.strictObject({
    type: z.literal('join'),
    name: playerName.optional(),
    seatToken: z.string().regex(SEAT_TOKEN_PATTERN).optional(),
  }),
  z.strictObject({ type: z.literal('set_ready'), ready: z.boolean() }),
  z.strictObject({
    type: z.literal('set_portrait'),
    portrait: z.number().int().min(1).max(PORTRAIT_COUNT),
  }),
  z.strictObject({ type: z.literal('kick'), playerId }),
  z.strictObject({ type: z.literal('start') }),
  z.strictObject({ type: z.literal('action'), action: gameActionSchema }),
  z.strictObject({ type: z.literal('leave') }),
  z.strictObject({ type: z.literal('end_game') }),
  z.strictObject({ type: z.literal('new_game') }),
]);

export const createRoomSchema = z.strictObject({ name: playerName });

/** Parses a raw WebSocket payload; never throws. */
export function parseClientMessage(
  raw: string,
): { ok: true; message: ClientMessage } | { ok: false } {
  if (raw.length > MAX_MESSAGE_BYTES) return { ok: false };
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false };
  }
  const parsed = clientMessageSchema.safeParse(json);
  return parsed.success ? { ok: true, message: parsed.data } : { ok: false };
}
