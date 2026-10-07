import { man, M2 } from '../characters.js';
/**
 * The open-air kahvehane on the village square. Hüsnü, Kemal and Rıfat sit at their tavla
 * table all day and argue about Rıfat's "theories" (the moon landing, the rain, the secret lake under the fountain…) — Kemal and Hüsnü answer
 * with plain good sense, and Hüsnü would rather play tavla. Walk in or sit at a table and you hear them (systems/AmbientTalk.js),
 * each line with its meaning. Cemil Usta serves tea (and gazoz to children).
 */
const face = (bg, skin, hair, { cap = null, beard = false } = {}) => `<svg width="52" height="52" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="${bg}"/><circle cx="32" cy="36" r="16" fill="${skin}"/><path d="M16 31q4-13 16-13t16 13q-5-5-16-5t-16 5z" fill="${hair}"/>${cap ? `<path d="M15 27q17-11 34 0v-4q-17-10-34 0z" fill="${cap}"/>` : ''}<circle cx="26" cy="36" r="2" fill="#1B2440"/><circle cx="38" cy="36" r="2" fill="#1B2440"/>${beard ? `<path d="M19 40q13 17 26 0q-5 6-13 6t-13-6z" fill="${hair}"/>` : `<path d="M23 43q9-6 18 0q-9 3-18 0z" fill="${hair}"/>`}</svg>`;

/** Conversations at the uncles' table, A1–A2 Turkish. `who` speaks `tr` (meaning `en`). */
export const KAHVE_TALKS = [
  [
    { who: 'rifat', tr: 'Bence insanlar Ay’a hiç gitmedi. Hepsi bir film!', en: 'I think people never went to the Moon. It was all a film!' },
    { who: 'kemal', tr: 'Hadi oradan Rıfat! Ben televizyonda gördüm.', en: 'Come off it, Rıfat! I saw it on television.' },
    { who: 'rifat', tr: 'Televizyonda her şeyi görürsün, Kemal.', en: 'You can see anything on television, Kemal.' },
    { who: 'husnu', tr: 'Çayını iç Rıfat, soğuyor.', en: 'Drink your tea, Rıfat, it is getting cold.' },
  ],
  [
    { who: 'husnu', tr: 'Bu yıl hiç yağmur yağmadı. Tarlalar kurudu.', en: 'It has not rained at all this year. The fields have dried up.' },
    { who: 'rifat', tr: 'Bence birileri bulutları başka yere gönderiyor.', en: 'I think somebody is sending the clouds somewhere else.' },
    { who: 'kemal', tr: 'Bu yaz hava çok sıcaktı, Rıfat. Radyoda da söylediler.', en: 'It was very hot this summer, Rıfat. They said so on the radio too.' },
    { who: 'husnu', tr: 'İnşallah yakında yağar.', en: 'God willing, it will rain soon.' },
  ],
  [
    { who: 'kemal', tr: 'Meydandaki çeşmenin suyu nereden geliyor, biliyor musunuz?', en: 'Do you know where the water of the fountain in the square comes from?' },
    { who: 'rifat', tr: 'Dağın altında gizli bir göl var. Bu suyu içen yüz yaşına kadar yaşar!', en: 'There is a secret lake under the mountain. Whoever drinks this water lives to a hundred!' },
    { who: 'kemal', tr: 'Su dağdaki kaynaktan geliyor. Temiz su, ama sihirli değil.', en: 'The water comes from the spring on the mountain. It is clean water, but it is not magic.' },
    { who: 'husnu', tr: 'Uzun yaşamak için iyi beslenmek ve yürümek lazım.', en: 'To live long you need to eat well and walk.' },
  ],
  [
    { who: 'rifat', tr: 'Bakkalın fiyatları neden her hafta artıyor, biliyor musunuz?', en: 'Do you know why the grocer’s prices go up every week?' },
    { who: 'kemal', tr: 'Neden?', en: 'Why?' },
    { who: 'rifat', tr: 'Gece biri gelip etiketleri değiştiriyor. Ben gördüm!', en: 'Someone comes at night and changes the price tags. I saw it!' },
    { who: 'husnu', tr: 'Etiketleri Mehmet değiştiriyor, Rıfat. Toptancı zam yapınca o da yapıyor.', en: 'Mehmet changes the tags himself, Rıfat. When the wholesaler raises prices, so does he.' },
  ],
  [
    { who: 'kemal', tr: 'Aslan Bey kütüphanede bütün gün ne yapıyor sizce?', en: 'What do you think Aslan Bey does in the library all day?' },
    { who: 'rifat', tr: 'Kitapların arasında eski bir harita var. Hazine haritası!', en: 'There is an old map among the books. A treasure map!' },
    { who: 'husnu', tr: 'Ben ona sordum. Kitap okuyormuş.', en: 'I asked him. He says he reads books.' },
    { who: 'rifat', tr: 'Öyle söyler tabii.', en: 'Of course that is what he says.' },
  ],
  [
    { who: 'rifat', tr: 'Akşamları televizyonu kapatın. Televizyon bizi dinliyor.', en: 'Switch the television off in the evenings. The television is listening to us.' },
    { who: 'kemal', tr: 'Bizim televizyon çok eski, Rıfat. İnternete bile bağlı değil.', en: 'Our television is very old, Rıfat. It is not even connected to the internet.' },
    { who: 'husnu', tr: 'Hadi, bir el tavla atalım. Zarları sen at.', en: 'Come on, let us play a round of tavla. You throw the dice.' },
  ],
  [
    { who: 'rifat', tr: 'Dün gece köyün üstünde bir ışık gördüm. Yukarıda durdu, sonra kayboldu.', en: 'Last night I saw a light over the village. It stopped up there, then it disappeared.' },
    { who: 'kemal', tr: 'Uçaktı o, Rıfat. Her gece aynı saatte geçiyor.', en: 'That was a plane, Rıfat. It passes at the same time every night.' },
    { who: 'rifat', tr: 'Uçak durur mu hiç?', en: 'Does a plane ever stop?' },
    { who: 'husnu', tr: 'Uzaktan bakınca duruyor gibi görünür. Bize doğru geliyordu, o kadar.', en: 'From far away it looks as if it stops. It was coming towards us, that is all.' },
  ],
  [
    { who: 'husnu', tr: 'Cemil! Üç çay daha lütfen!', en: 'Cemil! Three more teas, please!' },
    { who: 'kahveci', tr: 'Hemen geliyor amcalar!', en: 'Coming right up, uncles!' },
    { who: 'rifat', tr: 'Cemil’in çayı neden bu kadar güzel? Bence içine bir şey koyuyor.', en: 'Why is Cemil’s tea so good? I think he puts something in it.' },
    { who: 'kemal', tr: 'Cemil çayı yavaş demliyor. Sırrı bu.', en: 'Cemil brews the tea slowly. That is the secret.' },
  ],
];

