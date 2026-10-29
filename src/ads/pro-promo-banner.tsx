import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

import { useAds } from '@/ads/ads-context';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Verschwindet von selbst, damit der Hinweis nie im Weg bleibt. */
const AUTO_HIDE_MS = 8000;

/**
 * Eigener Hinweis nach jedem Interstitial. Sitzt im normalen Layout ÜBER dem Werbebanner
 * (verdeckt also keine Anzeige), sieht bewusst nicht wie Google-Werbung aus und lässt sich wegtippen.
 */
export function ProPromoBanner() {
  const { promoVisible: visible, hidePromo } = useAds();
  const theme = useTheme();
  const [fade] = useState(() => new Animated.Value(0));
  // Nach dem Ausblenden ganz entfernen (sonst läge unsichtbarer Text für Screenreader herum).
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    Animated.timing(fade, { toValue: visible ? 1 : 0, duration: 250, useNativeDriver: true }).start(
      ({ finished }) => {
        if (finished && !visible) setMounted(false);
      }
    );
    if (!visible) return;
    const timer = setTimeout(hidePromo, AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [visible, hidePromo, fade]);

  if (!mounted) return null;

  return (
    <Animated.View style={[styles.banner, { backgroundColor: theme.accent, opacity: fade }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Pro-Version ansehen"
        style={styles.content}
        onPress={() => {
          hidePromo();
          router.push('/pro');
        }}>
        <ThemedText style={[styles.text, { color: theme.onAccent }]}>
          Kein Bock mehr auf Werbung? Hol dir Pro 👑
        </ThemedText>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Hinweis schließen"
        hitSlop={12}
        onPress={hidePromo}
        style={styles.close}>
        <ThemedText style={{ color: theme.onAccent, fontWeight: 700 }}>✕</ThemedText>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.large,
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    paddingLeft: Spacing.three,
  },
  content: { flex: 1, paddingVertical: Spacing.three },
  text: { fontWeight: 700 },
  close: { padding: Spacing.three },
});
