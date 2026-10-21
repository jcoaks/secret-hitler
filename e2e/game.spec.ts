import { expect, test } from '@playwright/test';
import { type Bot, seatBots } from './bots';
import { createRoom, gameOver, step } from './driver';

// One real browser (the host) plays a whole game against bots.
const API = process.env.BASE ?? 'http://localhost:8787';

for (const players of [5, 7]) {
  test(`partida completa de ${players} jugadores con una recarga a mitad`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });

    const code = await createRoom(page, 'Juan');
    let bots: Bot[] = [];
    try {
      bots = await seatBots(API, code, players - 1, { delayMs: 300 });
      await page.getByRole('button', { name: 'ESTOY LISTO' }).click();
      const start = page.getByRole('button', { name: 'EMPEZAR PARTIDA' });
      await expect(start).toBeEnabled();
      await start.click();
      await expect(page.getByRole('button', { name: 'ABRIR SOBRE' })).toBeVisible();

      let reloaded = false;
      const done = new Set<string>();
      for (let i = 0; i < 2000 && !(await gameOver(page)); i++) {
        const did = await step(page);
        if (did) done.add(did);
        // Once the game is under way, reload: the browser must get its seat back.
        if (!reloaded && done.has('VOTA EL GOBIERNO')) {
          reloaded = true;
          await page.reload();
          await expect(page.getByRole('button', { name: 'Tu rol' })).toBeVisible();
        }
        await page.waitForTimeout(100);
      }

      await expect(page.getByRole('dialog', { name: /Victoria/ })).toBeVisible();
      expect(reloaded).toBe(true);
      // Every role is revealed at the end.
      await expect(page.getByRole('img', { name: /Hitler/ }).first()).toBeVisible();
      expect(errors).toEqual([]);
    } finally {
      for (const bot of bots) bot.close();
    }
  });
}
