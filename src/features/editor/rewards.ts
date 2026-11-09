import type { Journey } from '@/core/sim';
import type { DeviceKind } from '@/core/sim';
import { useProgress } from '@/game/progressStore';

/**
 * XP for playing in the editor. Repeated actions only pay out a limited number
 * of times per session so the game rewards exploring, not button-mashing.
 */
const SESSION_CAPS = { packet: 25, cable: 15, device: 15 };
const counts = { packet: 0, cable: 0, device: 0 };

function capped(kind: keyof typeof counts): boolean {
  counts[kind]++;
  return counts[kind] <= SESSION_CAPS[kind];
}

export function rewardCable(): void {
  const p = useProgress.getState();
  p.bumpStat('cablesConnected');
  if (capped('cable')) p.addXp(2, 'Cable connected');
}

export function rewardDevice(totalDevices: number, inSandbox: boolean): void {
  const p = useProgress.getState();
  p.bumpStat('devicesPlaced');
  if (inSandbox) p.recordBest('biggestNetwork', totalDevices);
  if (capped('device')) p.addXp(1, 'New device');
}

export function rewardWifiJoin(): void {
  const p = useProgress.getState();
  p.bumpStat('wifiJoins');
  p.addXp(5, 'Joined WiFi!');
}

export function rewardJourney(journey: Journey, kindsOnPath: DeviceKind[], hubShout: boolean): void {
  const p = useProgress.getState();
  if (hubShout) p.bumpStat('hubShouts');
  if (journey.outcome === 'blocked') {
    p.bumpStat('packetsBlocked');
    return;
  }
  if (journey.outcome !== 'delivered') return;
  p.bumpStat('packetsDelivered');
  if (kindsOnPath.includes('internet')) p.bumpStat('internetTrips');
  if (journey.action === 'game') p.bumpStat('gamesPlayed');
  if (journey.action === 'print') p.bumpStat('printsDone');
  if (capped('packet')) p.addXp(kindsOnPath.includes('internet') ? 5 : 3, 'Packet delivered!');
}
