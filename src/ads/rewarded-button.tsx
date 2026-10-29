import { useEffect } from 'react';

import { useAds } from '@/ads/ads-context';
import { useClaimRewardedCoins, useRewardedRemaining } from '@/api/rewards';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { REWARDED_COINS } from '@/constants/app';
import { showAlert } from '@/lib/dialog';
import { errorMessage } from '@/lib/errors';

/**
 * "Video schauen = +100 Coins". Die Coins gibt es fürs vollständige Anschauen
 * (EARNED_REWARD), nicht fürs Klicken. Vorher wird das Tageslimit geprüft,
 * damit niemand ein Video umsonst schaut.
 */
export function RewardedButton({ groupId }: { groupId: string }) {
  const ads = useAds();
  const remaining = useRewardedRemaining(groupId);
  const claim = useClaimRewardedCoins(groupId);

  const { prepareRewarded } = ads;
  useEffect(() => {
    prepareRewarded();
  }, [prepareRewarded]);

  if (remaining.data === 0) {
    return (
      <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
        🎬 Heute schon 5 Videos geschaut. Morgen gibt’s wieder Coins.
      </ThemedText>
    );
  }

  const ready = ads.rewardedStatus === 'ready' && remaining.data !== undefined;
  const label =
    ads.rewardedStatus === 'unavailable'
      ? '🎬 Gerade kein Video verfügbar'
      : ready
        ? `🎬 Video schauen: +${REWARDED_COINS} 🪙 (noch ${remaining.data} heute)`
        : '🎬 Video wird geladen …';

  return (
    <Button
      title={label}
      variant="secondary"
      disabled={!ready || claim.isPending}
      onPress={() =>
        ads.showRewarded(() =>
          claim.mutate(undefined, {
            onSuccess: () => showAlert('Danke fürs Schauen! 🎉', `+${REWARDED_COINS} 🪙 sind auf deinem Konto.`),
            onError: (e) => showAlert('Belohnung fehlgeschlagen', errorMessage(e)),
          })
        )
      }
    />
  );
}
