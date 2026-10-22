import { chooseBotAction, emptyBotNotes, seededRandom, viewFor } from '@sh/engine';
import { HOST_CAN_END_AFTER_MS } from '@sh/protocol';
import { describe, expect, it } from 'vitest';
import {
  addSeat,
  connectSeat,
  createRoom,
  disconnectSeat,
  handleMessage,
  pendingBot,
  playBot,
  type RoomContext,
  type RoomData,
  roomInfo,
  roomStatus,
  roomView,
} from './room-core';

const NAMES = ['Ana', 'Beto', 'Carla', 'Dani', 'Eva', 'Fede', 'Gala', 'Hugo', 'Inés', 'Juan'];

function ctx(connected: Iterable<string>, now = 1_000): RoomContext {
  return { now, connected: new Set(connected), random: seededRandom(5) };
}

/** A lobby with `n` connected seats s1..sn; s1 is the host. */
function lobby(n: number): { data: RoomData; all: string[] } {
  const data = createRoom('KX7QM2', 0);
  const all: string[] = [];
  for (let i = 0; i < n; i++) {
    const result = addSeat(data, NAMES[i] as string, `hash${i}`, ctx(all));
    if (!result.ok) throw new Error(result.message);
    all.push(result.seat?.id as string);
    connectSeat(data, all[i] as string, ctx(all));
  }
  return { data, all };
}

function startedGame(n = 5): { data: RoomData; all: string[] } {
  const room = lobby(n);
  for (const id of room.all) {
    expectOk(handleMessage(room.data, id, { type: 'set_ready', ready: true }, ctx(room.all)));
  }
  expectOk(handleMessage(room.data, 's1', { type: 'start' }, ctx(room.all)));
  return room;
}

