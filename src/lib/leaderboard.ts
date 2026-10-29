import type { LeaderboardRow } from '@/lib/types';

/** Wer hat diese Woche am meisten verloren? null, wenn niemand im Minus ist. */
export function weeklyLoser(rows: LeaderboardRow[]): LeaderboardRow | null {
  let loser: LeaderboardRow | null = null;
  for (const row of rows) {
    if (row.week_net < 0 && (loser === null || row.week_net < loser.week_net)) {
      loser = row;
    }
  }
  return loser;
}
