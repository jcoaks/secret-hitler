// Drives the browser player through whatever the game asks of them.
import type { Page } from '@playwright/test';

const CONFIRM = /^(NOMINAR|INVESTIGAR|ELEGIR|EJECUTAR|DESCARTAR|APROBAR)$/;

/** A visible button that can be pressed now (prompts disable theirs while the move is in flight). */
const visible = (page: Page, name: string | RegExp) =>
  page
    .getByRole('button', { name, exact: typeof name === 'string' })
    .and(page.locator(':enabled'))
    .first()
    .isVisible()
    .catch(() => false);

export async function gameOver(page: Page): Promise<boolean> {
  return page
    .getByRole('dialog', { name: /Victoria/ })
    .isVisible()
    .catch(() => false);
}

/** Creates a room from the home page and returns its code ("KX7QM2"). */
export async function createRoom(page: Page, name: string): Promise<string> {
  await page.goto('/');
  await page.getByLabel('Tu nombre').fill(name);
  await page.getByRole('button', { name: 'CREAR SALA' }).click();
  await page.getByText('CÓDIGO DE SALA').waitFor();
  return ((await page.locator('h1 span').textContent()) ?? '').replace('-', '');
}

/** Answers the open prompt, if any. Returns a short name of what it did, or null. */
export async function step(page: Page): Promise<string | null> {
  if (
    await page
      .locator('button[aria-live=assertive]')
      .isVisible()
      .catch(() => false)
  ) {
    return 'announcement';
  }
  const dialog = page.locator('dialog[open]');
  if (!(await dialog.isVisible().catch(() => false))) return null;
  const title =
    (
      await dialog
        .locator('h2')
        .first()
        .textContent()
        .catch(() => '')
    )?.trim() ?? '';

  if (await visible(page, 'ABRIR SOBRE')) {
    await page.getByRole('button', { name: 'ABRIR SOBRE' }).click();
    // The card slides out before the role sheet appears.
    await page.getByRole('button', { name: 'ENTENDIDO' }).waitFor();
    return 'envelope';
  }
  if (await visible(page, 'ENTENDIDO')) {
    await page.getByRole('button', { name: 'ENTENDIDO' }).click();
    return title;
  }
  if (await visible(page, '¡Ja! (sí)')) {
    await page.getByRole('button', { name: '¡Ja! (sí)' }).click();
    return title;
  }
  if (await visible(page, 'ACEPTAR VETO')) {
    await page.getByRole('button', { name: 'RECHAZAR' }).click();
    return title;
  }
  const option = dialog.locator('button[aria-pressed]:not([disabled])').first();
  if (await option.isVisible().catch(() => false)) {
    if (
      !(await option.click({ timeout: 1500 }).then(
        () => true,
        () => false,
      ))
    )
      return null;
    // The prompt can be replaced in between (a new view arrived): the next step retries.
    const confirmed = await dialog
      .locator('button:enabled', { hasText: CONFIRM })
      .first()
      .click({ timeout: 1500 })
      .then(() => true)
      .catch(() => false);
    return confirmed ? title : null;
  }
  return null;
}
