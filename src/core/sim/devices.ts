import type { Action, AppKind, DeviceKind } from './types';

export interface DeviceSpec {
  label: string;
  /** Short kid-friendly description for the toolbox. */
  blurb: string;
  /** Twemoji code point, or null for devices drawn in code. */
  emoji: string | null;
  /** Number of cable sockets. */
  ports: number;
  canWifi: boolean;
  /** Can send and receive its own messages (computers, servers...). */
  isHost: boolean;
  /** Passes traffic through without being the destination (hubs, switches, firewalls). */
  isTransparent: boolean;
  /** Can use the mobile (cell) network. */
  canCell?: boolean;
  /** Can be watched live with the Video action (cameras, doorbells). */
  isCamera?: boolean;
  /** Toolbox group. */
  group?: 'smart';
}

export const DEVICE_SPECS: Record<DeviceKind, DeviceSpec> = {
  computer: {
    label: 'Computer',
    blurb: 'Plugs in with a cable',
    emoji: '1f5a5',
    ports: 1,
    canWifi: false,
    isHost: true,
    isTransparent: false,
  },
  laptop: {
    label: 'Laptop',
    blurb: 'Cable or WiFi',
    emoji: '1f4bb',
    ports: 1,
    canWifi: true,
    isHost: true,
    isTransparent: false,
  },
  tablet: {
    label: 'Tablet',
    blurb: 'WiFi only',
    emoji: null,
    ports: 0,
    canWifi: true,
    isHost: true,
    isTransparent: false,
  },
  console: {
    label: 'Game Console',
    blurb: 'Plays online games',
    emoji: '1f3ae',
    ports: 1,
    canWifi: true,
    isHost: true,
    isTransparent: false,
  },
  printer: {
    label: 'Printer',
    blurb: 'Prints your stuff',
    emoji: '1f5a8',
    ports: 1,
    canWifi: true,
    isHost: true,
    isTransparent: false,
  },
  hub: {
    label: 'Hub',
    blurb: 'Shouts to everyone',
    emoji: null,
    ports: 4,
    canWifi: false,
    isHost: false,
    isTransparent: true,
  },
  switch: {
    label: 'Switch',
    blurb: 'Sends to the right one',
    emoji: null,
    ports: 8,
    canWifi: false,
    isHost: false,
    isTransparent: true,
  },
  router: {
    label: 'WiFi Router',
    blurb: 'Your home network',
    emoji: null,
    ports: 5,
    canWifi: false,
    isHost: true,
    isTransparent: false,
  },
  firewall: {
    label: 'Firewall',
    blurb: 'Blocks what you choose',
    emoji: '1f9f1',
    ports: 2,
    canWifi: false,
    isHost: false,
    isTransparent: true,
  },
  internet: {
    label: 'The Internet',
    blurb: 'Connects the world',
    emoji: '2601',
    ports: 12,
    canWifi: false,
    isHost: false,
    isTransparent: false,
  },
  videoServer: {
    label: 'Video Server',
    blurb: 'videos.fun',
    emoji: '1f3ac',
    ports: 1,
    canWifi: false,
    isHost: true,
    isTransparent: false,
  },
  gameServer: {
    label: 'Game Server',
    blurb: 'games.fun',
    emoji: '1f47e',
    ports: 1,
    canWifi: false,
    isHost: true,
    isTransparent: false,
  },
  webServer: {
    label: 'Web Server',
    blurb: 'kidsweb.fun',
    emoji: '1f310',
    ports: 1,
    canWifi: false,
    isHost: true,
    isTransparent: false,
  },
  dnsServer: {
    label: 'DNS Server',
    blurb: 'The phone book for names',
    emoji: '1f4d6',
    ports: 1,
    canWifi: false,
    isHost: true,
    isTransparent: false,
  },
  vpnServer: {
    label: 'VPN Server',
    blurb: 'Makes secret tunnels',
    emoji: '1f510',
    ports: 1,
    canWifi: false,
    isHost: true,
    isTransparent: false,
  },
  phone: {
    label: 'Phone',
    blurb: 'WiFi or mobile data',
    emoji: '1f4f1',
    ports: 0,
    canWifi: true,
    canCell: true,
    isHost: true,
    isTransparent: false,
  },
  cellTower: {
    label: 'Cell Tower',
    blurb: 'Mobile data for phones, far and wide',
    emoji: null,
    ports: 1,
    canWifi: false,
    isHost: false,
    isTransparent: false,
  },
  smartSpeaker: {
    label: 'Smart Speaker',
    blurb: 'Plays music, answers questions',
    emoji: '1f50a',
    ports: 0,
    canWifi: true,
    isHost: true,
    isTransparent: false,
    group: 'smart',
  },
  smartTv: {
    label: 'Smart TV',
    blurb: 'Watches videos from the Internet',
    emoji: '1f4fa',
    ports: 1,
    canWifi: true,
    isHost: true,
    isTransparent: false,
    group: 'smart',
  },
  doorbell: {
    label: 'Video Doorbell',
    blurb: 'See who is at the door',
    emoji: '1f514',
    ports: 0,
    canWifi: true,
    isHost: true,
    isTransparent: false,
    isCamera: true,
    group: 'smart',
  },
  camera: {
    label: 'Security Camera',
    blurb: 'Keeps an eye on things',
    emoji: '1f4f9',
    ports: 1,
    canWifi: true,
    isHost: true,
    isTransparent: false,
    isCamera: true,
    group: 'smart',
  },
  smartLight: {
    label: 'Smart Light',
    blurb: 'Turn it on from your phone',
    emoji: '1f4a1',
    ports: 0,
    canWifi: true,
    isHost: true,
    isTransparent: false,
    group: 'smart',
  },
  thermostat: {
    label: 'Thermostat',
    blurb: 'Keeps the house cosy',
    emoji: '1f321',
    ports: 0,
    canWifi: true,
    isHost: true,
    isTransparent: false,
    group: 'smart',
  },
};

