import { expect, it } from '@jest/globals';

import { weeklyLoser } from './leaderboard';
import type { LeaderboardRow } from './types';

const row = (name: string, week_net: number): LeaderboardRow => ({
  user_id: name,
  display_name: name,
  avatar_emoji: '😎',
  coins: 1000,
  week_net,
});

it('findet den größten Verlust der Woche', () => {
  expect(weeklyLoser([row('a', 50), row('b', -350), row('c', -20)])?.display_name).toBe('b');
});

it('gibt null zurück, wenn niemand im Minus ist', () => {
  expect(weeklyLoser([row('a', 0), row('b', 10)])).toBeNull();
  expect(weeklyLoser([])).toBeNull();
});
