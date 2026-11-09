import { describe, expect, it } from 'vitest';
import {
  connect,
  createDevice,
  runCommand,
  sendPacket,
  Topology,
  type Action,
  type Command,
  type Device,
  type Journey,
  type Network,
} from '@/core/sim';
import { MISSIONS, missionStars } from '@/game/missions/catalogue';
import type { CommandRun, HistoryEntry, Mission, MissionContext } from '@/game/missions/types';

/** Plays a mission like a kid would, using only editor-level operations. */
class Player {
  network: Network;
  history: HistoryEntry[] = [];
  commands: CommandRun[] = [];
  /** ARP memory while the 👀 Helpers are switched on. */
  arp: Record<string, string[]> | undefined;

  constructor(readonly mission: Mission) {
    this.network = mission.setup();
  }

  link(a: string, b: string): this {
    const r = connect(this.network, a, b);
    if (!r.ok) throw new Error(r.reason);
    this.network = r.network;
    return this;
  }

  add(kind: Device['kind'], id: string, x = 0, y = 0): this {
    this.network = {
      ...this.network,
      devices: [...this.network.devices, { ...createDevice(kind, x, y, this.network.devices), id }],
    };
    return this;
  }

  remove(id: string): this {
    this.network = {
      devices: this.network.devices.filter((d) => d.id !== id),
      links: this.network.links.filter((l) => l.a !== id && l.b !== id),
    };
    return this;
  }

  update(id: string, patch: Partial<Device>): this {
    this.network = {
      ...this.network,
      devices: this.network.devices.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    };
    return this;
  }

  send(from: string, action: Action, to?: string): this {
    const topo = new Topology(this.network);
    this.record(topo, sendPacket(topo, from, action, to, this.options()));
    return this;
  }

  /** Runs a terminal command, the way the Terminal panel does. */
  command(cmd: Command, from: string, target?: string): this {
    const topo = new Topology(this.network);
    const { journey } = runCommand(topo, cmd, from, target, this.options());
    this.commands.push({ command: cmd, from, at: this.history.length });
    if (journey) this.record(topo, journey, cmd);
    return this;
  }

  /** Switches on the 👀 Helpers, like the toolbar button. */
  helpers(): this {
    this.arp = {};
    return this;
  }

  private options() {
    return this.arp ? { arp: this.arp } : {};
  }

  private record(topo: Topology, journey: Journey, command?: Command): void {
    for (const { deviceId, ip } of journey.learned ?? []) {
      if (this.arp) this.arp[deviceId] = [...(this.arp[deviceId] ?? []), ip];
    }
    const ids = [
      journey.from,
      ...journey.steps.flatMap((s) => s.moves.filter((m) => m.fate !== 'ignored').map((m) => m.to)),
    ];
    this.history.push({ journey, kindsOnPath: ids.map((id) => topo.device(id).kind), command });
  }

  /** Puts the cable between `a` and `b` on a team (VLAN), like tapping a switch socket. */
  team(a: string, b: string, vlan: number): this {
    this.network = {
      ...this.network,
      links: this.network.links.map((l) =>
        (l.a === a && l.b === b) || (l.a === b && l.b === a) ? { ...l, vlan } : l,
      ),
    };
    return this;
  }

  context(): MissionContext {
    return {
      network: this.network,
      topo: new Topology(this.network),
      history: this.history,
      commands: this.commands,
    };
  }

  done(): boolean {
    return this.mission.check(this.context());
  }

  /** The nudge Pip would give after the latest packet. */
  nudge(): string | undefined {
    return this.mission.nudge?.(this.history.at(-1)!, this.history, this.context());
  }
}

