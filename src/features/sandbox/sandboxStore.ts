import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createDevice, exportNetwork, importNetwork, type Network, type SavedNetwork } from '@/core/sim';
import { persistStorage } from '@/services/storage/safeStorage';

/** A friendly starting point so the sandbox is never an empty void. */
export function starterNetwork(): Network {
  const pc = createDevice('computer', 120, 260);
  const laptop = createDevice('laptop', 420, 260);
  return { devices: [pc, laptop], links: [] };
}

interface SandboxState {
  saved: SavedNetwork | null;
  save: (network: Network) => void;
  restore: () => Network;
}

/** Autosaved sandbox network, kept in the browser. */
export const useSandbox = create<SandboxState>()(
  persist(
    (set, get) => ({
      saved: null,
      save: (network) => set({ saved: exportNetwork(network) }),
      restore: () => (get().saved && importNetwork(get().saved)) || starterNetwork(),
    }),
    { name: 'kidsdn-sandbox', storage: persistStorage },
  ),
);
