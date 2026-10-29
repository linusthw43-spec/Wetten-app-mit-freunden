import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import mobileAds, {
  AdEventType,
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  InterstitialAd,
  RewardedAd,
  RewardedAdEventType,
  type AdsConsentInfo,
} from 'react-native-google-mobile-ads';

import { AdsContext, type AdsContextValue, type RewardedStatus } from '@/ads/ads-context';
import { AdUnits } from '@/ads/ad-units';
import { canShowInterstitial } from '@/ads/frequency';
import { useAuth } from '@/auth/auth-provider';
import { usePro } from '@/purchases/pro-provider';

const RETRY_MS = 60_000;
/** Kurz warten, bis die Navigation fertig animiert ist, bevor ein Interstitial erscheint. */
const BREAK_DELAY_MS = 400;

type Phase = 'idle' | 'starting' | 'ready' | 'blocked';
type RewardedEvent = 'loading' | 'ready' | 'showing' | 'error';

/** Zeitpunkt des App-Starts (Modul wird beim Start geladen). */
const APP_STARTED_AT = Date.now();

export function AdsProvider({ children }: { children: ReactNode }) {
  const { isPro } = usePro();
  const { profile } = useAuth();

  const [phase, setPhase] = useState<Phase>('idle');
  const [nonPersonalized, setNonPersonalized] = useState(true);
  const [privacyOptionsRequired, setPrivacyOptionsRequired] = useState(false);
  const [rewardedEvent, setRewardedEvent] = useState<RewardedEvent>('loading');
  // Pro-Nutzer laden Videos erst, wenn sie eins wollen (Button sichtbar).
  const [rewardedRequested, setRewardedRequested] = useState(false);
  const rewardedWanted = Boolean(profile && !isPro) || rewardedRequested;
  const [promoVisible, setPromoVisible] = useState(false);

  const startPromise = useRef<Promise<void> | null>(null);
  const lastInterstitialAt = useRef<number | null>(null);
  const interstitialQueued = useRef(false);
  const interstitialRef = useRef<InterstitialAd | null>(null);
  const interstitialLoaded = useRef(false);
  const rewardedRef = useRef<RewardedAd | null>(null);
  const onEarnedRef = useRef<(() => void) | null>(null);

  const applyConsentInfo = useCallback((info: AdsConsentInfo) => {
    setPrivacyOptionsRequired(
      info.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED
    );
  }, []);

  // 1. Einwilligung (UMP) einholen, 2. erst danach das SDK starten.
  const ensureStarted = useCallback(() => {
    startPromise.current ??= (async () => {
      setPhase('starting');
      let info: AdsConsentInfo | null = null;
      try {
        info = await AdsConsent.gatherConsent();
      } catch {
        // z. B. offline: auf die zuletzt gespeicherte Entscheidung zurückfallen
        info = await AdsConsent.getConsentInfo().catch(() => null);
      }
      if (!info?.canRequestAds) {
        setPhase('blocked');
        startPromise.current = null; // später erneut versuchen
        return;
      }
      applyConsentInfo(info);

      // Hat der Nutzer personalisierte Werbung abgelehnt, fragen wir nur
      // nicht-personalisierte (eingeschränkte) Werbung an, statt gar keine.
      const choices = await AdsConsent.getUserChoices().catch(() => null);
      setNonPersonalized(!choices?.selectPersonalisedAds);

      try {
        await mobileAds().initialize();
        setPhase('ready');
      } catch {
        setPhase('blocked');
        startPromise.current = null;
      }
    })();
    return startPromise.current;
  }, [applyConsentInfo]);

  // Gratis-Nutzer: nach dem Onboarding starten. Pro-Nutzer erst, wenn sie ein Video wollen.
  useEffect(() => {
    if (profile && !isPro) ensureStarted();
  }, [profile, isPro, ensureStarted]);

  // Interstitial vorladen (nur Gratis-Version).
  useEffect(() => {
    if (phase !== 'ready' || isPro) return;
    const ad = InterstitialAd.createForAdRequest(AdUnits.interstitial, {
      requestNonPersonalizedAdsOnly: nonPersonalized,
    });
    let retry: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = ad.addAdEventsListener(({ type }) => {
      if (type === AdEventType.LOADED) {
        interstitialLoaded.current = true;
      } else if (type === AdEventType.CLOSED) {
        interstitialLoaded.current = false;
        lastInterstitialAt.current = Date.now();
        setPromoVisible(true); // nach jedem Interstitial: eigener Pro-Hinweis
        ad.load();
      } else if (type === AdEventType.ERROR) {
        interstitialLoaded.current = false;
        retry = setTimeout(() => ad.load(), RETRY_MS);
      }
    });
    interstitialRef.current = ad;
    ad.load();
    return () => {
      clearTimeout(retry);
      unsubscribe();
      ad.destroy();
      interstitialRef.current = null;
      interstitialLoaded.current = false;
    };
  }, [phase, isPro, nonPersonalized]);

  // Belohnungsvideo vorladen (auch für Pro, aber erst wenn gewünscht).
  useEffect(() => {
    if (phase !== 'ready' || !rewardedWanted) return;
    const ad = RewardedAd.createForAdRequest(AdUnits.rewarded, {
      requestNonPersonalizedAdsOnly: nonPersonalized,
    });
    let retry: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = ad.addAdEventsListener(({ type }) => {
      if (type === RewardedAdEventType.LOADED) {
        setRewardedEvent('ready');
      } else if (type === RewardedAdEventType.EARNED_REWARD) {
        onEarnedRef.current?.();
        onEarnedRef.current = null;
      } else if (type === AdEventType.CLOSED) {
        onEarnedRef.current = null; // vorzeitig geschlossen: keine Belohnung
        setRewardedEvent('loading');
        ad.load();
      } else if (type === AdEventType.ERROR) {
        setRewardedEvent('error');
        retry = setTimeout(() => {
          setRewardedEvent('loading');
          ad.load();
        }, RETRY_MS);
      }
    });
    rewardedRef.current = ad;
    ad.load();
    return () => {
      clearTimeout(retry);
      unsubscribe();
      ad.destroy();
      rewardedRef.current = null;
      setRewardedEvent('loading');
    };
  }, [phase, rewardedWanted, nonPersonalized]);

  const rewardedStatus: RewardedStatus =
    phase === 'starting'
      ? 'loading'
      : phase !== 'ready' || !rewardedWanted || rewardedEvent === 'error'
        ? 'unavailable'
        : rewardedEvent;

  // Stabile Funktionen (Refs statt State), damit Effekte in Screens nicht in Schleifen laufen.
  const isProRef = useRef(isPro);
  const rewardedStatusRef = useRef(rewardedStatus);
  useEffect(() => {
    isProRef.current = isPro;
    rewardedStatusRef.current = rewardedStatus;
  });

  const queueInterstitial = useCallback(() => {
    if (!isProRef.current) interstitialQueued.current = true;
  }, []);

  const naturalBreak = useCallback(() => {
    if (!interstitialQueued.current) return;
    interstitialQueued.current = false; // nie über längere Zeit "aufheben"
    const ad = interstitialRef.current;
    const allowed = canShowInterstitial({
      now: Date.now(),
      appStartedAt: APP_STARTED_AT,
      lastShownAt: lastInterstitialAt.current,
    });
    // Nur zeigen, wenn es SCHON geladen ist. Wir warten nie auf eine Anzeige.
    if (isProRef.current || !ad || !interstitialLoaded.current || !allowed) return;
    setTimeout(() => {
      ad.show().catch(() => {});
    }, BREAK_DELAY_MS);
  }, []);

  const prepareRewarded = useCallback(() => {
    setRewardedRequested(true);
    ensureStarted();
  }, [ensureStarted]);

  const showRewarded = useCallback((onEarned: () => void) => {
    const ad = rewardedRef.current;
    if (!ad || rewardedStatusRef.current !== 'ready') return;
    onEarnedRef.current = onEarned;
    setRewardedEvent('showing');
    ad.show().catch(() => {
      onEarnedRef.current = null;
      setRewardedEvent('loading');
      ad.load();
    });
  }, []);

  const openPrivacyOptions = useCallback(async () => {
    const info = await AdsConsent.showPrivacyOptionsForm();
    applyConsentInfo(info);
    const choices = await AdsConsent.getUserChoices().catch(() => null);
    setNonPersonalized(!choices?.selectPersonalisedAds);
  }, [applyConsentInfo]);

  const hidePromo = useCallback(() => setPromoVisible(false), []);

  const value = useMemo<AdsContextValue>(
    () => ({
      showAds: phase === 'ready' && !isPro,
      nonPersonalized,
      queueInterstitial,
      naturalBreak,
      rewardedStatus,
      prepareRewarded,
      showRewarded,
      privacyOptionsRequired,
      openPrivacyOptions,
      promoVisible: promoVisible && !isPro,
      hidePromo,
    }),
    [
      promoVisible,
      hidePromo,
      phase,
      isPro,
      nonPersonalized,
      queueInterstitial,
      naturalBreak,
      rewardedStatus,
      prepareRewarded,
      showRewarded,
      privacyOptionsRequired,
      openPrivacyOptions,
    ]
  );

  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>;
}
