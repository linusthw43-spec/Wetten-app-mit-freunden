import { BannerSlot } from '@/ads/banner-slot';
import { ProPromoBanner } from '@/ads/pro-promo-banner';

/** Fußbereich der Hauptseiten: ggf. Pro-Hinweis, darunter der Werbebanner. Beides entfällt mit Pro. */
export function AdFooter() {
  return (
    <>
      <ProPromoBanner />
      <BannerSlot />
    </>
  );
}
