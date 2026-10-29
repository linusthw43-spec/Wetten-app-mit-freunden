import { describe, expect, it } from '@jest/globals';

import { canShowInterstitial } from './frequency';

const MIN = 60 * 1000;

describe('canShowInterstitial', () => {
  it('zeigt nichts in der ersten Minute nach dem Start', () => {
    expect(canShowInterstitial({ now: 59_000, appStartedAt: 0, lastShownAt: null })).toBe(false);
    expect(canShowInterstitial({ now: 60_000, appStartedAt: 0, lastShownAt: null })).toBe(true);
  });

  it('hält 3 Minuten Abstand zum letzten Interstitial', () => {
    const base = { appStartedAt: 0, lastShownAt: 10 * MIN };
    expect(canShowInterstitial({ ...base, now: 12 * MIN })).toBe(false);
    expect(canShowInterstitial({ ...base, now: 13 * MIN - 1 })).toBe(false);
    expect(canShowInterstitial({ ...base, now: 13 * MIN })).toBe(true);
  });
});