const SOLUTIONS: Record<string, (p: Player) => void> = {
  'hello-cable': (p) => p.link('amy', 'ben').send('amy', 'message', 'ben'),
  'ping-pong': (p) => p.link('c1', 'sw').link('c2', 'sw').link('c3', 'sw').send('c1', 'ping', 'c3'),
  'hub-vs-switch': (p) =>
    p
      .send('amy', 'message', 'ben')
      .remove('hub')
      .add('switch', 'sw')
      .link('amy', 'sw')
      .link('ben', 'sw')
      .link('cleo', 'sw')
      .send('amy', 'message', 'ben'),
  'home-router': (p) => p.link('pc', 'router').send('pc', 'ping', 'router'),
  'make-wifi': (p) =>
    p
      .update('router', { router: { wifiOn: true, ssid: 'Treehouse', password: 'abc', dhcp: true } })
      .update('laptop', { wifi: { ssid: 'Treehouse', password: 'abc' } })
      .send('laptop', 'ping', 'router'),
  'wrong-password': (p) =>
    p.update('tablet', { wifi: { ssid: 'Treehouse', password: 'pizza123' } }).send('tablet', 'message', 'pc'),
  'hello-internet': (p) => p.link('router', 'internet').send('laptop', 'video'),
  'too-far': (p) => p.update('tablet', { x: 300, y: 300 }).send('tablet', 'game'),
  bedtime: (p) =>
    p
      .update('firewall', { firewall: { blockedApps: ['game'], blockedDevices: [] } })
      .send('console', 'game')
      .send('laptop', 'video'),
  'fix-address': (p) => p.update('pc', { staticIp: undefined }).send('pc', 'web'),
  'printer-party': (p) => p.link('printer', 'sw').send('laptop', 'print', 'printer'),
  'phone-home': (p) => p.update('phone', { network: 'cell' }).send('phone', 'video'),
  'phone-book': (p) => p.send('laptop', 'web').update('dns', { powered: true }).send('laptop', 'web'),
  'network-detective': (p) =>
    p
      .command('traceroute', 'pc', 'videos.fun')
      .update('wall', { powered: true })
      .command('ping', 'pc', 'videos.fun'),
  'my-website': (p) =>
    p
      .update('homedns', { dns: { entries: [{ name: 'mysite.home', deviceId: 'mysite' }] } })
      .send('laptop', 'web', 'mysite.home'),
  'door-numbers': (p) =>
    p
      .send('friend', 'message', 'pc')
      .update('wall', {
        firewall: { blockedApps: [], blockedDevices: [], doors: [{ app: 'chat', deviceId: 'pc' }] },
      })
      .send('friend', 'message', 'pc'),
  'game-night': (p) =>
    p
      .update('wall', {
        firewall: { blockedApps: [], blockedDevices: [], doors: [{ app: 'game', deviceId: 'myconsole' }] },
      })
      .send('friendconsole', 'game', 'myconsole'),
  'guest-wifi': (p) =>
    p
      .update('router', {
        router: {
          wifiOn: true,
          ssid: 'Treehouse',
          password: 'pizza123',
          dhcp: true,
          guest: { on: true, ssid: 'Visitors', password: 'welcome' },
        },
      })
      .update('visitor', { wifi: { ssid: 'Visitors', password: 'welcome' } })
      .send('visitor', 'video')
      .send('visitor', 'print', 'printer'),
  'team-colors': (p) =>
    p.team('parents', 'switch', 2).send('kids', 'message', 'parents').send('parents', 'web'),
  'who-has': (p) => p.helpers().send('pc', 'print', 'printer').command('arp', 'pc'),
  'reach-home': (p) =>
    p
      .update('wall', {
        firewall: { blockedApps: [], blockedDevices: [], doors: [{ app: 'vpn', deviceId: 'homevpn' }] },
      })
      .update('laptop', { vpn: 'homevpn' })
      .send('laptop', 'print', 'printer'),
  'hidden-address': (p) =>
    p.send('laptop', 'web').update('laptop', { vpn: 'cloudvpn' }).send('laptop', 'web'),
  'tunnel-trick': (p) =>
    p
      .update('pc', { vpn: 'cloudvpn' })
      .send('pc', 'game')
      .update('wall', { firewall: { blockedApps: ['game', 'vpn'], blockedDevices: [], doors: [] } })
      .send('pc', 'game'),
  'packet-race': (p) =>
    p
      .add('computer', 'pc')
      .add('router', 'r')
      .add('internet', 'i')
      .add('videoServer', 'v')
      .link('pc', 'r')
      .link('r', 'i')
      .link('v', 'i')
      .send('pc', 'video'),
};

