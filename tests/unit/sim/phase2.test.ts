import { describe, expect, it } from 'vitest';
import {
  exportNetwork,
  importNetwork,
  macOf,
  runCommand,
  sendPacket,
  Topology,
  type Journey,
} from '@/core/sim';
import { homeNetwork, NetBuilder } from './helpers';

const stops = (j: Journey) =>
  j.steps.flatMap((s) => s.moves.filter((m) => m.fate !== 'ignored').map((m) => m.to));

/** Puts the cable between `a` and `b` on a team (VLAN). */
function team(net: NetBuilder, a: string, b: string, vlan: number): NetBuilder {
  net.network = {
    ...net.network,
    links: net.network.links.map((l) =>
      (l.a === a && l.b === b) || (l.a === b && l.b === a) ? { ...l, vlan } : l,
    ),
  };
  return net;
}

/** Home with a switch: Kids PC on Blue, Parents PC on Red, plus a printer on Blue. */
function teams() {
  const net = homeNetwork()
    .add('switch', 'Switch')
    .add('computer', 'Kids')
    .add('computer', 'Parents')
    .add('printer', 'Printer')
    .link('Switch', 'Router')
    .link('Kids', 'Switch')
    .link('Parents', 'Switch')
    .link('Printer', 'Switch');
  return team(net, 'Parents', 'Switch', 2);
}

describe('VLANs (teams)', () => {
  it('gives each team its own neighbourhood', () => {
    const topo = new Topology(teams().network);
    expect(topo.address('Kids')).toMatchObject({ ip: expect.stringMatching(/^192\.168\.1\./), vlan: 1 });
    expect(topo.address('Parents')).toMatchObject({ ip: expect.stringMatching(/^192\.168\.12\./), vlan: 2 });
  });

  it('keeps different teams apart, but both still reach the Internet', () => {
    const topo = new Topology(teams().network);
    const j = sendPacket(topo, 'Kids', 'message', 'Parents');
    expect(j.outcome).toBe('failed');
    expect(j.message).toMatch(/Blue team.*Red team.*keeps different teams/);
    expect(j.at).toBe('Router');
    expect(sendPacket(topo, 'Parents', 'video').outcome).toBe('delivered');
    expect(sendPacket(topo, 'Kids', 'print', 'Printer').outcome).toBe('delivered');
  });

  it('lets teams talk through the router when allowed', () => {
    const net = teams().set('Router', {
      router: { wifiOn: true, ssid: 'Treehouse', password: 'pizza123', dhcp: true, vlanRouting: true },
    });
    const j = sendPacket(new Topology(net.network), 'Kids', 'message', 'Parents');
    expect(j.outcome).toBe('delivered');
    expect(stops(j)).toEqual(['Switch', 'Router', 'Switch', 'Parents']);
  });

  it('a switch never mixes teams on its own', () => {
    // Two switches, Red sockets on both: the frame crosses the trunk between them.
    const net = teams().add('switch', 'Switch2').add('laptop', 'RedLaptop').link('Switch2', 'Switch');
    net.link('RedLaptop', 'Switch2');
    team(net, 'RedLaptop', 'Switch2', 2);
    const topo = new Topology(net.network);
    expect(sendPacket(topo, 'RedLaptop', 'message', 'Parents').outcome).toBe('delivered');
    expect(topo.localPath('RedLaptop', 'Kids')).toBeNull();
  });
});

describe('Guest WiFi', () => {
  const guests = () =>
    teams()
      .set('Router', {
        router: {
          wifiOn: true,
          ssid: 'Treehouse',
          password: 'pizza123',
          dhcp: true,
          vlanRouting: true,
          guest: { on: true, ssid: 'Visitors', password: 'hello' },
        },
      })
      .add('tablet', 'Guest', { x: 50, wifi: { ssid: 'Visitors', password: 'hello' } });

  it('joins the guest network and uses the Internet', () => {
    const topo = new Topology(guests().network);
    expect(topo.wifiStatus('Guest')).toMatchObject({ state: 'connected', guest: true });
    expect(topo.address('Guest').vlan).toBe(9);
    expect(sendPacket(topo, 'Guest', 'video').outcome).toBe('delivered');
  });

  it('keeps guests away from home devices, even when teams may talk', () => {
    const j = sendPacket(new Topology(guests().network), 'Guest', 'print', 'Printer');
    expect(j.outcome).toBe('failed');
    expect(j.message).toMatch(/keeps guests apart/);
  });

  it('is a separate network from the main WiFi', () => {
    const topo = new Topology(guests().network);
    expect(sendPacket(topo, 'Laptop', 'message', 'Guest').outcome).toBe('failed');
  });
});

