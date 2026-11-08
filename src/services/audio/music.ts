import { getAudioContext } from './context';

/**
 * Procedural chiptune background music. Nothing is pre-recorded: each bar picks
 * notes at random from a cheerful pentatonic scale over a looping chord
 * progression, so the music never repeats exactly and needs no audio files.
 */

const BPM = 112;
const STEP = 60 / BPM / 2; // eighth notes
const LOOKAHEAD = 0.25;
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16]; // major pentatonic, two octaves-ish
const PROGRESSION = [0, 7, 9, 5]; // I - V - vi - IV, in semitones from the root
const ROOT_MIDI = 60;

let timer: number | null = null;
let master: GainNode | null = null;
let nextTime = 0;
let step = 0;

function freq(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

function note(
  ctx: AudioContext,
  out: AudioNode,
  midi: number,
  time: number,
  length: number,
  type: OscillatorType,
  vol: number,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq(midi);
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(vol, time + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, time + length);
  osc.connect(gain).connect(out);
  osc.start(time);
  osc.stop(time + length + 0.05);
}

function schedule(): void {
  const ctx = getAudioContext();
  if (!master) return;
  while (nextTime < ctx.currentTime + LOOKAHEAD) {
    const bar = Math.floor(step / 8) % PROGRESSION.length;
    const chordRoot = ROOT_MIDI + PROGRESSION[bar];
    const beat = step % 8;

    if (beat % 2 === 0)
      note(ctx, master, chordRoot - 24 + (beat === 4 ? 7 : 0), nextTime, STEP * 1.8, 'triangle', 0.35);
    if (Math.random() < 0.7) {
      const degree = SCALE[Math.floor(Math.random() * SCALE.length)];
      note(ctx, master, chordRoot + degree, nextTime, STEP * 0.9, 'square', 0.07);
    }
    if (beat === 0 || beat === 4) note(ctx, master, chordRoot + 12, nextTime, STEP * 3, 'sine', 0.05);

    nextTime += STEP;
    step++;
  }
}

export function startMusic(): void {
  if (timer !== null) return;
  const ctx = getAudioContext();
  master = ctx.createGain();
  master.gain.value = 0.25;
  master.connect(ctx.destination);
  nextTime = ctx.currentTime + 0.1;
  step = 0;
  timer = window.setInterval(schedule, 100);
}

export function stopMusic(): void {
  if (timer !== null) window.clearInterval(timer);
  timer = null;
  master?.disconnect();
  master = null;
}
