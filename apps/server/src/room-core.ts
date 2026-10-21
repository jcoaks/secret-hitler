import { applyAction, createGame, type GameState, type Random, rules, viewFor } from '@sh/engine';
import {
  type ClientMessage,
  cleanName,
  HOST_CAN_END_AFTER_MS,
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
  PORTRAIT_COUNT,
  type RoomErrorCode,
  type RoomInfo,
  type RoomStatus,
  type RoomView,
} from '@sh/protocol';

export interface Seat {
  id: string;
  name: string;
  /** SHA-256 of the seat token; the token itself is only ever held by its player. */
  tokenHash: string;
  ready: boolean;
  portrait: number;
  /** Left a game in progress. The seat is kept so the game can be ended cleanly. */
  left: boolean;
}

/** Everything the room persists. */
export interface RoomData {
  code: string;
  createdAt: number;
  lastActivity: number;
  hostId: string | null;
  seats: Seat[];
  nextSeatNumber: number;
  game: GameState | null;
  pausedSince: number | null;
}

/** Per-event inputs that do not belong in the persisted data. */
export interface RoomContext {
  now: number;
  /** Seats with at least one open connection. */
  connected: ReadonlySet<string>;
  random: Random;
}

export type RoomResult =
  | { ok: true; seat?: Seat; kicked?: string; left?: string }
  | { ok: false; code: RoomErrorCode; message: string };

const okResult: RoomResult = { ok: true };

function error(code: RoomErrorCode, message: string): RoomResult {
  return { ok: false, code, message };
}

export function createRoom(code: string, now: number): RoomData {
  return {
    code,
    createdAt: now,
    lastActivity: now,
    hostId: null,
    seats: [],
    nextSeatNumber: 1,
    game: null,
    pausedSince: null,
  };
}

export function roomStatus(data: RoomData): RoomStatus {
  if (!data.game) return 'lobby';
  return data.game.phase === 'game_over' ? 'ended' : 'playing';
}

export function findSeatByTokenHash(data: RoomData, tokenHash: string): Seat | undefined {
  return data.seats.find((s) => s.tokenHash === tokenHash);
}

function activeSeats(data: RoomData): Seat[] {
  return data.seats.filter((s) => !s.left);
}

function sameName(a: string, b: string): boolean {
  return a.localeCompare(b, 'es', { sensitivity: 'base' }) === 0;
}

export function addSeat(
  data: RoomData,
  rawName: string,
  tokenHash: string,
  ctx: RoomContext,
): RoomResult {
  if (roomStatus(data) !== 'lobby') {
    return error('game_in_progress', 'La partida ya comenzó');
  }
  if (activeSeats(data).length >= rules.game.maxPlayers) {
    return error('room_full', `La mesa ya tiene ${rules.game.maxPlayers} jugadores`);
  }
  const name = cleanName(rawName);
  if (name.length < NAME_MIN_LENGTH || name.length > NAME_MAX_LENGTH) {
    return error(
      'bad_message',
      `El nombre debe tener entre ${NAME_MIN_LENGTH} y ${NAME_MAX_LENGTH} caracteres`,
    );
  }
  if (data.seats.some((s) => sameName(s.name, name))) {
    return error('name_taken', `Ya hay alguien llamado ${name} en la mesa`);
  }

  const seat: Seat = {
    id: `s${data.nextSeatNumber}`,
    name,
    tokenHash,
    ready: false,
    portrait: freePortrait(data, ctx),
    left: false,
  };
  data.nextSeatNumber += 1;
  data.seats.push(seat);
  data.hostId ??= seat.id;
  touch(data, ctx);
  return { ok: true, seat };
}

/** A seat's connection opened (new join or reconnect). */
export function connectSeat(data: RoomData, seatId: string, ctx: RoomContext): void {
  const seat = data.seats.find((s) => s.id === seatId);
  if (!seat) return;
  seat.left = false;
  if (!data.hostId || !data.seats.some((s) => s.id === data.hostId)) data.hostId = seatId;
  updatePause(data, ctx);
  touch(data, ctx);
}

