import { describe, expect, it } from 'vitest';
import { useCelebrations } from '@/game/celebrations';

describe('celebration holds', () => {
  it('counts nested holds and ignores double releases', () => {
    const { hold } = useCelebrations.getState();
    const a = hold();
    const b = hold();
    expect(useCelebrations.getState().holds).toBe(2);
    a();
    a();
    expect(useCelebrations.getState().holds).toBe(1);
    b();
    expect(useCelebrations.getState().holds).toBe(0);
  });
});
