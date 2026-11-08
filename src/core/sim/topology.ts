import { DEVICE_SPECS, isServer, WIFI_RANGE } from './devices';
import type { Address, Device, Edge, Network, WifiStatus } from './types';

/**
 * Read-only view of a network with the derived facts the simulator needs:
 * which connections work, who is on WiFi, which router ports face the
 * Internet, and every device's address. Build one per network change.
 */
export class Topology {
  readonly devices = new Map<string, Device>();
  readonly edges: Edge[] = [];
  private readonly adjacency = new Map<string, Edge[]>();
  private readonly wifi = new Map<string, WifiStatus>();
  private readonly wanNeighbours = new Map<string, Set<string>>();
  private readonly addresses = new Map<string, Address>();
  /** Router id → its LAN subnet prefix, e.g. "192.168.1". */
  readonly subnets = new Map<string, string>();

  constructor(readonly network: Network) {
    for (const d of network.devices) {
      this.devices.set(d.id, d);
      this.adjacency.set(d.id, []);
    }
    this.buildEdges();
    this.findWanPorts();
    this.assignAddresses();
  }

  device(id: string): Device {
    const d = this.devices.get(id);
    if (!d) throw new Error(`Unknown device ${id}`);
    return d;
  }

  neighbours(id: string): Edge[] {
    return this.adjacency.get(id) ?? [];
  }

  other(edge: Edge, id: string): string {
    return edge.a === id ? edge.b : edge.a;
  }

  wifiStatus(id: string): WifiStatus {
    return this.wifi.get(id) ?? { state: 'none' };
  }

  address(id: string): Address {
    return this.addresses.get(id) ?? { ip: null, source: 'none' };
  }

  isWanNeighbour(routerId: string, neighbourId: string): boolean {
    return this.wanNeighbours.get(routerId)?.has(neighbourId) ?? false;
  }

  /** Routers whose WiFi `device` can currently hear. */
  networksInRange(device: Device): Device[] {
    return this.network.devices.filter(
      (r) => r.kind === 'router' && r.powered && r.router?.wifiOn && distance(r, device) <= WIFI_RANGE,
    );
  }

  /** Cable sockets already used on a device. */
  portsUsed(id: string): number {
    return this.network.links.filter((l) => l.a === id || l.b === id).length;
  }

  internetId(): string | undefined {
    return this.network.devices.find((d) => d.kind === 'internet' && d.powered)?.id;
  }

  private addEdge(edge: Edge): void {
    this.edges.push(edge);
    this.adjacency.get(edge.a)?.push(edge);
    this.adjacency.get(edge.b)?.push(edge);
  }

  private buildEdges(): void {
    for (const link of this.network.links) {
      const a = this.devices.get(link.a);
      const b = this.devices.get(link.b);
      if (a?.powered && b?.powered) this.addEdge({ a: a.id, b: b.id, via: 'cable', linkId: link.id });
    }

    for (const d of this.network.devices) {
      if (!d.wifi || !DEVICE_SPECS[d.kind].canWifi) continue;
      const status = this.joinWifi(d);
      this.wifi.set(d.id, status);
      if (status.state === 'connected' && status.routerId)
        this.addEdge({ a: d.id, b: status.routerId, via: 'wifi' });
    }
  }

  private joinWifi(d: Device): WifiStatus {
    if (!d.powered || !d.wifi) return { state: 'none' };
    const named = this.network.devices.filter(
      (r) => r.kind === 'router' && r.powered && r.router?.wifiOn && r.router.ssid === d.wifi!.ssid,
    );
    if (named.length === 0) return { state: 'noSuchNetwork' };
    const inRange = named.filter((r) => distance(r, d) <= WIFI_RANGE);
    if (inRange.length === 0) return { state: 'outOfRange', routerId: named[0].id };
    const match = inRange.find((r) => r.router!.password === d.wifi!.password);
    return match
      ? { state: 'connected', routerId: match.id }
      : { state: 'wrongPassword', routerId: inRange[0].id };
  }

  /** A router port is WAN if the Internet can be reached from it through hubs, switches and firewalls. */
  private findWanPorts(): void {
    const internet = this.internetId();
    for (const r of this.network.devices) {
      if (r.kind !== 'router') continue;
      const wan = new Set<string>();
      if (internet) {
        for (const e of this.neighbours(r.id)) {
          const n = this.other(e, r.id);
          if (n === internet || this.reachesThroughTransparent(n, internet, r.id)) wan.add(n);
        }
      }
      this.wanNeighbours.set(r.id, wan);
    }
  }

  private reachesThroughTransparent(start: string, target: string, avoid: string): boolean {
    if (!DEVICE_SPECS[this.device(start).kind].isTransparent) return false;
    const seen = new Set([start, avoid]);
    const queue = [start];
    while (queue.length) {
      const id = queue.shift()!;
      for (const e of this.neighbours(id)) {
        const n = this.other(e, id);
        if (n === target) return true;
        if (seen.has(n)) continue;
        seen.add(n);
        if (DEVICE_SPECS[this.device(n).kind].isTransparent) queue.push(n);
      }
    }
    return false;
  }