/** A seat lost its last connection. `ctx.connected` must no longer include it. */
export function disconnectSeat(data: RoomData, seatId: string, ctx: RoomContext): void {
  if (data.hostId === seatId) transferHost(data, ctx);
  updatePause(data, ctx);
  touch(data, ctx);
}

export function handleMessage(
  data: RoomData,
  seatId: string,
  message: ClientMessage,
  ctx: RoomContext,
): RoomResult {
  const seat = data.seats.find((s) => s.id === seatId);
  if (!seat) return error('invalid_seat', 'No tienes asiento en esta mesa');
  const status = roomStatus(data);
  const isHost = data.hostId === seatId;
  touch(data, ctx);

  switch (message.type) {
    case 'join':
      return error('already_joined', 'Ya estás en la mesa');

    case 'set_ready':
      if (status !== 'lobby') return error('not_in_lobby', 'La partida ya comenzó');
      seat.ready = message.ready;
      return okResult;

    case 'set_portrait':
      if (status !== 'lobby') return error('not_in_lobby', 'La partida ya comenzó');
      if (data.seats.some((s) => s.id !== seatId && s.portrait === message.portrait)) {
        return error('portrait_taken', 'Otro jugador ya eligió ese retrato');
      }
      seat.portrait = message.portrait;
      return okResult;

    case 'kick': {
      if (!isHost) return error('not_host', 'Solo el anfitrión puede expulsar');
      if (status !== 'lobby')
        return error('not_in_lobby', 'No se puede expulsar durante la partida');
      if (message.playerId === seatId || !data.seats.some((s) => s.id === message.playerId)) {
        return error('invalid_seat', 'No puedes expulsar a ese jugador');
      }
      removeSeat(data, message.playerId, ctx);
      return { ok: true, kicked: message.playerId };
    }

    case 'start': {
      if (!isHost) return error('not_host', 'Solo el anfitrión empieza la partida');
      if (status !== 'lobby') return error('not_in_lobby', 'La partida ya comenzó');
      const setup = setupCheck(data);
      if (!setup.ok) return setup;
      if (!data.seats.every((s) => s.ready && ctx.connected.has(s.id))) {
        return error('not_everyone_ready', 'Todos deben estar conectados y listos');
      }
      const created = createGame(
        { players: data.seats.map((s) => ({ id: s.id, name: s.name })) },
        ctx.random,
      );
      if (!created.ok) return error(created.error.code, created.error.message);
      data.game = created.value;
      for (const s of data.seats) s.ready = false;
      updatePause(data, ctx);
      return okResult;
    }

    case 'action': {
      if (status !== 'playing' || !data.game)
        return error('not_playing', 'No hay partida en curso');
      if (data.pausedSince !== null) {
        return error('game_paused', 'La partida está en pausa hasta que vuelvan todos');
      }
      const result = applyAction(data.game, { ...message.action, playerId: seatId }, ctx.random);
      if (!result.ok) return error(result.error.code, result.error.message);
      data.game = result.value;
      updatePause(data, ctx);
      return okResult;
    }

    case 'leave':
      if (status === 'lobby') {
        removeSeat(data, seatId, ctx);
      } else {
        seat.left = true;
        if (isHost) transferHost(data, ctx);
        updatePause(data, ctx);
      }
      return { ok: true, left: seatId };

    case 'end_game': {
      if (!isHost) return error('not_host', 'Solo el anfitrión puede terminar la partida');
      if (status !== 'playing') return error('not_playing', 'No hay partida en curso');
      if (data.pausedSince === null || ctx.now - data.pausedSince < HOST_CAN_END_AFTER_MS) {
        return error(
          'not_paused_long_enough',
          'Solo se puede terminar tras un rato esperando a un jugador desconectado',
        );
      }
      backToLobby(data, ctx);
      return okResult;
    }

    case 'new_game':
      if (!isHost) return error('not_host', 'Solo el anfitrión puede empezar otra partida');
      if (status !== 'ended') return error('not_playing', 'La partida no ha terminado');
      backToLobby(data, ctx);
      return okResult;
  }
}

