import { AdMob, RewardAdPluginEvents } from '@capacitor-community/admob';
import { AdProvider } from './AdProvider.js';

const TEST_REWARDED_ID = 'ca-app-pub-3940256099942544/5224354917';

export class AdMobAdProvider extends AdProvider {
  #initialized = null;

  constructor({ rewardedId = TEST_REWARDED_ID } = {}) {
    super();
    this.rewardedId = rewardedId || TEST_REWARDED_ID;
  }

  async #init() {
    this.#initialized ??= AdMob.initialize({ initializeForTesting: this.rewardedId === TEST_REWARDED_ID }).catch((e) => {
      this.#initialized = null;
      throw e;
    });
    return this.#initialized;
  }

  async showRewarded() {
    await this.#init();
    let rewarded = false;
    let settled = false;
    let resolveResult;
    const result = new Promise((resolve) => { resolveResult = resolve; });

    const rewardHandle = await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
      rewarded = true;
      if (settled) return;
      settled = true;
      resolveResult(true);
    });
    const dismissedHandle = await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
      if (settled) return;
      settled = true;
      resolveResult(rewarded);
    });
    const failedHandle = await AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => {
      if (settled) return;
      settled = true;
      resolveResult(false);
    });

    try {
      await AdMob.prepareRewardVideoAd({ adId: this.rewardedId, isTesting: this.rewardedId === TEST_REWARDED_ID });
      await AdMob.showRewardVideoAd({ adId: this.rewardedId });
      if (!settled) {
        settled = true;
        resolveResult(rewarded);
      }
    } catch (e) {
      if (!settled) {
        settled = true;
        resolveResult(false);
      }
      console.warn('[admob] rewarded ad failed:', e.message);
    } finally {
      await Promise.allSettled([rewardHandle.remove(), dismissedHandle.remove(), failedHandle.remove()]);
    }

    return result;
  }
}
