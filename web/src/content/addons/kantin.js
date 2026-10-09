import { man } from '../characters.js';
/**
 * The school canteen: Hasan Amca's kiosk in the corner of the schoolyard (world/locations/SchoolYard.js).
 * Greeting him (time of day greetings, "Kolay gelsin"), then ordering politely; the shelf
 * (ui/MarketView.js, MARKETS.kantin in content/goods.js) sells toast, simit and drinks.
 */
const ORDER = [
  { tr: 'Bir tost lütfen.', en: 'One toast, please.', next: 'k3' },
  { tr: 'Neler var?', en: 'What do you have?', do: ['market:kantin'] },
  { tr: 'Şimdilik bir şey istemiyorum, teşekkürler.', en: "I don't want anything for now, thanks.", next: 'kNo' },
];

export default {
  id: 'kantin',
  npcs: {
    kantinci: {
      name: 'Kantinci Hasan', short: 'Hasan Amca', role: 'kantinci · canteen keeper',
      look: { shirt: 0xF2F2F2, vest: 0x2F6FDB, pants: 0x2A2F3A, skin: 0xE2B48C, hair: 0x6B5B4E, mustache: 0x4A3F36, apron: true },
      face: '<svg width="52" height="52" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#CFE3F7"/><circle cx="32" cy="36" r="16" fill="#E2B48C"/><path d="M16 31q4-13 16-13t16 13q-5-5-16-5t-16 5z" fill="#6B5B4E"/><circle cx="26" cy="36" r="2" fill="#1B2440"/><circle cx="38" cy="36" r="2" fill="#1B2440"/><path d="M23 43q9-6 18 0q-9 3-18 0z" fill="#4A3F36"/></svg>',
    },
  },
  voices: { kantinci: man('Iapetus') },
  castAll: { kantinci: ['schoolyard', 'kantinci', 'stand'] },
  kindNames: {
    tost: { tr: 'tost', en: 'toasted sandwich' },
    meyvesuyu: { tr: 'meyve suyu', en: 'fruit juice' },
    kek: { tr: 'kek', en: 'cake' },
    su: { tr: 'su', en: 'water' },
  },
  dialogues: {
    kantinci: {
      start: (ctx) => (ctx.flag('met-kantinci') ? 'k0' : 'k1'), // the greeting lesson once, then straight to the order
      nodes: {
        k1: { ask: 'speak', say: 'Merhaba evlat! Kantine hoş geldin.', en: 'Hello, kid! Welcome to the canteen.',
          expect: ['Merhaba Hasan Amca', 'Kolay gelsin', 'Günaydın'], keywords: ['merhaba', 'kolay', 'günaydın', 'selam'],
          show: 'Merhaba Hasan Amca, kolay gelsin!', showEn: 'Hello Uncle Hasan, may your work be easy!', hint: 'Kolay gelsin = may it be easy (said to someone working)',
          words: [['kantin', 'canteen'], ['kolay gelsin', 'may your work be easy']], do: ['flag:met-kantinci'], next: 'k2' },
        k0: { say: 'Yine hoş geldin! Ne alırsın?', en: 'Welcome again! What will you have?', words: [['yine', 'again']], options: ORDER },
        k2: { say: 'Sağ ol, eksik olma! Tostlar sıcak sıcak. Ne alırsın?', en: 'Thank you, bless you! The toasts are piping hot. What will you have?',
          words: [['sağ ol', 'thanks'], ['sıcak sıcak', 'piping hot'], ['tost', 'toasted sandwich']], options: ORDER },
        k3: { say: 'Kaşarlı mı, karışık mı? Buyur, rafa bak, beğendiğini seç.', en: 'With cheese or mixed? Go on, look at the shelf and pick what you like.',
          words: [['kaşarlı', 'with cheese'], ['karışık', 'mixed'], ['beğenmek', 'to like']],
          options: [{ tr: 'Tamam, bakayım.', en: "Okay, let me look.", do: ['market:kantin'] }] },
        kNo: { say: 'Peki, teneffüste yine gel. Afiyet olsun şimdiden!', en: 'All right, come again at break. Enjoy in advance!',
          words: [['teneffüs', 'break (at school)'], ['afiyet olsun', 'enjoy your meal']],
          options: [{ tr: 'Görüşürüz Hasan Amca!', en: 'See you, Uncle Hasan!' }] },
      },
    },
  },
};
