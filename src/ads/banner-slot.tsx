import { StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

import { useAds } from '@/ads/ads-context';
import { AdUnits } from '@/ads/ad-units';

/** Banner unten auf den Hauptseiten. Rendert nichts in der Pro-Version oder ohne Einwilligung. */
export function BannerSlot() {
  const { showAds, nonPersonalized } = useAds();
  if (!showAds) return null;
  return (
    <View style={styles.slot}>
      <BannerAd
        unitId={AdUnits.banner}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: nonPersonalized }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { alignItems: 'center' },
});
