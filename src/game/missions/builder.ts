import {
  connect,
  createDevice,
  type Decoration,
  type Device,
  type DeviceKind,
  type Network,
} from '@/core/sim';

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

  /** Adds a decorative building behind the devices. */
  building(
    template: Decoration['template'],
    x: number,
    y: number,
    label: string,
    colors?: Partial<Decoration['colors']>,
  ): this {
    const decorations = this.net.decorations ?? [];
    decorations.push({
      id: `building-${decorations.length}`,
      template,
      x,
      y,
      label,
      colors: { walls: '#fde68a', roof: '#ef4444', floors: '#fef3c7', trim: '#78350f', ...colors },
    });
    this.net.decorations = decorations;
    return this;
  }

  build(): Network {
    return this.net;
  }
}
