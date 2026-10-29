import { router } from 'expo-router';

import { ProfileForm } from '@/components/profile-form';
import { Screen } from '@/components/screen';

export default function EditProfileScreen() {
  return (
    <Screen edges={['bottom']}>
      <ProfileForm submitLabel="Speichern" onSaved={() => router.back()} />
    </Screen>
  );
}
