import { DEVICE_SPECS, DOMAINS, serverName } from './devices';
import type { Device, DeviceKind, Network } from './types';

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

/** "Computer", then "Computer 2", "Computer 3"... */
export function nextName(kind: DeviceKind, devices: Device[]): string {
  const base = DEVICE_SPECS[kind].label;
  const taken = new Set(devices.map((d) => d.name));
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) if (!taken.has(`${base} ${i}`)) return `${base} ${i}`;
}

/** A new device with sensible defaults for its kind. */
export function createDevice(kind: DeviceKind, x: number, y: number, devices: Device[] = []): Device {
  const device: Device = { id: newId(kind), kind, name: nextName(kind, devices), x, y, powered: true };
  if (kind === 'router')
    device.router = { wifiOn: true, ssid: 'Home WiFi', password: 'secret123', dhcp: true };
  if (kind === 'firewall') device.firewall = { blockedApps: [], blockedDevices: [], doors: [] };
  if (kind === 'dnsServer') device.dns = { entries: [] };
  if (kind === 'phone') device.network = 'wifi';
  const domain = DOMAINS[kind];
  if (domain) device.domain = uniqueDomain(domain, devices);
  return device;
}

/** "videos.fun", then "videos2.fun", "videos3.fun"... so every server has its own name. */
function uniqueDomain(base: string, devices: Device[]): string {
  const taken = new Set(devices.map((d) => serverName(d)).filter(Boolean));
  if (!taken.has(base)) return base;
  const [stem, ...rest] = base.split('.');
  for (let i = 2; ; i++) {
    const candidate = [`${stem}${i}`, ...rest].join('.');
    if (!taken.has(candidate)) return candidate;
  }
}

export type ConnectResult = { ok: true; network: Network } | { ok: false; reason: string };

/** Adds a cable between two devices if both have a free socket. */
export function connect(network: Network, a: string, b: string): ConnectResult {
  if (a === b) return { ok: false, reason: 'A cable needs two different devices!' };
  const da = network.devices.find((d) => d.id === a);
  const db = network.devices.find((d) => d.id === b);
  if (!da || !db) return { ok: false, reason: 'Device not found.' };
  if (network.links.some((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a))) {
    return { ok: false, reason: `${da.name} and ${db.name} are already connected.` };
  }
  for (const d of [da, db]) {
    const spec = DEVICE_SPECS[d.kind];
    if (spec.ports === 0) return { ok: false, reason: `${d.name} has no cable socket. It uses WiFi!` };
    const used = network.links.filter((l) => l.a === d.id || l.b === d.id).length;
    if (used >= spec.ports) {
      return {
        ok: false,
        reason: `${d.name} only has ${spec.ports} socket${spec.ports === 1 ? '' : 's'}, and ${spec.ports === 1 ? "it's" : "they're all"} used.`,
      };
    }
  }
  return { ok: true, network: { ...network, links: [...network.links, { id: newId('link'), a, b }] } };
}
