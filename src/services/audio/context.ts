let context: AudioContext | null = null;

/** Shared AudioContext. Browsers start it suspended until the first user gesture. */
export function getAudioContext(): AudioContext {
  if (!context) context = new AudioContext();
  if (context.state === 'suspended') void context.resume();
  return context;
}

/** Call once at startup: starts audio on the first tap anywhere, then runs `onUnlock`. */
export function unlockAudioOnGesture(onUnlock?: () => void): void {
  const unlock = () => {
    getAudioContext();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
    onUnlock?.();
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}
