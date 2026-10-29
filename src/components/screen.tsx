import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ScreenProps = {
  children: ReactNode;
  /** Inhalt scrollbar machen (Standard: true). */
  scroll?: boolean;
  /** Bereich unter dem Inhalt, z. B. für den Werbebanner (ab Phase 3). */
  footer?: ReactNode;
  edges?: Edge[];
};

export function Screen({ children, scroll = true, footer, edges = ['top', 'bottom'] }: ScreenProps) {
  const theme = useTheme();
  const content = <View style={styles.content}>{children}</View>;

  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor: theme.background }]}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
      ) : (
        <View style={styles.scroll}>{content}</View>
      )}
      {footer}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center' },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    padding: Spacing.three,
    gap: Spacing.three,
  },
});
