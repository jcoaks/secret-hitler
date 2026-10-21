// Bots that sit at a room over WebSocket and play random legal moves, so a
// single real browser can play a whole game in end-to-end tests.
import type { PlayerView } from '@sh/engine';
import type { RoomView, ServerMessage } from '@sh/protocol';

const BOT_NAMES = [
  'Lucía',
  'Mateo',
  'Sofía',
  'Diego',
  'Valentina',
  'Andrés',
  'Camila',
  'Tomás',
  'Elena',
];

export interface BotOptions {
  /** Delay before each move, so the browser has time to show every phase. */
  delayMs?: number;
}

export class Bot {
  room: RoomView | null = null;
  id: string | null = null;
  private ws: WebSocket | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  readonly name: string;
  private readonly wsUrl: string;
  private readonly options: BotOptions;

  constructor(name: string, wsUrl: string, options: BotOptions = {}) {
    this.name = name;
    this.wsUrl = wsUrl;
    this.options = options;
  }

  join(): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl);
      this.ws = ws;
      ws.onopen = () => ws.send(JSON.stringify({ type: 'join', name: this.name }));
      ws.onerror = () => reject(new Error(`${this.name}: error de conexión`));
      ws.onmessage = (event) => {
        const message = JSON.parse(String(event.data)) as ServerMessage;
        if (message.type === 'welcome') {
          this.id = message.playerId;
          resolve();
        } else if (message.type === 'room') {
          this.room = message.room;
          this.schedule();
        } else if (message.type === 'error' && !this.id) {
          reject(new Error(`${this.name}: ${message.code}`));
        }
      };
    });
  }

  send(message: unknown): void {
    this.ws?.send(JSON.stringify(message));
  }

  close(): void {
    if (this.timer) clearTimeout(this.timer);
    this.ws?.close();
  }

  private schedule(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.move(), this.options.delayMs ?? 300);
  }

  /** One random legal move if it's this bot's turn, based only on its own view. */
  private move(): void {
    const room = this.room;
    if (!room || room.pause) return;
    if (room.status === 'lobby') {
      const me = room.players.find((p) => p.id === this.id);
      if (me && !me.ready) this.send({ type: 'set_ready', ready: true });
      return;
    }
    const game = room.game;
    if (!game) return;
    const action = randomMove(game);
    if (action) this.send({ type: 'action', action });
  }
}

export function randomMove(game: PlayerView): Record<string, unknown> | null {
  const me = game.you;
  if (!me.alive) return null;
  const isPresident = game.presidentId === me.id;
  const others = game.players
    .map((p) => p.id)
    .filter((id) => id !== me.id && !game.deadIds.includes(id));
  const pick = <T>(items: T[]) => items[Math.floor(Math.random() * items.length)] as T;
  switch (game.phase) {
    case 'nomination':
      return isPresident ? { type: 'nominate', targetId: pick(game.eligibleChancellorIds) } : null;
    case 'election':
      return game.votedPlayerIds.includes(me.id)
        ? null
        : { type: 'vote', approve: Math.random() < 0.75 };
    case 'legislative_president':
      return me.hand
        ? { type: 'discard', index: Math.floor(Math.random() * me.hand.length) }
        : null;
    case 'legislative_chancellor':
      if (!me.hand) return null;
      if (game.vetoUnlocked && !game.vetoDenied && Math.random() < 0.3) {
        return { type: 'propose_veto' };
      }
      return { type: 'enact', index: Math.floor(Math.random() * me.hand.length) };
    case 'veto':
      return isPresident ? { type: 'answer_veto', accept: Math.random() < 0.5 } : null;
    case 'investigate':
      return isPresident
        ? {
            type: 'investigate',
            targetId: pick(others.filter((id) => !game.investigatedIds.includes(id))),
          }
        : null;
    case 'peek':
      return isPresident ? { type: 'end_peek' } : null;
    case 'special_election':
      return isPresident ? { type: 'special_election', targetId: pick(others) } : null;
    case 'execution':
      return isPresident ? { type: 'execute', targetId: pick(others) } : null;
    default:
      return null;
  }
}

/** Seats `count` bots in the room with the given code. */
export async function seatBots(
  baseUrl: string,
  code: string,
  count: number,
  options: BotOptions = {},
): Promise<Bot[]> {
  const wsUrl = `${baseUrl.replace(/^http/, 'ws')}/api/rooms/${code}/ws`;
  const bots: Bot[] = [];
  for (const name of BOT_NAMES.slice(0, count)) {
    const bot = new Bot(name, wsUrl, options);
    await bot.join();
    bots.push(bot);
  }
  return bots;
}
