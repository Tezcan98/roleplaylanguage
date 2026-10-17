import { CONFIG } from '../config/remote.js'; // prices set on the server

/**
 * What credits buy in the shop (ui/ShopView.js): no ads between story days, the HD character — a
 * detailed, animated child (Quaternius CC0, assets/models/hd_*.glb) that you are everywhere, seen
 * by everyone in the square (all with long clothes) — and, once you have it, outfits for it.
 * One outfit on at a time; without one the HD character wears its everyday clothes.
 */
const outfit = (id, title, en, only) => ({ id: `hd-${id}`, outfit: id, slot: 'body', needs: 'hd', title, en, price: CONFIG.prices.outfit, ...(only ? { for: (gender) => gender === only } : {}) });
/** The shop picture of an outfit as this player would wear it (tools/models/render-previews.mjs). */
export const outfitPicture = (item, gender, look) => `assets/shop/hd_${item.outfit ?? item.look ?? item.id}_${gender !== 'girl' ? (look === 'strong' ? 'strong' : 'boy') : look === 'open' ? 'girl' : 'covered'}.png`;

export const SHOP = [
  { id: 'adFree', title: 'Reklamsız mod', en: 'No more ads between the days of the story', price: CONFIG.prices.adFree, icon: '🚫' },
  { id: 'hd', slot: 'hd', look: 'casual', title: '⭐ HD karakter', en: 'A detailed, animated character instead of the blocky one', price: CONFIG.prices.hd },
  outfit('casual', 'Günlük kıyafet', 'Everyday clothes'),
  outfit('suit', 'Takım elbise', 'Suit', 'boy'),
  outfit('dress', 'Elbise', 'Dress', 'girl'),
  outfit('dress2', 'Pembe elbise', 'Pink dress', 'girl'),
  outfit('sport', 'Eşofman', 'Tracksuit'),
  outfit('jersey', 'Futbol forması', 'Football shirt'),
  outfit('sweater', 'Kazak', 'Jumper'),
  outfit('summer', 'Yazlık', 'Summer clothes'),
];

/**
 * Food from the shop: eaten at once, for credits, and good for a while (a second one adds its time
 * on). Urfa biberi: so hot you run faster (systems/PlayerController.js `boost`). Altın baklava: a
 * golden light shines under your feet for days, seen by everyone in the square.
 */
export const FOODS = [
  { id: 'pepper', icon: '🌶️', title: 'Urfa biberi', en: 'So hot you run faster!', price: CONFIG.prices.pepper, minutes: CONFIG.boosts.pepperMinutes, speed: CONFIG.boosts.pepperSpeed },
  { id: 'baklava', icon: '🍯', title: 'Altın baklava', en: 'You shine with a golden light — everyone in the square sees you', price: CONFIG.prices.aura, minutes: CONFIG.boosts.glowDays * 24 * 60, glow: true },
];

/** The glowing ring under the player is on (Altın baklava eaten; whoever bought the old golden light keeps it on). */
export const auraOn = (wallet) => wallet.boostLeft('baklava') > 0 || wallet.equipped('aura') === 'aura';

/** The outfit the player has on (an id like 'casual'), or null. */
/** The HD outfit the player wears ('casual' when only the HD character is on), or null: the blocky body. */
export const outfitOn = (wallet) => (wallet.equipped('hd') === 'hd' ? SHOP.find((i) => i.id === wallet.equipped('body'))?.outfit ?? 'casual' : null);

/** Saves from before the HD character was its own item: whoever had an outfit gets the HD character. */
export function migrateWallet(wallet) {
  const d = wallet.data;
  if (d.owned.includes('hd') || !d.owned.some((id) => id.startsWith('hd-'))) return;
  d.owned.push('hd');
  if (d.equipped.body) d.equipped.hd = 'hd';
  wallet.settings.set('wallet', d);
}
/** The model for an outfit and a gender. */
/** Outfits that are the everyday body in other colours (hdClothes.js PALETTE); the dresses add a long skirt. */
export const REPAINTS = ['dress', 'dress2', 'sport', 'jersey', 'sweater', 'summer'];
export const isDress = (outfit) => outfit === 'dress' || outfit === 'dress2';
export const outfitModel = (outfit, gender, style = '') => {
  const girl = gender === 'girl';
  let body = REPAINTS.includes(outfit) ? 'casual' : outfit; // the dress: the everyday girl with a long skirt; the others: her / his own body repainted
  if (body === 'casual' && !girl && style === 'strong') body = 'curly'; // each of the four characters has a body of its own: Hakan
  if (body === 'casual' && girl && style === 'open') body = 'brown'; // Seher
  return `hd.${body}.${girl ? 'girl' : 'boy'}`;
};
