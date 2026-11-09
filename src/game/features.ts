import { MISSIONS } from './missions/catalogue';

/** Advanced abilities that unlock by finishing the mission that teaches them. */
export type Feature =
  | 'cell'
  | 'dnsServer'
  | 'dnsNames'
  | 'terminal'
  | 'doors'
  | 'hostGames'
  | 'guestWifi'
  | 'vlans'
  | 'arp'
  | 'vpn';

export const FEATURE_MISSION: Record<Feature, string> = {
  cell: 'phone-home',
  dnsServer: 'phone-book',
  terminal: 'network-detective',
  dnsNames: 'my-website',
  doors: 'door-numbers',
  hostGames: 'game-night',
  guestWifi: 'guest-wifi',
  vlans: 'team-colors',
  arp: 'who-has',
  vpn: 'reach-home',
};

export const ALL_FEATURES = Object.keys(FEATURE_MISSION) as Feature[];

export interface FeatureLock {
  level: number;
  missionNumber: number;
  title: string;
}

/** What it takes to unlock a feature, for lock labels like "Level 8 · Mission 17: Door Numbers". */
export function featureLock(feature: Feature): FeatureLock {
  const index = MISSIONS.findIndex((m) => m.id === FEATURE_MISSION[feature]);
  const mission = MISSIONS[index];
  return { level: mission.minLevel ?? 1, missionNumber: index + 1, title: mission.title };
}

export function isFeatureUnlocked(feature: Feature, missionStars: Record<string, number>): boolean {
  return FEATURE_MISSION[feature] in missionStars;
}

export function unlockedFeatures(missionStars: Record<string, number>): Feature[] {
  return ALL_FEATURES.filter((f) => isFeatureUnlocked(f, missionStars));
}
