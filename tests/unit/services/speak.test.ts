import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** A fake speechSynthesis that records what it was asked to do. */
function fakeSpeech(busy = false) {
  const spoken: Array<{
    text: string;
    lang: string;
    voice: unknown;
    onerror: ((e: { error: string }) => void) | null;
  }> = [];
  const synth = {
    speaking: busy,
    pending: false,
    cancel: vi.fn(),
    resume: vi.fn(),
    getVoices: () => [{ name: 'Google US English', lang: 'en_US' }],
    addEventListener: vi.fn(),
    speak: vi.fn((u: (typeof spoken)[number]) => spoken.push(u)),
  };
  class Utterance {
    lang = '';
    rate = 1;
    pitch = 1;
    voice: unknown = null;
    onerror: ((e: { error: string }) => void) | null = null;
    onend: (() => void) | null = null;
    constructor(public text: string) {}
  }
  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
  vi.stubGlobal('window', { speechSynthesis: synth, setTimeout, clearTimeout });
  return { synth, spoken };
}

describe('read-aloud', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('speaks right away in US English, without emoji, when nothing is playing', async () => {
    const { synth, spoken } = fakeSpeech();
    const { speak } = await import('@/services/speech/speak');
    speak('Hello 🎉 Pip!');
    expect(synth.cancel).not.toHaveBeenCalled();
    expect(spoken[0]).toMatchObject({ text: 'Hello  Pip!', lang: 'en-US' });
    expect(spoken[0].voice).toMatchObject({ name: 'Google US English' });
  });

  it('waits a moment after cancelling, because Android drops speech queued straight after', async () => {
    vi.useFakeTimers();
    const { synth, spoken } = fakeSpeech(true);
    const { speak } = await import('@/services/speech/speak');
    speak('Second thing');
    expect(synth.cancel).toHaveBeenCalled();
    expect(spoken).toHaveLength(0);
    vi.advanceTimersByTime(200);
    expect(spoken).toHaveLength(1);
  });

  it('tries again with the default voice if the chosen one fails', async () => {
    const { spoken } = fakeSpeech();
    const { speak } = await import('@/services/speech/speak');
    speak('Hi');
    spoken[0].onerror?.({ error: 'synthesis-failed' });
    expect(spoken).toHaveLength(2);
    expect(spoken[1].voice).toBeNull();
  });

  it('reports the number of voices', async () => {
    fakeSpeech();
    const { speechStatus } = await import('@/services/speech/speak');
    expect(speechStatus()).toEqual({ supported: true, voices: 1 });
  });
});