export const SERVER_FOR_ACTION: Partial<Record<Action, DeviceKind>> = {
  video: 'videoServer',
  game: 'gameServer',
  web: 'webServer',
};

export const DOMAINS: Partial<Record<DeviceKind, string>> = {
  videoServer: 'videos.fun',
  gameServer: 'games.fun',
  webServer: 'kidsweb.fun',
};

export const APP_FOR_ACTION: Record<Action, AppKind> = {
  ping: 'ping',
  message: 'chat',
  video: 'video',
  game: 'game',
  web: 'web',
  print: 'print',
};

export const APP_LABELS: Record<AppKind, string> = {
  chat: 'Chat',
  ping: 'Pings',
  vpn: 'VPNs',
  video: 'Videos',
  game: 'Games',
  web: 'Websites',
  print: 'Printing',
};

/** The website name a server answers to (its own, or the default for its kind). */
export function serverName(d: { kind: DeviceKind; domain?: string }): string | undefined {
  return d.domain ?? DOMAINS[d.kind];
}

/**
 * "Door numbers" (ports) each app knocks on. Pings don't really use a door, but
 * calling it the knock door keeps the idea simple for kids.
 */
export const DOORS: Record<AppKind, string> = {
  web: '80',
  video: '443',
  chat: '5222',
  game: '3074',
  ping: 'knock',
  print: '9100',
  vpn: '1194',
};

/** The team (VLAN) used by Guest WiFi. */
export const GUEST_VLAN = 9;

/** Kid-friendly team names and colours for VLANs. */
export const VLANS: Array<{ id: number; name: string; color: string }> = [
  { id: 1, name: 'Blue team', color: '#3b82f6' },
  { id: 2, name: 'Red team', color: '#ef4444' },
  { id: 3, name: 'Green team', color: '#22c55e' },
  { id: 4, name: 'Yellow team', color: '#eab308' },
  { id: GUEST_VLAN, name: 'Guests', color: '#a855f7' },
];

export function vlanInfo(id: number | undefined): { id: number; name: string; color: string } {
  return VLANS.find((v) => v.id === (id ?? 1)) ?? VLANS[0];
}

/** WiFi reaches this far (canvas units) from a router. */
export const WIFI_RANGE = 340;

/** Mobile data reaches much further from a cell tower. */
export const CELL_RANGE = 900;

/** Servers that live on the Internet by default and answer to a name. */
export function isServer(kind: DeviceKind): boolean {
  return (
    kind === 'videoServer' ||
    kind === 'gameServer' ||
    kind === 'webServer' ||
    kind === 'dnsServer' ||
    kind === 'vpnServer'
  );
}
