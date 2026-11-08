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
  | 'webServer';

/** Things a packet can be trying to do. Firewalls filter by the matching app. */
export type Action = 'ping' | 'message' | 'video' | 'game' | 'web' | 'print';
export type AppKind = 'chat' | 'video' | 'game' | 'web' | 'print';

export interface RouterConfig {
  wifiOn: boolean;
  ssid: string;
  password: string;
  /** Hand out addresses automatically. */
  dhcp: boolean;
}

export interface FirewallConfig {
  blockedApps: AppKind[];
  blockedDevices: string[];
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
  /** Mission-placed devices can't be deleted. */
  locked?: boolean;
}

export interface Link {
  id: string;
  a: string;
  b: string;
}

export interface Network {
  devices: Device[];
  links: Link[];
}

export type Via = 'cable' | 'wifi';

/** A usable connection between two powered devices. */
export interface Edge {
  a: string;
  b: string;
  via: Via;
  linkId?: string;
}

export type AddressSource = 'dhcp' | 'static' | 'self' | 'public' | 'none';

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
}
