import { el } from '../../ui/dom.js';

/**
 * Rewarded-ad port: `showRewarded()` resolves true when the ad was watched to the end.
 * On mobile, replace MockAdProvider with an AdMob / Unity Ads adapter.
 */
export class AdProvider {
  async showRewarded() { return false; }
}

/** Placeholder ad: a countdown overlay. */
export class MockAdProvider extends AdProvider {
  constructor(host, modes, seconds = 5) { super(); Object.assign(this, { host, modes, seconds }); }

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
        count.textContent = left > 0 ? `Ödül için ${left} sn…` : 'Ödül kazandın: +1 kredi';
        if (left <= 0) { clearInterval(timer); close.disabled = false; close.textContent = 'Ödülü al'; }
        left--;
      };
      const timer = setInterval(tick, 1000);
      tick();
      close.onclick = () => { clearInterval(timer); wrap.remove(); pop(); resolve(left < 0); };
    });
  }
}
