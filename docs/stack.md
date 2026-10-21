# Secret Hitler: stack

Migrado el 2026-10-21 desde Java (Javalin) + Create React App al stack de Avalon Online. Reglas: `config/secret-hitler-rules.json`.

## Resumen

| Capa | Elección |
|---|---|
| Lenguaje | TypeScript estricto en todo el proyecto |
| Monorepo | pnpm workspaces |
| Frontend | React 19 + Vite (SPA), React Router |
| Estilos | Tailwind CSS 4 con la paleta del juego original; fuentes Germania One y Montserrat autoalojadas (Fontsource) |
| Animaciones | Motion (votos, políticas, sobre del rol, contador electoral) |
| Estado en cliente | Zustand, alimentado por los mensajes del servidor |
| Tiempo real | WebSockets; en el cliente, PartySocket (reconexión automática) |
| Servidor | Cloudflare Workers + un **Durable Object por sala** (API nativa de WebSockets con hibernación) |
| Validación | Zod para todos los mensajes, compartido entre cliente y servidor |
| Hosting | Cloudflare: Worker del servidor y el frontend como assets estáticos del Worker, en `secrethitler.lat` |
| Pruebas | Vitest (motor, protocolo, salas y lógica de la web), Playwright (partidas completas en el navegador contra bots) |
| Calidad | Biome (lint y formato), GitHub Actions (lint, tipos, pruebas y build en cada PR) |

## Motor (`packages/engine`)

- Máquina de estados pura: `applyAction(estado, acción, random) → estado`, sin efectos. Fases: `nomination`, `election`, `legislative_president`, `legislative_chancellor`, `veto`, `investigate`, `peek`, `special_election`, `execution`, `game_over`.
- Toda la aleatoriedad (reparto de roles, primer presidente, barajar el mazo) entra como parámetro, para poder reproducir partidas en las pruebas.
- El turno avanza solo tras cada gobierno; ya no hace falta el botón «Terminar mandato» del juego anterior.
- `viewFor(estado, jugador)`: lo que **ese** jugador puede ver. La mano solo la ve quien la tiene, el espionaje solo el presidente, el resultado de una investigación solo quien investigó y los votos solo cuando han votado todos. El juego anterior mandaba las cartas del presidente y del canciller a todos los jugadores.
- La `chronicle` es el registro público de la partida (elecciones con sus votos, políticas, vetos, poderes). La web la usa para los anuncios y el historial.
- Pruebas de 5 a 10 jugadores, cada regla del reglamento oficial (límites de mandato, caos, veto, elección especial, investigación, ejecución) y 1.800 partidas aleatorias que llegan a las cuatro formas de terminar sin perder ninguna carta.

## Servidor (`apps/server`)

Igual que en Avalon:

- Cada sala es un Durable Object identificado por su código: guarda el estado, acepta los WebSockets de sus jugadores y es la única autoridad.
- `room-core.ts` es puro y se prueba sin Cloudflare; `room.ts` solo adapta WebSockets, almacenamiento y alarmas.
- Las desconexiones pausan la partida (salvo la de un jugador ya ejecutado); el anfitrión puede terminarla tras 120 s de pausa. Una alarma borra las salas sin actividad durante 6 h.
- Al sentarse, cada jugador recibe un retrato libre al azar y puede cambiarlo en la sala de espera.

### API

| Ruta | Uso |
|---|---|
| `POST /api/rooms` `{name}` | Crea la sala y el asiento del anfitrión → `{code, playerId, seatToken}` |
| `GET /api/rooms/:code` | Estado público: `{code, status, playerCount, joinable, playerNames, hostName}`; 404 si no existe |
| `GET /api/rooms/:code/ws` | WebSocket. Primer mensaje: `join` con `name` (asiento nuevo) o `seatToken` (reconexión) |

Mensajes del cliente: `join`, `set_ready`, `set_portrait`, `kick`, `start`, `action`, `leave`, `end_game`, `new_game`. Acciones de juego: `nominate`, `vote`, `discard`, `enact`, `propose_veto`, `answer_veto`, `investigate`, `end_peek`, `special_election`, `execute`. Del servidor: `welcome`, `room`, `error`, `kicked`.

## Seguridad

- **El servidor manda:** el cliente nunca recibe roles ajenos (salvo los que su rol conoce), manos ajenas, el orden del mazo ni votos antes de tiempo.
- **Sin cuentas ni base de datos:** al sentarse, cada jugador recibe un token de asiento aleatorio (128 bits) guardado en `localStorage`. El servidor solo guarda su hash.
- Toda acción se valida dos veces: el esquema (Zod) y las reglas (motor: turno, fase, cargo, vivo o ejecutado).
- Límite de mensajes por conexión y de tamaño de mensaje; nombres de 2 a 20 caracteres, únicos.

## Web (`apps/web`)

- `store/room.ts`: conexión con PartySocket, token de asiento por sala y vista de la sala (igual que Avalon).
- `store/ui.ts`: diálogos y la cola de anuncios, que sustituye a la cola de animaciones del juego anterior. Las decisiones esperan a que terminen los anuncios.
- `components/game/`: `PlayerCard` (la carta de jugador original con retrato, rol conocido, ¡Ja!/Nein y cargo), tableros con las posiciones originales de las políticas y el contador, mazos.
- `screens/`: `entry/` (inicio, unirse, sala de espera, reglas) y `game/` (decisiones, anuncios, sobre del rol, historial, final, pausa).
- Las ilustraciones del juego original están en `apps/web/src/assets`, convertidas a WebP.

## Desarrollo local

- `pnpm dev` levanta el Worker (8787) y Vite (5173, con proxy de `/api` y WebSockets).
- `pnpm e2e` juega partidas de 5 y 7 jugadores en Chromium: el navegador crea la sala y bots por WebSocket ocupan el resto de asientos, con una recarga a mitad.
- `pnpm --filter @sh/server smoke` juega una partida completa por WebSocket contra el servidor. Con `BASE=<url>` se puede lanzar contra un despliegue.
