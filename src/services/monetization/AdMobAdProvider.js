import { AdMob } from '@capacitor-community/admob';
import { AdProvider } from './AdProvider.js';

const TEST_REWARDED_ID = 'ca-app-pub-3940256099942544/5224354917';

/** Native AdMob rewarded-video adapter for the existing AdProvider port. */
export class AdMobAdProvider extends AdProvider {
  constructor({ rewardedId = TEST_REWARDED_ID } = {}) {
    super();
    this.rewardedId = rewardedId || TEST_REWARDED_ID;
    this.initialized = false;
  }

  async #init() {
    if (this.initialized) return;
    await AdMob.initialize({ initializeForTesting: this.rewardedId === TEST_REWARDED_ID });
    this.initialized = true;
  }

  async showRewarded() {
    try {
      await this.#init();
      await AdMob.prepareRewardVideoAd({ adId: this.rewardedId, isTesting: this.rewardedId === TEST_REWARDED_ID });
      const reward = await AdMob.showRewardVideoAd();
      return !!reward && Number(reward.amount ?? 0) > 0;
    } catch (e) {
      console.warn('[admob] rewarded ad failed', e);
      return false;
    }
  }
}
