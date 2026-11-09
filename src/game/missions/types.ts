import type { Command, DeviceKind, Journey, Network, Topology } from '@/core/sim';
import type { Feature } from '../features';

/** A packet that was sent during a mission, with the kinds of devices it passed through. */
export interface HistoryEntry {
  journey: Journey;
  kindsOnPath: DeviceKind[];
  /** Set when the packet was sent from the terminal. */
  command?: Command;
}

export interface MissionContext {
  network: Network;
  topo: Topology;
  history: HistoryEntry[];
}

export interface Mission {
  id: string;
  title: string;
  /** Twemoji code point for the mission card. */
  emoji: string;
  /** What Pip says when the mission starts. */
  story: string;
  /** The goal, shown on the goal card. */
  goal: string;
  hints: string[];
  /** Device kinds the toolbox offers during the mission. */
  tools: DeviceKind[];
  setup: () => Network;
  check: (ctx: MissionContext) => boolean;
  /** What the kid just learned, shown when the mission is complete. */
  lesson: string;
  /** Seconds for a timed mission; stars are then based on time. */
  timeLimit?: number;
  /** Chapter on the mission map. */
  chapter: 1 | 2;
  /** Player level needed to start the mission. */
  minLevel?: number;
  /** Advanced features switched on while playing this mission. */
  features?: Feature[];
}
