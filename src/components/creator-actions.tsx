import { StyleSheet, View } from 'react-native';

import { useAds } from '@/ads/ads-context';
import { useBetAction } from '@/api/bets';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { showAlert } from '@/lib/dialog';
import { errorMessage } from '@/lib/errors';
import type { Side } from '@/lib/payout';
import type { Bet } from '@/lib/types';

/** Nur für den Ersteller: Einsätze stoppen, Ergebnis eintragen, abbrechen. */
export function CreatorActions({ bet }: { bet: Bet }) {
  const action = useBetAction(bet);
  const ads = useAds();
  const onError = (e: unknown) => showAlert('Hat nicht geklappt', errorMessage(e));

  function resolve(outcome: Side) {
    const label = outcome === 'yes' ? 'JA' : 'NEIN';
    showAlert(
      `Ergebnis: ${label}?`,
      `„${bet.question}“\n\nDas Ergebnis ist endgültig und die Coins werden sofort verteilt.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: `${label} eintragen`,
          // Erst das Ergebnis in Ruhe zeigen. Ein Interstitial kommt frühestens,
          // wenn man zurück zur Gruppe geht (natürliche Pause).
          onPress: () =>
            action.mutate({ type: 'resolve', outcome }, { onError, onSuccess: ads.queueInterstitial }),
        },
      ]
    );
  }

  function cancel() {
    showAlert('Wette abbrechen?', 'Alle bekommen ihren Einsatz zurück.', [
      { text: 'Nein', style: 'cancel' },
      { text: 'Wette abbrechen', style: 'destructive', onPress: () => action.mutate({ type: 'cancel' }, { onError }) },
    ]);
  }

  return (
    <Card>
      <ThemedText type="smallBold" themeColor="textSecondary">
        DU HAST DIESE WETTE ERSTELLT
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Steht das Ergebnis fest? Dann trag es hier ein. Stopp vorher am besten die Einsätze,
        damit niemand mehr nachlegt, wenn es schon klar ist.
      </ThemedText>
      <View style={styles.row}>
        <Button title="Ergebnis: Ja" style={styles.flex} disabled={action.isPending} onPress={() => resolve('yes')} />
        <Button title="Ergebnis: Nein" style={styles.flex} disabled={action.isPending} onPress={() => resolve('no')} />
      </View>
      {bet.status === 'open' && (
        <Button
          title="⏸ Einsätze stoppen"
          variant="secondary"
          loading={action.isPending}
          onPress={() => action.mutate({ type: 'lock' }, { onError })}
        />
      )}
      <Button title="Wette abbrechen" variant="secondary" disabled={action.isPending} onPress={cancel} />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
});
