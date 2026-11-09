import { describe, expect, it } from 'vitest';
import { installMode } from '@/services/install/installPrompt';

const browser = { standalone: false, electron: false, ios: false };
const offer = { prompt: async () => {}, userChoice: Promise.resolve({ outcome: 'accepted' as const }) };
const event = offer as unknown as Parameters<typeof installMode>[0]['event'];

describe('install button', () => {
  it('offers installing when the browser sent its install event', () => {
    expect(installMode({ event, installed: false }, browser)).toBe('prompt');
    expect(installMode({ event: null, installed: false }, browser)).toBeNull();
  });

  it('shows instructions on iPhone and iPad, which have no install event', () => {
    expect(installMode({ event: null, installed: false }, { ...browser, ios: true })).toBe('ios');
  });

  it('hides once installed, or inside the installed app or desktop app', () => {
    expect(installMode({ event, installed: true }, browser)).toBeNull();
    expect(installMode({ event, installed: false }, { ...browser, standalone: true })).toBeNull();
    expect(installMode({ event, installed: false }, { ...browser, electron: true })).toBeNull();
  });
});
