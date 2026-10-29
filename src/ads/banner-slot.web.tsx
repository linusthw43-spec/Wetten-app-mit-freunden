import { StyleSheet, View } from 'react-native';

import { useAds } from '@/ads/ads-context';
import { ThemedText } from '@/components/themed-text';

/** Platzhalter im Browser (nur mit EXPO_PUBLIC_FAKE_ADS=1 sichtbar). */
export function BannerSlot() {
  const { showAds } = useAds();
  if (!showAds) return null;
  return (
    <View style={styles.slot}>
      <ThemedText type="small">[Test-Banner]</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { height: 50, alignItems: 'center', justifyContent: 'center', backgroundColor: '#8884' },
});
