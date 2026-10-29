import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { ProfileForm } from '@/components/profile-form';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export default function OnboardingScreen() {
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <View style={{ gap: Spacing.two, marginTop: Spacing.five }}>
          <ThemedText type="title">Moin! 👋</ThemedText>
          <ThemedText themeColor="textSecondary">
            Wette mit deinen Freunden um Fake-Coins. Kein echtes Geld, nur Ehre. Wie sollen dich
            die anderen sehen?
          </ThemedText>
        </View>
        <ProfileForm submitLabel="Los geht's" />
      </Screen>
    </KeyboardAvoidingView>
  );
}
