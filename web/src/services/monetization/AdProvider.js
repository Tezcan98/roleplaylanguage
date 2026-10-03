import { el } from '../../ui/dom.js';

/**
 * Ad port. `showRewarded()` resolves true when the video was watched to the end;
 * `showInterstitial()` shows a full-screen ad and resolves when it is closed.
 * In the Android app: AdMobAdProvider. On the website there is no ad network (yet).
 */
export class AdProvider {
  async showRewarded() { return false; }
  async showInterstitial() {}
}

/**
 * Website / tests: a placeholder for the rewarded video (a countdown); interstitials only with
 * `interstitials: true` (?mockads), as a 3-second placeholder card.
 */
export class MockAdProvider extends AdProvider {
  constructor(host, modes, seconds = 5, { interstitials = false } = {}) { super(); Object.assign(this, { host, modes, seconds, interstitials }); }

  showInterstitial() {
    if (!this.interstitials) return Promise.resolve();
    return new Promise((resolve) => {
      const pop = this.modes.push('overlay');
      const close = el('button', { class: 'btn alt sm', text: '✕', attrs: { type: 'button', disabled: '' } });
      const wrap = el('div', { class: 'overlay open ad interstitial' }, [el('div', { class: 'ad-box', html: 'Reklam<br><small>Burada tam ekran bir reklam görünecek</small>' }), close]);
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
        el('div', { class: 'ad-box', html: 'Reklam alanı<br><small>Burada gerçek bir reklam oynayacak</small>' }), count, close,
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
