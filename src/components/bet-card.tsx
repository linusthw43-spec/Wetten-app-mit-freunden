import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { Card } from '@/components/card';
import { PoolBar } from '@/components/pool-bar';
import { StatusChip } from '@/components/status-chip';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { formatCoins, formatDelta, formatRelative } from '@/lib/format';
import type { Bet } from '@/lib/types';

export function BetCard({ bet }: { bet: Bet }) {
  const { session } = useAuth();
  const mine = bet.wagers.find((w) => w.user_id === session?.user.id);

  let myLine: string | null = null;
  if (mine) {
    const side = mine.side === 'yes' ? 'Ja' : 'Nein';
    myLine =
      mine.payout === null
        ? `Dein Einsatz: ${formatCoins(mine.amount)} 🪙 auf ${side}`
        : `Dein Ergebnis: ${formatDelta(mine.payout - mine.amount)} 🪙`;
  }

  return (
    <Card onPress={() => router.push({ pathname: '/bet/[id]', params: { id: bet.id } })}>
      <View style={styles.header}>
        <StatusChip bet={bet} />
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.meta}>
          {bet.creator?.avatar_emoji} {bet.creator?.display_name} · {formatRelative(bet.created_at)}
        </ThemedText>
      </View>
      <ThemedText type="subtitle" style={styles.question}>
        {bet.question}
      </ThemedText>
      <PoolBar wagers={bet.wagers} outcome={bet.status === 'resolved' ? bet.outcome : null} />
      {myLine && (
        <ThemedText type="smallBold" themeColor="textSecondary">
          {myLine}
        </ThemedText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  meta: { flexShrink: 1 },
  question: { fontSize: 19, lineHeight: 26 },
});
