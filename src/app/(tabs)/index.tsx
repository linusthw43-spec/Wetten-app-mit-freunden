import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useMyGroups } from '@/api/groups';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Coins } from '@/components/coins';
import { Screen } from '@/components/screen';
import { StatusView } from '@/components/status-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { errorMessage } from '@/lib/errors';

export default function GroupsScreen() {
  const groups = useMyGroups();
  useRefreshOnFocus(groups.refetch);

  return (
    <Screen edges={['top']} refreshing={groups.isRefetching} onRefresh={groups.refetch}>
      <ThemedText type="title">Deine Gruppen</ThemedText>

      <View style={styles.actions}>
        <Button title="＋ Gruppe erstellen" style={styles.flex} onPress={() => router.push('/group/new')} />
        <Button
          title="Beitreten"
          variant="secondary"
          style={styles.flex}
          onPress={() => router.push('/join')}
        />
      </View>

      {groups.isPending ? (
        <StatusView loading />
      ) : groups.isError ? (
        <StatusView
          emoji="📡"
          title="Laden fehlgeschlagen"
          message={errorMessage(groups.error)}
          action={<Button title="Nochmal" onPress={() => groups.refetch()} />}
        />
      ) : groups.data.length === 0 ? (
        <StatusView
          emoji="🎲"
          title="Noch keine Gruppe"
          message="Erstell eine Gruppe und lad deine Freunde ein, oder tritt mit einem Einladungscode bei."
        />
      ) : (
        groups.data.map((group) => (
          <Card
            key={group.id}
            style={styles.row}
            onPress={() => router.push({ pathname: '/group/[id]', params: { id: group.id } })}>
            <Text style={styles.emoji}>{group.emoji}</Text>
            <View style={styles.flex}>
              <ThemedText type="subtitle" numberOfLines={1}>
                {group.name}
              </ThemedText>
              <Coins value={group.coins} type="small" themeColor="textSecondary" />
            </View>
            <ThemedText themeColor="textSecondary">›</ThemedText>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  emoji: { fontSize: 36 },
});
