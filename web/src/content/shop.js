/**
 * What credits buy in the shop (ui/ShopView.js): no ads between story days, and outfits — a
 * detailed, animated child character (Quaternius CC0, assets/models/hd_*.glb) that you are in the
 * square and the schoolyard, seen by everyone there (all with long clothes). One outfit on at a time.
 */
const outfit = (id, title, en, only) => ({ id: `hd-${id}`, outfit: id, slot: 'body', title, en, price: 10, ...(only ? { for: (gender) => gender === only } : {}) });
/** The shop picture of an outfit as this player would wear it (tools/models/render-previews.mjs). */
export const outfitPicture = (item, gender, look) => `assets/shop/hd_${item.outfit ?? item.id}_${gender !== 'girl' ? 'boy' : look === 'open' ? 'girl' : 'covered'}.png`;

export const SHOP = [
  { id: 'adFree', title: 'Reklamsız mod', en: 'No more ads between the days of the story', price: 100, icon: '🚫' },
  outfit('casual', 'Günlük kıyafet', 'Everyday clothes'),
  outfit('suit', 'Takım elbise', 'Suit', 'boy'),
  outfit('dress', 'Elbise', 'Dress', 'girl'),
  { id: 'aura', slot: 'aura', title: '✨ Altın Yıldız Işığı', en: 'A golden light shining under your feet — everyone in the square sees you', price: 15, picture: true },
];

/** The glowing ring under the player is on. */
export const auraOn = (wallet) => wallet.equipped('aura') === 'aura';

/** The outfit the player has on (an id like 'casual'), or null. */
export const outfitOn = (wallet) => SHOP.find((i) => i.id === wallet.equipped('body'))?.outfit ?? null;
/** The model for an outfit and a gender. */
export const outfitModel = (outfit, gender) => `hd.${outfit === 'dress' ? 'casual' : outfit}.${gender === 'girl' ? 'girl' : 'boy'}`; // the dress: the everyday girl with a long skirt
