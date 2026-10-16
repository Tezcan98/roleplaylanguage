import { el, ICONS } from './dom.js';
import { gloss } from '../i18n/Gloss.js';
import { SHOP, FOODS, outfitPicture } from '../content/shop.js';
import { PACKS, SELL_PACKS } from '../services/monetization/Billing.js';
import { AD_REWARD, SHARE_REWARD } from '../services/monetization/CreditWallet.js';
import { coin } from './coin.js';

const hm = (ms) => { const m = Math.ceil(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)} sa ${m % 60} dk` : `${m} dk`; };

const mmss = (ms) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
/** The shop's tabs: gold (free credits and packs), food (boosts), outfits and more. */
const TABS = [['gold', '🪙', 'Altın', 'Gold'], ['food', '🌶️', 'Yiyecek', 'Food'], ['wear', '👕', 'Kıyafet', 'Outfits and more']];

/**
 * The shop (the coin in the HUD, and on the main menu), in tabs of bright cards: earn credits
 * (daily reward, a rewarded video every 3 hours, sharing), buy credit packs (Google Play, in the
 * app), spend credits on food that works for a few minutes (Urfa biberi: faster) and on ad-free
 * mode and outfits. Lessons and practice also cost credits, at the school.
 */
export class ShopView {
  #pop = null;
  #prices = {};
  #tab = 'gold';

  constructor(host, { modes, wallet, ads, billing, gender, look, onDaily, onOutfit, toasts, share = null, onEat = () => {} }) {
    this.share = share; // "Paylaş, kazan": () => Promise<shared?> (platform/share.js)
    Object.assign(this, { modes, wallet, ads, billing, gender, look, onDaily, onOutfit, toasts, onEat });
    this.tabs = el('div', { class: 'shop-tabs', attrs: { role: 'tablist' } });
    this.body = el('div', { class: 'shop-body' });
    this.balance = el('b', { class: 'shop-balance' });
    this.root = el('div', { class: 'overlay dim shop' }, [el('div', { class: 'card' }, [
      el('div', { class: 'shop-head' }, [
        el('h2', { class: 'ctitle' }, [coin(), ' Dükkan']), this.balance,
        el('button', { class: 'iconbtn light', html: ICONS.close, attrs: { type: 'button', 'aria-label': 'Kapat' }, on: { click: () => this.close() } }),
      ]),
      this.tabs,
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
    // a card: its name on top, a big picture, a line under it, the button; `ribbon`: a corner label
    const card = (cls, art, name, sub, action, { subTr = false, ribbon = '' } = {}) => el('div', { class: `shop-card ${cls}` }, [
      ribbon ? el('span', { class: 'shop-ribbon', text: ribbon }) : null,
      el('b', { class: 'shop-card-name', text: name }),
      el('div', { class: 'shop-art' }, [art instanceof Node ? art : el('span', { class: 'shop-card-top', text: art })]),
      sub ? el('small', { class: subTr ? 'shop-sub' : 'shop-sub en-t', text: sub }) : null, action,
    ].filter(Boolean));
    const btn = (text, cls, fn, disabled = false) => el('button', { class: `shop-btn ${cls}`, text, attrs: { type: 'button', ...(disabled ? { disabled: '' } : {}) }, on: { click: fn } });
    const price = (n, fn) => { const b = btn(` ${n}`, 'buy', fn, w.balance < n); b.prepend(coin()); return b; };

    this.tabs.replaceChildren(...TABS.map(([id, icon, tr, en]) => el('button', {
      class: `shop-tab${id === this.#tab ? ' on' : ''}`, attrs: { type: 'button', role: 'tab', 'aria-selected': String(id === this.#tab) },
      on: { click: () => { this.#tab = id; this.render(); } },
    }, [el('span', { class: 'shop-tab-icon', text: icon }), el('span', {}, [tr, el('small', { class: 'en-t', text: gloss(en) })])])));

    let cards;
    if (this.#tab === 'gold') {
      // free first (daily reward, a video, sharing), then every pack with its price (while packs are sold)
      const daily = w.daily(), wait = w.adWait();
      cards = [
        card('free', '🎁', daily ? `+${daily.amount}` : '✓', daily ? `Günlük ödül · ${daily.day}. gün` : 'Yarın yine gel',
          daily ? btn('Al', 'go', () => { this.onDaily(); this.render(); }) : btn('Alındı', '', () => {}, true), { subTr: true, ribbon: daily ? 'Bedava' : '' }),
        this.ads.hasRewarded && card('free video', '▶️', `+${AD_REWARD}`, 'Video izle',
          wait ? btn(hm(wait), '', () => {}, true) : btn('İzle', 'go', async (e) => {
            e.target.disabled = true;
            if (await this.ads.showRewarded()) { w.adWatched(); this.toasts.show(`+${AD_REWARD} kredi`, 'Credits earned'); }
            else if (this.ads.lastError) this.toasts.show(`Şu an reklam yok, sonra tekrar dene. (AdMob: ${this.ads.lastError})`, 'No ad right now — try again later.');
            this.render();
          }), { subTr: true }),
        this.share && card('free share', '📤', `+${SHARE_REWARD}`, 'Paylaş, kazan',
          w.sharedToday() ? btn('Yarın yine ✓', '', () => {}, true) : btn('Paylaş', 'go', async (e) => {
            e.target.disabled = true;
            if (await this.share()) { w.shared(); this.toasts.show(`Teşekkürler! +${SHARE_REWARD} kredi`, 'Thanks for sharing!'); }
            this.render();
          }), { subTr: true }),
        ...(SELL_PACKS ? PACKS : []).map((p, i) => card(`pack pack${i}`, ['🪙', '💰', '💎'][i] ?? '💎', `${p.credits}`, 'kredi',
          btn(this.#prices[p.id] ?? p.price, 'buy', async (e) => {
            if (!this.billing.available) { this.toasts.show('Altın paketleri Android uygulamasında satılır', 'Credit packs are sold in the Android app'); return; }
            e.target.disabled = true;
            if (await this.billing.buy(p)) { w.add(p.credits, 'purchase'); this.toasts.show(`+${p.credits} kredi. Teşekkürler!`, 'Thank you!'); }
            else this.toasts.show('Satın alma tamamlanmadı', 'The purchase did not go through');
            this.render();
          }), { subTr: true, ribbon: ['', 'En popüler', 'En avantajlı'][i] ?? '' })),
      ];
    } else if (this.#tab === 'food') {
      // eaten at once, good for a few minutes; another one adds its minutes on
      cards = FOODS.map((f) => {
        const left = w.boostLeft(f.id);
        const art = el('div', { class: 'shop-food' }, [el('span', { class: 'shop-card-top', text: f.icon }), el('span', { class: 'shop-badge', text: `⚡ ×${f.speed} · ${f.minutes} dk` })]);
        return card(left ? 'food on' : 'food', art, f.title, left ? `⏱ ${mmss(left)} kaldı` : gloss(f.en), price(f.price, () => {
          if (!w.eat(f)) return;
          this.onEat(f);
          this.toasts.show(`🌶️ Hızlandın! ${f.minutes} dakika`, 'You are faster for a few minutes');
          this.render();
        }), { subTr: !!left, ribbon: left ? 'Aktif' : 'Yeni' });
      });
    } else {
      // outfits (one on at a time) and ad-free mode
      cards = SHOP.filter((i) => !i.for || i.for(this.gender, this.look)).map((i) => {
        const owned = w.owns(i.id), worn = i.slot && w.equipped(i.slot) === i.id && (!i.needs || w.equipped(i.needs) === i.needs);
        let action;
        if (i.needs && !w.owns(i.needs)) action = btn('Önce HD karakter', '', () => {}, true); // outfits are for the HD character
        else if (!owned) action = price(i.price, () => this.#buy(i));
        else if (!i.slot) action = btn('Alındı ✓', '', () => {}, true);
        else action = worn ? btn('Çıkar', 'worn', () => { w.unequip(i.slot); this.onOutfit(); }) : btn('Giy', 'go', () => { this.#wear(i); this.onOutfit(); });
        // what the character will look like (no icons): the outfit picture, a glowing ring
        const pic = i.outfit || i.look || i.picture ? el('img', { class: 'shop-pic', attrs: { src: outfitPicture(i, this.gender, this.look), alt: i.title, loading: 'lazy' } }) : i.icon;
        return card(worn ? 'item worn' : `item${i.id === 'adFree' ? ' noads' : ''}`, pic, i.title, gloss(i.en), action, { ribbon: worn ? 'Üstünde' : '' });
      });
    }
    this.body.replaceChildren(el('div', { class: `shop-grid tab-${this.#tab}` }, cards.filter(Boolean)));
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
