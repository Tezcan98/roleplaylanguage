/**
 * What credits buy in the shop (ui/ShopView.js): no ads between story days, the HD character — a
 * detailed, animated child (Quaternius CC0, assets/models/hd_*.glb) that you are everywhere, seen
 * by everyone in the square (all with long clothes) — and, once you have it, outfits for it.
 * One outfit on at a time; without one the HD character wears its everyday clothes.
 */
const outfit = (id, title, en, only) => ({ id: `hd-${id}`, outfit: id, slot: 'body', needs: 'hd', title, en, price: 30, ...(only ? { for: (gender) => gender === only } : {}) });
/** The shop picture of an outfit as this player would wear it (tools/models/render-previews.mjs). */
export const outfitPicture = (item, gender, look) => `assets/shop/hd_${item.outfit ?? item.look ?? item.id}_${gender !== 'girl' ? (look === 'strong' ? 'strong' : 'boy') : look === 'open' ? 'girl' : 'covered'}.png`;

export const SHOP = [
  { id: 'adFree', title: 'Reklamsız mod', en: 'No more ads between the days of the story', price: 100, icon: '🚫' },
  { id: 'hd', slot: 'hd', look: 'casual', title: '⭐ HD karakter', en: 'A detailed, animated character instead of the blocky one', price: 120 },
  outfit('casual', 'Günlük kıyafet', 'Everyday clothes'),
  outfit('suit', 'Takım elbise', 'Suit', 'boy'),
  outfit('dress', 'Elbise', 'Dress', 'girl'),
  { id: 'aura', slot: 'aura', title: '✨ Altın Yıldız Işığı', en: 'A golden light shining under your feet — everyone in the square sees you', price: 25, picture: true },
];

/** The glowing ring under the player is on. */
export const auraOn = (wallet) => wallet.equipped('aura') === 'aura';

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
export const outfitModel = (outfit, gender, style = '') => {
  const girl = gender === 'girl';
  let body = outfit === 'dress' ? 'casual' : outfit; // the dress: the everyday girl with a long skirt
  if (body === 'casual' && !girl && style === 'strong') body = 'curly'; // each of the four characters has a body of its own: Hakan
  if (body === 'casual' && girl && style === 'open') body = 'brown'; // Seher
  return `hd.${body}.${girl ? 'girl' : 'boy'}`;
};