export function roomView(data: RoomData, seatId: string, ctx: RoomContext): RoomView {
  const setup = setupCheck(data);
  const status = roomStatus(data);
  const inGame = data.game?.players.some((p) => p.id === seatId) ?? false;
  return {
    code: data.code,
    status,
    you: { id: seatId, isHost: data.hostId === seatId },
    hostId: data.hostId,
    players: data.seats.map((s) => ({
      id: s.id,
      name: s.name,
      ready: s.ready,
      connected: ctx.connected.has(s.id),
      portrait: s.portrait,
      left: s.left,
    })),
    setup,
    canStart:
      status === 'lobby' && setup.ok && data.seats.every((s) => s.ready && ctx.connected.has(s.id)),
    game: data.game && inGame ? viewFor(data.game, seatId) : null,
    pause:
      data.pausedSince === null
        ? null
        : {
            disconnectedIds: disconnectedPlayers(data, ctx),
            since: data.pausedSince,
            hostCanEndAt: data.pausedSince + HOST_CAN_END_AFTER_MS,
          },
  };
}

export function roomInfo(data: RoomData): RoomInfo {
  const seats = activeSeats(data);
  return {
    code: data.code,
    status: roomStatus(data),
    playerCount: seats.length,
    joinable: roomStatus(data) === 'lobby' && seats.length < rules.game.maxPlayers,
    playerNames: seats.map((s) => s.name),
    hostName: data.seats.find((s) => s.id === data.hostId)?.name ?? null,
  };
}

// ---------------------------------------------------------------------------

function setupCheck(
  data: RoomData,
): { ok: true } | { ok: false; code: RoomErrorCode; message: string } {
  const { minPlayers, maxPlayers } = rules.game;
  const count = activeSeats(data).length;
  if (count < minPlayers || count > maxPlayers) {
    return {
      ok: false,
      code: 'invalid_player_count',
      message: `Secret Hitler se juega con ${minPlayers} a ${maxPlayers} jugadores`,
    };
  }
  return { ok: true };
}

/** A random portrait nobody at the table is using. */
function freePortrait(data: RoomData, ctx: RoomContext): number {
  const used = new Set(data.seats.map((s) => s.portrait));
  const free = Array.from({ length: PORTRAIT_COUNT }, (_, i) => i + 1).filter((p) => !used.has(p));
  return free[Math.floor(ctx.random() * free.length)] ?? 1;
}

function disconnectedPlayers(data: RoomData, ctx: RoomContext): string[] {
  // Executed players no longer act, so their absence does not hold up the table.
  const ids =
    data.game?.players.map((p) => p.id).filter((id) => !data.game?.deadIds.includes(id)) ?? [];
  return ids.filter((id) => {
    const seat = data.seats.find((s) => s.id === id);
    return !seat || seat.left || !ctx.connected.has(id);
  });
}

function updatePause(data: RoomData, ctx: RoomContext): void {
  if (roomStatus(data) !== 'playing' || !rules.session.disconnectPausesGame) {
    data.pausedSince = null;
    return;
  }
  if (disconnectedPlayers(data, ctx).length === 0) data.pausedSince = null;
  else data.pausedSince ??= ctx.now;
}

/** Hands the host role to the next connected seat clockwise, if any. */
function transferHost(data: RoomData, ctx: RoomContext): void {
  const from = Math.max(
    0,
    data.seats.findIndex((s) => s.id === data.hostId),
  );
  for (let i = 1; i <= data.seats.length; i++) {
    const seat = data.seats[(from + i) % data.seats.length];
    if (seat && seat.id !== data.hostId && !seat.left && ctx.connected.has(seat.id)) {
      data.hostId = seat.id;
      return;
    }
  }
}

function removeSeat(data: RoomData, seatId: string, ctx: RoomContext): void {
  if (data.hostId === seatId) transferHost(data, ctx);
  data.seats = data.seats.filter((s) => s.id !== seatId);
  if (data.hostId === seatId) data.hostId = data.seats[0]?.id ?? null;
}

function backToLobby(data: RoomData, ctx: RoomContext): void {
  data.game = null;
  data.pausedSince = null;
  const leaving = data.seats.filter((s) => s.left).map((s) => s.id);
  for (const id of leaving) removeSeat(data, id, ctx);
  for (const s of data.seats) s.ready = false;
}

function touch(data: RoomData, ctx: RoomContext): void {
  data.lastActivity = ctx.now;
}
