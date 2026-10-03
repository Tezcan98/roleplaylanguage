import { el } from '../../ui/dom.js';
import { gloss } from '../../i18n/Gloss.js';
import { AD_REWARD } from './CreditWallet.js';

/**
 * Pay-to-enter for lessons: spend credits, or watch a rewarded video (+3, every 3 hours).
 * `request(lesson)` resolves true when the player may enter.
 */
export class ClassAccessGate {
  constructor({ host, modes, wallet, ads }) { Object.assign(this, { host, modes, wallet, ads }); }

  request(resource) {
    const cost = resource.cost ?? 1;
    return new Promise((resolve) => {
      const pop = this.modes.push('overlay');
      const balance = el('p', { class: 'ctext' });
      const pay = el('button', { class: 'btn', attrs: { type: 'button' } });
      const ad = el('button', { class: 'btn alt', attrs: { type: 'button' } });
      const cancel = el('button', { class: 'btn alt', text: 'Vazgeç', attrs: { type: 'button' } });
      const root = el('div', { class: 'overlay open dim' }, [el('div', { class: 'card' }, [
        el('p', { class: 'chap', text: resource.titleEn ? 'Ders' : 'Sesli sınav' }),
        el('h2', { class: 'ctitle', text: resource.title }),
        el('p', { class: 'cen en-t', text: resource.titleEn ? gloss(resource.titleEn) : gloss('Speech exam') }),
        balance, pay, ad, cancel,
      ])]);
      const refresh = () => {
        balance.textContent = `${resource.titleEn ? 'Bu ders' : 'Bu sınav'} ${cost} kredi. Kredin: ${this.wallet.balance}`;
        pay.textContent = `Krediyle gir (−${cost})`;
        pay.disabled = this.wallet.balance < cost;
        const wait = this.wallet.adWait();
        ad.disabled = wait > 0;
        ad.textContent = wait > 0 ? `▶ Sonraki video ${Math.ceil(wait / 60000)} dk sonra` : `▶ Video izle (+${AD_REWARD} kredi)`;
      };
      const done = (ok) => { root.remove(); pop(); resolve(ok); };
      pay.onclick = () => { if (this.wallet.trySpend(cost)) done(true); };
      ad.onclick = async () => { ad.disabled = true; if (await this.ads.showRewarded()) this.wallet.adWatched(); refresh(); };
      cancel.onclick = () => done(false);
      refresh();
      this.host.append(root);
    });
  }
}
