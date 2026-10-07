import { man, M2 } from '../characters.js';
/**
 * The greengrocer (manav) at the village square. Sunday afternoon mom sends Ahmet to buy
 * a kilo of apples and two kilos of potatoes: kilos, fruit and vegetable names, prices,
 * adding up and change.
 */
const face = '<svg width="52" height="52" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#C9E6A8"/><circle cx="32" cy="36" r="16" fill="#E9B98F"/><path d="M16 30q4-12 16-12t16 12q-6-3-16-3t-16 3z" fill="#4A3426"/><circle cx="26" cy="36" r="2" fill="#1B2440"/><circle cx="38" cy="36" r="2" fill="#1B2440"/><path d="M25 43q7 5 14 0" stroke="#7A3B2A" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>';

export default {
  id: 'market',

  npcs: {
    manav: {
      name: 'Rıza Manav', short: 'Manav', role: 'manav · greengrocer',
      look: { shirt: 0x5E8C3A, pants: 0x3E3A33, skin: 0xE9B98F, hair: 0x4A3426, apron: true },
      face,
    },
  },
  voices: { manav: man('Sadaltager', M2) },
  castAll: { manav: ['village', 'manav', 'stand'] },
  kindNames: {
    elma: { tr: 'kilo elma', en: 'kg of apples' },
    patates: { tr: 'kilo patates', en: 'kg of potatoes' },
  },

  quests: [{
    chapter: 'd1-afternoon', after: 'laundry',
    quests: [{
      id: 'manav', title: 'Manav',
      obj: (c) => (c.has('patates') ? 'Aldıklarını annene götür' : 'Köy meydanındaki manavdan elma ve patates al'),
      en: (c) => (c.has('patates') ? 'Take what you bought to mom' : 'Buy apples and potatoes at the greengrocer in the village square'),
      target: (c) => (c.has('patates') ? { npc: 'anne' } : { npc: 'manav' }),
      minutes: 25,
    }],
  }],

  dialogues: {
    anne: {
      start: (ctx) => (ctx.q === 'manav' ? (ctx.has('patates') ? 'mvBack' : 'mvRemind') : undefined),
      nodes: {
        // replaces the end of the laundry talk: one more errand before grandpa's tale
        ln3: { say: 'Çok yardımseversin! Bir ricam daha var: manava gider misin? Bir kilo elma ve iki kilo patates al. Al, elli lira.',
          en: "You're so helpful! One more favour: will you go to the greengrocer? Buy a kilo of apples and two kilos of potatoes. Here, fifty lira.",
          words: [['manav', 'greengrocer'], ['kilo', 'kilogram'], ['elma', 'apple'], ['patates', 'potato'], ['elli', 'fifty']],
          options: [{ tr: 'Tamam anne, hemen giderim!', en: "Okay mom, I'll go right away!", do: ['give:para:50'] }] },
        mvRemind: { say: 'Manav köy meydanında, çeşmenin arkasında. Bir kilo elma, iki kilo patates!', en: 'The greengrocer is in the village square, behind the fountain. One kilo of apples, two kilos of potatoes!',
          words: [['arkasında', 'behind']], options: [{ tr: 'Unutmam anne!', en: "I won't forget, mom!" }] },
        mvBack: { ask: 'order', say: 'Geldin mi? Söyle bakalım, ne aldın?', en: 'Are you back? Tell me, what did you buy?',
          answer: 'Bir kilo elma ve iki kilo patates aldım.', answerEn: 'I bought a kilo of apples and two kilos of potatoes.', next: 'mvDone' },
        mvDone: { say: 'Aferin! Para üstü de senin olsun. Şimdi deden seni çağırıyor, sana masal anlatacak.', en: "Well done! Keep the change too. Now grandpa is calling you, he'll tell you a tale.",
          words: [['para üstü', 'change (money)']],
          options: [{ tr: 'Masal mı? Yaşasın!', en: 'A tale? Hooray!', do: ['take:elma', 'take:patates', 'quest'] }] },
      },
    },
    manav: {
      start: (ctx) => (ctx.q === 'manav' && !ctx.has('patates') ? 'mv1' : 'idle'),
      nodes: {
        mv1: { ask: 'order', say: 'Buyur evlat, ne istersin? Her şey taze!', en: 'Here you are, kid, what would you like? Everything is fresh!', words: [['taze', 'fresh'], ['buyur', 'here you are / go ahead']],
          answer: 'Bir kilo elma ve iki kilo patates lütfen.', answerEn: 'A kilo of apples and two kilos of potatoes, please.', next: 'mv2' },
        mv2: { ask: 'listen', say: 'Elmanın kilosu yirmi lira, patatesin kilosu on lira.', en: 'Apples are twenty lira a kilo, potatoes ten lira a kilo.',
          prompt: 'Dinle: toplam kaç lira? (1 kilo elma + 2 kilo patates)', hint: '20 + 10 + 10 = 40 (kırk)',
          words: [['yirmi', 'twenty'], ['on', 'ten'], ['kırk', 'forty']],
          options: [
            { tr: 'Otuz lira.', en: 'Thirty lira.', wrong: true },
            { tr: 'Kırk lira.', en: 'Forty lira.', next: 'mv3' },
            { tr: 'Elli lira.', en: 'Fifty lira.', wrong: true },
          ] },
        mv3: { say: 'Aferin, hesabın iyi! Kırk lira. Buyur, elmaların ve patateslerin.', en: 'Well done, good maths! Forty lira. Here are your apples and potatoes.',
          options: [{ tr: 'Buyurun, elli lira.', en: 'Here you are, fifty lira.', next: 'mv4' }] },
        mv4: { say: 'Paranın üstü on lira. Annene selam söyle!', en: 'Your change is ten lira. Say hello to your mom!', words: [['paranın üstü', 'change (money)']],
          options: [{ tr: 'Teşekkürler, kolay gelsin!', en: 'Thanks, take it easy!', do: ['take:para:40', 'give:elma', 'give:patates:2'] }] },
        idle: { say: 'Taze meyve, taze sebze! Elma, armut, portakal, domates, patates…', en: 'Fresh fruit, fresh vegetables! Apples, pears, oranges, tomatoes, potatoes…',
          words: [['meyve', 'fruit'], ['sebze', 'vegetable'], ['armut', 'pear'], ['portakal', 'orange']],
          options: [{ tr: 'Kolay gelsin!', en: 'Take it easy!' }, { tr: 'Domates tohumu var mı?', en: 'Do you have tomato seeds?', next: 'seeds' }] },
      },
    },
  },
};
