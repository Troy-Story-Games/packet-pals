import type { DeviceKind } from '@/core/sim';
import { MISSIONS } from './missions/catalogue';

/** Sandbox devices that unlock by finishing a mission (others are always available). */
const UNLOCKED_BY: Partial<Record<DeviceKind, string>> = {
  router: 'home-router',
  internet: 'hello-internet',
  videoServer: 'hello-internet',
  webServer: 'fix-address',
  gameServer: 'too-far',
  console: 'too-far',
  firewall: 'bedtime',
};

export const SANDBOX_KINDS: DeviceKind[] = [
  'computer',
  'laptop',
  'tablet',
  'printer',
  'console',
  'hub',
  'switch',
  'router',
  'firewall',
  'internet',
  'videoServer',
  'gameServer',
  'webServer',
];

/** The mission that unlocks `kind`, or undefined if it's always available. */
export function unlockMission(kind: DeviceKind): { id: string; number: number; title: string } | undefined {
  const id = UNLOCKED_BY[kind];
  if (!id) return undefined;
  const index = MISSIONS.findIndex((m) => m.id === id);
  return { id, number: index + 1, title: MISSIONS[index].title };
}

export function isKindUnlocked(kind: DeviceKind, missionStars: Record<string, number>): boolean {
  const mission = unlockMission(kind);
  return !mission || mission.id in missionStars;
}

/** A mission is playable once the previous one is finished. */
export function isMissionUnlocked(index: number, missionStars: Record<string, number>): boolean {
  return index === 0 || MISSIONS[index - 1].id in missionStars;
}
