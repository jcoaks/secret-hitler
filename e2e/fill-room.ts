// Seats bots at a room so you can play with them by hand:
//   pnpm --filter @sh/e2e fill <CÓDIGO> [bots=4] [delayMs=1500]
import { seatBots } from './bots.ts';

const [code, count = '4', delay = '1500'] = process.argv.slice(2);
if (!code) {
  console.error('Uso: pnpm --filter @sh/e2e fill <CÓDIGO> [bots] [delayMs]');
  process.exit(1);
}
const base = process.env.BASE ?? 'http://localhost:8787';
const bots = await seatBots(base, code.replace(/-/g, '').toUpperCase(), Number(count), {
  delayMs: Number(delay),
});
console.log(`${bots.length} bots sentados en ${code}. Ctrl+C para sacarlos.`);
