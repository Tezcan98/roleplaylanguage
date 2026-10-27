import { el, ICONS } from './dom.js';
import { gloss } from '../i18n/Gloss.js';
import { SHOP, FOODS, outfitPicture } from '../content/shop.js';
import { PACKS, SELL_PACKS } from '../services/monetization/Billing.js';
import { AD_REWARD, SHARE_REWARD } from '../services/monetization/CreditWallet.js';
import { coin } from './coin.js';

const hm = (ms) => { const m = Math.ceil(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)} sa ${m % 60} dk` : `${m} dk`; };

const mmss = (ms) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
/** How long a food works: '30 dk', '3 gün'; what is left: '29:41', '2 gün 23 sa'. */
const span = (min) => (min >= 1440 ? `${Math.round(min / 1440)} gün` : `${min} dk`);
const left_ = (ms) => (ms >= 86400000 ? `${Math.floor(ms / 86400000)} gün ${Math.floor((ms % 86400000) / 3600000)} sa` : ms >= 3600000 ? `${Math.floor(ms / 3600000)} sa ${Math.floor((ms % 3600000) / 60000)} dk` : mmss(ms));
/** The shop's tabs: gold (free credits and packs), food (boosts), outfits and more. */
const TABS = [['gold', '🪙', 'Altın', 'Gold'], ['food', '🌶️', 'Yiyecek', 'Food'], ['wear', '👕', 'Kıyafet', 'Outfits and more']];

/**
 * The shop (the coin in the HUD, and on the main menu), in tabs of bright cards: earn credits
 * (daily reward, a rewarded video every hour, sharing), buy credit packs (Google Play, in the
 * app), spend credits on food that works for a few minutes (Urfa biberi: faster) and on ad-free
 * mode (on the gold tab) and outfits. Lessons and practice at the school are free.
 */
export class ShopView {
  #pop = null;
  #prices = {};
  #tab = 'gold';

  #taps = [];

  constructor(host, { modes, wallet, ads, billing, gender, look, onDaily, onOutfit, toasts, share = null, feedback = null, onEat = () => {}, onCode = null }) {
    this.onCode = onCode; // five quick taps on the "Altın" tab: the developer's code card
    this.share = share; // "Paylaş, kazan": () => Promise<shared?> (platform/share.js)
    this.feedback = feedback; // "Yorum yaz, kazan": { due(), open() } (ui/FeedbackView.js: once a day, up to 20 credits)
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

  /** `tab`: open on that tab ('gold', 'food', 'wear'; else the one it was on). */
  async open(tab = null) {
    if (tab) this.#tab = tab;
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
    // spending credits: "Emin misin?" first (what it is, how much)
    const price = (n, fn, what) => { const b = btn(` ${n}`, 'buy', async () => { if (await this.#confirm(what, n)) fn(); }, w.balance < n); b.prepend(coin()); return b; };

    this.tabs.replaceChildren(...TABS.map(([id, icon, tr, en]) => el('button', {
      class: `shop-tab${id === this.#tab ? ' on' : ''}`, attrs: { type: 'button', role: 'tab', 'aria-selected': String(id === this.#tab) },
      on: { click: () => { this.#tab = id; this.render(); if (id === 'gold') this.#goldTap(); } },
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
        this.feedback && card('free feedback', '💬', '+20', 'Yorum yaz, kazan',
          this.feedback.due() ? btn('Yaz', 'go', () => { this.close(); this.feedback.open(); }) : btn('Yarın yine ✓', '', () => {}, true), { subTr: true }),
        // ad-free mode: here with the gold, not among the outfits
        this.#itemCard(SHOP.find((i) => i.id === 'adFree'), { card, btn, price }),
        // the packs with their prices; not on sale yet (config.json sellPacks): shown, the button off
        ...PACKS.map((p, i) => card(`pack pack${i}`, ['🪙', '💰', '💎'][i] ?? '💎', `${p.credits}`, SELL_PACKS ? 'kredi' : 'kredi · yakında',
          btn(this.#prices[p.id] ?? p.price, 'buy', async (e) => {
            if (!this.billing.available) { this.toasts.show('Altın paketleri Android uygulamasında satılır', 'Credit packs are sold in the Android app'); return; }
            e.target.disabled = true;
            if (await this.billing.buy(p)) { w.add(p.credits, 'purchase'); this.toasts.show(`+${p.credits} kredi. Teşekkürler!`, 'Thank you!'); }
            else this.toasts.show('Satın alma tamamlanmadı', 'The purchase did not go through');
            this.render();
          }, !SELL_PACKS), { subTr: true, ribbon: ['', 'En popüler', 'En avantajlı'][i] ?? '' })),
      ];
    } else if (this.#tab === 'food') {
      // eaten at once, good for a few minutes; another one adds its minutes on
      cards = FOODS.map((f) => {
        const left = w.boostLeft(f.id);
        const art = el('div', { class: `shop-food${f.glow ? ' glow' : ''}` }, [el('span', { class: 'shop-card-top', ...(f.art ? { html: f.art } : { text: f.icon }) }), el('span', { class: 'shop-badge', text: f.speed ? `⚡ ×${f.speed} · ${span(f.minutes)}` : `✨ ${span(f.minutes)}` })]);
        return card(`food${f.glow ? ' gold' : ''}${left ? ' on' : ''}`, art, f.title, left ? `⏱ ${left_(left)} kaldı` : gloss(f.en), price(f.price, () => {
          if (!w.eat(f)) return;
          this.onEat(f);
          if (f.glow) this.toasts.show(`✨ Parlıyorsun! ${span(f.minutes)}`, 'Everyone in the square sees your golden light');
          else this.toasts.show(`${f.icon} Hızlandın! ${span(f.minutes)}`, 'You are faster for a while');
          this.render();
        }, f.title), { subTr: !!left, ribbon: left ? 'Aktif' : 'Yeni' });
      });
    } else {
      // outfits (one on at a time) and the HD character they need
      cards = SHOP.filter((i) => i.id !== 'adFree' && (!i.for || i.for(this.gender, this.look))).map((i) => this.#itemCard(i, { card, btn, price }));
    }
    this.body.replaceChildren(el('div', { class: `shop-grid tab-${this.#tab}` }, cards.filter(Boolean)));
  }

  /** A card of something credits buy (content/shop.js SHOP): price, or wear / take off, or "1 gün dene" with a video. */
  #itemCard(i, { card, btn, price }) {
    if (!i) return null;
    const w = this.wallet;
    const owned = w.owns(i.id), worn = i.slot && w.equipped(i.slot) === i.id && (!i.needs || w.equipped(i.needs) === i.needs);
    const trying = owned && !w.bought(i.id); // tried on for a day (a video): wear it, or buy it for good
    // a rewarded video puts it on for a day (an outfit: with the HD character it needs)
    const tryOn = i.slot && !owned && this.ads.hasRewarded && btn('📺 1 gün dene', 'go', async (e) => {
      e.target.disabled = true;
      if (await this.ads.showRewarded()) {
        w.tryOn([i.id, i.needs].filter(Boolean)); this.#wear(i);
        this.toasts.show(`${i.title} bir gün senin!`, 'Yours for a day!'); this.onOutfit();
      } else { if (this.ads.lastError) this.toasts.show('Şu an reklam yok, sonra tekrar dene.', 'No ad right now — try again later.'); this.render(); }
    });
    let action;
    if (i.needs && !w.owns(i.needs)) action = tryOn || btn('Önce HD karakter', '', () => {}, true); // outfits are for the HD character
    else if (!owned) action = price(i.price, () => this.#buy(i), i.title);
    else if (!i.slot) action = btn('Alındı ✓', '', () => {}, true);
    else action = worn ? btn('Çıkar', 'worn', () => { w.unequip(i.slot); this.onOutfit(); }) : btn('Giy', 'go', () => { this.#wear(i); this.onOutfit(); });
    if (tryOn && action !== tryOn) action = el('div', { class: 'shop-btns' }, [action, tryOn]);
    if (trying) action = el('div', { class: 'shop-btns' }, [action, price(i.price, () => this.#buy(i), i.title)]);
    // what the character will look like (no icons): the outfit picture, a glowing ring
    const pic = i.outfit || i.look || i.picture ? el('img', { class: 'shop-pic', attrs: { src: outfitPicture(i, this.gender, this.look), alt: i.title, loading: 'lazy' } }) : i.icon;
    return card(worn ? 'item worn' : `item${i.id === 'adFree' ? ' noads' : ''}`, pic, i.title, gloss(i.en), action, { ribbon: trying ? `Deneme · ${left_(w.trialLeft(i.id))}` : worn ? 'Üstünde' : '' });
  }

  /** Five quick taps on the "Altın" tab (2.5 s): the code card. */
  #goldTap() {
    const now = performance.now();
    this.#taps = [...this.#taps.filter((t) => now - t < 2500), now];
    if (this.#taps.length >= 5 && this.onCode) { this.#taps = []; this.onCode(); }
  }

  /** "Emin misin?" over the shop: resolves true for "Evet, al". */
  #confirm(what, n) {
    return new Promise((resolve) => {
      const done = (ok) => { box.remove(); resolve(ok); };
      const yes = el('button', { class: 'shop-btn buy yes', attrs: { type: 'button' }, on: { click: () => done(true) } }, [coin(), ` ${n} · Evet, al`]);
      const box = el('div', { class: 'shop-confirm', attrs: { role: 'dialog', 'aria-modal': 'true' }, on: { click: (e) => { if (e.target === box) done(false); } } }, [el('div', { class: 'shop-confirm-card' }, [
        el('b', { text: 'Emin misin?' }),
        el('p', {}, [`${what} için `, coin(), ` ${n} altın harcanacak.`, el('small', { class: 'en-t', text: ` · ${gloss('Are you sure? This spends your gold.')}` })]),
        el('div', { class: 'shop-confirm-btns' }, [el('button', { class: 'shop-btn no', text: 'Vazgeç', attrs: { type: 'button' }, on: { click: () => done(false) } }), yes]),
      ])]);
      this.root.append(box);
      yes.focus();
    });
  }

  /** An outfit puts the HD character on too. */
  #wear(item) {
    this.wallet.equip(item);
    const needs = item.needs && SHOP.find((i) => i.id === item.needs);
    if (needs) this.wallet.equip(needs);
  }

  #buy(item) {
    if (!this.wallet.buy(item)) return;
    if (item.needs && !this.wallet.bought(item.needs)) this.toasts.show('HD karakteri de alırsan deneme bitince de giyebilirsin.', 'Buy the HD character too to keep wearing it.');
    if (item.slot) this.#wear(item);
    this.toasts.show(`${item.title} senin!`, 'It is yours!');
    if (item.slot) this.onOutfit(); else this.render();
  }
}
