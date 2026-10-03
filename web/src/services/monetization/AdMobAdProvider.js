import { AdMob } from '@capacitor-community/admob';
import { AdProvider } from './AdProvider.js';

// Google's test units: used until the real ones are in assets/manifest.json → "admob"
const TEST = { rewarded: 'ca-app-pub-3940256099942544/5224354917', interstitial: 'ca-app-pub-3940256099942544/1033173712' };

/**
 * AdMob in the Android app: rewarded videos (credits) and full-screen interstitials between story
 * days. The interstitial ad unit should be set to "display" only (no video) in the AdMob console.
 * Asks for consent first where the law requires it (EU, UK).
 */
export class AdMobAdProvider extends AdProvider {
  constructor({ rewardedId, interstitialId } = {}) {
    super();
    this.ids = { rewarded: rewardedId || TEST.rewarded, interstitial: interstitialId || TEST.interstitial };
    this.testing = this.ids.rewarded === TEST.rewarded;
    this.ready = null;
  }

  #init() {
    this.ready ??= (async () => {
      await AdMob.initialize({ initializeForTesting: this.testing });
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
      await AdMob.prepareRewardVideoAd({ adId: this.ids.rewarded, isTesting: this.testing });
      const reward = await AdMob.showRewardVideoAd();
      return !!reward && Number(reward.amount ?? 0) > 0;
    } catch (e) {
      console.warn('[admob] rewarded ad failed', e);
      return false;
    }
  }

  async showInterstitial() {
    try {
      await this.#init();
      await AdMob.prepareInterstitial({ adId: this.ids.interstitial, isTesting: this.testing });
      await AdMob.showInterstitial();
    } catch (e) {
      console.warn('[admob] interstitial failed', e); // no ad this time: the story just goes on
    }
  }
}