describe('missions', () => {
  it.each(MISSIONS.map((m) => [m.id, m] as const))(
    '%s is not already solved at the start',
    (_id, mission) => {
      expect(new Player(mission).done()).toBe(false);
    },
  );

  it.each(MISSIONS.map((m) => [m.id, m] as const))('%s can be solved', (id, mission) => {
    const player = new Player(mission);
    SOLUTIONS[id](player);
    expect(player.done()).toBe(true);
  });

  it('has a solution for every mission', () => {
    expect(Object.keys(SOLUTIONS).sort()).toEqual(MISSIONS.map((m) => m.id).sort());
  });

  it('gives stars for hints, mistakes and speed', () => {
    const normal = MISSIONS[0];
    expect(missionStars(normal, 0, 0, 999)).toBe(3);
    expect(missionStars(normal, 1, 0, 0)).toBe(2);
    expect(missionStars(normal, 2, 0, 0)).toBe(1);
    const timed = MISSIONS.find((m) => m.timeLimit)!;
    expect(missionStars(timed, 2, 9, 30)).toBe(3);
    expect(missionStars(timed, 0, 0, 170)).toBe(1);
  });
});

describe('mission nudges', () => {
  it('Network Detective nudges a ping sent outside the Terminal', () => {
    const mission = MISSIONS.find((m) => m.id === 'network-detective')!;
    const p = new Player(mission).update('wall', { powered: true }).send('pc', 'ping', 'videos.fun');
    expect(p.done()).toBe(false);
    expect(p.nudge()).toMatch(/Terminal/);
  });

  it('Door Numbers nudges a message sent the wrong way round', () => {
    const mission = MISSIONS.find((m) => m.id === 'door-numbers')!;
    const p = new Player(mission).send('pc', 'message', 'friend');
    expect(p.nudge()).toMatch(/Other way round/);
  });

  const play = (id: string) => new Player(MISSIONS.find((m) => m.id === id)!);

  it('Guest WiFi nudges a visitor using the family WiFi', () => {
    const p = play('guest-wifi')
      .update('visitor', { wifi: { ssid: 'Treehouse', password: 'pizza123' } })
      .send('visitor', 'print', 'printer');
    expect(p.done()).toBe(false);
    expect(p.nudge()).toMatch(/printed on YOUR printer/);
  });

  it('Team Colours nudges when the teams are still the same', () => {
    expect(play('team-colors').send('kids', 'message', 'parents').nudge()).toMatch(/same team/);
  });

  it('Who Has? only counts arp after a visible shout', () => {
    const early = play('who-has').command('arp', 'pc').helpers().send('pc', 'print', 'printer');
    expect(early.done()).toBe(false);
    expect(early.nudge()).toMatch(/run arp/);
    expect(play('who-has').send('pc', 'print', 'printer').nudge()).toMatch(/Helpers/);
  });

  it('Secret Tunnel Home warns about opening the print door instead', () => {
    const p = play('reach-home')
      .update('wall', {
        firewall: { blockedApps: [], blockedDevices: [], doors: [{ app: 'print', deviceId: 'printer' }] },
      })
      .send('laptop', 'print', 'printer');
    expect(p.history[0].journey.outcome).toBe('delivered');
    expect(p.done()).toBe(false);
    expect(p.nudge()).toMatch(/ANYONE on the Internet/);
    expect(
      play('reach-home').update('laptop', { vpn: 'homevpn' }).send('laptop', 'print', 'printer').nudge(),
    ).toMatch(/Open the VPNs door/);
  });

  it('Tunnel Trick nudges the boss step after sneaking through', () => {
    const p = play('tunnel-trick').update('pc', { vpn: 'cloudvpn' }).send('pc', 'game');
    expect(p.done()).toBe(false);
    expect(p.nudge()).toMatch(/block VPNs/);
  });
});
