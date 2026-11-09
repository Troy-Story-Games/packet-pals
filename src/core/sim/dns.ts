import { DOMAINS } from './devices';
import type { Topology } from './topology';
import type { Device } from './types';

export interface NameLookup {
  /** The DNS server device asked, or undefined for the built-in Internet phone book. */
  dnsId?: string;
  /** The device the name belongs to, or null if nobody knows it. */
  deviceId: string | null;
  /** True when a home DNS server didn't know the name and asked the Internet. */
  forwarded: boolean;
}

export function normaliseName(name: string): string {
  return name.trim().toLowerCase();
}

/** Names every Internet server answers to, e.g. videos.fun → the video server. */
function builtInNames(topo: Topology): Map<string, string> {
  const names = new Map<string, string>();
  for (const d of topo.network.devices) {
    const domain = DOMAINS[d.kind];
    if (domain && d.powered && !names.has(domain)) names.set(domain, d.id);
  }
  return names;
}

function customName(dns: Device, name: string): string | undefined {
  return dns.dns?.entries.find((e) => normaliseName(e.name) === name)?.deviceId;
}

/** DNS servers plugged straight into the Internet cloud (even if switched off). */
export function internetDnsServer(topo: Topology): Device | undefined {
  const internet = topo.network.devices.find((d) => d.kind === 'internet');
  if (!internet) return undefined;
  return topo.network.devices.find(
    (d) =>
      d.kind === 'dnsServer' &&
      topo.network.links.some(
        (l) => (l.a === d.id && l.b === internet.id) || (l.b === d.id && l.a === internet.id),
      ),
  );
}

/** A powered DNS server on the same home network as `srcId`. */
export function homeDnsServer(topo: Topology, srcId: string): Device | undefined {
  return topo
    .localReach(srcId)
    .map((id) => topo.device(id))
    .find((d) => d.kind === 'dnsServer' && d.powered);
}

/**
 * Looks a name up the way `srcId` would: its home DNS server first (custom names,
 * then asking the Internet), otherwise the Internet's DNS server, otherwise the
 * built-in phone book that is part of the Internet cloud.
 */
export function resolveName(topo: Topology, srcId: string, rawName: string): NameLookup {
  const name = normaliseName(rawName);
  const builtIn = builtInNames(topo);
  const internetDns = internetDnsServer(topo);
  const internetAnswer = () => (internetDns && customName(internetDns, name)) ?? builtIn.get(name) ?? null;

  const home = homeDnsServer(topo, srcId);
  if (home) {
    const own = customName(home, name);
    return { dnsId: home.id, deviceId: own ?? internetAnswer(), forwarded: own === undefined };
  }
  if (internetDns) return { dnsId: internetDns.id, deviceId: internetAnswer(), forwarded: false };
  return { deviceId: builtIn.get(name) ?? null, forwarded: false };
}

/** Every name `srcId` could look up, for pickers. */
export function knownNames(topo: Topology, srcId: string): string[] {
  const names = new Set(builtInNames(topo).keys());
  const internetDns = internetDnsServer(topo);
  for (const dns of [internetDns, homeDnsServer(topo, srcId)]) {
    for (const e of dns?.dns?.entries ?? []) names.add(normaliseName(e.name));
  }
  return [...names].sort();
}
