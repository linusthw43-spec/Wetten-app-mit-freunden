import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useBet } from '@/api/bets';
import { useGroup } from '@/api/groups';
import { useAuth } from '@/auth/auth-provider';
import { Card } from '@/components/card';
import { CreatorActions } from '@/components/creator-actions';
import { PoolBar } from '@/components/pool-bar';
import { Screen } from '@/components/screen';
import { StatusChip } from '@/components/status-chip';
import { StatusView } from '@/components/status-view';
import { ThemedText } from '@/components/themed-text';
import { WagerForm } from '@/components/wager-form';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/errors';
import { formatCoins, formatDelta, formatRelative } from '@/lib/format';
import type { Bet, Wager } from '@/lib/types';

export default function BetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const bet = useBet(id);
  const group = useGroup(bet.data?.group_id ?? '');

  if (bet.isPending) return <StatusView loading />;
  if (bet.isError) {
    return <StatusView emoji="🤷" title="Wette nicht gefunden" message={errorMessage(bet.error)} />;
  }

  const b = bet.data;
  const mine = b.wagers.find((w) => w.user_id === userId);
  const isCreator = b.creator_id === userId;
  const isRunning = b.status === 'open' || b.status === 'locked';

  return (
    <Screen
      edges={['bottom']}
      refreshing={bet.isRefetching}
      onRefresh={() => Promise.all([bet.refetch(), group.refetch()])}>
      <View style={{ gap: Spacing.two }}>
        <StatusChip bet={b} />
        <ThemedText type="title" style={styles.question}>
          {b.question}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          von {b.creator?.avatar_emoji} {b.creator?.display_name} · {formatRelative(b.created_at)}
        </ThemedText>
      </View>

      <PoolBar wagers={b.wagers} outcome={b.status === 'resolved' ? b.outcome : null} />

      {!isRunning && mine && <MyResult bet={b} wager={mine} />}

      {mine && isRunning && (
        <ThemedText themeColor="textSecondary">
          Du hast {formatCoins(mine.amount)} 🪙 auf {mine.side === 'yes' ? 'Ja' : 'Nein'} gesetzt.
        </ThemedText>
      )}

      {b.status === 'open' && group.data && (
        <Card>
          <WagerForm bet={b} userId={userId} balance={group.data.coins} />
        </Card>
      )}
      {b.status === 'locked' && (
        <ThemedText themeColor="textSecondary">
          ⏸ Einsätze sind gestoppt. Jetzt fehlt nur noch das Ergebnis.
        </ThemedText>
      )}

      {isCreator && isRunning && <CreatorActions bet={b} />}

      <WagerList bet={b} userId={userId} />
    </Screen>
  );
}

function MyResult({ bet, wager }: { bet: Bet; wager: Wager }) {
  const theme = useTheme();
  const delta = (wager.payout ?? 0) - wager.amount;
  let emoji = '↩️';
  let text = `Einsatz zurück (${formatCoins(wager.amount)} 🪙)`;
  let color = theme.textSecondary;
  if (bet.status === 'resolved' && delta > 0) {
    emoji = '🤑';
    text = `Gewonnen: ${formatDelta(delta)} 🪙`;
    color = theme.success;
  } else if (bet.status === 'resolved' && delta < 0) {
    emoji = '💸';
    text = `Verloren: ${formatDelta(delta)} 🪙`;
    color = theme.danger;
  }
  return (
    <Card style={styles.result}>
      <Text style={styles.resultEmoji}>{emoji}</Text>
      <ThemedText type="subtitle" style={{ color }}>
        {text}
      </ThemedText>
    </Card>
  );
}

function WagerList({ bet, userId }: { bet: Bet; userId: string }) {
  const theme = useTheme();
  if (bet.wagers.length === 0) {
    return <ThemedText themeColor="textSecondary">Noch hat niemand gesetzt.</ThemedText>;
  }
  const sorted = [...bet.wagers].sort((a, b) => b.amount - a.amount);
  return (
    <View style={{ gap: Spacing.two }}>
      <ThemedText type="subtitle">Einsätze</ThemedText>
      {sorted.map((w) => {
        const delta = w.payout === null ? null : w.payout - w.amount;
        return (
          <View key={w.user_id} style={styles.wagerRow}>
            <Text style={styles.wagerEmoji}>{w.profile?.avatar_emoji}</Text>
            <ThemedText style={styles.flex} numberOfLines={1}>
              {w.profile?.display_name}
              {w.user_id === userId ? ' (du)' : ''}
            </ThemedText>
            <ThemedText type="small" style={{ color: w.side === 'yes' ? theme.success : theme.danger }}>
              {w.side === 'yes' ? 'Ja' : 'Nein'}
            </ThemedText>
            <ThemedText type="smallBold" style={styles.amount}>
              {delta === null ? `${formatCoins(w.amount)} 🪙` : `${formatDelta(delta)} 🪙`}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  question: { fontSize: 26, lineHeight: 34 },
  result: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  resultEmoji: { fontSize: 40 },
  wagerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  wagerEmoji: { fontSize: 22 },
  flex: { flex: 1 },
  amount: { minWidth: 80, textAlign: 'right' },
});
