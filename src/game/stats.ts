/** Counters the game tracks; badges are derived from these. */
export interface Stats {
  packetsDelivered: number;
  packetsBlocked: number;
  cablesConnected: number;
  wifiJoins: number;
  devicesPlaced: number;
  internetTrips: number;
  gamesPlayed: number;
  hubShouts: number;
  /** Most devices ever in the sandbox at once. */
  biggestNetwork: number;
}

export type StatKey = keyof Stats;

export const EMPTY_STATS: Stats = {
  packetsDelivered: 0,
  packetsBlocked: 0,
  cablesConnected: 0,
  wifiJoins: 0,
  devicesPlaced: 0,
  internetTrips: 0,
  gamesPlayed: 0,
  hubShouts: 0,
  biggestNetwork: 0,
};
