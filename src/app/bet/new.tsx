import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useCreateBet } from '@/api/bets';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { showAlert } from '@/lib/dialog';
import { errorMessage } from '@/lib/errors';

const IDEAS = [
  'Kommt Max wieder zu spät?',
  'Gewinnt der HSV am Samstag?',
  'Schafft Lisa den Marathon?',
  'Regnet es am Wochenende?',
];

export default function NewBetScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const [question, setQuestion] = useState('');
  const createBet = useCreateBet(groupId);
  const trimmed = question.trim();
  const valid = trimmed.length >= 3;

  function submit() {
    if (!valid) return;
    createBet.mutate(trimmed, {
      // Zurück zur Gruppe. Ab Phase 3 kommt hier (in einer natürlichen Pause) ggf. ein Interstitial.
      onSuccess: () => router.back(),
      onError: (e) => showAlert('Hat nicht geklappt', errorMessage(e)),
    });
  }

  return (
    <Screen edges={['bottom']}>
      <TextField
        label="Worauf wird gewettet? (Ja/Nein-Frage)"
        placeholder="z. B. Kommt Max wieder zu spät?"
        value={question}
        onChangeText={setQuestion}
        maxLength={140}
        multiline
        autoFocus
        style={styles.input}
      />
      <ThemedText type="small" themeColor="textSecondary" style={styles.counter}>
        {trimmed.length}/140
      </ThemedText>

      <View style={{ gap: Spacing.two }}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          Ideen
        </ThemedText>
        {IDEAS.map((idea) => (
          <Button key={idea} title={idea} variant="secondary" onPress={() => setQuestion(idea)} />
        ))}
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        Du trägst später das Ergebnis ein. Dann wird der Topf an alle verteilt, die richtig lagen.
      </ThemedText>
      <Button title="Wette erstellen" onPress={submit} disabled={!valid} loading={createBet.isPending} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { minHeight: 96, paddingTop: Spacing.three, textAlignVertical: 'top' },
  counter: { textAlign: 'right', marginTop: -Spacing.two },
});
