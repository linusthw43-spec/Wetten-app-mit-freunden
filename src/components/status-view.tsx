import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type StatusViewProps = {
  loading?: boolean;
  emoji?: string;
  title?: string;
  message?: ReactNode;
  action?: ReactNode;
};

/** Vollflächige Anzeige für Laden, Fehler und leere Zustände. */
export function StatusView({ loading, emoji, title, message, action }: StatusViewProps) {
  const theme = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {loading && <ActivityIndicator size="large" color={theme.accent} />}
      {emoji && <ThemedText style={styles.emoji}>{emoji}</ThemedText>}
      {title && (
        <ThemedText type="subtitle" style={styles.center}>
          {title}
        </ThemedText>
      )}
      {message && (
        <ThemedText themeColor="textSecondary" style={styles.center}>
          {message}
        </ThemedText>
      )}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  emoji: { fontSize: 56, lineHeight: 68 },
  center: { textAlign: 'center' },
});
