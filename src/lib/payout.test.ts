import { describe, expect, it } from '@jest/globals';

import { computePayouts, previewPayout, type WagerInput } from './payout';

const total = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0);

describe('computePayouts', () => {
  // Gleiches Szenario wie supabase/tests/test_groups_bets.sql (Wette 1)
  const wagers: WagerInput[] = [
    { userId: 'bob', side: 'yes', amount: 350 },
    { userId: 'carl', side: 'no', amount: 100 },
    { userId: 'alice', side: 'no', amount: 101 },
  ];

  it('verteilt den Topf nach Einsatz und gibt den Rest dem höchsten Einsatz', () => {
    const result = computePayouts(wagers, 'no');
    expect(result.get('alice')).toBe(277);
    expect(result.get('carl')).toBe(274);
    expect(result.get('bob')).toBe(0);
    expect(total(result)).toBe(551);
  });

  it('gibt alles zurück, wenn niemand auf die Gewinnerseite gesetzt hat', () => {
    const only = [{ userId: 'bob', side: 'yes', amount: 100 } as const];
    expect(computePayouts([...only], 'no').get('bob')).toBe(100);
  });

  it('gibt den Einsatz zurück, wenn alle auf dieselbe Seite gesetzt haben', () => {
    const same: WagerInput[] = [
      { userId: 'a', side: 'yes', amount: 30 },
      { userId: 'b', side: 'yes', amount: 70 },
    ];
    const result = computePayouts(same, 'yes');
    expect(result.get('a')).toBe(30);
    expect(result.get('b')).toBe(70);
  });

  it('löst Gleichstand beim Rest über die kleinere userId auf', () => {
    const tie: WagerInput[] = [
      { userId: 'z', side: 'yes', amount: 1 },
      { userId: 'y', side: 'yes', amount: 1 },
      { userId: 'x', side: 'no', amount: 1 },
    ];
    const result = computePayouts(tie, 'yes');
    expect(result.get('y')).toBe(2);
    expect(result.get('z')).toBe(1);
    expect(total(result)).toBe(3);
  });

  it('verliert nie Coins (Zufallstest)', () => {
    for (let run = 0; run < 500; run++) {
      const list: WagerInput[] = Array.from({ length: 1 + (run % 7) }, (_, i) => ({
        userId: `u${i}`,
        side: (run * 31 + i * 17) % 3 === 0 ? 'no' : 'yes',
        amount: 1 + ((run * 97 + i * 13) % 500),
      }));
      for (const outcome of ['yes', 'no'] as const) {
        expect(total(computePayouts(list, outcome))).toBe(list.reduce((s, w) => s + w.amount, 0));
      }
    }
  });
});

describe('previewPayout', () => {
  it('rechnet den neuen Einsatz zum bestehenden dazu', () => {
    const wagers: WagerInput[] = [
      { userId: 'me', side: 'yes', amount: 50 },
      { userId: 'other', side: 'no', amount: 100 },
    ];
    // ich hätte 100 auf Ja, Topf 200 -> alles für mich
    expect(previewPayout(wagers, 'me', 'yes', 50)).toBe(200);
  });

  it('ist 0 ohne Einsatz', () => {
    expect(previewPayout([], 'me', 'yes', 0)).toBe(0);
  });
});
