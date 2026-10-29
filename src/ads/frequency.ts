/** Mindestabstand zwischen zwei Interstitials. */
export const INTERSTITIAL_COOLDOWN_MS = 3 * 60 * 1000;
/** Keine Interstitials direkt nach dem App-Start. */
export const INTERSTITIAL_STARTUP_GRACE_MS = 60 * 1000;

type CapInput = {
  now: number;
  appStartedAt: number;
  /** Zeitpunkt des letzten gezeigten Interstitials, null = noch keins. */
  lastShownAt: number | null;
};

/** Darf an einer natürlichen Pause gerade ein Interstitial gezeigt werden? */
export function canShowInterstitial({ now, appStartedAt, lastShownAt }: CapInput): boolean {
  if (now - appStartedAt < INTERSTITIAL_STARTUP_GRACE_MS) return false;
  if (lastShownAt !== null && now - lastShownAt < INTERSTITIAL_COOLDOWN_MS) return false;
  return true;
}