describe('ARP (who has?)', () => {
  it('shouts to everyone on the switch, and only the owner answers', () => {
    const topo = new Topology(teams().network);
    const j = sendPacket(topo, 'Kids', 'print', 'Printer', { arp: {} });
    expect(j.outcome).toBe('delivered');
    const shout = j.steps.filter((s) => s.packet === 'arp');
    expect(shout[0].note).toMatch(/Who has 192\.168\.1\.\d+\? Tell 192\.168\.1\.\d+/);
    const reached = shout.flatMap((s) => s.moves.map((m) => `${m.to}:${m.fate}`));
    expect(reached).toContain('Printer:arrive');
    expect(reached).toContain('PC:ignored'); // through the router's own sockets
    // The Red team never hears a Blue shout.
    expect(reached.some((r) => r.startsWith('Parents'))).toBe(false);
    expect(
      shout.some((s) => s.note?.includes(`That's me! My hardware address (MAC) is ${macOf('Printer')}`)),
    ).toBe(true);
    expect(j.learned).toEqual([
      { deviceId: 'Kids', ip: topo.address('Printer').ip },
      { deviceId: 'Printer', ip: topo.address('Kids').ip },
    ]);
  });

  it('does not shout for a neighbour it already knows', () => {
    const topo = new Topology(teams().network);
    const j = sendPacket(topo, 'Kids', 'print', 'Printer', { arp: { Kids: [topo.address('Printer').ip!] } });
    expect(j.steps.some((s) => s.packet === 'arp')).toBe(false);
  });

  it('asks for the router when going to the Internet, and the arp command lists it', () => {
    const topo = new Topology(teams().network);
    const j = sendPacket(topo, 'Kids', 'video', undefined, { arp: {} });
    expect(j.steps[0].note).toMatch(/Who has 192\.168\.1\.1\?/);
    const lines = runCommand(topo, 'arp', 'Kids', undefined, { arp: { Kids: ['192.168.1.1'] } }).lines;
    expect(lines.join('\n')).toContain(`192.168.1.1`);
    expect(lines.join('\n')).toContain(macOf('Router'));
    expect(runCommand(topo, 'arp', 'Kids').lines[0]).toMatch(/hasn't met any neighbours/);
  });
});

/** Home (with firewall) + grandma's house + an Internet VPN server. */
function vpnWorld() {
  return new NetBuilder()
    .add('internet', 'Internet')
    .add('webServer', 'Web')
    .add('gameServer', 'Games')
    .add('vpnServer', 'CloudVPN')
    .add('router', 'Router', { router: { wifiOn: false, ssid: '', password: '', dhcp: true } })
    .add('firewall', 'Wall')
    .add('printer', 'Printer')
    .add('vpnServer', 'HomeVPN')
    .add('switch', 'Switch')
    .add('router', 'Grandma', { x: 3000, router: { wifiOn: false, ssid: '', password: '', dhcp: true } })
    .add('laptop', 'Laptop', { x: 3000 })
    .link('Web', 'Internet')
    .link('Games', 'Internet')
    .link('CloudVPN', 'Internet')
    .link('Switch', 'Router')
    .link('Printer', 'Switch')
    .link('HomeVPN', 'Switch')
    .link('Router', 'Wall')
    .link('Wall', 'Internet')
    .link('Laptop', 'Grandma')
    .link('Grandma', 'Internet');
}

describe('VPN', () => {
  it('cannot print home from away without a tunnel', () => {
    const j = sendPacket(new Topology(vpnWorld().network), 'Laptop', 'print', 'Printer');
    expect(j.outcome).toBe('failed');
  });

  it('needs a VPN door on the home firewall', () => {
    const net = vpnWorld().set('Laptop', { vpn: 'HomeVPN' });
    const j = sendPacket(new Topology(net.network), 'Laptop', 'print', 'Printer');
    expect(j.outcome).toBe('failed');
    expect(j.message).toMatch(/Can't reach the VPN server HomeVPN/);
  });

  it('tunnels home through the VPN door, then prints on the home network', () => {
    const net = vpnWorld()
      .set('Laptop', { vpn: 'HomeVPN' })
      .set('Wall', {
        firewall: { blockedApps: [], blockedDevices: [], doors: [{ app: 'vpn', deviceId: 'HomeVPN' }] },
      });
    const j = sendPacket(new Topology(net.network), 'Laptop', 'print', 'Printer');
    expect(j.outcome).toBe('delivered');
    const tunnel = j.steps.filter((s) => s.packet === 'tunnel');
    expect(tunnel.at(-1)!.moves[0].to).toBe('HomeVPN');
    expect(stops(j).slice(tunnel.length)).toEqual(['Switch', 'Printer']);
    expect(j.vpnId).toBe('HomeVPN');
  });

  it("makes websites see the VPN's address", () => {
    const net = vpnWorld().set('Laptop', { vpn: 'CloudVPN' });
    const topo = new Topology(net.network);
    const j = sendPacket(topo, 'Laptop', 'web');
    expect(j.outcome).toBe('delivered');
    expect(j.message).toContain(`saw the VPN's address (${topo.address('CloudVPN').ip})`);
    expect(stops(j)).toEqual(['Grandma', 'Internet', 'CloudVPN', 'Internet', 'Web']);
    // The reply comes back through the tunnel too.
    expect(j.replySteps.at(-1)!.packet).toBe('tunnel');
  });

  it('hides the app from a firewall, unless the firewall blocks VPNs', () => {
    const school = (blockedApps: Array<'game' | 'vpn'>) =>
      vpnWorld()
        .add('firewall', 'SchoolWall')
        .add('router', 'School', { x: 5000, router: { wifiOn: false, ssid: '', password: '', dhcp: true } })
        .add('computer', 'SchoolPC', { x: 5000 })
        .link('SchoolPC', 'School')
        .link('School', 'SchoolWall')
        .link('SchoolWall', 'Internet')
        .set('SchoolWall', { firewall: { blockedApps, blockedDevices: [], doors: [] } });

    expect(sendPacket(new Topology(school(['game']).network), 'SchoolPC', 'game').outcome).toBe('blocked');
    const sneaky = school(['game']).set('SchoolPC', { vpn: 'CloudVPN' });
    expect(sendPacket(new Topology(sneaky.network), 'SchoolPC', 'game').outcome).toBe('delivered');
    const strict = school(['game', 'vpn']).set('SchoolPC', { vpn: 'CloudVPN' });
    const j = sendPacket(new Topology(strict.network), 'SchoolPC', 'game');
    expect(j.outcome).toBe('blocked');
    expect(j.message).toMatch(/VPNs are blocked/);
  });

  it('fails clearly when the VPN server is off', () => {
    const net = vpnWorld().set('Laptop', { vpn: 'CloudVPN' }).set('CloudVPN', { powered: false });
    expect(sendPacket(new Topology(net.network), 'Laptop', 'web').message).toMatch(
      /VPN server .* switched off/,
    );
  });

  it('traceroute shows the tunnel as one hop', () => {
    const net = vpnWorld().set('Laptop', { vpn: 'CloudVPN' });
    const lines = runCommand(new Topology(net.network), 'traceroute', 'Laptop', 'Web').lines;
    expect(lines.slice(1, -1).map((l) => l.trim().split(/\s+/)[1])).toEqual(['CloudVPN', 'Internet', 'Web']);
  });
});

describe('saving Phase 2 settings', () => {
  it('round-trips teams, guest WiFi and VPN choice', () => {
    const net = teams()
      .set('Router', {
        router: {
          wifiOn: true,
          ssid: 'T',
          password: 'p',
          dhcp: true,
          vlanRouting: true,
          guest: { on: true, ssid: 'G', password: 'g' },
        },
      })
      .add('vpnServer', 'VPN')
      .set('Kids', { vpn: 'VPN' });
    const back = importNetwork(JSON.parse(JSON.stringify(exportNetwork(net.network))))!;
    const router = back.devices.find((d) => d.kind === 'router')!;
    expect(router.router).toMatchObject({ vlanRouting: true, guest: { on: true, ssid: 'G', password: 'g' } });
    expect(back.links.filter((l) => l.vlan === 2)).toHaveLength(1);
    const kids = back.devices.find((d) => d.name === 'Kids')!;
    expect(back.devices.find((d) => d.id === kids.vpn)?.name).toBe('VPN');
  });
});
