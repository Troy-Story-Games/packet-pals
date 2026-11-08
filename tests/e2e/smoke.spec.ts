import { expect, test, type Page } from '@playwright/test';

const device = (page: Page, name: string) =>
  page.locator('.react-flow__node').filter({ hasText: name }).first();

/** Close any badge / level-up pop-ups, like a kid tapping "Awesome!". */
async function dismissRewards(page: Page) {
  const awesome = page.getByRole('button', { name: 'Awesome!' });
  for (let i = 0; i < 6 && (await awesome.isVisible()); i++) {
    await awesome.click({ force: true });
    await page.waitForTimeout(350);
  }
}

test('home shows the main activities', async ({ page }) => {
  await page.goto('./');
  for (const name of ['Missions', 'Build Anything', 'Network Book', 'Trophies']) {
    await expect(page.getByRole('button', { name: new RegExp(name) })).toBeVisible();
  }
});

test('mission 1 can be completed by cabling and messaging', async ({ page }) => {
  await page.goto('./#/missions/hello-cable');
  await expect(device(page, "Amy's PC")).toBeVisible();

  await page.getByRole('button', { name: 'Cable' }).click();
  await device(page, "Amy's PC").click();
  await device(page, "Ben's PC").click();
  await expect(page.getByText(/are connected/)).toBeVisible();
  await page.waitForTimeout(500);
  await dismissRewards(page);

  await page.getByRole('button', { name: 'Move' }).click();
  await device(page, "Amy's PC").click();
  await page.getByRole('button', { name: 'Message', exact: true }).click();
  await page.getByRole('button', { name: "Ben's PC" }).click();

  await expect(page.getByRole('heading', { name: 'Mission complete!' })).toBeVisible({ timeout: 10_000 });
});

test('sandbox adds devices from the toolbox', async ({ page }) => {
  await page.goto('./#/sandbox');
  await expect(device(page, 'Computer')).toBeVisible();
  const before = await page.locator('.react-flow__node').count();
  await page
    .getByRole('button', { name: /Switch/ })
    .first()
    .click();
  await expect(page.locator('.react-flow__node')).toHaveCount(before + 1);
});
