import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { RewardedButton } from '@/ads/rewarded-button';
import { usePlaceWager } from '@/api/bets';
import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { showAlert } from '@/lib/dialog';
import { errorMessage } from '@/lib/errors';
import { formatCoins } from '@/lib/format';
import { previewPayout, type Side } from '@/lib/payout';
import type { Bet } from '@/lib/types';

const QUICK_AMOUNTS = [10, 50, 100, 250];

type WagerFormProps = { bet: Bet; userId: string; balance: number };

export function WagerForm({ bet, userId, balance }: WagerFormProps) {
  const theme = useTheme();
  const existing = bet.wagers.find((w) => w.user_id === userId);
  const [side, setSide] = useState<Side>(existing?.side ?? 'yes');
  const [amountText, setAmountText] = useState('');
  const placeWager = usePlaceWager(bet);

  const amount = Number.parseInt(amountText, 10) || 0;
  const tooMuch = amount > balance;
  const valid = amount > 0 && !tooMuch;
  const wagerInputs = bet.wagers.map((w) => ({ userId: w.user_id, side: w.side, amount: w.amount }));
  const preview = valid ? previewPayout(wagerInputs, userId, side, amount) : 0;
  const sideLabel = side === 'yes' ? 'Ja' : 'Nein';

  function submit() {
    if (!valid) return;
    placeWager.mutate(
      { side, amount },
      {
        onSuccess: () => setAmountText(''),
        onError: (e) => showAlert('Einsatz fehlgeschlagen', errorMessage(e)),
      }
    );
  }

  if (balance <= 0) {
    return (
      <View style={styles.root}>
        <ThemedText themeColor="textSecondary">Du hast in dieser Gruppe keine Coins mehr. 😬</ThemedText>
        <RewardedButton groupId={bet.group_id} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {existing ? 'Nachlegen' : 'Dein Tipp'}
      </ThemedText>
      <View style={styles.row}>
        {(['yes', 'no'] as const).map((s) => {
          const selected = side === s;
          // Wer schon gesetzt hat, bleibt auf seiner Seite.
          const locked = existing !== undefined && existing.side !== s;
          const color = s === 'yes' ? theme.success : theme.danger;
          return (
            <Pressable
              key={s}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: locked }}
              disabled={locked}
              onPress={() => setSide(s)}
              style={[
                styles.side,
                {
                  borderColor: selected ? color : theme.border,
                  backgroundColor: selected ? color : theme.backgroundElement,
                  opacity: locked ? 0.3 : 1,
                },
              ]}>
              <ThemedText style={{ fontWeight: 700, color: selected ? '#fff' : theme.text }}>
                {s === 'yes' ? '✅ Ja' : '❌ Nein'}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.row}>
        {QUICK_AMOUNTS.filter((a) => a <= balance).map((a) => (
          <Button
            key={a}
            title={String(a)}
            variant="secondary"
            style={styles.quick}
            onPress={() => setAmountText(String(a))}
          />
        ))}
        <Button
          title="Alles"
          variant="secondary"
          style={styles.quick}
          onPress={() => setAmountText(String(balance))}
        />
      </View>

      <TextField
        label={`Einsatz (du hast ${formatCoins(balance)} 🪙)`}
        placeholder="0"
        keyboardType="number-pad"
        value={amountText}
        onChangeText={(t) => setAmountText(t.replace(/[^0-9]/g, ''))}
        maxLength={7}
      />

      {tooMuch ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
          So viele Coins hast du nicht.
        </ThemedText>
      ) : valid ? (
        <ThemedText type="small" themeColor="textSecondary">
          Wenn {sideLabel} gewinnt, bekommst du nach aktuellem Stand {formatCoins(preview)} 🪙 zurück.
        </ThemedText>
      ) : null}

      <Button
        title={valid ? `${formatCoins(amount)} 🪙 auf ${sideLabel} setzen` : 'Einsatz wählen'}
        onPress={submit}
        disabled={!valid}
        loading={placeWager.isPending}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.three },
  row: { flexDirection: 'row', gap: Spacing.two },
  side: {
    flex: 1,
    minHeight: 56,
    borderRadius: Radius.medium,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quick: { flex: 1, paddingHorizontal: 0, minHeight: 44 },
});
