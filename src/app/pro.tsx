import { Switch, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { SHOW_TEST_TOOLS } from '@/constants/app';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePro } from '@/purchases/pro-provider';

const FEATURES = [
  { emoji: '🚫', title: 'Komplett werbefrei', text: 'Keine Banner, keine Vollbild-Werbung.' },
  { emoji: '🎨', title: 'Gruppen-Themes', text: 'Eigene Farben für eure Gruppe.' },
  { emoji: '😜', title: 'Eigene Emojis', text: 'Jedes Emoji für Profil und Gruppen.' },
  { emoji: '📊', title: 'Statistiken', text: 'Trefferquote, größter Gewinn, Coin-Verlauf.' },
];

export default function ProScreen() {
  const { isPro, setSimulatedPro } = usePro();
  const theme = useTheme();

  return (
    <Screen edges={['bottom']}>
      <View style={styles.hero}>
        <Text style={styles.crown}>👑</Text>
        <ThemedText type="title" style={styles.center}>
          Wett-App Pro
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.center}>
          {isPro ? 'Du bist Pro. Danke für deine Unterstützung!' : 'Mehr Spaß, null Werbung.'}
        </ThemedText>
      </View>

      {FEATURES.map((f) => (
        <Card key={f.title} style={styles.feature}>
          <Text style={styles.featureEmoji}>{f.emoji}</Text>
          <View style={styles.flex}>
            <ThemedText style={{ fontWeight: 700 }}>{f.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {f.text}
            </ThemedText>
          </View>
        </Card>
      ))}

      <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
        Kaufen kommt in Phase 4 (RevenueCat). Coins kann man auch mit Pro nicht kaufen, und Videos
        für +100 🪙 bleiben freiwillig.
      </ThemedText>

      {SHOW_TEST_TOOLS && (
        <Card style={[styles.feature, { borderWidth: 1, borderColor: theme.border }]}>
          <View style={styles.flex}>
            <ThemedText style={{ fontWeight: 700 }}>🧪 Test: Pro simulieren</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Nur im Test-Build. Schaltet die Werbung ab wie ein echtes Pro-Abo.
            </ThemedText>
          </View>
          <Switch value={isPro} onValueChange={setSimulatedPro} trackColor={{ true: theme.accent }} />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: Spacing.two, marginVertical: Spacing.three },
  crown: { fontSize: 64 },
  center: { textAlign: 'center' },
  feature: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  featureEmoji: { fontSize: 32 },
  flex: { flex: 1 },
});
