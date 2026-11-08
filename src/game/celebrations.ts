import { useEffect } from 'react';
import { create } from 'zustand';

export type Celebration =
  | { kind: 'xp'; amount: number; label: string }
  | { kind: 'levelUp'; level: number }
  | { kind: 'badge'; badgeId: string };

interface CelebrationQueue {
  queue: Array<Celebration & { id: number }>;
  /**
   * While above zero, level-up and badge pop-ups wait in the queue so they don't
   * cover something the kid is watching (a packet animation, a results card...).
   */
  holds: number;
  push: (c: Celebration) => void;
  dismiss: (id: number) => void;
  /** Delay pop-ups until the returned release function is called. Safe to call twice. */
  hold: () => () => void;
}

let nextId = 1;

/** Transient (not persisted) queue of toasts and pop-ups for rewards. */
export const useCelebrations = create<CelebrationQueue>()((set) => ({
  queue: [],
  holds: 0,
  push: (c) => set((s) => ({ queue: [...s.queue, { ...c, id: nextId++ }] })),
  dismiss: (id) => set((s) => ({ queue: s.queue.filter((c) => c.id !== id) })),
  hold: () => {
    set((s) => ({ holds: s.holds + 1 }));
    let released = false;
    return () => {
      if (released) return;
      released = true;
      set((s) => ({ holds: Math.max(0, s.holds - 1) }));
    };
  },
}));

/** Hold pop-ups for `ms` milliseconds, e.g. while a short animation plays. */
export function holdCelebrationsFor(ms: number): void {
  const release = useCelebrations.getState().hold();
  window.setTimeout(release, ms);
}

/** Hold pop-ups for as long as `active` is true (and the component is mounted). */
export function useCelebrationHold(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    return useCelebrations.getState().hold();
  }, [active]);
}
