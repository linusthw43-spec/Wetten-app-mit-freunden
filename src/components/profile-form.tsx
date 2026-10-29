import { useState } from 'react';
import { Alert, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { Button } from '@/components/button';
import { EmojiPicker } from '@/components/emoji-picker';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { FREE_EMOJIS, Spacing } from '@/constants/theme';

export const NAME_MAX_LENGTH = 24;

type ProfileFormProps = {
  submitLabel: string;
  onSaved?: () => void;
};

/** Name + Emoji wählen. Wird im Onboarding und beim Bearbeiten genutzt. */
export function ProfileForm({ submitLabel, onSaved }: ProfileFormProps) {
  const { profile, saveProfile } = useAuth();
  const [name, setName] = useState(profile?.display_name ?? '');
  const [emoji, setEmoji] = useState(profile?.avatar_emoji ?? FREE_EMOJIS[0]);
  const [saving, setSaving] = useState(false);

  const trimmed = name.trim();

  async function submit() {
    if (!trimmed) return;
    setSaving(true);
    try {
      await saveProfile({ display_name: trimmed, avatar_emoji: emoji });
      onSaved?.();
    } catch (e) {
      Alert.alert('Speichern fehlgeschlagen', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ gap: Spacing.four }}>
      <TextField
        label="Dein Name"
        placeholder="z. B. Kevin"
        value={name}
        onChangeText={setName}
        maxLength={NAME_MAX_LENGTH}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      <View style={{ gap: Spacing.two }}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          Dein Emoji
        </ThemedText>
        <EmojiPicker value={emoji} onChange={setEmoji} />
      </View>
      <Button title={submitLabel} onPress={submit} disabled={!trimmed} loading={saving} />
    </View>
  );
}
