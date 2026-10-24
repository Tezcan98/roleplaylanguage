import { AdMob, MaxAdContentRating, BannerAdSize, BannerAdPosition, BannerAdPluginEvents, RewardAdPluginEvents } from '@capacitor-community/admob';
import { AdProvider } from './AdProvider.js';

// Google's test units: used until the real ones are in assets/manifest.json → "admob"
const TEST = { rewarded: 'ca-app-pub-3940256099942544/5224354917', interstitial: 'ca-app-pub-3940256099942544/1033173712', banner: 'ca-app-pub-3940256099942544/6300978111' };

/**
 * AdMob in the Android app: rewarded videos (credits), full-screen interstitials between story
 * days, and a banner at the bottom of the menu where you pick the village square. The interstitial ad unit should be set to "display" only (no video) in the AdMob console.
 * Asks for consent first where the law requires it (EU, UK). When AdMob gives no video, `lastError`
 * says why (AdMob's own words: "No fill", "Account not approved yet"…; an app not yet public on
 * Google Play is not reviewed and gets few or no ads) and the shop shows it.
 */
export class AdMobAdProvider extends AdProvider {
  #sized = null;
  get hasRewarded() { return true; }

  /**
   * `onEvent(e, f, data)`: every ad shown, rewarded, opened (a banner's click), and its estimated revenue — for the live numbers (server AdStats.js).
   * `onHouse(on)`: no AdMob banner to show right now (or one again): our own goes in its place (HouseBanner).
   */
  constructor({ rewardedId, interstitialId, bannerId, onEvent = null, onHouse = null } = {}) {
    super();
    this.onEvent = onEvent;
    this.onHouse = onHouse;
    this.lastError = '';
    this.ids = { rewarded: rewardedId || TEST.rewarded, interstitial: interstitialId || TEST.interstitial, banner: bannerId || TEST.banner };
    this.testing = Object.fromEntries(Object.keys(TEST).map((k) => [k, this.ids[k] === TEST[k]])); // test mode only for Google's test ids
    this.bannerOn = false;
    this.ready = null;
  }

