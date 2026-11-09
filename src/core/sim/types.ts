export type DeviceKind =
  | 'computer'
  | 'laptop'
  | 'tablet'
  | 'console'
  | 'printer'
  | 'hub'
  | 'switch'
  | 'router'
  | 'firewall'
  | 'internet'
  | 'videoServer'
  | 'gameServer'
  | 'webServer'
  | 'dnsServer'
  | 'phone'
  | 'cellTower'
  | 'smartSpeaker'
  | 'smartTv'
  | 'doorbell'
  | 'camera'
  | 'smartLight'
  | 'thermostat';

/** Things a packet can be trying to do. Firewalls filter by the matching app. */
export type Action = 'ping' | 'message' | 'video' | 'game' | 'web' | 'print';
export type AppKind = 'chat' | 'ping' | 'video' | 'game' | 'web' | 'print';

export interface RouterConfig {
  wifiOn: boolean;
  ssid: string;
  password: string;
  /** Hand out addresses automatically. */
  dhcp: boolean;
}

/** A port-forwarding rule: let this app in from the Internet, to this device. */
export interface Door {
  app: AppKind;
  deviceId: string;
}

export interface FirewallConfig {
  blockedApps: AppKind[];
  blockedDevices: string[];
  /** Doors opened from the Internet into the home (port forwarding). */
  doors?: Door[];
}

/** A custom name in a DNS server's phone book. */
export interface DnsEntry {
  name: string;
  deviceId: string;
}

export interface Device {
  id: string;
  kind: DeviceKind;
  name: string;
  /** Canvas position; also used for WiFi range. */
  x: number;
  y: number;
  powered: boolean;
  /** A hand-typed address. Undefined means "get one automatically". */
  staticIp?: string;
  /** The WiFi network this device tries to join. */
  wifi?: { ssid: string; password: string };
  router?: RouterConfig;
  firewall?: FirewallConfig;
  /** Phones: use WiFi or the mobile (cell) network. */
  network?: 'wifi' | 'cell';
  /** Video, game and web servers: the website name they answer to. */
  domain?: string;
  /** DNS servers: custom names they know. */
  dns?: { entries: DnsEntry[] };
  /** Mission-placed devices can't be deleted. */
  locked?: boolean;
}

export interface Link {
  id: string;
  a: string;
  b: string;
}

export type BuildingTemplate = 'house1' | 'house2' | 'house3' | 'office';

/** A purely decorative building drawn behind devices in the sandbox. */
export interface Decoration {
  id: string;
  template: BuildingTemplate;
  x: number;
  y: number;
  colors: { walls: string; roof: string; floors: string; trim: string };
  label?: string;
}

export interface Network {
  devices: Device[];
  links: Link[];
  decorations?: Decoration[];
}

export type Via = 'cable' | 'wifi' | 'cell';

/** A usable connection between two powered devices. */
export interface Edge {
  a: string;
  b: string;
  via: Via;
  linkId?: string;
}

export type AddressSource = 'dhcp' | 'static' | 'self' | 'public' | 'carrier' | 'none';

export interface Address {
  ip: string | null;
  source: AddressSource;
  /** The router that is this device's way out to the Internet. */
  gatewayId?: string;
}

export type WifiState = 'none' | 'connected' | 'wrongPassword' | 'outOfRange' | 'noSuchNetwork';

export interface WifiStatus {
  state: WifiState;
  routerId?: string;
}

/** One packet moving along one connection during a step of a journey. */
export interface Move {
  from: string;
  to: string;
  via: Via;
  linkId?: string;
  /**
   * forward: normal hop. ignored: a hub copy the receiver throws away.
   * blocked: stopped here by a firewall. arrive: reached its destination.
   */
  fate: 'forward' | 'ignored' | 'blocked' | 'arrive';
}

export interface JourneyStep {
  moves: Move[];
  /** Lookup steps carry a question to the DNS server rather than the real packet. */
  packet?: 'lookup';
  /** Something to say while this step plays (e.g. DNS lookups). */
  note?: string;
}

export interface Journey {
  action: Action;
  from: string;
  to?: string;
  outcome: 'delivered' | 'blocked' | 'failed';
  /** Kid-readable explanation of what happened. */
  message: string;
  /** Device the message is about (where it went wrong, or the destination). */
  at: string;
  steps: JourneyStep[];
  /** Steps for the answer coming back (pings, videos, games, websites). */
  replySteps: JourneyStep[];
  /** The name that was looked up, if the target was a name like videos.fun. */
  name?: string;
}
