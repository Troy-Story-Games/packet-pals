import confetti from 'canvas-confetti';

/** A big celebratory burst from the middle of the screen. */
export function burstConfetti(): void {
  void confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 }, scalar: 1.2 });
}