function expectOk(result: ReturnType<typeof handleMessage>): void {
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`);
}

function codeOf(result: ReturnType<typeof handleMessage>): string | null {
  return result.ok ? null : result.code;
}

describe('asientos', () => {
  it('el primero en sentarse es el anfitrión', () => {
    const { data } = lobby(3);
    expect(data.hostId).toBe('s1');
    expect(data.seats.map((s) => s.name)).toEqual(['Ana', 'Beto', 'Carla']);
  });

  it('no permite nombres repetidos, aunque cambien tildes o mayúsculas', () => {
    const { data, all } = lobby(1);
    expect(addSeat(data, 'Ines', 'h', ctx(all)).ok).toBe(true);
    const repeated = addSeat(data, 'INÉS', 'h2', ctx(all));
    expect(repeated.ok || repeated.code).toBe('name_taken');
  });

  it('no admite más de 10 jugadores', () => {
    const { data, all } = lobby(10);
    const extra = addSeat(data, 'Karla', 'h', ctx(all));
    expect(extra.ok || extra.code).toBe('room_full');
    expect(roomInfo(data).joinable).toBe(false);
  });

  it('no admite jugadores nuevos con la partida empezada', () => {
    const { data, all } = startedGame();
    const late = addSeat(data, 'Karla', 'h', ctx(all));
    expect(late.ok || late.code).toBe('game_in_progress');
  });
});

describe('sala de espera', () => {
  it('solo el anfitrión expulsa y empieza', () => {
    const { data, all } = lobby(5);
    const c = ctx(all);
    expect(codeOf(handleMessage(data, 's2', { type: 'kick', playerId: 's3' }, c))).toBe('not_host');
    expect(codeOf(handleMessage(data, 's2', { type: 'start' }, c))).toBe('not_host');
  });

  it('expulsar quita el asiento', () => {
    const { data, all } = lobby(5);
    const result = handleMessage(data, 's1', { type: 'kick', playerId: 's3' }, ctx(all));
    expect(result).toEqual({ ok: true, kicked: 's3' });
    expect(data.seats.map((s) => s.id)).not.toContain('s3');
  });

  it('cada jugador recibe un retrato libre y puede cambiarlo por otro libre', () => {
    const { data, all } = lobby(5);
    const portraits = data.seats.map((s) => s.portrait);
    expect(new Set(portraits).size).toBe(5);
    const taken = portraits[1] as number;
    expect(
      codeOf(handleMessage(data, 's1', { type: 'set_portrait', portrait: taken }, ctx(all))),
    ).toBe('portrait_taken');
    const free = Array.from({ length: 20 }, (_, i) => i + 1).find((p) => !portraits.includes(p));
    expectOk(
      handleMessage(data, 's1', { type: 'set_portrait', portrait: free as number }, ctx(all)),
    );
    expect(roomView(data, 's2', ctx(all)).players[0]?.portrait).toBe(free);
  });

  it('informa si no hay suficientes jugadores', () => {
    const { data, all } = lobby(4);
    const view = roomView(data, 's2', ctx(all));
    expect(view.setup).toMatchObject({ ok: false, code: 'invalid_player_count' });
    expect(view.canStart).toBe(false);
  });

  it('solo empieza con 5 o más jugadores, todos listos y conectados', () => {
    const small = lobby(4);
    for (const id of small.all)
      handleMessage(small.data, id, { type: 'set_ready', ready: true }, ctx(small.all));
    expect(codeOf(handleMessage(small.data, 's1', { type: 'start' }, ctx(small.all)))).toBe(
      'invalid_player_count',
    );

    const { data, all } = lobby(5);
    expect(codeOf(handleMessage(data, 's1', { type: 'start' }, ctx(all)))).toBe(
      'not_everyone_ready',
    );
    for (const id of all) handleMessage(data, id, { type: 'set_ready', ready: true }, ctx(all));
    expect(codeOf(handleMessage(data, 's1', { type: 'start' }, ctx(all.slice(1))))).toBe(
      'not_everyone_ready',
    );
    expect(roomView(data, 's1', ctx(all)).canStart).toBe(true);
    expectOk(handleMessage(data, 's1', { type: 'start' }, ctx(all)));
    expect(roomStatus(data)).toBe('playing');
    expect(data.seats.every((s) => !s.ready)).toBe(true);
  });
});

describe('partida', () => {
  it('cada jugador recibe solo su propia vista', () => {
    const { data, all } = startedGame();
    const views = all.map((id) => roomView(data, id, ctx(all)));
    for (const view of views) {
      expect(view.game?.you.id).toBe(view.you.id);
      expect(view.game?.roles).toBeNull();
    }
    expect(new Set(views.map((v) => v.game?.you.role)).size).toBeGreaterThan(1);
  });

  it('las acciones se firman con el asiento de quien las envía', () => {
    const { data, all } = startedGame();
    const president = data.game?.presidentId as string;
    const others = all.filter((id) => id !== president);
    const nominate = {
      type: 'action',
      action: { type: 'nominate', targetId: others[1] as string },
    } as const;
    expect(codeOf(handleMessage(data, others[0] as string, nominate, ctx(all)))).toBe(
      'not_president',
    );
    expectOk(handleMessage(data, president, nominate, ctx(all)));
    expect(data.game?.phase).toBe('election');
  });

  it('un jugador ejecutado que se desconecta no pausa la partida', () => {
    const { data, all } = startedGame();
    const game = data.game as NonNullable<typeof data.game>;
    game.deadIds = ['s3'];
    const rest = all.filter((id) => id !== 's3');
    disconnectSeat(data, 's3', ctx(rest, 5_000));
    expect(data.pausedSince).toBeNull();
  });

  it('una desconexión pausa la partida y pasa el anfitrión al siguiente conectado', () => {
    const { data, all } = startedGame();
    const rest = all.filter((id) => id !== 's1');
    disconnectSeat(data, 's1', ctx(rest, 5_000));
    expect(data.pausedSince).toBe(5_000);
    expect(data.hostId).toBe('s2');
    expect(roomView(data, 's2', ctx(rest)).pause?.disconnectedIds).toEqual(['s1']);
    expect(
      codeOf(
        handleMessage(
          data,
          's2',
          { type: 'action', action: { type: 'vote', approve: true } },
          ctx(rest),
        ),
      ),
    ).toBe('game_paused');

    connectSeat(data, 's1', ctx(all, 6_000));
    expect(data.pausedSince).toBeNull();
    expect(data.hostId).toBe('s2');
  });

  it('el anfitrión solo puede terminar tras esperar el tiempo mínimo', () => {
    const { data, all } = startedGame();
    const rest = all.filter((id) => id !== 's3');
    disconnectSeat(data, 's3', ctx(rest, 10_000));
    const early = handleMessage(
      data,
      's1',
      { type: 'end_game' },
      ctx(rest, 10_000 + HOST_CAN_END_AFTER_MS - 1),
    );
    expect(codeOf(early)).toBe('not_paused_long_enough');
    expectOk(
      handleMessage(data, 's1', { type: 'end_game' }, ctx(rest, 10_000 + HOST_CAN_END_AFTER_MS)),
    );
    expect(roomStatus(data)).toBe('lobby');
    expect(data.seats).toHaveLength(5);
  });

  it('abandonar a mitad de partida deja el asiento hasta que la partida termina', () => {
    const { data, all } = startedGame(6);
    const result = handleMessage(data, 's4', { type: 'leave' }, ctx(all));
    expect(result).toEqual({ ok: true, left: 's4' });
    const rest = all.filter((id) => id !== 's4');
    disconnectSeat(data, 's4', ctx(rest, 2_000));
    expect(data.seats.find((s) => s.id === 's4')?.left).toBe(true);
    expect(data.pausedSince).not.toBeNull();

    expectOk(
      handleMessage(data, 's1', { type: 'end_game' }, ctx(rest, 2_000 + HOST_CAN_END_AFTER_MS)),
    );
    expect(data.seats.map((s) => s.id)).not.toContain('s4');
    expect(roomInfo(data)).toMatchObject({ status: 'lobby', playerCount: 5, joinable: true });
  });

  it('abandonar la sala de espera quita el asiento y traspasa el anfitrión', () => {
    const { data, all } = lobby(5);
    expect(handleMessage(data, 's1', { type: 'leave' }, ctx(all))).toEqual({
      ok: true,
      left: 's1',
    });
    expect(data.seats).toHaveLength(4);
    expect(data.hostId).toBe('s2');
  });
});

describe('bots', () => {
  function lobbyWithBots(people: number, bots: number) {
    const room = lobby(people);
    for (let i = 0; i < bots; i++) {
      expectOk(handleMessage(room.data, 's1', { type: 'add_bot' }, ctx(room.all)));
    }
    return room;
  }

  it('solo el anfitrión añade bots, que están siempre listos y conectados', () => {
    const { data, all } = lobbyWithBots(1, 4);
    expect(codeOf(handleMessage(data, 's1', { type: 'add_bot' }, ctx(all)))).toBeNull();
    const view = roomView(data, 's1', ctx(all));
    const bots = view.players.filter((p) => p.bot);
    expect(bots).toHaveLength(5);
    expect(bots.every((b) => b.ready && b.connected)).toBe(true);
    expect(new Set(view.players.map((p) => p.name)).size).toBe(6);
  });

  it('no deja añadir bots a otros ni pasar de 10', () => {
    const { data, all } = lobbyWithBots(2, 8);
    expect(codeOf(handleMessage(data, 's2', { type: 'add_bot' }, ctx(all)))).toBe('not_host');
    expect(codeOf(handleMessage(data, 's1', { type: 'add_bot' }, ctx(all)))).toBe('room_full');
  });

  it('una persona y cuatro bots juegan una partida completa', () => {
    const { data, all } = lobbyWithBots(1, 4);
    expectOk(handleMessage(data, 's1', { type: 'set_ready', ready: true }, ctx(all)));
    expect(roomView(data, 's1', ctx(all)).canStart).toBe(true);
    expectOk(handleMessage(data, 's1', { type: 'start' }, ctx(all)));
    const random = seededRandom(9);
    for (let step = 0; roomStatus(data) === 'playing'; step++) {
      expect(step).toBeLessThan(3000);
      const c = { now: 1_000 + step, connected: new Set(all), random };
      if (playBot(data, c)) continue;
      // The person plays like a bot too, through the normal message path.
      const game = data.game as NonNullable<typeof data.game>;
      const move = chooseBotAction(viewFor(game, 's1'), emptyBotNotes(), random);
      if (!move) throw new Error('la persona no tiene jugada');
      const { playerId: _, ...action } = move.action as Record<string, unknown>;
      expectOk(handleMessage(data, 's1', { type: 'action', action } as never, c));
    }
    expect(roomStatus(data)).toBe('ended');
    expect(data.chat?.length).toBeGreaterThan(0);
    // Some bots say goodbye at the end.
    const farewells = data.chat?.filter((line) => line.final) ?? [];
    expect(farewells.length).toBeGreaterThan(0);
    expect(farewells.length).toBeLessThanOrEqual(3);
    expect(data.chat?.every((line) => data.seats.find((s) => s.id === line.playerId)?.bot)).toBe(
      true,
    );
  });

  it('los bots no pausan la partida ni heredan el anfitrión', () => {
    const { data, all } = lobbyWithBots(1, 4);
    expectOk(handleMessage(data, 's1', { type: 'set_ready', ready: true }, ctx(all)));
    expectOk(handleMessage(data, 's1', { type: 'start' }, ctx(all)));
    expect(data.pausedSince).toBeNull();
    disconnectSeat(data, 's1', ctx([], 5_000));
    expect(data.hostId).toBe('s1');
    expect(data.pausedSince).toBe(5_000);
    expect(pendingBot(data)).toBeNull();
  });
});
