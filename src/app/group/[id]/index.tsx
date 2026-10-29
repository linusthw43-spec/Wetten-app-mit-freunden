import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useBets } from '@/api/bets';
import { useGroup } from '@/api/groups';
import { BetCard } from '@/components/bet-card';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Coins } from '@/components/coins';
import { Screen } from '@/components/screen';
import { StatusView } from '@/components/status-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { errorMessage } from '@/lib/errors';
import { shareInvite } from '@/lib/invite';

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = useGroup(id);
  const bets = useBets(id);

  const refetchAll = () => Promise.all([group.refetch(), bets.refetch()]);
  useRefreshOnFocus(refetchAll);

  if (group.isPending) return <StatusView loading />;
  if (group.isError) {
    return <StatusView emoji="🤷" title="Gruppe nicht gefunden" message={errorMessage(group.error)} />;
  }

  const g = group.data;
  const running = bets.data?.filter((b) => b.status === 'open' || b.status === 'locked') ?? [];
  const finished = bets.data?.filter((b) => b.status === 'resolved' || b.status === 'cancelled') ?? [];

  return (
    <Screen
      edges={['bottom']}
      refreshing={group.isRefetching || bets.isRefetching}
      onRefresh={refetchAll}>
      <Stack.Screen options={{ title: `${g.emoji} ${g.name}` }} />

      <Card>
        <ThemedText type="small" themeColor="textSecondary">
          Dein Guthaben in dieser Gruppe
        </ThemedText>
        <Coins value={g.coins} type="title" />
        <View style={styles.row}>
          <Button
            title="🏆 Rangliste"
            variant="secondary"
            style={styles.flex}
            onPress={() => router.push({ pathname: '/group/[id]/leaderboard', params: { id } })}
          />
          <Button title="📨 Einladen" variant="secondary" style={styles.flex} onPress={() => shareInvite(g)} />
        </View>
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          Einladungscode: <ThemedText type="smallBold">{g.invite_code}</ThemedText>
        </ThemedText>
      </Card>

      <Button
        title="＋ Neue Wette"
        onPress={() => router.push({ pathname: '/bet/new', params: { groupId: id } })}
      />

      {bets.isPending ? (
        <StatusView loading />
      ) : bets.isError ? (
        <StatusView emoji="📡" title="Wetten konnten nicht geladen werden" message={errorMessage(bets.error)} />
      ) : bets.data.length === 0 ? (
        <StatusView emoji="🤝" title="Noch keine Wetten" message="Wer traut sich als Erstes?" />
      ) : (
        <>
          {running.length > 0 && <ThemedText type="subtitle">Laufend</ThemedText>}
          {running.map((bet) => (
            <BetCard key={bet.id} bet={bet} />
          ))}
          {finished.length > 0 && <ThemedText type="subtitle">Vorbei</ThemedText>}
          {finished.map((bet) => (
            <BetCard key={bet.id} bet={bet} />
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
});
