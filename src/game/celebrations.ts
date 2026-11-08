import { create } from 'zustand';

export type Celebration =
  | { kind: 'xp'; amount: number; label: string }
  | { kind: 'levelUp'; level: number }
  | { kind: 'badge'; badgeId: string };

interface CelebrationQueue {
  queue: Array<Celebration & { id: number }>;
  push: (c: Celebration) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

/** Transient (not persisted) queue of toasts and pop-ups for rewards. */
export const useCelebrations = create<CelebrationQueue>()((set) => ({
  queue: [],
  push: (c) => set((s) => ({ queue: [...s.queue, { ...c, id: nextId++ }] })),
  dismiss: (id) => set((s) => ({ queue: s.queue.filter((c) => c.id !== id) })),
}));
