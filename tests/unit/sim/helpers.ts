import { connect, createDevice, type Device, type DeviceKind, type Network } from '@/core/sim';

/** Tiny builder for test networks: `net.add('laptop', 'L')`, `net.link('L', 'R')`. */
export class NetBuilder {
  network: Network = { devices: [], links: [] };

  add(kind: DeviceKind, id: string, patch: Partial<Device> = {}): this {
    const d = createDevice(kind, patch.x ?? 0, patch.y ?? 0, this.network.devices);
    this.network.devices.push({ ...d, ...patch, id, name: patch.name ?? id });
    return this;
  }

  link(a: string, b: string): this {
    const result = connect(this.network, a, b);
    if (!result.ok) throw new Error(result.reason);
    this.network = result.network;
    return this;
  }

  set(id: string, patch: Partial<Device>): this {
    this.network = {
      ...this.network,
      devices: this.network.devices.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    };
    return this;
  }
}

/** A typical home: router with WiFi, a wired PC, the Internet and all three servers. */
export function homeNetwork(): NetBuilder {
  return new NetBuilder()
    .add('router', 'Router', {
      router: { wifiOn: true, ssid: 'Treehouse', password: 'pizza123', dhcp: true },
    })
    .add('computer', 'PC')
    .add('laptop', 'Laptop', { x: 100, wifi: { ssid: 'Treehouse', password: 'pizza123' } })
    .add('internet', 'Internet')
    .add('videoServer', 'Videos')
    .add('gameServer', 'Games')
    .add('webServer', 'Web')
    .link('PC', 'Router')
    .link('Router', 'Internet')
    .link('Videos', 'Internet')
    .link('Games', 'Internet')
    .link('Web', 'Internet');
}
