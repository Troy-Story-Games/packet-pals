import { create } from 'zustand';

/** Chrome's install event (not in the standard DOM typings). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallState {
  /** Saved install event; present when the browser lets us offer installing. */
  event: BeforeInstallPromptEvent | null;
  installed: boolean;
}

export const useInstall = create<InstallState>(() => ({ event: null, installed: false }));

/** How the app can be installed here: a real prompt, iPhone/iPad instructions, or not at all. */
export type InstallMode = 'prompt' | 'ios' | null;

export interface InstallEnv {
  standalone: boolean;
  electron: boolean;
  ios: boolean;
}

function detectEnv(): InstallEnv {
  if (typeof window === 'undefined') return { standalone: false, electron: false, ios: false };
  const nav = navigator as Navigator & { standalone?: boolean };
  return {
    standalone: window.matchMedia?.('(display-mode: standalone)').matches || nav.standalone === true,
    electron: /Electron/.test(nav.userAgent),
    ios: /iPad|iPhone|iPod/.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1),
  };
}

export function installMode(state: InstallState, env: InstallEnv = detectEnv()): InstallMode {
  if (state.installed || env.standalone || env.electron) return null;
  if (state.event) return 'prompt';
  // iOS has no install event; it can only be added from Safari's Share menu.
  return env.ios ? 'ios' : null;
}

/**
 * Starts listening for the browser's install offer. Call once at startup:
 * the event fires early and only once per page load.
 */
export function listenForInstall(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Keep it for our own Install button instead of the browser's banner.
    e.preventDefault();
    useInstall.setState({ event: e as BeforeInstallPromptEvent });
  });
  window.addEventListener('appinstalled', () => useInstall.setState({ event: null, installed: true }));
}

/** Shows the browser's install dialog. Resolves true if the player said yes. */
export async function promptInstall(): Promise<boolean> {
  const { event } = useInstall.getState();
  if (!event) return false;
  await event.prompt();
  const { outcome } = await event.userChoice;
  // The event can only be used once.
  useInstall.setState({ event: null, installed: outcome === 'accepted' });
  return outcome === 'accepted';
}
