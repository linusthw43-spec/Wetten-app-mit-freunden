import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatCoins } from '@/lib/format';
import type { Side } from '@/lib/payout';
import type { Wager } from '@/lib/types';

type PoolBarProps = { wagers: Pick<Wager, 'side' | 'amount'>[]; outcome?: Side | null };

/** Zeigt, wie viele Coins auf Ja bzw. Nein liegen. */
export function PoolBar({ wagers, outcome }: PoolBarProps) {
  const theme = useTheme();
  const yes = wagers.filter((w) => w.side === 'yes');
  const no = wagers.filter((w) => w.side === 'no');
  const yesSum = yes.reduce((s, w) => s + w.amount, 0);
  const noSum = no.reduce((s, w) => s + w.amount, 0);
  const total = yesSum + noSum;
  const yesShare = total === 0 ? 0.5 : yesSum / total;
  const dim = (side: Side) => (outcome && outcome !== side ? 0.35 : 1);

  return (
    <View style={styles.root}>
      <View style={[styles.bar, { backgroundColor: theme.backgroundSelected }]}>
        <View style={{ flex: yesShare, backgroundColor: theme.success, opacity: dim('yes') }} />
        <View style={{ flex: 1 - yesShare, backgroundColor: theme.danger, opacity: dim('no') }} />
      </View>
      <View style={styles.labels}>
        <ThemedText type="small" style={{ opacity: dim('yes') }}>
          ✅ Ja · {formatCoins(yesSum)} 🪙 ({yes.length})
        </ThemedText>
        <ThemedText type="small" style={{ opacity: dim('no') }}>
          ({no.length}) {formatCoins(noSum)} 🪙 · Nein ❌
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.one },
  bar: { height: 10, borderRadius: Radius.small, overflow: 'hidden', flexDirection: 'row' },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
});
