import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useCreateGroup } from '@/api/groups';
import { Button } from '@/components/button';
import { EmojiPicker } from '@/components/emoji-picker';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { showAlert } from '@/lib/dialog';
import { errorMessage } from '@/lib/errors';

const GROUP_EMOJIS = ['🎲', '🍕', '⚽', '🍻', '🎮', '🏠', '🎓', '🏆'] as const;

export default function NewGroupScreen() {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState<string>(GROUP_EMOJIS[0]);
  const createGroup = useCreateGroup();
  const trimmed = name.trim();

  function submit() {
    if (!trimmed) return;
    createGroup.mutate(
      { name: trimmed, emoji },
      {
        onSuccess: (id) => router.replace({ pathname: '/group/[id]', params: { id } }),
        onError: (e) => showAlert('Hat nicht geklappt', errorMessage(e)),
      }
    );
  }

  return (
    <Screen edges={['bottom']}>
      <TextField
        label="Name der Gruppe"
        placeholder="z. B. WG Chaos"
        value={name}
        onChangeText={setName}
        maxLength={30}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      <View style={{ gap: Spacing.two }}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          Emoji
        </ThemedText>
        <EmojiPicker value={emoji} onChange={setEmoji} options={GROUP_EMOJIS} />
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        Jedes Mitglied startet in der Gruppe mit 1.000 🪙.
      </ThemedText>
      <Button
        title="Gruppe erstellen"
        onPress={submit}
        disabled={!trimmed}
        loading={createGroup.isPending}
      />
    </Screen>
  );
}
