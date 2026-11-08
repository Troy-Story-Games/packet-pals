/** Read-aloud using the browser's built-in voices (works offline on Android and ChromeOS). */

const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu;

let cachedVoice: SpeechSynthesisVoice | null | undefined;

function pickVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice !== undefined) return cachedVoice;
  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) return null; // Not loaded yet; try again next time.
  const english = voices.filter((v) => v.lang.startsWith('en'));
  cachedVoice =
    english.find((v) => /female|samantha|google us english/i.test(v.name)) ?? english[0] ?? voices[0] ?? null;
  return cachedVoice;
}

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speak(text: string): void {
  if (!canSpeak()) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.replace(EMOJI, '').trim());
  const voice = pickVoice();
  if (voice) utterance.voice = voice;
  utterance.rate = 0.95;
  utterance.pitch = 1.1;
  speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (canSpeak()) speechSynthesis.cancel();
}
