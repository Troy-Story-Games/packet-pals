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
import type { HistoryEntry, Mission } from '@/game/missions/types';

/** Plays a mission like a kid would, using only editor-level operations. */
class Player {
  network: Network;
  history: HistoryEntry[] = [];

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
    const journey = sendPacket(topo, from, action, to);
    const ids = [
      journey.from,
      ...journey.steps.flatMap((s) => s.moves.filter((m) => m.fate !== 'ignored').map((m) => m.to)),
    ];
    this.history.push({ journey, kindsOnPath: ids.map((id) => topo.device(id).kind) });
    return this;
  }

  /** Runs a terminal command, the way the Terminal panel does. */
  command(cmd: Command, from: string, target?: string): this {
    const topo = new Topology(this.network);
    const { journey } = runCommand(topo, cmd, from, target);
    if (journey) this.record(topo, journey, cmd);
    return this;
  }

  private record(topo: Topology, journey: Journey, command?: Command): void {
    const ids = [
      journey.from,
      ...journey.steps.flatMap((s) => s.moves.filter((m) => m.fate !== 'ignored').map((m) => m.to)),
    ];
    this.history.push({ journey, kindsOnPath: ids.map((id) => topo.device(id).kind), command });
  }

  done(): boolean {
    return this.mission.check({
      network: this.network,
      topo: new Topology(this.network),
      history: this.history,
    });
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
    expect(mission.nudge?.(p.history.at(-1)!, p.history)).toMatch(/Terminal/);
  });

  it('Door Numbers nudges a message sent the wrong way round', () => {
    const mission = MISSIONS.find((m) => m.id === 'door-numbers')!;
    const p = new Player(mission).send('pc', 'message', 'friend');
    expect(mission.nudge?.(p.history.at(-1)!, p.history)).toMatch(/Other way round/);
  });
});
