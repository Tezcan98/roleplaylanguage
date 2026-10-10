import { el, ICONS } from './dom.js';
import { gloss } from '../i18n/Gloss.js';
import { SHOP, outfitPicture } from '../content/shop.js';
import { PACKS } from '../services/monetization/Billing.js';
import { AD_REWARD } from '../services/monetization/CreditWallet.js';
import { coin } from './coin.js';

const hm = (ms) => { const m = Math.ceil(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)} sa ${m % 60} dk` : `${m} dk`; };

/**
 * The shop (the coin in the HUD, and on the main menu): earn credits (daily reward, a rewarded video
 * every 3 hours), buy credit packs (Google Play, in the app), spend credits (ad-free mode,
 * outfits). Lessons and practice also cost credits, at the school.
 */
export class ShopView {
  #pop = null;
  #prices = {};

  constructor(host, { modes, wallet, ads, billing, gender, look, onDaily, onOutfit, toasts }) {
    Object.assign(this, { modes, wallet, ads, billing, gender, look, onDaily, onOutfit, toasts });
    this.body = el('div', { class: 'shop-body' });
    this.balance = el('b', { class: 'shop-balance' });
    this.root = el('div', { class: 'overlay dim shop' }, [el('div', { class: 'card' }, [
      el('div', { class: 'shop-head' }, [
        el('h2', { class: 'ctitle' }, [coin(), ' Dükkan']), this.balance,
        el('button', { class: 'iconbtn light', html: ICONS.close, attrs: { type: 'button', 'aria-label': 'Kapat' }, on: { click: () => this.close() } }),
      ]),
      this.body,
    ])]);
    host.append(this.root);
  }

  get isOpen() { return this.root.classList.contains('open'); }

  async open() {
    if (!this.#pop) this.#pop = this.modes.push('overlay');
    this.root.classList.add('open');
    this.render();
    if (this.billing.available) { this.#prices = await this.billing.prices(); if (this.isOpen) this.render(); }
  }

  close() { this.root.classList.remove('open'); this.#pop?.(); this.#pop = null; }

  render() {
    const w = this.wallet;
    this.balance.replaceChildren(coin(), ` ${w.balance}`);
    const card = (cls, top, name, sub, action, subTr = false) => el('div', { class: `shop-card ${cls}` }, [
      top instanceof Node ? top : el('span', { class: 'shop-card-top', text: top }), el('b', { class: 'shop-card-name', text: name }), sub ? el('small', { class: subTr ? 'shop-sub' : 'shop-sub en-t', text: sub }) : null, action,
    ].filter(Boolean));
    const btn = (text, cls, fn, disabled = false) => el('button', { class: `shop-btn ${cls}`, text, attrs: { type: 'button', ...(disabled ? { disabled: '' } : {}) }, on: { click: fn } });
    const title = (tr, en) => el('h3', { class: 'shop-title' }, [tr, el('small', { class: 'en-t', text: ` · ${en}` })]);

    // gold: free first (daily reward, a video), then every pack with its price
    const daily = w.daily(), wait = w.adWait();
    const gold = [
      card('free', '🎁', daily ? `+${daily.amount}` : '✓', daily ? `Günlük ödül · ${daily.day}. gün` : 'Yarın yine gel',
        daily ? btn('Al', 'go', () => { this.onDaily(); this.render(); }) : btn('Alındı', '', () => {}, true), true),
      card('free', '▶', `+${AD_REWARD}`, 'Video izle',
        wait ? btn(hm(wait), '', () => {}, true) : btn('İzle', 'go', async (e) => {
          e.target.disabled = true;
          if (await this.ads.showRewarded()) { w.adWatched(); this.toasts.show(`+${AD_REWARD} kredi`, 'Credits earned'); }
          this.render();
        }), true),
      ...PACKS.map((p, i) => card(`pack pack${i}`, [el('span', { class: 'shop-card-top' }, [coin()]), '💰', '💎'][i] ?? '💎', `${p.credits}`, 'kredi',
        btn(this.#prices[p.id] ?? p.price, 'buy', async (e) => {
          if (!this.billing.available) { this.toasts.show('Altın paketleri Android uygulamasında satılır', 'Credit packs are sold in the Android app'); return; }
          e.target.disabled = true;
          if (await this.billing.buy(p)) { w.add(p.credits, 'purchase'); this.toasts.show(`+${p.credits} kredi. Teşekkürler!`, 'Thank you!'); }
          else this.toasts.show('Satın alma tamamlanmadı', 'The purchase did not go through');
          this.render();
        }), true)),
    ];

    // spend: outfits (one on at a time) and ad-free mode
    const items = SHOP.filter((i) => !i.for || i.for(this.gender, this.look)).map((i) => {
      const owned = w.owns(i.id), worn = i.slot && w.equipped(i.slot) === i.id && (!i.needs || w.equipped(i.needs) === i.needs);
      let action;
      if (i.needs && !w.owns(i.needs)) action = btn('Önce HD karakter', '', () => {}, true); // outfits are for the HD character
      else if (!owned) { action = btn(` ${i.price}`, 'buy', () => this.#buy(i), w.balance < i.price); action.prepend(coin()); }
      else if (!i.slot) action = btn('Alındı ✓', '', () => {}, true);
      else action = worn ? btn('Çıkar', 'worn', () => { w.unequip(i.slot); this.onOutfit(); }) : btn('Giy', 'go', () => { this.#wear(i); this.onOutfit(); });
      // what the character will look like (no icons): the outfit picture, a glowing ring
      const pic = i.outfit || i.look || i.picture ? el('img', { class: 'shop-pic', attrs: { src: outfitPicture(i, this.gender, this.look), alt: i.title, loading: 'lazy' } }) : i.icon;
      return card(worn ? 'item worn' : 'item', pic, i.title, gloss(i.en), action);
    });
    this.body.replaceChildren(
      title('Altın', gloss('Gold')), el('div', { class: 'shop-grid' }, gold),
      title('Kıyafetler ve daha fazlası', gloss('Outfits and more')), el('div', { class: 'shop-grid' }, items),
    );
  }

  /** An outfit puts the HD character on too. */
  #wear(item) {
    this.wallet.equip(item);
    const needs = item.needs && SHOP.find((i) => i.id === item.needs);
    if (needs) this.wallet.equip(needs);
  }

  #buy(item) {
    if (!this.wallet.buy(item)) return;
    if (item.slot) this.#wear(item);
    this.toasts.show(`${item.title} senin!`, 'It is yours!');
    if (item.slot) this.onOutfit(); else this.render();
  }
}
