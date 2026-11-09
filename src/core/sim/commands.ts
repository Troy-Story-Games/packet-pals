import { DEVICE_SPECS, VLANS, vlanInfo } from './devices';
import { homeDnsServer, internetDnsServer, resolveName } from './dns';
import { macOf, sendPacket, type SendOptions } from './journey';
import type { Topology } from './topology';
import type { Journey } from './types';

export type Command = 'ping' | 'nslookup' | 'traceroute' | 'ipconfig' | 'arp';

export const COMMANDS: Array<{ id: Command; help: string; needsTarget: boolean }> = [
  { id: 'ping', help: 'Is it there? Sends a ping and waits for a pong.', needsTarget: true },
  { id: 'traceroute', help: 'Shows every stop a packet makes on the way.', needsTarget: true },
  { id: 'nslookup', help: "Asks the phone book (DNS) for a name's address.", needsTarget: true },
  { id: 'ipconfig', help: "Shows this device's own address and helpers.", needsTarget: false },
  {
    id: 'arp',
    help: 'Shows the neighbours this device has found, and their hardware addresses.',
    needsTarget: false,
  },
];

export interface CommandResult {
  lines: string[];
  /** A packet journey to animate on the canvas, if the command sends one. */
  journey?: Journey;
}

function label(topo: Topology, id: string): string {
  const ip = topo.address(id).ip ?? topo.frontDoor(id);
  return ip ? `${topo.device(id).name} (${ip})` : topo.device(id).name;
}

/** The device that answers to `ip` on the local network (routers answer on each team's .1). */
function ownerOfIp(topo: Topology, ip: string): string | undefined {
  for (const d of topo.network.devices) {
    if (topo.address(d.id).ip === ip) return d.id;
    if (d.kind === 'router' && VLANS.some((v) => `${topo.subnetFor(d.id, v.id)}.1` === ip)) return d.id;
  }
  return undefined;
}

/**
 * Runs a terminal command from `fromId`. `target` is a device id or a name.
 * `options.arp` is the ARP memory (device → IPs it knows), used by `arp` and to show ARP shouts.
 */
export function runCommand(
  topo: Topology,
  cmd: Command,
  fromId: string,
  target?: string,
  options: SendOptions = {},
): CommandResult {
  const from = topo.device(fromId);
  switch (cmd) {
    case 'arp': {
      const known = options.arp?.[fromId] ?? [];
      if (known.length === 0) {
        return {
          lines: [`${from.name} hasn't met any neighbours yet.`, '  Send something first, then look again!'],
        };
      }
      return {
        lines: [
          `${from.name} knows these neighbours:`,
          ...known.map((ip) => {
            const owner = ownerOfIp(topo, ip);
            return `  ${ip.padEnd(15)} ${owner ? macOf(owner) : '??:??:??:??:??:??'}  ${owner ? topo.device(owner).name : ''}`;
          }),
        ],
      };
    }

    case 'ipconfig': {
      const a = topo.address(fromId);
      const dns = homeDnsServer(topo, fromId) ?? internetDnsServer(topo);
      const how = topo.onCell(fromId)
        ? 'Mobile data'
        : topo.wifiStatus(fromId).state === 'connected'
          ? 'WiFi'
          : 'Cable';
      return {
        lines: [
          `${from.name}`,
          `  Address ........ ${a.ip ?? '(none yet)'}`,
          `  Connected by ... ${topo.neighbours(fromId).length ? how : '(nothing)'}`,
          `  Way out ........ ${a.gatewayId ? label(topo, a.gatewayId) : '(none)'}`,
          `  Phone book ..... ${dns ? label(topo, dns.id) : 'Internet phone book'}`,
          ...(a.vlan && a.vlan !== 1 ? [`  Team ........... ${vlanInfo(a.vlan).name}`] : []),
          ...(from.vpn && topo.devices.has(from.vpn) ? [`  VPN ............ ${label(topo, from.vpn)}`] : []),
        ],
      };
    }

    case 'nslookup': {
      if (!target) return { lines: ['Which name should I look up?'] };
      const lookup = resolveName(topo, fromId, target);
      const server = lookup.dnsId ? label(topo, lookup.dnsId) : 'Internet phone book';
      if (lookup.dnsId && !topo.device(lookup.dnsId).powered) {
        return { lines: [`Asking ${server}...`, `  No answer: the phone book is switched off!`] };
      }
      return {
        lines: [
          `Asking ${server}...`,
          lookup.deviceId
            ? `  ${target} lives at ${topo.address(lookup.deviceId).ip ?? '(no address)'}${lookup.forwarded ? '  (asked the Internet)' : ''}`
            : `  Nobody knows ${target}.`,
        ],
      };
    }

    case 'ping': {
      if (!target) return { lines: ['Who should I ping?'] };
      const journey = sendPacket(topo, fromId, 'ping', target, options);
      const dst = journey.to ? label(topo, journey.to) : target;
      const lines =
        journey.outcome === 'delivered'
          ? [
              `Pinging ${dst}...`,
              ...[1, 2, 3].map((n) => `  Reply ${n} from ${dst}: Pong! (${journey.steps.length * 2 + n} ms)`),
            ]
          : [`Pinging ${dst}...`, `  No reply. ${journey.message}`];
      return { lines, journey };
    }

    case 'traceroute': {
      if (!target) return { lines: ['Where should I trace to?'] };
      const journey = sendPacket(topo, fromId, 'ping', target, options);
      // Real traceroute only hears from devices that answer: hubs, switches and firewalls stay quiet.
      // Inside a VPN tunnel the stops are hidden, so the whole tunnel looks like one hop.
      const hops = journey.steps
        .filter((s, i, all) => {
          if (s.packet === 'lookup' || s.packet === 'arp') return false;
          return s.packet !== 'tunnel' || all[i + 1]?.packet !== 'tunnel';
        })
        .map((s) => s.moves.find((m) => m.fate !== 'ignored')!.to)
        .filter((id) => {
          const spec = DEVICE_SPECS[topo.device(id).kind];
          return !spec.isTransparent;
        });
      const lines = [`Tracing the way to ${journey.to ? label(topo, journey.to) : target}...`];
      hops.forEach((id, i) => lines.push(`  ${i + 1}  ${label(topo, id)}`));
      if (journey.outcome !== 'delivered') {
        lines.push(`  ${hops.length + 1}  * * *   (stuck here: ${journey.message})`);
      } else {
        lines.push('  Arrived!');
      }
      return { lines, journey };
    }
  }
}
