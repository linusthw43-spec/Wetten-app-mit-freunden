import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useLeaderboard } from '@/api/groups';
import { useAuth } from '@/auth/auth-provider';
import { Card } from '@/components/card';
import { Coins } from '@/components/coins';
import { Screen } from '@/components/screen';
import { StatusView } from '@/components/status-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/errors';
import { formatDelta } from '@/lib/format';
import { weeklyLoser } from '@/lib/leaderboard';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const theme = useTheme();
  const board = useLeaderboard(id);

  if (board.isPending) return <StatusView loading />;
  if (board.isError) {
    return <StatusView emoji="📡" title="Laden fehlgeschlagen" message={errorMessage(board.error)} />;
  }

  const loser = weeklyLoser(board.data);

  return (
    <Screen edges={['bottom']} refreshing={board.isRefetching} onRefresh={board.refetch}>
      <Card style={styles.loserCard}>
        <Text style={styles.loserEmoji}>{loser ? '🤡' : '😇'}</Text>
        <View style={styles.flex}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            VERLIERER DER WOCHE
          </ThemedText>
          {loser ? (
            <>
              <ThemedText type="subtitle">
                {loser.avatar_emoji} {loser.display_name}
              </ThemedText>
              <ThemedText style={{ color: theme.danger }}>{formatDelta(loser.week_net)} 🪙 diese Woche</ThemedText>
            </>
          ) : (
            <ThemedText>Diese Woche hat noch keiner verloren.</ThemedText>
          )}
        </View>
      </Card>

      {board.data.map((row, index) => {
        const isMe = row.user_id === session?.user.id;
        return (
          <Card
            key={row.user_id}
            style={[styles.row, isMe && { borderWidth: 2, borderColor: theme.accent }]}>
            <ThemedText type="subtitle" style={styles.rank}>
              {MEDALS[index] ?? `${index + 1}.`}
            </ThemedText>
            <Text style={styles.avatar}>{row.avatar_emoji}</Text>
            <View style={styles.flex}>
              <ThemedText type="default" numberOfLines={1} style={{ fontWeight: 700 }}>
                {row.display_name}
                {isMe ? ' (du)' : ''}
              </ThemedText>
              {row.week_net !== 0 && (
                <ThemedText
                  type="small"
                  style={{ color: row.week_net > 0 ? theme.success : theme.danger }}>
                  {formatDelta(row.week_net)} diese Woche
                </ThemedText>
              )}
            </View>
            <Coins value={row.coins} type="smallBold" />
          </Card>
        );
      })}

      <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
        „Diese Woche“ zählt alle Wetten, die seit Montag ausgewertet wurden.
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loserCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  loserEmoji: { fontSize: 48 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  rank: { width: 40, textAlign: 'center' },
  avatar: { fontSize: 28 },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
});
