import { el } from '../../ui/dom.js';

/**
 * Ad port. `showRewarded()` resolves true when the video was watched to the end;
 * `showInterstitial()` shows a full-screen ad and resolves when it is closed.
 * In the Android app: AdMobAdProvider. On the website there is no ad network (yet).
 */
export class AdProvider {
  /** Whether there are rewarded videos here at all (the Android app; on the website there is no ad network). */
  get hasRewarded() { return false; }
  lastError = '';
  async showRewarded() { return false; }
  async showInterstitial() {}
  /** A banner at the bottom of the screen (the square's menu); nothing on the website. */
  async showBanner() {}
  async hideBanner() {}
}

/**
 * Tests (?mockads): a stand-in for the rewarded video (a countdown) and the interstitial (3 s).
 * The website itself has no ads (no ad network: no "watch a video" there).
 */
export class MockAdProvider extends AdProvider {
  constructor(host, modes, seconds = 5, { interstitials = false, rewarded = false } = {}) { super(); Object.assign(this, { host, modes, seconds, interstitials, rewarded }); }

  get hasRewarded() { return this.rewarded; }

  showInterstitial() {
    if (!this.interstitials) return Promise.resolve();
    return new Promise((resolve) => {
      const pop = this.modes.push('overlay');
      const close = el('button', { class: 'btn alt sm', text: '✕', attrs: { type: 'button', disabled: '' } });
      const wrap = el('div', { class: 'overlay open ad interstitial' }, [el('div', { class: 'ad-box', html: 'Test reklamı' }), close]);
      this.host.append(wrap);
      setTimeout(() => { close.disabled = false; }, 3000);
      close.onclick = () => { wrap.remove(); pop(); resolve(); };
    });
  }

  showRewarded() {
    return new Promise((resolve) => {
      const pop = this.modes.push('overlay');
      const count = el('div', { class: 'ad-count' });
      const close = el('button', { class: 'btn alt sm', text: 'Kapat', attrs: { type: 'button', disabled: '' } });
      const wrap = el('div', { class: 'overlay open ad' }, [
        el('div', { class: 'ad-box', html: 'Test reklamı' }), count, close,
      ]);
      this.host.append(wrap);
      let left = this.seconds;
      const tick = () => {
        count.textContent = left > 0 ? `Ödül için ${left} sn…` : 'Ödül kazandın!';
        if (left <= 0) { clearInterval(timer); close.disabled = false; close.textContent = 'Ödülü al'; }
        left--;
      };
      const timer = setInterval(tick, 1000);
      tick();
      close.onclick = () => { clearInterval(timer); wrap.remove(); pop(); resolve(left < 0); };
    });
  }
}
