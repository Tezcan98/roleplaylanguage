import { AdMob, BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';
import { AdProvider } from './AdProvider.js';

// Google's test units: used until the real ones are in assets/manifest.json → "admob"
const TEST = { rewarded: 'ca-app-pub-3940256099942544/5224354917', interstitial: 'ca-app-pub-3940256099942544/1033173712', banner: 'ca-app-pub-3940256099942544/6300978111' };

/**
 * AdMob in the Android app: rewarded videos (credits), full-screen interstitials between story
 * days, and a banner at the bottom of the menu where you pick the village square. The interstitial ad unit should be set to "display" only (no video) in the AdMob console.
 * Asks for consent first where the law requires it (EU, UK).
 */
export class AdMobAdProvider extends AdProvider {
  constructor({ rewardedId, interstitialId, bannerId } = {}) {
    super();
    this.ids = { rewarded: rewardedId || TEST.rewarded, interstitial: interstitialId || TEST.interstitial, banner: bannerId || TEST.banner };
    this.testing = Object.fromEntries(Object.keys(TEST).map((k) => [k, this.ids[k] === TEST[k]])); // test mode only for Google's test ids
    this.bannerOn = false;
    this.ready = null;
  }

  #init() {
    this.ready ??= (async () => {
      await AdMob.initialize({ initializeForTesting: Object.values(this.testing).some(Boolean) });
      try {
        const info = await AdMob.requestConsentInfo();
        if (info.isConsentFormAvailable && info.status === 'REQUIRED') await AdMob.showConsentForm();
      } catch { /* no consent form needed */ }
    })();
    return this.ready;
  }

  async showRewarded() {
    try {
      await this.#init();
      await AdMob.prepareRewardVideoAd({ adId: this.ids.rewarded, isTesting: this.testing.rewarded });
      const reward = await AdMob.showRewardVideoAd();
      return !!reward && Number(reward.amount ?? 0) > 0;
    } catch (e) {
      console.warn('[admob] rewarded ad failed', e);
      return false;
    }
  }

  /** The banner at the bottom of the screen (the square's menu); `hideBanner()` takes it away. */
  async showBanner() {
    if (this.bannerOn) return;
    this.bannerOn = true;
    try {
      await this.#init();
      if (!this.bannerOn) return; // left the menu meanwhile
      await AdMob.showBanner({ adId: this.ids.banner, adSize: BannerAdSize.ADAPTIVE_BANNER, position: BannerAdPosition.BOTTOM_CENTER, margin: 0, isTesting: this.testing.banner });
    } catch (e) { console.warn('[admob] banner failed', e); }
  }

  async hideBanner() {
    if (!this.bannerOn) return;
    this.bannerOn = false;
    try { await AdMob.removeBanner(); } catch { /* not shown */ }
  }

  async showInterstitial() {
    try {
      await this.#init();
      await AdMob.prepareInterstitial({ adId: this.ids.interstitial, isTesting: this.testing.interstitial });
      await AdMob.showInterstitial();
    } catch (e) {
      console.warn('[admob] interstitial failed', e); // no ad this time: the story just goes on
    }
  }
}
