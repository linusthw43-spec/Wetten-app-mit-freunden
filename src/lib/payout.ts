export type Side = 'yes' | 'no';

export type WagerInput = { userId: string; side: Side; amount: number };

/**
 * Auszahlung nach Pari-Mutuel. Muss exakt zu `resolve_bet` in
 * supabase/migrations/20261029120000_groups_bets.sql passen:
 * - Der ganze Topf geht an die Gewinnerseite, aufgeteilt nach Einsatz (abgerundet).
 * - Den Rundungsrest bekommt der Gewinner mit dem höchsten Einsatz (bei Gleichstand: kleinste userId).
 * - Hat niemand auf die Gewinnerseite gesetzt, bekommt jeder seinen Einsatz zurück.
 *
 * Gibt pro Nutzer zurück, wie viele Coins wieder aufs Konto gehen (0 = verloren).
 */
export function computePayouts(wagers: WagerInput[], outcome: Side): Map<string, number> {
  const result = new Map<string, number>();
  const pool = sum(wagers);
  const winners = wagers
    .filter((w) => w.side === outcome)
    .sort((a, b) => b.amount - a.amount || (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0));
  const winTotal = sum(winners);

  if (winTotal === 0) {
    for (const w of wagers) result.set(w.userId, w.amount);
    return result;
  }

  for (const w of wagers) result.set(w.userId, 0);
  let paid = 0;
  for (const w of winners) {
    const share = Math.floor((w.amount * pool) / winTotal);
    result.set(w.userId, share);
    paid += share;
  }
  const top = winners[0];
  result.set(top.userId, (result.get(top.userId) ?? 0) + (pool - paid));
  return result;
}

/** Was bekäme `userId` zurück, wenn `side` gewinnt und er zusätzlich `extra` setzt? */
export function previewPayout(
  wagers: WagerInput[],
  userId: string,
  side: Side,
  extra: number
): number {
  const existing = wagers.find((w) => w.userId === userId);
  const others = wagers.filter((w) => w.userId !== userId);
  const mine: WagerInput = { userId, side, amount: (existing?.amount ?? 0) + extra };
  if (mine.amount <= 0) return 0;
  return computePayouts([...others, mine], side).get(userId) ?? 0;
}

export function sum(wagers: { amount: number }[]): number {
  return wagers.reduce((total, w) => total + w.amount, 0);
}
