import { DEVICE_SPECS } from './devices';
import type { AppKind, BuildingTemplate, Decoration, Device, DeviceKind, Network } from './types';

/** Saved-file / share-link format. Short keys keep QR codes small. */
interface SavedDevice {
  i: string;
  k: DeviceKind;
  n: string;
  x: number;
  y: number;
  p?: 0;
  ip?: string;
  w?: [string, string];
  r?: [0 | 1, string, string, 0 | 1];
  f?: [AppKind[], string[]];
  /** Firewall doors: [app, device id]. */
  fd?: Array<[AppKind, string]>;
  /** Server website name. */
  dn?: string;
  /** Phone on mobile data. */
  c?: 1;
  /** DNS custom names: [name, device id]. */
  ns?: Array<[string, string]>;
}

interface SavedDecoration {
  t: BuildingTemplate;
  x: number;
  y: number;
  /** walls, roof, floors, trim */
  c: [string, string, string, string];
  n?: string;
}

export interface SavedNetwork {
  v: 1;
  d: SavedDevice[];
  l: Array<[string, string]>;
  b?: SavedDecoration[];
}

/** Converts a network to the compact saved format, with short ids. */
export function exportNetwork(network: Network): SavedNetwork {
  const ids = new Map(network.devices.map((d, i) => [d.id, `d${i}`]));
  return {
    v: 1,
    d: network.devices.map((d) => {
      const saved: SavedDevice = {
        i: ids.get(d.id)!,
        k: d.kind,
        n: d.name,
        x: Math.round(d.x),
        y: Math.round(d.y),
      };
      if (!d.powered) saved.p = 0;
      if (d.staticIp) saved.ip = d.staticIp;
      if (d.wifi) saved.w = [d.wifi.ssid, d.wifi.password];
      if (d.router)
        saved.r = [d.router.wifiOn ? 1 : 0, d.router.ssid, d.router.password, d.router.dhcp ? 1 : 0];
      if (d.firewall)
        saved.f = [d.firewall.blockedApps, d.firewall.blockedDevices.map((id) => ids.get(id) ?? id)];
      if (d.firewall?.doors?.length)
        saved.fd = d.firewall.doors.map((door) => [door.app, ids.get(door.deviceId) ?? door.deviceId]);
      if (d.network === 'cell') saved.c = 1;
      if (d.domain) saved.dn = d.domain;
      if (d.dns?.entries.length)
        saved.ns = d.dns.entries.map((e) => [e.name, ids.get(e.deviceId) ?? e.deviceId]);
      return saved;
    }),
    l: network.links.map((l) => [ids.get(l.a)!, ids.get(l.b)!]),
    ...(network.decorations?.length
      ? {
          b: network.decorations.map((b) => ({
            t: b.template,
            x: Math.round(b.x),
            y: Math.round(b.y),
            c: [b.colors.walls, b.colors.roof, b.colors.floors, b.colors.trim],
            ...(b.label ? { n: b.label } : {}),
          })),
        }
      : {}),
  };
}

/** Reads a saved network, returning null if it isn't valid. */
export function importNetwork(data: unknown): Network | null {
  if (!isSaved(data)) return null;
  const devices: Device[] = data.d.map((s) => {
    const d: Device = {
      id: s.i,
      kind: s.k,
      name: String(s.n).slice(0, 24),
      x: Number(s.x) || 0,
      y: Number(s.y) || 0,
      powered: s.p !== 0,
    };
    if (s.ip) d.staticIp = String(s.ip);
    if (s.w) d.wifi = { ssid: String(s.w[0]), password: String(s.w[1]) };
    if (s.k === 'router') {
      const r = s.r ?? [1, 'Home WiFi', 'secret123', 1];
      d.router = { wifiOn: r[0] === 1, ssid: String(r[1]), password: String(r[2]), dhcp: r[3] === 1 };
    }
    if (s.k === 'firewall') {
      d.firewall = {
        blockedApps: s.f?.[0] ?? [],
        blockedDevices: s.f?.[1] ?? [],
        doors: (s.fd ?? []).map(([app, deviceId]) => ({ app, deviceId })),
      };
    }
    if (s.c === 1) d.network = 'cell';
    if (s.dn) d.domain = String(s.dn).slice(0, 40);
    if (s.k === 'dnsServer')
      d.dns = { entries: (s.ns ?? []).map(([name, deviceId]) => ({ name: String(name), deviceId })) };
    return d;
  });
  const known = new Set(devices.map((d) => d.id));
  const links = data.l
    .filter(([a, b]) => known.has(a) && known.has(b) && a !== b)
    .map(([a, b], i) => ({ id: `link-${i}`, a, b }));
  const decorations: Decoration[] = (data.b ?? [])
    .filter((b) => TEMPLATES.includes(b.t))
    .map((b, i) => ({
      id: `building-${i}`,
      template: b.t,
      x: Number(b.x) || 0,
      y: Number(b.y) || 0,
      colors: { walls: b.c[0], roof: b.c[1], floors: b.c[2], trim: b.c[3] },
      label: b.n,
    }));
  return decorations.length ? { devices, links, decorations } : { devices, links };
}

const TEMPLATES: BuildingTemplate[] = ['house1', 'house2', 'house3', 'office'];

function isSaved(data: unknown): data is SavedNetwork {
  if (typeof data !== 'object' || data === null) return false;
  const v = data as Partial<SavedNetwork>;
  return (
    v.v === 1 &&
    Array.isArray(v.d) &&
    Array.isArray(v.l) &&
    v.d.every((d) => typeof d === 'object' && d !== null && typeof d.i === 'string' && d.k in DEVICE_SPECS)
  );
}
