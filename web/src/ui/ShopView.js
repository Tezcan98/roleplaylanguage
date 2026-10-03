import { el, ICONS } from './dom.js';
import { gloss } from '../i18n/Gloss.js';
import { SHOP } from '../content/shop.js';
import { PACKS } from '../services/monetization/Billing.js';
import { AD_REWARD } from '../services/monetization/CreditWallet.js';

const hm = (ms) => { const m = Math.ceil(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)} sa ${m % 60} dk` : `${m} dk`; };

/**
 * The shop (🪙 in the HUD, and on the main menu): earn credits (daily reward, a rewarded video
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
        el('h2', { class: 'ctitle', text: '🪙 Dükkan' }), this.balance,
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
    this.balance.textContent = `${w.balance} kredi`;
    const btn = (text, cls, fn, disabled = false) => el('button', { class: cls, text, attrs: { type: 'button', ...(disabled ? { disabled: '' } : {}) }, on: { click: fn } });
    const section = (tr, en, children) => el('section', { class: 'shop-sec' }, [el('h3', {}, [tr, el('small', { class: 'en-t', text: ` · ${en}` })]), ...children]);

    // earn
    const daily = w.daily();
    const wait = w.adWait();
    const earn = section('Kredi kazan', gloss('Earn credits'), [
      daily
        ? btn(`🎁 Günlük ödül: ${daily.day}. gün · +${daily.amount}`, 'btn', () => { this.onDaily(); this.render(); })
        : el('p', { class: 'shop-note', text: `🎁 Bugünkü ödülü aldın (${w.data.streak}. gün). Yarın yine gel, ödül büyüsün!` }),
      wait
        ? el('p', { class: 'shop-note', text: `▶ Sonraki video: ${hm(wait)} sonra` })
        : btn(`▶ Video izle · +${AD_REWARD} kredi`, 'btn alt', async (e) => {
          e.target.disabled = true;
          if (await this.ads.showRewarded()) { w.adWatched(); this.toasts.show(`+${AD_REWARD} kredi`, 'Credits earned'); }
          this.render();
        }),
    ]);

    // buy packs
    const packs = section('Kredi al', gloss('Buy credits'), this.billing.available
      ? PACKS.map((p) => btn(`${p.credits} kredi · ${this.#prices[p.id] ?? p.price}`, 'btn alt shop-pack', async (e) => {
        e.target.disabled = true;
        if (await this.billing.buy(p)) { w.add(p.credits, 'purchase'); this.toasts.show(`+${p.credits} kredi. Teşekkürler!`, 'Thank you!'); }
        else this.toasts.show('Satın alma tamamlanmadı', 'The purchase did not go through');
        this.render();
      }))
      : [el('p', { class: 'shop-note', text: `${PACKS.map((p) => `${p.credits} kredi ${p.price}`).join(' · ')} — Android uygulamasında satın alınır.` })]);

    // spend
    const items = SHOP.filter((i) => !i.for || i.for(this.gender, this.look)).map((i) => {
      const owned = w.owns(i.id), worn = i.slot && w.equipped(i.slot) === i.id;
      let action;
      if (i.id === 'adFree') action = owned ? el('span', { class: 'shop-owned', text: 'Alındı ✓' }) : btn(`${i.price} kredi`, 'chipbtn primary', () => this.#buy(i), w.balance < i.price);
      else if (!owned) action = btn(`${i.price} kredi`, 'chipbtn primary', () => this.#buy(i), w.balance < i.price);
      else action = worn ? btn('Çıkar', 'chipbtn', () => { w.unequip(i.slot); this.onOutfit(); }) : btn('Giy', 'chipbtn', () => { w.equip(i); this.onOutfit(); });
      return el('div', { class: `shop-item${i.value != null ? '' : ' wide'}` }, [
        el('span', { class: 'shop-icon', text: i.icon, style: i.value != null ? { color: `#${i.value.toString(16).padStart(6, '0')}` } : {} }),
        el('span', { class: 'shop-name' }, [i.title, el('small', { class: 'en-t', text: gloss(i.en) })]),
        action,
      ]);
    });
    const spend = section('Harca', gloss('Spend credits'), [el('div', { class: 'shop-items' }, items)]);
    this.body.replaceChildren(earn, packs, spend);
  }

  #buy(item) {
    if (!this.wallet.buy(item)) return;
    this.toasts.show(`${item.title} senin!`, 'It is yours!');
    if (item.slot) this.onOutfit(); else this.render();
  }
}
