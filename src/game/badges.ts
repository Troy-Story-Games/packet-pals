import { DEVICE_SPECS } from '@/core/sim';
import { levelForXp } from './levels';
import { MISSIONS } from './missions/catalogue';
import type { Stats } from './stats';

export interface BadgeContext {
  stats: Stats;
  xp: number;
  missionStars: Record<string, number>;
  streak: number;
  /** Number of device kinds discovered. */
  discovered: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  /** Twemoji code point of the badge picture. */
  emoji: string;
  earned: (ctx: BadgeContext) => boolean;
}

const missionsDone = (c: BadgeContext) => Object.keys(c.missionStars).length;

export const BADGES: Badge[] = [
  {
    id: 'plugged-in',
    name: 'Plugged In',
    description: 'Connect your first cable.',
    emoji: '1f50c',
    earned: (c) => c.stats.cablesConnected >= 1,
  },
  {
    id: 'packet-pilot',
    name: 'Packet Pilot',
    description: 'Deliver your first packet.',
    emoji: '1f4e8',
    earned: (c) => c.stats.packetsDelivered >= 1,
  },
  {
    id: 'wifi-wizard',
    name: 'WiFi Wizard',
    description: 'Join a device to WiFi.',
    emoji: '1f4f6',
    earned: (c) => c.stats.wifiJoins >= 1,
  },
  {
    id: 'loud-hub',
    name: 'Loud Hub',
    description: 'Hear a hub shout to everyone.',
    emoji: '1f4e1',
    earned: (c) => c.stats.hubShouts >= 1,
  },
  {
    id: 'surfer',
    name: 'Internet Surfer',
    description: 'Reach a server on the Internet.',
    emoji: '1f310',
    earned: (c) => c.stats.internetTrips >= 1,
  },
  {
    id: 'gamer',
    name: 'Online Gamer',
    description: 'Play a game online.',
    emoji: '1f47e',
    earned: (c) => c.stats.gamesPlayed >= 1,
  },
  {
    id: 'guard',
    name: 'Firewall Guard',
    description: 'Block a packet with a firewall.',
    emoji: '1f6e1',
    earned: (c) => c.stats.packetsBlocked >= 1,
  },
  {
    id: 'printing-press',
    name: 'Printing Press',
    description: 'Print something on a printer.',
    emoji: '1f5a8',
    earned: (c) => c.stats.printsDone >= 1,
  },
  {
    id: 'architect',
    name: 'Network Architect',
    description: 'Build a network with 10 devices.',
    emoji: '1f3d7',
    earned: (c) => c.stats.biggestNetwork >= 10,
  },
  {
    id: 'packet-pro',
    name: 'Packet Pro',
    description: 'Deliver 50 packets.',
    emoji: '1f680',
    earned: (c) => c.stats.packetsDelivered >= 50,
  },
  {
    id: 'halfway',
    name: 'Halfway Hero',
    description: 'Finish 6 missions.',
    emoji: '1f9ed',
    earned: (c) => missionsDone(c) >= 6,
  },
  {
    id: 'champion',
    name: 'Network Champion',
    description: 'Get 3 stars on every mission.',
    emoji: '1f3c6',
    earned: (c) => MISSIONS.every((m) => (c.missionStars[m.id] ?? 0) >= 3),
  },
  {
    id: 'collector',
    name: 'Device Collector',
    description: 'Discover every kind of device.',
    emoji: '1f4be',
    earned: (c) => c.discovered >= Object.keys(DEVICE_SPECS).length,
  },
  {
    id: 'streak-3',
    name: 'On Fire',
    description: 'Play 3 days in a row.',
    emoji: '1f525',
    earned: (c) => c.streak >= 3,
  },
  {
    id: 'royal',
    name: 'Network Royalty',
    description: 'Reach level 5.',
    emoji: '1f451',
    earned: (c) => levelForXp(c.xp) >= 5,
  },
];

export const BADGE_XP = 25;

export function newlyEarnedBadges(ctx: BadgeContext, owned: readonly string[]): Badge[] {
  return BADGES.filter((b) => !owned.includes(b.id) && b.earned(ctx));
}

export function badgeById(id: string): Badge | undefined {
  return BADGES.find((b) => b.id === id);
}
