// Plays one game in a real browser against bots and saves a screenshot of each new screen.
//   SHOTS=<dir> VIEWPORT=390x844 node tour.ts [players=5]
import { chromium } from '@playwright/test';
import { seatBots } from './bots.ts';
import { createRoom, gameOver, step } from './driver.ts';

const SHOTS = process.env.SHOTS ?? 'shots';
const players = Number(process.argv[2] ?? 5);
const WEB = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const API = process.env.BASE ?? 'http://localhost:8787';
const [width = 1280, height = 900] = (process.env.VIEWPORT ?? '').split('x').map(Number);

const browser = await chromium.launch();
const page = await browser.newPage({ baseURL: WEB, viewport: { width, height } });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});

let count = 0;
const seen = new Set<string>();
async function shot(name: string): Promise<void> {
  if (seen.has(name)) return;
  seen.add(name);
  await page.waitForTimeout(400);
  const file = `${SHOTS}/${String(count++).padStart(2, '0')}-${name.replace(/\W+/g, '_')}.png`;
  await page.screenshot({ path: file, fullPage: true });
}

await page.goto('/');
await shot('inicio');
const code = await createRoom(page, 'Juan');
const bots = await seatBots(API, code, players - 1, { delayMs: 700 });
await page.getByRole('button', { name: 'ESTOY LISTO' }).click();
await page.getByRole('button', { name: 'EMPEZAR PARTIDA' }).and(page.locator(':enabled')).waitFor();
await shot('sala');
await page.getByRole('button', { name: 'EMPEZAR PARTIDA' }).click();

for (let i = 0; i < 2000 && !(await gameOver(page)); i++) {
  const title = await page
    .locator('dialog[open] h2, button[aria-live=assertive] span')
    .first()
    .textContent({ timeout: 200 })
    .catch(() => null);
  if (title) await shot(title.trim());
  await step(page);
  await page.waitForTimeout(250);
}
await shot('final');
console.log(errors.length ? `errores: ${errors.join('\n')}` : 'sin errores');
for (const bot of bots) bot.close();
await browser.close();