  #init() {
    this.ready ??= (async () => {
      // a game for children: AdMob's child-directed treatment (no personalised ads, no tracking) and ads fit for all ages only (Google Play's Families policy)
      await AdMob.initialize({ initializeForTesting: Object.values(this.testing).some(Boolean), tagForChildDirectedTreatment: true, tagForUnderAgeOfConsent: true, maxAdContentRating: MaxAdContentRating.General });
      this.#listen();
      try {
        const info = await AdMob.requestConsentInfo({ tagForUnderAgeOfConsent: true });
        if (info.isConsentFormAvailable && info.status === 'REQUIRED') await AdMob.showConsentForm();
      } catch { /* no consent form needed */ }
    })();
    return this.ready;
  }

  /** The plugin's ad events → onEvent (impressions of full-screen ads come with the revenue AdMob estimates for them). */
  #listen() {
    if (!this.onEvent) return;
    const on = (name, e, f) => AdMob.addListener(name, (d) => { try { this.onEvent(e, f, d ?? {}); } catch { /* never in the ad's way */ } }).catch(() => {});
    for (const [name, e, f] of [
      ['interstitialAdShowed', 'show', 'interstitial'], ['interstitialAdImpression', 'paid', 'interstitial'], ['interstitialAdDismissed', 'dismiss', 'interstitial'],
      ['interstitialAdFailedToShow', 'fail', 'interstitial'], ['interstitialAdFailedToLoad', 'fail', 'interstitial'],
      ['onRewardedVideoAdShowed', 'show', 'rewarded'], ['onRewardedVideoAdImpression', 'paid', 'rewarded'], ['onRewardedVideoAdReward', 'reward', 'rewarded'],
      ['onRewardedVideoAdDismissed', 'dismiss', 'rewarded'], ['onRewardedVideoAdFailedToShow', 'fail', 'rewarded'], ['onRewardedVideoAdFailedToLoad', 'fail', 'rewarded'],
      ['bannerAdImpression', 'impression', 'banner'], ['bannerAdPaid', 'paid', 'banner'], ['bannerAdOpened', 'click', 'banner'], ['bannerAdFailedToLoad', 'fail', 'banner'],
    ]) on(name, e, f);
  }

  async showRewarded() {
    try {
      await this.#init();
      this.lastError = '';
      await AdMob.prepareRewardVideoAd({ adId: this.ids.rewarded, isTesting: this.testing.rewarded, npa: true });
      // closed before the end: the plugin's call never answers, so the "dismissed" event does
      let off = null;
      const closed = new Promise((r) => { AdMob.addListener(RewardAdPluginEvents.Dismissed, () => setTimeout(() => r(null), 300)).then((h) => { off = h; }); });
      const reward = await Promise.race([AdMob.showRewardVideoAd(), closed]);
      off?.remove?.();
      return !!reward && Number(reward.amount ?? 0) > 0;
    } catch (e) {
      this.lastError = String(e?.message ?? e ?? '').slice(0, 120);
      console.warn('[admob] rewarded ad failed', e);
      return false;
    }
  }

  /**
   * The banner at the bottom of the screen (menus, a player standing still); `hideBanner()` takes it away.
   * When AdMob has no ad (its first load or a refresh a minute later fails — the plugin then removes
   * the banner altogether), our own goes in its place and AdMob is asked again: in 15 s, then 30, then
   * every minute, for as long as the banner is wanted.
   */
  async showBanner() {
    if (this.bannerOn) return;
    this.bannerOn = true; this.#wanted = true;
    document.body.classList.add('banner-on'); // the menus leave room for it at the bottom (style.css --banner-h)
    try {
      await this.#init();
      this.#sized ??= AdMob.addListener(BannerAdPluginEvents.SizeChanged, (s) => { if (s?.height > 0) document.documentElement.style.setProperty('--banner-h', `${Math.ceil(s.height)}px`); });
      this.#watch ??= Promise.all([
        AdMob.addListener(BannerAdPluginEvents.Loaded, () => { this.#backoff = 0; if (this.#wanted) this.onHouse?.(false); }),
        AdMob.addListener(BannerAdPluginEvents.FailedToLoad, () => this.#noAd()),
      ]).catch(() => {});
      if (!this.bannerOn) return; // left the menu meanwhile
      await AdMob.showBanner({ adId: this.ids.banner, adSize: BannerAdSize.ADAPTIVE_BANNER, position: BannerAdPosition.BOTTOM_CENTER, margin: 0, isTesting: this.testing.banner, npa: true });
      if (!this.bannerOn) await AdMob.removeBanner(); // taken away while it was coming up
    } catch (e) {
      console.warn('[admob] banner failed', e);
      this.#noAd();
    }
  }

  #wanted = false;  // a banner is asked for (the menu is still up): a failed one tries again
  #watch = null;
  #retry = null;
  #backoff = 0;     // failed tries in a row
  /** No AdMob banner now: ours in its place, AdMob asked again in a while. */
  #noAd() {
    if (!this.#wanted) return;
    this.bannerOn = false; // (the plugin has removed its banner: the next showBanner makes a new one)
    this.onHouse?.(true);
    clearTimeout(this.#retry);
    const wait = [15000, 30000][this.#backoff++] ?? 60000;
    this.#retry = setTimeout(() => { if (this.#wanted) this.showBanner(); }, wait);
  }

  async hideBanner() {
    this.#wanted = false;
    clearTimeout(this.#retry);
    this.#backoff = 0;
    this.onHouse?.(false);
    document.body.classList.remove('banner-on');
    if (!this.bannerOn) return;
    this.bannerOn = false;
    try { await AdMob.removeBanner(); } catch { /* not shown */ }
  }

  async showInterstitial() {
    try {
      await this.#init();
      await AdMob.prepareInterstitial({ adId: this.ids.interstitial, isTesting: this.testing.interstitial, npa: true });
      await AdMob.showInterstitial();
    } catch (e) {
      console.warn('[admob] interstitial failed', e); // no ad this time: the story just goes on
    }
  }
}
