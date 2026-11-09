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

const CHAPTER_2 = [
  'phone-home',
  'phone-book',
  'network-detective',
  'my-website',
  'door-numbers',
  'game-night',
];

test('switch sockets can be painted team colours', async ({ page }) => {
  await progress(page, [...CHAPTER_2, 'guest-wifi']);
  await page.goto('./#/missions/team-colors');
  await dismissRewards(page);
  await device(page, 'Switch').click();
  await page.getByRole('button', { name: /Advanced: Team colours/ }).click();
  await page.getByRole('button', { name: /Parents' PC is on the Blue team/ }).click();
  await expect(page.getByRole('button', { name: /Parents' PC is on the Red team/ })).toBeVisible();
  // On phones the settings sheet covers the canvas, so close it first.
  await page.getByRole('button', { name: 'Close' }).click();
  await device(page, "Parents' PC").click();
  await expect(page.getByRole('complementary').getByText('192.168.12.10')).toBeVisible();
});

test('a laptop can connect to a VPN server', async ({ page }) => {
  await progress(page, [...CHAPTER_2, 'guest-wifi', 'team-colors', 'who-has']);
  await page.goto('./#/missions/reach-home');
  await dismissRewards(page);
  await device(page, 'Your Laptop').click();
  await page.getByRole('button', { name: /Advanced: VPN/ }).click();
  await page.getByRole('button', { name: 'Home VPN', exact: true }).click();
  await expect(page.getByText(/Using the VPN/)).toBeVisible();
});

test('Who Has? waits for the arp output, then lets you stay and go on later', async ({ page }) => {
  test.setTimeout(90_000);
  await progress(page, [...CHAPTER_2, 'guest-wifi', 'team-colors']);
  await page.goto('./#/missions/who-has');
  await dismissRewards(page);
  await page.getByRole('button', { name: 'Helpers' }).click();
  await device(page, 'Computer').click();
  await page.getByRole('button', { name: 'Print', exact: true }).click();
  await page.getByRole('button', { name: 'Printer', exact: true }).first().click();
  await page.getByRole('button', { name: 'Cool!' }).click({ timeout: 30_000 });
  // New badges (Neighbour Finder) pop up once the printout is closed.
  await page.waitForTimeout(2000);
  await dismissRewards(page);
  // Pip kept every message from that trip.
  await expect(page.getByRole('button', { name: 'Previous message' })).toBeEnabled();
  await page.getByRole('button', { name: 'Previous message' }).click();
  await expect(page.getByRole('button', { name: 'Next message' })).toBeEnabled();

  await page.getByRole('button', { name: 'Terminal' }).click();
  const terminal = page.getByRole('dialog', { name: 'Terminal' });
  await terminal.getByRole('button', { name: 'arp' }).click();
  await terminal.getByRole('button', { name: 'Computer' }).click();
  await terminal.getByRole('button', { name: /Run/ }).click();
  await expect(terminal.getByText(/knows these neighbours/)).toBeVisible();
  // The card waits so the output can be read first.
  const card = page.getByRole('dialog', { name: 'Mission complete' });
  await page.waitForTimeout(2000);
  await expect(card).toBeHidden();
  await page.getByRole('button', { name: 'Stay here' }).click({ timeout: 10_000 });
  await expect(card).toBeHidden();
  await expect(terminal.getByText(/knows these neighbours/)).toBeVisible();
  await page.getByRole('button', { name: /Next mission/ }).click();
  await expect(page).toHaveURL(/#\/missions\/reach-home/);
});

test('the top bar keeps the music button on every screen size', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('button', { name: /Turn music/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Turn sounds/ })).toBeVisible();
});

test('About shows who made it and where the code lives', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'About', exact: true }).click();
  await expect(page.getByRole('button', { name: 'TroyStoryGames' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'See the code on GitHub' })).toBeVisible();
  await expect(page.getByText(/Version \d+\.\d+\.\d+/)).toBeVisible();
});

test('an Install button appears when the browser offers installing', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('button', { name: /Install app/ })).toHaveCount(0);
  await page.evaluate(() => {
    const offer = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: async () => {},
      userChoice: Promise.resolve({ outcome: 'dismissed' }),
    });
    window.dispatchEvent(offer);
  });
  await expect(page.getByRole('button', { name: /Install app/ })).toBeVisible();
});