  /**
   * Can a frame go from `from` into `to`, given it entered `from` from `prev`?
   * Hubs, switches and firewalls pass everything along; a router only switches
   * between its home (LAN) ports, never out to the Internet side.
   */
  canPassThrough(id: string, prev: string | undefined, next: string): boolean {
    const d = this.device(id);
    if (DEVICE_SPECS[d.kind].isTransparent) return true;
    if (d.kind === 'router' && prev !== undefined) {
      return !this.isWanNeighbour(id, prev) && !this.isWanNeighbour(id, next);
    }
    return false;
  }

  /**
   * Shortest path from `from` to `to` on the local network (no routing).
   * Returns the device ids including both ends, or null.
   */
  localPath(from: string, to: string): string[] | null {
    if (from === to) return [from];
    // State is (device, previous device) because routers care where a frame came from.
    const start = { id: from, prev: undefined as string | undefined, path: [from] };
    const seen = new Set<string>([`${from}|`]);
    const queue = [start];
    while (queue.length) {
      const { id, prev, path } = queue.shift()!;
      for (const e of this.neighbours(id)) {
        const n = this.other(e, id);
        if (path.includes(n)) continue;
        if (id !== from && !this.canPassThrough(id, prev, n)) continue;
        if (n === to) return [...path, n];
        const key = `${n}|${id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        queue.push({ id: n, prev: id, path: [...path, n] });
      }
    }
    return null;
  }

  /** Every device reachable on the local network from `id` (its "neighbourhood"). */
  localReach(id: string): string[] {
    return this.network.devices
      .filter((d) => d.id !== id && this.localPath(id, d.id) !== null)
      .map((d) => d.id);
  }

  private assignAddresses(): void {
    const routers = this.network.devices.filter((d) => d.kind === 'router');
    routers.forEach((r, i) => this.subnets.set(r.id, `192.168.${i + 1}`));

    const internet = this.internetId();
    let publicHost = 10;

    for (const r of routers) {
      this.addresses.set(
        r.id,
        r.powered ? { ip: `${this.subnets.get(r.id)}.1`, source: 'static' } : { ip: null, source: 'none' },
      );
    }

    const leaseCounters = new Map<string, number>();
    for (const d of this.network.devices) {
      const spec = DEVICE_SPECS[d.kind];
      if (!spec.isHost || d.kind === 'router') continue;
      if (!d.powered || this.neighbours(d.id).length === 0) {
        this.addresses.set(d.id, { ip: d.staticIp ?? null, source: d.staticIp ? 'static' : 'none' });
        continue;
      }

      if (isServer(d.kind)) {
        const online = internet !== undefined && this.localPathToInternet(d.id) !== null;
        this.addresses.set(
          d.id,
          online ? { ip: `203.0.113.${publicHost++}`, source: 'public' } : { ip: null, source: 'none' },
        );
        continue;
      }

      const gateways = this.localReach(d.id).filter((id) => {
        const r = this.device(id);
        return r.kind === 'router' && r.powered;
      });

      if (d.staticIp) {
        const gw = gateways.find((g) => d.staticIp!.startsWith(`${this.subnets.get(g)}.`));
        this.addresses.set(d.id, { ip: d.staticIp, source: 'static', gatewayId: gw });
        continue;
      }

      const dhcp = gateways.find((g) => this.device(g).router?.dhcp);
      if (dhcp) {
        const next = leaseCounters.get(dhcp) ?? 10;
        leaseCounters.set(dhcp, next + 1);
        this.addresses.set(d.id, {
          ip: `${this.subnets.get(dhcp)}.${next}`,
          source: 'dhcp',
          gatewayId: dhcp,
        });
      } else {
        // No one hands out addresses, so the device makes one up (link-local, like real computers do).
        this.addresses.set(d.id, {
          ip: `169.254.${hash(d.id) % 250}.${(hash(d.id + 'x') % 250) + 2}`,
          source: 'self',
        });
      }
    }
  }

  /** Path from a device to the Internet cloud through transparent devices only. */
  localPathToInternet(id: string): string[] | null {
    const internet = this.internetId();
    if (!internet) return null;
    const seen = new Set([id]);
    const queue: string[][] = [[id]];
    while (queue.length) {
      const path = queue.shift()!;
      const last = path[path.length - 1];
      for (const e of this.neighbours(last)) {
        const n = this.other(e, last);
        if (n === internet) return [...path, n];
        if (seen.has(n) || !DEVICE_SPECS[this.device(n).kind].isTransparent) continue;
        seen.add(n);
        queue.push([...path, n]);
      }
    }
    return null;
  }

  /** The connection used between two neighbouring devices. */
  edgeBetween(a: string, b: string): Edge | undefined {
    return this.neighbours(a).find((e) => this.other(e, a) === b);
  }
}

export function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/** Same first three numbers = same neighbourhood (a /24 subnet). */
export function sameSubnet(a: string, b: string): boolean {
  return (
    a.split('.').slice(0, 3).join('.') === b.split('.').slice(0, 3).join('.') ||
    (a.startsWith('169.254.') && b.startsWith('169.254.'))
  );
}
