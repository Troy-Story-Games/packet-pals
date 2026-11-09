import { describe, expect, it } from 'vitest';
import { exportNetwork, importNetwork, runCommand, sendPacket, Topology, type Journey } from '@/core/sim';
import { homeNetwork, NetBuilder } from './helpers';

const stops = (j: Journey) =>
  j.steps.flatMap((s) => s.moves.filter((m) => m.fate !== 'ignored').map((m) => m.to));

/** Two homes on the Internet. Home B has a firewall in front of its router. */
function twoHomes() {
  return homeNetwork()
    .add('router', 'RouterB', { x: 2000, router: { wifiOn: false, ssid: '', password: '', dhcp: true } })
    .add('firewall', 'WallB')
    .add('computer', 'PCB')
    .add('console', 'ConsoleB')
    .link('PCB', 'RouterB')
    .link('ConsoleB', 'RouterB')
    .link('RouterB', 'WallB')
    .link('WallB', 'Internet');
}

describe('phones and cell towers', () => {
  const withTower = (phoneX: number) =>
    homeNetwork()
      .add('cellTower', 'Tower', { x: 0, y: 0 })
      .add('phone', 'Phone', { x: phoneX, y: 0, network: 'cell' })
      .link('Tower', 'Internet');

  it('uses mobile data within range and gets a carrier address', () => {
    const topo = new Topology(withTower(500).network);
    expect(topo.cellStatus('Phone').state).toBe('connected');
    expect(topo.address('Phone')).toMatchObject({ source: 'carrier', gatewayId: 'Tower' });
    const j = sendPacket(topo, 'Phone', 'video');
    expect(j.outcome).toBe('delivered');
    expect(stops(j)).toEqual(['Tower', 'Internet', 'Videos']);
    expect(j.steps[0].moves[0].via).toBe('cell');
  });

  it('loses signal when too far away', () => {
    const j = sendPacket(new Topology(withTower(5000).network), 'Phone', 'video');
    expect(j.outcome).toBe('failed');
    expect(j.message).toMatch(/too far from the cell tower/);
  });

  it('can text another phone but strangers cannot reach it', () => {
    const net = withTower(300).add('phone', 'Phone2', { x: 100, y: 50, network: 'cell' });
    const topo = new Topology(net.network);
    expect(sendPacket(topo, 'Phone', 'message', 'Phone2').outcome).toBe('delivered');
    expect(sendPacket(topo, 'PC', 'message', 'Phone').message).toMatch(/phone company keeps strangers out/);
  });
});

describe('DNS servers', () => {
  it('asks an Internet DNS server first, with visible lookup steps', () => {
    const net = homeNetwork().add('dnsServer', 'DNS').link('DNS', 'Internet');
    const j = sendPacket(new Topology(net.network), 'PC', 'web');
    expect(j.outcome).toBe('delivered');
    const lookups = j.steps.filter((s) => s.packet === 'lookup');
    expect(lookups.map((s) => s.moves[0].to)).toEqual([
      'Router',
      'Internet',
      'DNS',
      'Internet',
      'Router',
      'PC',
    ]);
    expect(j.name).toBe('kidsweb.fun');
  });

  it('fails by name when the DNS server is switched off', () => {
    const net = homeNetwork().add('dnsServer', 'DNS', { powered: false }).link('DNS', 'Internet');
    const j = sendPacket(new Topology(net.network), 'PC', 'web');
    expect(j.outcome).toBe('failed');
    expect(j.message).toMatch(/phone book .* is switched off/);
  });

  it('knows custom names at home, and asks the Internet for the rest', () => {
    const net = homeNetwork()
      .add('switch', 'Switch')
      .add('webServer', 'MySite')
      .add('dnsServer', 'HomeDNS', { dns: { entries: [{ name: 'mysite.home', deviceId: 'MySite' }] } })
      .link('Switch', 'Router')
      .link('MySite', 'Switch')
      .link('HomeDNS', 'Switch');
    const topo = new Topology(net.network);
    expect(topo.address('MySite').source).toBe('dhcp');

    const mine = sendPacket(topo, 'Laptop', 'web', 'mysite.home');
    expect(mine.outcome).toBe('delivered');
    expect(mine.to).toBe('MySite');
    expect(mine.steps.filter((s) => s.packet !== 'lookup').map((s) => s.moves[0].to)).toEqual([
      'Router',
      'Switch',
      'MySite',
    ]);

    const videos = sendPacket(topo, 'Laptop', 'video');
    expect(videos.outcome).toBe('delivered');
    expect(videos.steps.some((s) => s.note?.includes('asked the Internet'))).toBe(true);

    expect(sendPacket(topo, 'Laptop', 'web', 'nope.home').message).toMatch(/No one knows/);
  });
});

