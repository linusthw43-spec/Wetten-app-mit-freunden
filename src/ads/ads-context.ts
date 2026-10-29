import { createContext, useContext } from 'react';

export type RewardedStatus = 'unavailable' | 'loading' | 'ready' | 'showing';

export type AdsContextValue = {
  /** Banner & Interstitials erlaubt? (false bei Pro, ohne Einwilligung oder im Web) */
  showAds: boolean;
  /** true = nur nicht-personalisierte (eingeschränkte) Werbung anfragen */
  nonPersonalized: boolean;
  /** Merkt ein Interstitial für die nächste natürliche Pause vor (z. B. nach "Wette erstellt"). */
  queueInterstitial: () => void;
  /** An einer natürlichen Pause aufrufen. Zeigt ein vorgemerktes Interstitial, falls erlaubt. */
  naturalBreak: () => void;
  rewardedStatus: RewardedStatus;
  /** Lädt das Belohnungsvideo (startet bei Bedarf Einwilligung + SDK, z. B. für Pro-Nutzer). */
  prepareRewarded: () => void;
  /** Zeigt das Video. onEarned wird NUR nach vollständigem Anschauen aufgerufen. */
  showRewarded: (onEarned: () => void) => void;
  /** Muss laut Google ein "Datenschutz-Optionen"-Eintrag angeboten werden? */
  privacyOptionsRequired: boolean;
  openPrivacyOptions: () => Promise<void>;
  /** Eigener Pro-Hinweis nach einem Interstitial sichtbar? */
  promoVisible: boolean;
  hidePromo: () => void;
};

export const noAds: AdsContextValue = {
  showAds: false,
  nonPersonalized: true,
  queueInterstitial: () => {},
  naturalBreak: () => {},
  rewardedStatus: 'unavailable',
  prepareRewarded: () => {},
  showRewarded: () => {},
  privacyOptionsRequired: false,
  openPrivacyOptions: async () => {},
  promoVisible: false,
  hidePromo: () => {},
};

export const AdsContext = createContext<AdsContextValue>(noAds);

export function useAds() {
  return useContext(AdsContext);
}
