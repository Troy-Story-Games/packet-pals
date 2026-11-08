import { connect, createDevice, type Device, type DeviceKind, type Network } from '@/core/sim';

/** Fluent helper for writing mission starting networks with readable ids. */
export class MissionNet {
  private net: Network = { devices: [], links: [] };

  add(kind: DeviceKind, id: string, x: number, y: number, patch: Partial<Device> = {}): this {
    const device = createDevice(kind, x, y, this.net.devices);
    this.net.devices.push({ ...device, locked: true, ...patch, id });
    return this;
  }

  link(a: string, b: string): this {
    const result = connect(this.net, a, b);
    if (!result.ok) throw new Error(`Mission setup: ${result.reason}`);
    this.net = result.network;
    return this;
  }

  build(): Network {
    return this.net;
  }
}
