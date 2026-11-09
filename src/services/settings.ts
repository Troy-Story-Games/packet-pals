import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage } from './storage/safeStorage';

interface SettingsState {
  sfx: boolean;
  music: boolean;
  /** Read explanations aloud automatically when a new step appears. */
  autoSpeak: boolean;
  /** Show the hidden helpers (ARP "who has?" shouts) once unlocked. */
  helpers: boolean;
  toggle: (key: 'sfx' | 'music' | 'autoSpeak' | 'helpers') => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      sfx: true,
      music: false,
      autoSpeak: false,
      helpers: false,
      toggle: (key) => set((s) => ({ [key]: !s[key] })),
    }),
    { name: 'kidsdn-settings', storage: persistStorage },
  ),
);
