import { router } from 'expo-router';
import { useState } from 'react';

import { useJoinGroup } from '@/api/groups';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { showAlert } from '@/lib/dialog';
import { errorMessage } from '@/lib/errors';

export function JoinForm({ initialCode = '' }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode.toUpperCase());
  const joinGroup = useJoinGroup();
  const cleaned = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

  function submit() {
    if (cleaned.length !== 6) return;
    joinGroup.mutate(cleaned, {
      onSuccess: (id) => router.replace({ pathname: '/group/[id]', params: { id } }),
      onError: (e) => showAlert('Beitreten fehlgeschlagen', errorMessage(e)),
    });
  }

  return (
    <Screen edges={['bottom']}>
      <ThemedText themeColor="textSecondary">
        Gib den 6-stelligen Code ein, den du von deinen Freunden bekommen hast.
      </ThemedText>
      <TextField
        label="Einladungscode"
        placeholder="ABC123"
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={8}
        autoFocus={!initialCode}
        returnKeyType="done"
        onSubmitEditing={submit}
        style={{ fontSize: 24, letterSpacing: 4, textAlign: 'center' }}
      />
      <Button
        title="Gruppe beitreten"
        onPress={submit}
        disabled={cleaned.length !== 6}
        loading={joinGroup.isPending}
      />
    </Screen>
  );
}
