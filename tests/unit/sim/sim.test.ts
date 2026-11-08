import { describe, expect, it } from 'vitest';
import { connect, sendPacket, Topology, type Journey } from '@/core/sim';
import { homeNetwork, NetBuilder } from './helpers';

const visited = (j: Journey) =>
  j.steps.flatMap((s) => s.moves.filter((m) => m.fate !== 'ignored').map((m) => m.to));

describe('local networks', () => {
  it('lets two cabled computers talk with self-made addresses', () => {
    const net = new NetBuilder().add('computer', 'A').add('computer', 'B').link('A', 'B');
    const topo = new Topology(net.network);
    expect(topo.address('A').source).toBe('self');
    const j = sendPacket(topo, 'A', 'message', 'B');
    expect(j.outcome).toBe('delivered');
    expect(visited(j)).toEqual(['B']);
  });

  it('fails when nothing is plugged in', () => {
    const net = new NetBuilder().add('computer', 'A').add('computer', 'B');
    const j = sendPacket(new Topology(net.network), 'A', 'ping', 'B');
    expect(j.outcome).toBe('failed');
    expect(j.message).toMatch(/isn't connected/);
  });

  it('hubs shout to everyone, switches only to the right one', () => {
    const build = (kind: 'hub' | 'switch') =>
      new NetBuilder()
        .add(kind, 'X')
        .add('computer', 'A')
        .add('computer', 'B')
        .add('computer', 'C')
        .link('A', 'X')
        .link('B', 'X')
        .link('C', 'X');
    const viaHub = sendPacket(new Topology(build('hub').network), 'A', 'message', 'B');
    const ignored = viaHub.steps.flatMap((s) => s.moves.filter((m) => m.fate === 'ignored').map((m) => m.to));
    expect(ignored).toEqual(['C']);
    const viaSwitch = sendPacket(new Topology(build('switch').network), 'A', 'message', 'B');
    expect(viaSwitch.steps.flatMap((s) => s.moves).every((m) => m.fate !== 'ignored')).toBe(true);
    expect(viaSwitch.outcome).toBe('delivered');
  });

  it('respects socket limits', () => {
    const net = new NetBuilder()
      .add('computer', 'A')
      .add('computer', 'B')
      .add('computer', 'C')
      .link('A', 'B');
    const result = connect(net.network, 'A', 'C');
    expect(result.ok).toBe(false);
  });

  it('switched-off devices break the path', () => {
    const net = new NetBuilder()
      .add('switch', 'S')
      .add('computer', 'A')
      .add('computer', 'B')
      .link('A', 'S')
      .link('B', 'S')
      .set('S', { powered: false });
    expect(sendPacket(new Topology(net.network), 'A', 'ping', 'B').outcome).toBe('failed');
  });
});

describe('routers and WiFi', () => {
  it('hands out addresses with DHCP', () => {
    const topo = new Topology(homeNetwork().network);
    expect(topo.address('PC')).toMatchObject({ ip: '192.168.1.10', source: 'dhcp', gatewayId: 'Router' });
    expect(topo.address('Laptop').ip).toBe('192.168.1.11');
  });

  it('joins WiFi only with the right password and in range', () => {
    const ok = new Topology(homeNetwork().network);
    expect(ok.wifiStatus('Laptop').state).toBe('connected');

    const wrong = new Topology(
      homeNetwork().set('Laptop', { wifi: { ssid: 'Treehouse', password: 'nope' } }).network,
    );
    expect(wrong.wifiStatus('Laptop').state).toBe('wrongPassword');
    expect(sendPacket(wrong, 'Laptop', 'video').message).toMatch(/Wrong WiFi password/);

    const far = new Topology(homeNetwork().set('Laptop', { x: 5000 }).network);
    expect(far.wifiStatus('Laptop').state).toBe('outOfRange');
  });

  it('wired and WiFi devices on the same router can talk', () => {
    const net = homeNetwork().add('printer', 'Printer').link('Printer', 'Router');
    const j = sendPacket(new Topology(net.network), 'Laptop', 'print', 'Printer');
    expect(j.outcome).toBe('delivered');
    expect(visited(j)).toEqual(['Router', 'Printer']);
    expect(j.steps[0].moves[0].via).toBe('wifi');
  });

  it('reaches Internet servers through the router, with a DNS lookup', () => {
    const j = sendPacket(new Topology(homeNetwork().network), 'Laptop', 'video');
    expect(j.outcome).toBe('delivered');
    expect(visited(j)).toEqual(['Router', 'Internet', 'Videos']);
    expect(j.steps.some((s) => s.note?.includes('videos.fun'))).toBe(true);
    expect(j.replySteps).toHaveLength(3);
  });

  it('explains when the router has no Internet', () => {
    const net = homeNetwork();
    net.network = {
      ...net.network,
      links: net.network.links.filter((l) => !(l.a === 'Router' && l.b === 'Internet')),
    };
    const j = sendPacket(new Topology(net.network), 'PC', 'game');
    expect(j.outcome).toBe('failed');
    expect(j.at).toBe('Router');
    expect(j.steps).toHaveLength(1);
  });

  it('needs a server to exist', () => {
    const net = new NetBuilder()
      .add('router', 'R')
      .add('computer', 'PC')
      .add('internet', 'I')
      .link('PC', 'R')
      .link('R', 'I');
    expect(sendPacket(new Topology(net.network), 'PC', 'video').message).toMatch(/no Video Server/);
  });

  it('static addresses must match the router neighbourhood', () => {
    const bad = homeNetwork().set('PC', { staticIp: '10.0.0.5' });
    const j = sendPacket(new Topology(bad.network), 'PC', 'web');
    expect(j.outcome).toBe('failed');
    expect(j.message).toMatch(/neighbourhood/);
    const good = homeNetwork().set('PC', { staticIp: '192.168.1.50' });
    expect(sendPacket(new Topology(good.network), 'PC', 'web').outcome).toBe('delivered');
  });

  it('without DHCP devices only get self-made addresses', () => {
    const net = homeNetwork().set('Router', {
      router: { wifiOn: true, ssid: 'Treehouse', password: 'pizza123', dhcp: false },
    });
    const topo = new Topology(net.network);
    expect(topo.address('PC').source).toBe('self');
    expect(sendPacket(topo, 'PC', 'video').message).toMatch(/DHCP/);
  });

  it("can't reach devices inside someone else's home", () => {
    const net = homeNetwork()
      .add('router', 'Router2')
      .add('computer', 'PC2')
      .link('PC2', 'Router2')
      .link('Router2', 'Internet');
    const j = sendPacket(new Topology(net.network), 'PC', 'ping', 'PC2');
    expect(j.outcome).toBe('failed');
    expect(j.message).toMatch(/strangers/);
  });
});

describe('firewalls', () => {
  const guarded = () =>
    new NetBuilder()
      .add('router', 'Router')
      .add('computer', 'PC')
      .add('firewall', 'Wall')
      .add('internet', 'Internet')
      .add('videoServer', 'Videos')
      .add('gameServer', 'Games')
      .link('PC', 'Router')
      .link('Router', 'Wall')
      .link('Wall', 'Internet')
      .link('Videos', 'Internet')
      .link('Games', 'Internet');

  it('lets traffic through by default', () => {
    expect(sendPacket(new Topology(guarded().network), 'PC', 'game').outcome).toBe('delivered');
  });

  it('blocks chosen apps but not others', () => {
    const net = guarded().set('Wall', { firewall: { blockedApps: ['game'], blockedDevices: [] } });
    const topo = new Topology(net.network);
    const game = sendPacket(topo, 'PC', 'game');
    expect(game.outcome).toBe('blocked');
    expect(game.at).toBe('Wall');
    expect(game.steps.at(-1)!.moves[0].fate).toBe('blocked');
    expect(sendPacket(topo, 'PC', 'video').outcome).toBe('delivered');
  });

  it('blocks chosen devices', () => {
    const net = guarded().set('Wall', { firewall: { blockedApps: [], blockedDevices: ['PC'] } });
    expect(sendPacket(new Topology(net.network), 'PC', 'video').outcome).toBe('blocked');
  });
});

describe('saving and sharing', () => {
  it('round-trips a network through the compact format', async () => {
    const { exportNetwork, importNetwork } = await import('@/core/sim');
    const original = homeNetwork()
      .add('firewall', 'Wall', { firewall: { blockedApps: ['game'], blockedDevices: ['PC'] } })
      .set('PC', { staticIp: '192.168.1.77', powered: false }).network;
    const restored = importNetwork(JSON.parse(JSON.stringify(exportNetwork(original))))!;
    expect(restored.devices).toHaveLength(original.devices.length);
    expect(restored.links).toHaveLength(original.links.length);
    const pc = restored.devices.find((d) => d.name === 'PC')!;
    expect(pc).toMatchObject({ staticIp: '192.168.1.77', powered: false });
    const wall = restored.devices.find((d) => d.kind === 'firewall')!;
    expect(wall.firewall!.blockedDevices).toEqual([pc.id]);
    expect(restored.devices.find((d) => d.kind === 'laptop')!.wifi).toEqual({
      ssid: 'Treehouse',
      password: 'pizza123',
    });
  });

  it('rejects junk', async () => {
    const { importNetwork } = await import('@/core/sim');
    expect(importNetwork({ hello: 1 })).toBeNull();
    expect(importNetwork({ v: 1, d: [{ i: 'x', k: 'spaceship' }], l: [] })).toBeNull();
  });
});