export default {
  id: 'kahvehane',
  npcs: {
    husnu: {
      name: 'Hüsnü Amca', short: 'Hüsnü', role: 'kahvehane müdavimi · coffeehouse regular',
      look: { shirt: 0x6E7B5A, vest: 0x3A3F4A, pants: 0x2A2F3A, skin: 0xE2B48C, hair: 0xD8D8D8, mustache: 0xD8D8D8, cap: 0x3B3F46 },
      face: face('#E6D8C4', '#E2B48C', '#D8D8D8', { cap: '#3B3F46' }),
    },
    kemal: {
      name: 'Kemal Amca', short: 'Kemal', role: 'kahvehane müdavimi · coffeehouse regular',
      look: { shirt: 0x8A6E4B, pants: 0x3A3326, skin: 0xD9A77E, hair: 0x5A5048, mustache: 0x5A5048, glasses: true },
      face: face('#C7D9E8', '#D9A77E', '#5A5048'),
    },
    rifat: {
      name: 'Rıfat Amca', short: 'Rıfat', role: 'kahvehane müdavimi · coffeehouse regular',
      look: { shirt: 0x9B59B6, vest: 0x34495E, pants: 0x4B4F58, skin: 0xC98E68, hair: 0x2B1D14, mustache: 0x2B1D14 },
      face: face('#E8D6A8', '#C98E68', '#2B1D14', { beard: true }),
    },
    kahveci: {
      name: 'Cemil Usta', short: 'Cemil', role: 'kahveci · coffeehouse keeper',
      look: { shirt: 0xFFFFFF, vest: 0x2E4A3A, pants: 0x2A2F3A, skin: 0xF0C09A, hair: 0x2E2926, mustache: 0x382A22, apron: true },
      face: face('#F0D2A6', '#F0C09A', '#2E2926'),
    },
  },
  voices: {
    husnu: man('Rasalgethi'),
    kemal: man('Alnilam', M2),
    rifat: man('Enceladus'),
    kahveci: man('Sadachbia', M2),
  },
  castAll: {
    husnu: ['village', 'amca1', 'sitBench'],
    kemal: ['village', 'amca2', 'sitBench'],
    rifat: ['village', 'amca3', 'sitBench'],
    kahveci: ['village', 'kahveci', 'stand'],
  },
  dialogues: {
    rifat: { start: () => 'r1', nodes: {
      r1: { say: 'Gel evlat. Sence insanlar gerçekten Ay’a gitti mi?', en: 'Come here, child. Do you think people really went to the Moon?',
        words: [['Ay', 'the Moon'], ['gerçekten', 'really']],
        options: [{ tr: 'Evet, gittiler.', en: 'Yes, they did.', next: 'r2' }, { tr: 'Bilmiyorum.', en: "I don't know.", next: 'r3' }] },
      r2: { say: 'Kemal de öyle diyor. Belki haklısınız; ben yine de kitaplara bakacağım.', en: "Kemal says so too. Maybe you're right; I'll still look it up in the books.", words: [['haklı', 'right']], options: [{ tr: 'Kütüphanede çok kitap var.', en: 'There are many books in the library.' }] },
      r3: { say: 'Bilmediğin şeyi araştır. Kütüphanede Aslan Bey’e sor.', en: "Look into what you don't know. Ask Aslan Bey in the library.", words: [['araştırmak', 'to look into, to research']], options: [{ tr: 'Tamam amca.', en: 'Okay, uncle.' }] },
    } },
    kemal: { start: () => 'k1', nodes: {
      k1: { say: 'Rıfat’ı dinleme evlat. Onun her gün yeni bir hikâyesi var.', en: "Don't listen to Rıfat, child. He has a new story every day.",
        words: [['dinlemek', 'to listen'], ['hikâye', 'story'], ['her gün', 'every day']],
        options: [{ tr: 'Ama ilginç şeyler anlatıyor.', en: 'But he tells interesting things.', next: 'k2' }] },
      k2: { say: 'İlginç, orası doğru. Ama her duyduğuna inanma. Önce düşün, sonra sor.', en: "Interesting, that's true. But don't believe everything you hear. First think, then ask.",
        words: [['inanmak', 'to believe'], ['düşünmek', 'to think'], ['sormak', 'to ask']],
        options: [{ tr: 'Haklısınız amca.', en: "You're right, uncle." }] },
    } },
    husnu: { start: () => 'h1', nodes: {
      h1: { say: 'Hoş geldin evlat! Tavla bilir misin? Zarı atarsın, pulları oynarsın.', en: 'Welcome, child! Do you know tavla? You throw the dice and move the pieces.',
        words: [['tavla', 'backgammon'], ['zar', 'dice'], ['pul', 'piece (tavla)']],
        options: [{ tr: 'Biraz biliyorum.', en: 'I know a little.', next: 'h2' }, { tr: 'Bilmiyorum.', en: "I don't know it.", next: 'h2' }] },
      h2: { say: 'Altı ile beş gelirse “şeşbeş” deriz. Büyüyünce sana da öğretirim.', en: "When you throw a six and a five, we say “şeşbeş”. When you're older I'll teach you too.",
        words: [['altı', 'six'], ['beş', 'five']], options: [{ tr: 'Teşekkür ederim amca.', en: 'Thank you, uncle.' }] },
    } },
    kahveci: { start: () => 'c1', nodes: {
      c1: { say: 'Hoş geldin evlat! Çocuklara kahve yok ama çay var, gazoz var. Ne içersin?', en: 'Welcome, child! No coffee for children, but there is tea and there is fizzy lemonade. What will you drink?',
        words: [['kahve', 'coffee'], ['gazoz', 'fizzy lemonade (soda)'], ['içmek', 'to drink']],
        options: [{ tr: 'Bir gazoz lütfen.', en: 'A lemonade, please.', next: 'c2' }, { tr: 'Bir çay lütfen.', en: 'A tea, please.', next: 'c2' }] },
      c2: { say: 'Buyur, afiyet olsun! Amcaların sohbetini dinle, Türkçen gelişir.', en: 'Here you go, enjoy! Listen to the uncles chat — your Turkish will get better.',
        options: [{ tr: 'Eline sağlık!', en: 'Thank you (bless your hands)!' }] },
    } },
  },
};
