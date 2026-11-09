import arrive from '@/assets/sounds/arrive.ogg';
import blip from '@/assets/sounds/blip.ogg';
import blocked from '@/assets/sounds/blocked.ogg';
import bounce from '@/assets/sounds/bounce.ogg';
import connect from '@/assets/sounds/connect.ogg';
import drop from '@/assets/sounds/drop.ogg';
import error from '@/assets/sounds/error.ogg';
import jingleBadge from '@/assets/sounds/jingle-badge.ogg';
import jingleLevelUp from '@/assets/sounds/jingle-levelup.ogg';
import jingleWin from '@/assets/sounds/jingle-win.ogg';
import open from '@/assets/sounds/open.ogg';
import pop from '@/assets/sounds/pop.ogg';
import remove from '@/assets/sounds/remove.ogg';
import send from '@/assets/sounds/send.ogg';
import tap from '@/assets/sounds/tap.ogg';
import toggle from '@/assets/sounds/toggle.ogg';
import wifi from '@/assets/sounds/wifi.ogg';
import { useSettings } from '../settings';
import { getAudioContext } from './context';

const SOUNDS = {
  arrive,
  blip,
  blocked,
  bounce,
  connect,
  drop,
  error,
  jingleBadge,
  jingleLevelUp,
  jingleWin,
  open,
  pop,
  remove,
  send,
  tap,
  toggle,
  wifi,
} as const;

export type SoundName = keyof typeof SOUNDS;

const buffers = new Map<SoundName, Promise<AudioBuffer | null>>();

function load(name: SoundName): Promise<AudioBuffer | null> {
  let pending = buffers.get(name);
  if (!pending) {
    pending = fetch(SOUNDS[name])
      .then((r) => r.arrayBuffer())
      .then((data) => getAudioContext().decodeAudioData(data))
      .catch(() => null);
    buffers.set(name, pending);
  }
  return pending;
}

/** Warms the cache so the first tap doesn't lag. */
export function preloadSounds(): void {
  (Object.keys(SOUNDS) as SoundName[]).forEach((n) => void load(n));
}

export interface PlayOptions {
  volume?: number;
  /** Playback rate; >1 is higher-pitched. Handy for rising "combo" sounds. */
  rate?: number;
}

/** Overall loudness of sound effects, so they sit under the music and speech. */
export const SFX_MASTER = 0.55;

/** Plays a sound effect unless sound effects are muted. */
export function playSound(name: SoundName, { volume = 0.6, rate = 1 }: PlayOptions = {}): void {
  if (!useSettings.getState().sfx) return;
  void load(name).then((buffer) => {
    if (!buffer) return;
    const ctx = getAudioContext();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    const gain = ctx.createGain();
    gain.gain.value = volume * SFX_MASTER;
    source.connect(gain).connect(ctx.destination);
    source.start();
  });
}
