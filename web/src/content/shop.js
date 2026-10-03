/**
 * What credits buy in the shop (ui/ShopView.js). Outfits are colours for the player's own
 * character (seen by everyone in the square, too); `for(gender, look)` limits who can wear it.
 */
const shirt = (id, title, en, value) => ({ id: `shirt-${id}`, slot: 'shirt', value, title: `${title} gömlek`, en: `${en} shirt`, price: 20, icon: '👕' });
const cap = (id, title, en, value) => ({ id: `cap-${id}`, slot: 'cap', value, title: `${title} kasket`, en: `${en} flat cap`, price: 30, icon: '🧢', for: (gender) => gender === 'boy' });
const scarf = (id, title, en, value) => ({ id: `scarf-${id}`, slot: 'headscarf', value, title: `${title} başörtüsü`, en: `${en} headscarf`, price: 20, icon: '🧕', for: (gender, look) => gender === 'girl' && look !== 'open' });

export const SHOP = [
  { id: 'adFree', title: 'Reklamsız mod', en: 'No more ads between the days of the story', price: 100, icon: '🚫' },
  shirt('red', 'Kırmızı', 'Red', 0xD9453B), shirt('blue', 'Mavi', 'Blue', 0x2F6FDB), shirt('green', 'Yeşil', 'Green', 0x3E8E4A),
  shirt('purple', 'Mor', 'Purple', 0x8E44AD), shirt('orange', 'Turuncu', 'Orange', 0xE67E22), shirt('black', 'Siyah', 'Black', 0x2B2B2B),
  cap('brown', 'Kahverengi', 'Brown', 0x6B4F3A), cap('navy', 'Lacivert', 'Navy', 0x2C3E66),
  scarf('pink', 'Pembe', 'Pink', 0xE86A92), scarf('sky', 'Açık mavi', 'Light blue', 0x5DADE2), scarf('green', 'Yeşil', 'Green', 0x6FA86A), scarf('beige', 'Bej', 'Beige', 0xD9C7A3),
];

/** The colours the player has put on: { shirt?, cap?, headscarf? } (to lay over the base look). */
export function outfitOf(wallet) {
  const out = {};
  for (const slot of ['shirt', 'cap', 'headscarf']) {
    const item = SHOP.find((i) => i.id === wallet.equipped(slot));
    if (item) out[slot] = item.value;
  }
  return out;
}
