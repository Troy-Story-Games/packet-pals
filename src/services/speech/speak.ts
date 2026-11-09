/**
 * Read-aloud using the browser's built-in voices (works offline on Android and ChromeOS).
 *
 * Chrome on Android has a few quirks this works around: voices load late, speech
 * queued straight after cancel() is dropped, an utterance can be garbage-collected
 * mid-sentence, and a voice it can't use fails silently unless `lang` is set.
 */

const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu;
const LANG = 'en-US';
/** Android drops speech queued right after cancel(), so wait a moment first. */
const AFTER_CANCEL_MS = 120;

let cachedVoice: SpeechSynthesisVoice | null = null;
/** Kept so the browser can't garbage-collect it while it is speaking. */
let current: SpeechSynthesisUtterance | null = null;
let pending: number | undefined;

function pickVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;
  const voices = speechSynthesis.getVoices();
  const english = voices.filter((v) => v.lang.replace('_', '-').startsWith('en'));
  cachedVoice =
    english.find((v) => /female|samantha|google us english/i.test(v.name)) ??
    english.find((v) => v.lang.replace('_', '-') === LANG) ??
    english[0] ??
    null;
  return cachedVoice;
}

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

if (canSpeak()) {
  // Voices often arrive after page load (always on Android); pick again when they do.
  speechSynthesis.addEventListener?.('voiceschanged', () => {
    cachedVoice = null;
    pickVoice();
  });
}

/** Whether read-aloud is available, for the About page. */
export function speechStatus(): { supported: boolean; voices: number } {
  if (!canSpeak()) return { supported: false, voices: 0 };
  return { supported: true, voices: speechSynthesis.getVoices().length };
}

function utter(text: string, withVoice: boolean): void {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = LANG;
  utterance.rate = 0.95;
  utterance.pitch = 1.1;
  const voice = withVoice ? pickVoice() : null;
  if (voice) utterance.voice = voice;
  // Some devices list voices they can't actually use: try again with the default one.
  utterance.onerror = (e) => {
    if (withVoice && voice && e.error !== 'interrupted' && e.error !== 'canceled') utter(text, false);
  };
  utterance.onend = () => {
    if (current === utterance) current = null;
  };
  current = utterance;
  speechSynthesis.resume();
  speechSynthesis.speak(utterance);
}

export function speak(text: string): void {
  if (!canSpeak()) return;
  const clean = text.replace(EMOJI, '').trim();
  if (!clean) return;
  window.clearTimeout(pending);
  if (speechSynthesis.speaking || speechSynthesis.pending) {
    speechSynthesis.cancel();
    pending = window.setTimeout(() => utter(clean, true), AFTER_CANCEL_MS);
  } else {
    utter(clean, true);
  }
}

export function stopSpeaking(): void {
  if (!canSpeak()) return;
  window.clearTimeout(pending);
  current = null;
  speechSynthesis.cancel();
}
