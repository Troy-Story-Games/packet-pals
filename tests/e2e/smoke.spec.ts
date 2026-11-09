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

  // Rewards must not cover the packet while it travels...
  const reward = page.getByRole('dialog', { name: 'Reward' });
  await page.waitForTimeout(400);
  await expect(reward).toBeHidden();

  // ...or the mission-complete card; they wait until it's closed.
  await expect(page.getByRole('heading', { name: 'Mission complete!' })).toBeVisible({ timeout: 10_000 });
  await expect(reward).toBeHidden();
  await page.getByRole('button', { name: 'Play again' }).click();
  await expect(reward).toBeVisible();
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

/** Starts with Chapter 1 (and optionally more) finished and a high level. */
async function progress(page: Page, extra: string[] = []) {
  await page.addInitScript((extra) => {
    const ch1 = [
      'hello-cable',
      'ping-pong',
      'hub-vs-switch',
      'home-router',
      'make-wifi',
      'wrong-password',
      'hello-internet',
      'too-far',
      'bedtime',
      'fix-address',
      'printer-party',
      'packet-race',
    ];
    const stars = Object.fromEntries([...ch1, ...extra].map((id) => [id, 3]));
    const badges = [
      'plugged-in',
      'packet-pilot',
      'wifi-wizard',
      'loud-hub',
      'surfer',
      'gamer',
      'guard',
      'architect',
      'packet-pro',
      'halfway',
      'royal',
      'printing-press',
      'collector',
      'champion',
    ];
    localStorage.setItem(
      'kidsdn-progress',
      JSON.stringify({
        state: {
          xp: 3000,
          stats: {},
          missionStars: stars,
          badges,
          streak: { count: 1, lastDay: null },
          discovered: [],
        },
        version: 1,
      }),
    );
  }, extra);
}

test('printing shows what came out of the printer', async ({ page }) => {
  await page.goto('./#/sandbox');
  await expect(device(page, 'Computer')).toBeVisible();
  await page
    .getByRole('button', { name: /^Printer$/ })
    .first()
    .click();
  await dismissRewards(page);
  await page.getByRole('button', { name: 'Cable' }).click();
  await device(page, 'Computer').click();
  await device(page, 'Printer').click();
  await page.waitForTimeout(400);
  await dismissRewards(page);
  await page.getByRole('button', { name: 'Move', exact: true }).click();
  await device(page, 'Computer').click();
  await page.getByRole('button', { name: 'Print', exact: true }).click();
  // The "send to" list in the inspector comes before the toolbox card in the page.
  await page.getByRole('button', { name: 'Printer', exact: true }).first().click();
  await expect(page.getByRole('dialog', { name: /Printer printed/ })).toBeVisible({ timeout: 10_000 });
});

test('locked advanced settings show what unlocks them', async ({ page }) => {
  await progress(page);
  await page.goto('./#/sandbox');
  await expect(device(page, 'Computer')).toBeVisible();
  await page
    .getByRole('button', { name: /Firewall/ })
    .first()
    .click();
  await expect(page.getByText(/Level 8 · Mission 17: Door Numbers/)).toBeVisible();
});

test('the terminal runs commands built from pills', async ({ page }) => {
  await progress(page, ['phone-home', 'phone-book', 'network-detective']);
  await page.goto('./#/sandbox');
  await expect(device(page, 'Computer')).toBeVisible();
  await dismissRewards(page);
  await page.getByRole('button', { name: 'Terminal' }).click();
  const terminal = page.getByRole('dialog', { name: 'Terminal' });
  await terminal.getByRole('button', { name: 'ipconfig' }).click();
  await terminal.getByRole('button', { name: 'Computer' }).click();
  await terminal.getByRole('button', { name: /Run/ }).click();
  await expect(terminal.getByText(/Computer> ipconfig/)).toBeVisible();
  await expect(terminal.getByText(/Address/)).toBeVisible();
});
