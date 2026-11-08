import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage } from '@/services/storage/safeStorage';
import { BADGE_XP, newlyEarnedBadges } from './badges';
import { useCelebrations } from './celebrations';
import { levelForXp } from './levels';
import { EMPTY_STATS, type StatKey, type Stats } from './stats';
import { today, visitStreak, type Streak } from './streak';

export const MISSION_XP_PER_STAR = 20;

interface ProgressData {
  xp: number;
  stats: Stats;
  missionStars: Record<string, number>;
  badges: string[];
  streak: Streak;
  /** Device kinds the player has met, for the Network Book. */
  discovered: string[];
}

interface ProgressActions {
  addXp: (amount: number, label: string) => void;
  bumpStat: (key: StatKey, by?: number) => void;
  recordBest: (key: StatKey, value: number) => void;
  /** Records a finished mission; only improvements earn more XP. */
  completeMission: (missionId: string, stars: number) => void;
  /** Adds device kinds to the Network Book; new ones earn XP. */
  discover: (kinds: string[]) => void;
  checkIn: () => void;
  importSave: (data: unknown) => boolean;
  reset: () => void;
}

export type ProgressState = ProgressData & ProgressActions;

const INITIAL: ProgressData = {
  xp: 0,
  stats: EMPTY_STATS,
  missionStars: {},
  badges: [],
  streak: { count: 0, lastDay: null },
  discovered: [],
};

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => {
      const celebrate = useCelebrations.getState().push;

      const gainXp = (amount: number, label: string) => {
        const before = levelForXp(get().xp);
        set((s) => ({ xp: s.xp + amount }));
        celebrate({ kind: 'xp', amount, label });
        const after = levelForXp(get().xp);
        if (after > before) celebrate({ kind: 'levelUp', level: after });
        awardBadges();
      };

      const awardBadges = () => {
        const s = get();
        const earned = newlyEarnedBadges(
          {
            stats: s.stats,
            xp: s.xp,
            missionStars: s.missionStars,
            streak: s.streak.count,
            discovered: s.discovered.length,
          },
          s.badges,
        );
        if (earned.length === 0) return;
        set({ badges: [...s.badges, ...earned.map((b) => b.id)] });
        for (const badge of earned) {
          celebrate({ kind: 'badge', badgeId: badge.id });
          gainXp(BADGE_XP, badge.name);
        }
      };

      return {
        ...INITIAL,
        addXp: gainXp,
        bumpStat: (key, by = 1) => {
          set((s) => ({ stats: { ...s.stats, [key]: s.stats[key] + by } }));
          awardBadges();
        },
        recordBest: (key, value) => {
          if (value <= get().stats[key]) return;
          set((s) => ({ stats: { ...s.stats, [key]: value } }));
          awardBadges();
        },
        completeMission: (missionId, stars) => {
          const previous = get().missionStars[missionId] ?? 0;
          set((s) => ({ missionStars: { ...s.missionStars, [missionId]: Math.max(previous, stars) } }));
          gainXp(20 + Math.max(0, stars - previous) * MISSION_XP_PER_STAR, 'Mission complete!');
        },
        discover: (kinds) => {
          const fresh = [...new Set(kinds)].filter((k) => !get().discovered.includes(k));
          if (fresh.length === 0) return;
          set((s) => ({ discovered: [...s.discovered, ...fresh] }));
          gainXp(5 * fresh.length, fresh.length === 1 ? 'New device discovered!' : 'New devices discovered!');
        },
        checkIn: () => {
          set((s) => ({ streak: visitStreak(s.streak, today()) }));
          awardBadges();
        },
        importSave: (data) => {
          if (!isProgressData(data)) return false;
          set({ ...INITIAL, ...data, stats: { ...EMPTY_STATS, ...data.stats } });
          return true;
        },
        reset: () => set(INITIAL),
      };
    },
    {
      name: 'kidsdn-progress',
      version: 1,
      storage: persistStorage,
      partialize: ({ xp, stats, missionStars, badges, streak, discovered }) => ({
        xp,
        stats,
        missionStars,
        badges,
        streak,
        discovered,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ProgressData>;
        return { ...current, ...p, stats: { ...EMPTY_STATS, ...p.stats } };
      },
    },
  ),
);

function isProgressData(value: unknown): value is ProgressData {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.xp === 'number' && typeof v.stats === 'object' && Array.isArray(v.badges);
}

export function exportSave(): ProgressData {
  const { xp, stats, missionStars, badges, streak, discovered } = useProgress.getState();
  return { xp, stats, missionStars, badges, streak, discovered };
}

export const useLevel = () => useProgress((s) => levelForXp(s.xp));
