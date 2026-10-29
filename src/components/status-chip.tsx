import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Bet } from '@/lib/types';

export function StatusChip({ bet }: { bet: Pick<Bet, 'status' | 'outcome'> }) {
  const theme = useTheme();
  const { label, color } = {
    open: { label: 'Offen', color: theme.accent },
    locked: { label: 'Einsätze gestoppt', color: theme.textSecondary },
    resolved: {
      label: bet.outcome === 'yes' ? 'Ergebnis: Ja' : 'Ergebnis: Nein',
      color: bet.outcome === 'yes' ? theme.success : theme.danger,
    },
    cancelled: { label: 'Abgebrochen', color: theme.textSecondary },
  }[bet.status];

  return (
    <View style={[styles.chip, { borderColor: color }]}>
      <ThemedText type="smallBold" style={{ color }}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderRadius: Radius.small,
    paddingHorizontal: Spacing.two,
  },
});
