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
    emoji: '1f4f1',
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
  ping: 'chat',
  message: 'chat',
  video: 'video',
  game: 'game',
  web: 'web',
  print: 'print',
};

export const APP_LABELS: Record<AppKind, string> = {
  chat: 'Chat & pings',
  video: 'Videos',
  game: 'Games',
  web: 'Websites',
  print: 'Printing',
};

/** WiFi reaches this far (canvas units) from a router. */
export const WIFI_RANGE = 340;

/** Devices whose packets are about the Internet rather than the home network. */
export function isServer(kind: DeviceKind): boolean {
  return kind === 'videoServer' || kind === 'gameServer' || kind === 'webServer';
}
