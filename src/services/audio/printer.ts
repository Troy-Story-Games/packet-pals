import { SFX_MASTER } from './sfx';
import { useSettings } from '../settings';
import { getAudioContext } from './context';

/**
 * A procedural printer sound: a motor hum under bursts of filtered noise, like
 * a print head zipping back and forth. No recording needed.
 */
export function playPrinter(): void {
  if (!useSettings.getState().sfx) return;
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.value = 0.35 * SFX_MASTER;
  out.connect(ctx.destination);

  const motor = ctx.createOscillator();
  motor.type = 'sawtooth';
  motor.frequency.value = 70;
  const motorGain = ctx.createGain();
  motorGain.gain.setValueAtTime(0, now);
  motorGain.gain.linearRampToValueAtTime(0.12, now + 0.05);
  motorGain.gain.setValueAtTime(0.12, now + 1.1);
  motorGain.gain.linearRampToValueAtTime(0, now + 1.25);
  motor.connect(motorGain).connect(out);
  motor.start(now);
  motor.stop(now + 1.3);

  const noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1.3), ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 2400;
  filter.Q.value = 2;
  const zips = ctx.createGain();
  zips.gain.setValueAtTime(0, now);
  // Six quick passes of the print head.
  for (let i = 0; i < 6; i++) {
    const t = now + 0.08 + i * 0.18;
    zips.gain.linearRampToValueAtTime(0.5, t + 0.02);
    zips.gain.linearRampToValueAtTime(0.05, t + 0.14);
  }
  zips.gain.linearRampToValueAtTime(0, now + 1.25);
  source.connect(filter).connect(zips).connect(out);
  source.start(now);
  source.stop(now + 1.3);
}
