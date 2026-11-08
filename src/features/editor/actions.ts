import type { Action } from '@/core/sim';

/** How each packet action looks in the run panel and on the wire. */
export const ACTION_INFO: Record<
  Action,
  { label: string; emoji: string; color: string; needsTarget: boolean }
> = {
  ping: { label: 'Ping', emoji: '1f3d3', color: '#facc15', needsTarget: true },
  message: { label: 'Message', emoji: '1f4ac', color: '#38bdf8', needsTarget: true },
  video: { label: 'Video', emoji: '1f3ac', color: '#ef4444', needsTarget: false },
  game: { label: 'Game', emoji: '1f47e', color: '#a855f7', needsTarget: false },
  web: { label: 'Website', emoji: '1f310', color: '#22c55e', needsTarget: false },
  print: { label: 'Print', emoji: '1f5a8', color: '#f97316', needsTarget: true },
};

export const ACTIONS: Action[] = ['ping', 'message', 'video', 'game', 'web', 'print'];

/** Milliseconds for one hop of a packet animation. */
export const STEP_MS = 750;

/** Layout constants shared by nodes and WiFi range drawing. */
export const NODE_WIDTH = 124;
export const ART_CENTER_Y = 46;
