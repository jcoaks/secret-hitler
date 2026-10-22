// End-to-end smoke test against a running Worker (default: `wrangler dev` on :8787).
// Creates a room, seats 5 players over WebSockets, plays a full game with random legal
// moves, and checks pause/resume on reconnect and rejection of a forged seat token.
//
//   pnpm --filter @sh/server smoke            # local
//   BASE=https://secret-hitler.example.workers.dev pnpm --filter @sh/server smoke

const BASE = process.env.BASE ?? 'http://localhost:8787';
const WS_BASE = BASE.replace(/^http/, 'ws');
const NAMES = ['Ana', 'Beto', 'Carla', 'Dani', 'Eva'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pick = (items) => items[Math.floor(Math.random() * items.length)];

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

class Client {
  constructor(name, code) {
    this.name = name;
    this.code = code;
    this.room = null;
    this.errors = [];
    this.busy = false;
  }

  connect(join) {
    // Never act on a view from a previous connection.
    this.room = null;
    this.lastTurn = null;
    this.busy = false;
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${WS_BASE}/api/rooms/${this.code}/ws`);
      this.ws = ws;
      ws.onopen = () => ws.send(JSON.stringify({ type: 'join', ...join }));
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'welcome') {
          this.id = msg.playerId;
          this.token = msg.seatToken;
          resolve(this);
        } else if (msg.type === 'room') {
          this.room = msg.room;
          this.busy = false;
        } else if (msg.type === 'error') {
          this.errors.push(`${this.name}:${msg.code}@${this.room?.game?.phase ?? 'sin vista'}`);
          this.busy = false;
          if (!this.id) reject(new Error(msg.code));
        }
      };
      ws.onerror = () => reject(new Error(`${this.name}: error de conexión`));
    });
  }

  send(message) {
    this.busy = true;
    this.ws.send(JSON.stringify(message));
  }

  /** One random legal move if this player has to act, based only on its own view. */
  act() {
    const game = this.room?.game;
    if (!game || this.busy || this.room.pause) return;
    // Act at most once per turn state: an update caused by someone else's move can
    // arrive before our own move is processed, and must not trigger a second send.
    const turn = JSON.stringify([
      game.phase,
      game.round,
      game.votedPlayerIds.includes(game.you.id),
      game.you.hand?.length ?? 0,
    ]);
    if (turn === this.lastTurn) return;
    const me = game.you;
    if (!me.alive) return;
    const isPresident = game.presidentId === me.id;
    const others = game.players
      .map((p) => p.id)
      .filter((id) => id !== me.id && !game.deadIds.includes(id));
    const action = (() => {
      switch (game.phase) {
        case 'nomination':
          return isPresident
            ? { type: 'nominate', targetId: pick(game.eligibleChancellorIds) }
            : null;
        case 'election':
          return game.votedPlayerIds.includes(me.id)
            ? null
            : { type: 'vote', approve: Math.random() < 0.7 };
        case 'legislative_president':
          return me.hand ? { type: 'discard', index: Math.floor(Math.random() * 3) } : null;
        case 'legislative_chancellor':
          if (!me.hand) return null;
          if (game.vetoUnlocked && !game.vetoDenied && Math.random() < 0.3) {
            return { type: 'propose_veto' };
          }
          return { type: 'enact', index: Math.floor(Math.random() * 2) };
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
    })();
    if (action) {
      this.lastTurn = turn;
      this.send({ type: 'action', action });
    }
  }
}

async function waitFor(predicate, label, timeout = 10_000) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeout) fail(`tiempo agotado esperando: ${label}`);
    await sleep(20);
  }
}

// 1. Create the room over HTTP.
const created = await fetch(`${BASE}/api/rooms`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ name: NAMES[0] }),
});
if (created.status !== 201) fail(`crear sala devolvió ${created.status}`);
const { code, seatToken } = await created.json();
console.log(`✓ sala creada ${code}`);

const info = await (await fetch(`${BASE}/api/rooms/${code.toLowerCase()}`)).json();
if (info.playerCount !== 1 || !info.joinable) fail(`info inesperada ${JSON.stringify(info)}`);
const missing = await fetch(`${BASE}/api/rooms/AAAA`);
if (missing.status !== 404) fail('una sala inexistente debería dar 404');
console.log('✓ información de sala y 404');

// 2. Seat everyone: the host reclaims their seat by token, the rest join by name.
const clients = [await new Client(NAMES[0], code).connect({ seatToken })];
for (const name of NAMES.slice(1)) clients.push(await new Client(name, code).connect({ name }));
const forged = new Client('Intruso', code);
await forged.connect({ seatToken: '0'.repeat(32) }).then(
  () => fail('un token falso no debería entrar'),
  (error) => error.message === 'invalid_seat' || fail(`error inesperado ${error.message}`),
);
const dup = new Client('ana', code);
await dup.connect({ name: 'ANA' }).then(
  () => fail('un nombre repetido no debería entrar'),
  (error) => error.message === 'name_taken' || fail(`error inesperado ${error.message}`),
);
console.log('✓ 5 jugadores sentados; token falso y nombre repetido rechazados');

// 3. Ready up and start.
const [host] = clients;
for (const c of clients) c.send({ type: 'set_ready', ready: true });
await waitFor(() => host.room?.canStart, 'que todos estén listos');
host.send({ type: 'start' });
await waitFor(() => clients.every((c) => c.room?.status === 'playing'), 'el inicio de la partida');
const roles = clients.map((c) => c.room.game.you.role);
if (clients.some((c) => c.room.game.roles !== null)) fail('se filtraron los roles ajenos');
console.log(`✓ partida empezada; roles repartidos: ${roles.sort().join(', ')}`);

// 4. Play until the end, dropping and restoring one player after the first policy.
let reconnected = false;
const start = Date.now();
while (host.room.status === 'playing') {
  if (Date.now() - start > 60_000) fail('la partida no terminó en 60 s');
  const firstPolicy = host.room.game.chronicle.some((e) => e.type === 'enacted');
  const victim = clients[2];
  if (!reconnected && firstPolicy && !host.room.game.deadIds.includes(victim.id)) {
    reconnected = true;
    victim.ws.close();
    await waitFor(
      () => host.room.pause?.disconnectedIds.includes(victim.id),
      'la pausa por desconexión',
    );
    console.log('✓ la desconexión de un jugador pausa la partida');
    await victim.connect({ seatToken: victim.token });
    await waitFor(() => host.room.pause === null, 'que se reanude la partida');
    console.log('✓ el jugador recupera su asiento con su token y la partida sigue');
  }
  for (const c of clients) c.act();
  await sleep(15);
}

await waitFor(() => clients.every((c) => c.room.status === 'ended'), 'que todos vean el final');
const { winner, winReason, enacted, roles: allRoles } = host.room.game;
if (!allRoles) fail('al final deberían revelarse todos los roles');
const unexpected = clients.flatMap((c) => c.errors);
if (unexpected.length) fail(`errores inesperados durante la partida: ${unexpected.join(', ')}`);
console.log(
  `✓ partida terminada: ganan los ${winner === 'liberal' ? 'liberales' : 'fascistas'} (${winReason}) con ${enacted.liberal} liberales y ${enacted.fascist} fascistas`,
);

for (const c of clients) c.ws.close();
console.log('✓ prueba de humo completa');
process.exit(0);
