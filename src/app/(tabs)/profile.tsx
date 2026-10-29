import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function ProfileScreen() {
  const { profile, session } = useAuth();
  const theme = useTheme();

  return (
    <Screen edges={['top']}>
      <ThemedText type="title">Profil</ThemedText>

      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        <Text style={styles.avatar}>{profile?.avatar_emoji}</Text>
        <View style={{ flex: 1 }}>
          <ThemedText type="subtitle">{profile?.display_name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Gratis-Version
          </ThemedText>
        </View>
      </View>

      <Button title="Name & Emoji ändern" variant="secondary" onPress={() => router.push('/edit-profile')} />

      <ThemedText type="small" themeColor="textSecondary" style={styles.footnote}>
        Hier wird nur mit Fake-Coins gewettet. Coins kann man nicht kaufen und nicht auszahlen.
        {'\n'}Konto-ID: {session?.user.id.slice(0, 8)}
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.large,
  },
  avatar: { fontSize: 48 },
  footnote: { marginTop: 'auto', textAlign: 'center' },
});
