import { el } from '../../ui/dom.js';

/**
 * Ad port. `showRewarded()` resolves true when the video was watched to the end;
 * `showInterstitial()` shows a full-screen ad and resolves when it is closed.
 * In the Android app: AdMobAdProvider. On the website there is no ad network (yet).
 */
export class AdProvider {
  async showRewarded() { return false; }
  async showInterstitial() {}
  /** A banner at the bottom of the screen (the square's menu); nothing on the website. */
  async showBanner() {}
  async hideBanner() {}
}

/**
 * Our own ad (no ad network on the website): the promo film of the game, the site's loop
 * (sehem2.com.tr/assets/loop.mp4), with "soon on Google Play". Where it can't be loaded (tests,
 * offline) the card shows the game's name on its own.
 */
function houseAd() {
  const film = el('video', { class: 'ad-film', attrs: { src: '/assets/loop.mp4', poster: '/assets/poster.webp', autoplay: '', muted: '', loop: '', playsinline: '' } });
  film.muted = true; // (needed for autoplay)
  film.addEventListener('error', () => film.remove());
  return el('div', { class: 'ad-box house' }, [film, el('div', { class: 'ad-caption', html: 'Anadolu Ailesi<br><small>Yakında Google Play\'de · Türkçeyi bir aileyle yaşayarak öğren</small>' })]);
}

/**
 * Website / tests: our own ad (houseAd) for the rewarded video, with a countdown; interstitials only
 * with `interstitials: true` (?mockads), for 3 seconds.
 */
export class MockAdProvider extends AdProvider {
  constructor(host, modes, seconds = 5, { interstitials = false } = {}) { super(); Object.assign(this, { host, modes, seconds, interstitials }); }

  showInterstitial() {
    if (!this.interstitials) return Promise.resolve();
    return new Promise((resolve) => {
      const pop = this.modes.push('overlay');
      const close = el('button', { class: 'btn alt sm', text: '✕', attrs: { type: 'button', disabled: '' } });
      const wrap = el('div', { class: 'overlay open ad interstitial' }, [houseAd(), close]);
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
        houseAd(), count, close,
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
