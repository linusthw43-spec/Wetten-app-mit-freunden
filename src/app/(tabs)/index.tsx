import { View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { Screen } from '@/components/screen';
import { StatusView } from '@/components/status-view';
import { ThemedText } from '@/components/themed-text';

export default function GroupsScreen() {
  const { profile } = useAuth();
  return (
    <Screen scroll={false} edges={['top']}>
      <ThemedText type="title">Deine Gruppen</ThemedText>
      <View style={{ flex: 1 }}>
        <StatusView
          emoji="🎲"
          title={`Hi ${profile?.display_name ?? ''}!`}
          message="Noch keine Gruppen. Gruppen erstellen und Freunde einladen kommt in Phase 2."
        />
      </View>
    </Screen>
  );
}
