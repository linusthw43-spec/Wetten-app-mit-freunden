import { useLocalSearchParams } from 'expo-router';

import { JoinForm } from '@/components/join-form';

/** Ziel des Einladungslinks wettapp://join/ABC123 */
export default function JoinWithCodeScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return <JoinForm initialCode={code ?? ''} />;
}
