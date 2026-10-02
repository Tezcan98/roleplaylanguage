/**
 * The music corner on the square: Ömer Baba sits in an open pavilion and plays the ney (you
 * hear it as you come closer — systems/NeyMusic.js). Talk to him and he puts the ney down
 * and tells a menkıbe: Yunus Emre's straight firewood, Mevlânâ and the reed flute, Şeyh
 * Edebali's advice to Osman Gazi.
 */
const STORIES = {
  yunus: [
    { say: 'Yunus Emre gençken Tapduk Emre’nin dergâhına geldi. Orada yıllarca hizmet etti; dergâha dağdan odun taşıdı.', en: 'When Yunus Emre was young he came to Tapduk Emre’s lodge. He served there for many years and carried firewood from the mountain to the lodge.', words: [['odun', 'firewood'], ['hizmet etmek', 'to serve']] },
    { say: 'Bir gün biri sordu: “Yunus, getirdiğin odunların hepsi dümdüz. Neden hiç eğri odun yok?”', en: 'One day someone asked: “Yunus, all the wood you bring is perfectly straight. Why is there never a crooked piece?”', words: [['düz', 'straight'], ['eğri', 'crooked']] },
    { say: 'Yunus cevap verdi: “Bu kapıya eğri odun bile yakışmaz.” Yani evlat, doğruluk her şeyde olmalı; odunda bile.', en: 'Yunus answered: “Not even crooked wood is fitting for this door.” That is, child, honesty must be in everything, even in firewood.', words: [['doğruluk', 'honesty, uprightness'], ['yakışmak', 'to suit, to be fitting']] },
  ],
  mevlana: [
    { say: 'Mevlânâ Celâleddin Konya’da yaşadı. Büyük kitabı Mesnevî’ye neyle başladı: “Dinle, bu ney neler anlatıyor.”', en: 'Mevlânâ Celâleddin lived in Konya. He began his great book, the Masnavi, with the ney: “Listen to what this reed is telling.”', words: [['ney', 'ney (reed flute)'], ['dinlemek', 'to listen']] },
    { say: 'Ney, sazlıktan kesilmiş bir kamıştır. Yuvasından ayrıldığı için içli içli inler.', en: 'The ney is a reed cut from the reed bed. Because it was parted from its home, it moans with longing.', words: [['kamış', 'reed'], ['ayrılmak', 'to be parted']] },
    { say: 'İnsan da neye benzer, evlat. Allah’tan gelir, O’na döner. Neyin sesi o özlemi anlatır.', en: 'A person is like the ney, child. We come from God and return to Him. The sound of the ney tells of that longing.', words: [['özlem', 'longing'], ['dönmek', 'to return']] },
  ],
  edebali: [
    { say: 'Osman Gazi gençken Şeyh Edebali’nin yanına giderdi. Şeyh Edebali ona güzel nasihatler verirdi.', en: 'When Osman Gazi was young he used to visit Sheikh Edebali. Sheikh Edebali gave him fine advice.', words: [['nasihat', 'advice']] },
    { say: 'Bir gün şöyle dedi: “İnsanı yaşat ki devlet yaşasın.” Yani insanlara iyilik et, onları koru.', en: 'One day he said: “Let people live, so that the state may live.” That is: do good to people and protect them.', words: [['yaşatmak', 'to keep alive'], ['iyilik', 'kindness, good deed']] },
    { say: 'Bir de şunu dedi: “Sabretmesini bil. Vakti gelmeden çiçek açmaz.” Sabır, evlat, her işin anahtarıdır.', en: 'He also said: “Know how to be patient. A flower does not bloom before its time.” Patience, child, is the key to everything.', words: [['sabır', 'patience'], ['çiçek açmak', 'to bloom']] },
  ],
};
const TITLES = { yunus: ['Yunus Emre’nin odunları', 'Yunus Emre’s firewood'], mevlana: ['Mevlânâ ve ney', 'Mevlânâ and the ney'], edebali: ['Şeyh Edebali’nin nasihati', 'Sheikh Edebali’s advice'] };

function nodes() {
  const out = {
    o1: { say: 'Hoş geldin evlat, otur şöyle. Bu ney sazlıktan kesilmiş bir kamış; içinde nefes var, özlem var. Sana bir menkıbe anlatayım mı?', en: 'Welcome, child, sit down here. This ney is a reed cut from the reed bed; there is breath in it, and longing. Shall I tell you a menkıbe (a story of the wise)?',
      words: [['menkıbe', 'story of a saintly person'], ['nefes', 'breath']],
      options: [{ tr: 'Evet, anlatır mısın?', en: 'Yes, will you tell one?', next: 'menu' }, { tr: 'Önce neyi dinlemek istiyorum.', en: 'First I want to listen to the ney.' }] },
    menu: { say: 'Hangisini anlatayım?', en: 'Which one shall I tell?',
      options: Object.entries(TITLES).map(([id, [tr, en]]) => ({ tr, en, next: `${id}0` })) },
    end: { say: 'Bunları kalbinde sakla, evlat. Ney de hep bunu anlatır.', en: 'Keep these in your heart, child. The ney always tells this too.',
      options: [{ tr: 'Bir tane daha anlatır mısın?', en: 'Will you tell one more?', next: 'menu' }, { tr: 'Allah razı olsun, Ömer Baba.', en: 'May God be pleased with you, Ömer Baba.' }] },
  };
  Object.entries(STORIES).forEach(([id, parts]) => parts.forEach((p, i) => {
    out[`${id}${i}`] = { ...p, options: [i < parts.length - 1 ? { tr: 'Sonra ne oldu?', en: 'What happened then?', next: `${id}${i + 1}` } : { tr: 'Ne güzel bir hikâye!', en: 'What a beautiful story!', next: 'end', do: [`flag:menkibe-${id}`] }] };
  }));
  return out;
}

export default {
  id: 'musiki',
  npcs: {
    omerBaba: {
      name: 'Ömer Baba', short: 'Ömer Baba', role: 'neyzen · ney player',
      look: { shirt: 0xEDE6D6, vest: 0x5B6B4A, pants: 0x4A4036, skin: 0xD9A77E, hair: 0xE6E6E6, mustache: 0xE6E6E6, cap: 0xF2EEE4 },
      face: '<svg width="52" height="52" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#D7E3C8"/><circle cx="32" cy="36" r="16" fill="#D9A77E"/><path d="M15 27q17-13 34 0v-3q-17-11-34 0z" fill="#F2EEE4"/><circle cx="26" cy="36" r="2" fill="#1B2440"/><circle cx="38" cy="36" r="2" fill="#1B2440"/><path d="M19 41q13 18 26 0q-5 6-13 6t-13-6z" fill="#E6E6E6"/></svg>',
    },
  },
  voices: { omerBaba: { id: 'tr_TR-fahrettin-medium', pitch: 0.8 } },
  castAll: { omerBaba: ['village', 'omerBaba', 'sitFloor'] },
  dialogues: { omerBaba: { start: () => 'o1', nodes: nodes() } },
};
