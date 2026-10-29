import { useState, type ReactNode } from 'react';

import { AdsContext, noAds, type AdsContextValue } from '@/ads/ads-context';
import { usePro } from '@/purchases/pro-provider';

/**
 * Im Browser gibt es kein AdMob. Mit EXPO_PUBLIC_FAKE_ADS=1 (nur für Tests im Browser)
 * werden Anzeigen simuliert: Interstitial = sofort "geschlossen", Video = sofort "angeschaut".
 */
const FAKE_ADS = process.env.EXPO_PUBLIC_FAKE_ADS === '1';

export function AdsProvider({ children }: { children: ReactNode }) {
  const { isPro } = usePro();
  const [promoVisible, setPromoVisible] = useState(false);
  const [queued, setQueued] = useState(false);

  const value: AdsContextValue = FAKE_ADS
    ? {
        ...noAds,
        showAds: !isPro,
        queueInterstitial: () => setQueued(!isPro),
        naturalBreak: () => {
          if (!queued) return;
          setQueued(false);
          setPromoVisible(true);
        },
        rewardedStatus: 'ready',
        showRewarded: (onEarned) => onEarned(),
        promoVisible: promoVisible && !isPro,
        hidePromo: () => setPromoVisible(false),
      }
    : noAds;

  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>;
}
