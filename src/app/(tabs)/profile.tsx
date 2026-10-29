import { router } from 'expo-router';
import { useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';

import { useAds } from '@/ads/ads-context';
import { useAuth } from '@/auth/auth-provider';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { SHOW_TEST_TOOLS } from '@/constants/app';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { clearLastCrash, isSafeMode, readLastCrash, setSafeMode } from '@/lib/crash-log';
import { showAlert } from '@/lib/dialog';
import { errorMessage } from '@/lib/errors';
import { usePro } from '@/purchases/pro-provider';

export default function ProfileScreen() {
  const { profile, session } = useAuth();
  const theme = useTheme();
  const { isPro } = usePro();
  const ads = useAds();
  const [lastCrash, setLastCrash] = useState(readLastCrash);
  const [safeMode, setSafeModeState] = useState(isSafeMode);

  return (
    <Screen edges={['top']}>
      <ThemedText type="title">Profil</ThemedText>

      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        <Text style={styles.avatar}>{profile?.avatar_emoji}</Text>
        <View style={{ flex: 1 }}>
          <ThemedText type="subtitle">{profile?.display_name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {isPro ? 'Pro 👑' : 'Gratis-Version'}
          </ThemedText>
        </View>
      </View>

      <Button title="Name & Emoji ändern" variant="secondary" onPress={() => router.push('/edit-profile')} />
      <Button
        title={isPro ? '👑 Pro-Vorteile ansehen' : '👑 Pro holen: werbefrei & mehr'}
        variant={isPro ? 'secondary' : 'primary'}
        onPress={() => router.push('/pro')}
      />
      {ads.privacyOptionsRequired && (
        <Button
          title="Datenschutz-Optionen (Werbung)"
          variant="secondary"
          onPress={() =>
            ads.openPrivacyOptions().catch((e) => showAlert('Konnte nicht geöffnet werden', errorMessage(e)))
          }
        />
      )}

      {safeMode && (
        <View style={[styles.notice, { borderColor: theme.border }]}>
          <ThemedText style={{ fontWeight: 700 }}>🛟 Abgesicherter Modus: Werbung ist aus</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Nach einem Absturz gestartet. Werbung wieder einschalten und die App danach einmal
            komplett schließen und neu öffnen.
          </ThemedText>
          <Button
            title="Werbung wieder einschalten"
            variant="secondary"
            onPress={() => {
              setSafeMode(false);
              setSafeModeState(false);
              showAlert('Erledigt', 'Bitte die App jetzt komplett schließen und neu öffnen.');
            }}
          />
        </View>
      )}

      {lastCrash && (
        <Button
          title="🐞 Letzten Absturzbericht teilen"
          variant="secondary"
          onPress={() => Share.share({ message: lastCrash })}
        />
      )}
      {lastCrash && (
        <Button
          title="Absturzbericht löschen"
          variant="secondary"
          onPress={() => {
            clearLastCrash();
            setLastCrash(null);
          }}
        />
      )}

      {SHOW_TEST_TOOLS && (
        <Button
          title="🧪 Test-Absturz auslösen"
          variant="secondary"
          onPress={() =>
            showAlert('Test-Absturz?', 'Die App stürzt absichtlich ab, damit du den Absturzbericht siehst.', [
              { text: 'Abbrechen', style: 'cancel' },
              {
                text: 'Absturz auslösen',
                style: 'destructive',
                onPress: () =>
                  setTimeout(() => {
                    throw new Error('Test-Absturz (absichtlich über das Profil ausgelöst)');
                  }, 0),
              },
            ])
          }
        />
      )}

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
  notice: { borderWidth: 1, borderRadius: Radius.large, padding: Spacing.three, gap: Spacing.two },
  footnote: { marginTop: 'auto', textAlign: 'center' },
});
