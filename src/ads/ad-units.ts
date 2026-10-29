import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

/**
 * Anzeigenblöcke. Solange keine echten IDs per ENV gesetzt sind (und in Debug-Builds immer),
 * werden Googles offizielle Test-IDs verwendet. Echte IDs NIE in Debug-Builds testen.
 */
function unit(envAndroid: string | undefined, envIos: string | undefined, testId: string) {
  const real = Platform.OS === 'ios' ? envIos : envAndroid;
  return !__DEV__ && real ? real : testId;
}

export const AdUnits = {
  banner: unit(
    process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID,
    process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS,
    TestIds.ADAPTIVE_BANNER
  ),
  interstitial: unit(
    process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID,
    process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS,
    TestIds.INTERSTITIAL
  ),
  rewarded: unit(
    process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID,
    process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS,
    TestIds.REWARDED
  ),
};