describe('front doors (port forwarding)', () => {
  it('keeps strangers out and explains which door to open', () => {
    const j = sendPacket(new Topology(twoHomes().network), 'PC', 'message', 'PCB');
    expect(j.outcome).toBe('failed');
    expect(j.at).toBe('WallB');
    expect(j.message).toMatch(/open door 5222/);
  });

  it('lets the right app in through an open door', () => {
    const net = twoHomes().set('WallB', {
      firewall: { blockedApps: [], blockedDevices: [], doors: [{ app: 'chat', deviceId: 'PCB' }] },
    });
    const topo = new Topology(net.network);
    const j = sendPacket(topo, 'PC', 'message', 'PCB');
    expect(j.outcome).toBe('delivered');
    expect(stops(j)).toEqual(['Router', 'Internet', 'WallB', 'RouterB', 'PCB']);
    // A chat door doesn't let games in.
    expect(sendPacket(topo, 'PC', 'game', 'ConsoleB').outcome).toBe('failed');
  });

  it('can host a game for a friend', () => {
    const net = twoHomes().set('WallB', {
      firewall: { blockedApps: [], blockedDevices: [], doors: [{ app: 'game', deviceId: 'ConsoleB' }] },
    });
    const j = sendPacket(new Topology(net.network), 'PC', 'game', 'ConsoleB');
    expect(j.outcome).toBe('delivered');
    expect(j.message).toMatch(/joined ConsoleB's game/);
  });

  it('gives home routers a public front door address', () => {
    const topo = new Topology(twoHomes().network);
    expect(topo.frontDoor('Router')).toMatch(/^198\.51\.100\./);
    expect(topo.frontDoor('RouterB')).toMatch(/^198\.51\.100\./);
  });
});

describe('terminal commands', () => {
  it('traceroute lists the stops that answer', () => {
    const { lines } = runCommand(new Topology(homeNetwork().network), 'traceroute', 'PC', 'Videos');
    expect(lines.join('\n')).toMatch(/1 {2}Router .*\n {2}2 {2}The Internet|1 {2}Router/);
    expect(lines.at(-1)).toMatch(/Arrived/);
  });

  it('traceroute shows where it gets stuck', () => {
    const net = homeNetwork().add('switch', 'S', { powered: false });
    net.network = {
      ...net.network,
      links: net.network.links.filter((l) => !(l.a === 'Router' && l.b === 'Internet')),
    };
    const { lines } = runCommand(new Topology(net.network), 'traceroute', 'PC', 'Videos');
    expect(lines.at(-1)).toMatch(/\* \* \*/);
  });

  it('nslookup and ipconfig explain addresses', () => {
    const topo = new Topology(homeNetwork().network);
    expect(runCommand(topo, 'nslookup', 'PC', 'videos.fun').lines[1]).toMatch(
      /videos\.fun lives at 203\.0\.113\./,
    );
    expect(runCommand(topo, 'ipconfig', 'PC').lines.join('\n')).toMatch(/192\.168\.1\.10/);
    expect(runCommand(topo, 'ping', 'PC', 'Laptop').lines[1]).toMatch(/Pong/);
  });
});

describe('smart devices', () => {
  it('cameras can be watched live from a phone at home', () => {
    const net = homeNetwork()
      .add('camera', 'Cam', { x: 50, wifi: { ssid: 'Treehouse', password: 'pizza123' } })
      .add('phone', 'Phone', { x: 80, network: 'wifi', wifi: { ssid: 'Treehouse', password: 'pizza123' } });
    const j = sendPacket(new Topology(net.network), 'Phone', 'video', 'Cam');
    expect(j.outcome).toBe('delivered');
    expect(j.message).toMatch(/Live picture from Cam/);
  });
});

describe('saving new things', () => {
  it('round-trips doors, cell phones, DNS names and buildings', () => {
    const net = twoHomes()
      .set('WallB', {
        firewall: { blockedApps: [], blockedDevices: [], doors: [{ app: 'game', deviceId: 'ConsoleB' }] },
      })
      .add('phone', 'P', { network: 'cell' })
      .add('dnsServer', 'D', { dns: { entries: [{ name: 'my.home', deviceId: 'PCB' }] } });
    net.network.decorations = [
      {
        id: 'b',
        template: 'house2',
        x: 10,
        y: 20,
        colors: { walls: '#fff', roof: '#f00', floors: '#ccc', trim: '#000' },
        label: 'Home',
      },
    ];
    const back = importNetwork(JSON.parse(JSON.stringify(exportNetwork(net.network))))!;
    const byName = (n: string) => back.devices.find((d) => d.name === n)!;
    expect(byName('WallB').firewall!.doors).toEqual([{ app: 'game', deviceId: byName('ConsoleB').id }]);
    expect(byName('P').network).toBe('cell');
    expect(byName('D').dns!.entries).toEqual([{ name: 'my.home', deviceId: byName('PCB').id }]);
    expect(back.decorations![0]).toMatchObject({
      template: 'house2',
      label: 'Home',
      colors: { roof: '#f00' },
    });
  });
});

void NetBuilder;
