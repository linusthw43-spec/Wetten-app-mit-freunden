import { expect, it } from '@jest/globals';

import { formatCoins, formatDelta, formatRelative } from './format';

it('formatiert Coins mit Tausenderpunkt', () => {
  expect(formatCoins(0)).toBe('0');
  expect(formatCoins(999)).toBe('999');
  expect(formatCoins(1250)).toBe('1.250');
  expect(formatCoins(1234567)).toBe('1.234.567');
  expect(formatCoins(-3500)).toBe('-3.500');
});

it('formatiert Differenzen mit Vorzeichen', () => {
  expect(formatDelta(176)).toBe('+176');
  expect(formatDelta(-350)).toBe('-350');
  expect(formatDelta(0)).toBe('±0');
});

it('formatiert relative Zeiten', () => {
  const now = new Date('2026-10-29T12:00:00Z');
  expect(formatRelative('2026-10-29T11:59:30Z', now)).toBe('gerade eben');
  expect(formatRelative('2026-10-29T11:55:00Z', now)).toBe('vor 5 Min.');
  expect(formatRelative('2026-10-29T09:00:00Z', now)).toBe('vor 3 Std.');
  expect(formatRelative('2026-10-28T11:00:00Z', now)).toBe('gestern');
  expect(formatRelative('2026-10-26T11:00:00Z', now)).toBe('vor 3 Tagen');
});
