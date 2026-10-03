/**
 * What credits buy in the shop (ui/ShopView.js): no ads between story days, and the HD character
 * (a detailed, animated child model, Quaternius CC0) that you are in the square and the schoolyard,
 * seen by everyone there.
 */
export const SHOP = [
  { id: 'adFree', title: 'Reklamsız mod', en: 'No more ads between the days of the story', price: 100, icon: '🚫' },
  { id: 'hd', slot: 'body', title: 'HD karakter', en: 'A detailed, animated character in the square and the schoolyard — everyone sees it', price: 150, icon: '✨' },
];

/** Is the player's HD character bought and switched on? */
export const hdOn = (wallet) => wallet.equipped('body') === 'hd';
/** The HD model for this player: boy, girl (and covered: the hair goes under a headscarf). */
export const hdModelFor = (gender) => (gender === 'girl' ? 'hd.girl' : 'hd.boy');
