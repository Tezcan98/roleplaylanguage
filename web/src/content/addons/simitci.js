import { man } from '../characters.js';
/**
 * Cemal the simit seller with his cart on the village square (world/locations/VillageSquare.js
 * #simitCart). He sells simit and tells "soğuk espri" (lame jokes) — each one takes a Turkish idiom
 * literally, so the meaning (and the joke) is explained in the gloss: the idiom goes in the notebook.
 * A joke you haven't heard comes first; when all are heard, any but the last one.
 */
const JOKES = [
  { say: 'Arkadaşım "Bana kulak ver!" dedi. Vermedim tabii, ikisini de kullanıyorum!', en: 'My friend said "Give me your ear!" (= listen to me). Of course I didn\'t give it, I use both of them!',
    explain: '“Kulak vermek” dinlemek demek. Arkadaşım “Beni dinle!” dedi; ben de kulağımı verip veremeyeceğimi düşündüm. Kulak verilir mi hiç?', explainEn: '“Kulak vermek” means to listen. My friend said “Listen to me!”; I took it as really giving my ear away. As if you could!',
    word: ['kulak vermek', 'to listen (lit. to give an ear)'] },
  { say: 'Müşteri "Simitlere bir göz atabilir miyim?" diye sordu. "Atma evladım, lazım olur!" dedim.', en: 'A customer asked "Can I throw an eye on the simits?" (= have a look). "Don\'t throw it, kid, you\'ll need it!" I said.',
    explain: '“Göz atmak” kısaca bakmak demek. Müşteri “Bakabilir miyim?” dedi; ben gözünü fırlatacak sandım!', explainEn: '“Göz atmak” means to have a quick look. The customer asked to look; I thought he would throw his eye!',
    word: ['göz atmak', 'to have a look (lit. to throw an eye)'] },
  { say: 'Dün matematik sınavında kafayı yedim. Doydum ama hiçbir soruyu çözemedim!', en: 'Yesterday I "ate my head" in the maths exam (= went crazy). I got full, but I couldn\'t solve a single question!',
    explain: '“Kafayı yemek” çok şaşırmak, deli gibi olmak demek. Ben gerçekten kafamı yedim de doydum diyorum!', explainEn: '“Kafayı yemek” means to go crazy. I say I really ate my head and got full!',
    word: ['kafayı yemek', 'to go crazy (lit. to eat the head)'] },
  { say: 'Komşu "Bana bir el at!" diye bağırdı. Attım, ama tutamadı!', en: 'The neighbour shouted "Throw me a hand!" (= help me). I threw it, but he couldn\'t catch it!',
    explain: '“El atmak” yardım etmek demek. Komşu “Yardım et!” dedi; ben elimi fırlattım sandım!', explainEn: '“El atmak” means to help. The neighbour asked for help; I pretended I threw my hand at him!',
    word: ['el atmak', 'to lend a hand (lit. to throw a hand)'] },
  { say: 'Bu soru için çok kafa patlattım. Doktora gittim, "Geçmiş olsun" dedi!', en: 'I "burst my head" over this question (= thought hard). I went to the doctor and he said "Get well soon"!',
    explain: '“Kafa patlatmak” bir şeyi çok düşünmek demek. Ben kafam gerçekten patladı da doktora gittim diyorum!', explainEn: '“Kafa patlatmak” means to think very hard. I say my head really burst, so I went to the doctor!',
    word: ['kafa patlatmak', 'to think hard (lit. to burst the head)'] },
  { say: 'Simitlerimi görünce kardeşimin ağzı kulaklarına vardı. Şimdi simidi kulağıyla yiyor!', en: 'When my brother saw my simits, his mouth reached his ears (= he grinned from ear to ear). Now he eats simit with his ear!',
    explain: '“Ağzı kulaklarına varmak” çok sevinmek, kocaman gülümsemek demek. Ben de ağzı kulağına gitti, simidi kulağıyla yiyor dedim!', explainEn: '“Ağzı kulaklarına varmak” means to grin from ear to ear. I said his mouth really reached his ears, so he eats with his ear!',
    word: ['ağzı kulaklarına varmak', 'to grin from ear to ear (lit. the mouth reaches the ears)'] },
  { say: 'Öğretmeni görünce dilim tutuldu. Bıraksın diye bekledim, beş dakika konuşamadım!', en: 'When I saw the teacher my tongue was held (= I was speechless). I waited for it to be let go, I couldn\'t speak for five minutes!',
    explain: '“Dili tutulmak” şaşırıp konuşamamak demek. Ben dilimi biri tutuyormuş gibi bırakmasını bekledim!', explainEn: '“Dili tutulmak” means to be too surprised to speak. I waited as if someone was really holding my tongue!',
    word: ['dili tutulmak', 'to be speechless (lit. the tongue is held)'] },
  { say: 'Annem "Gözüm üstünde!" dedi. O günden beri kafamı kaşıyamıyorum, gözüne değer diye!', en: 'My mother said "My eye is on you!" (= I\'m watching you). Since that day I can\'t scratch my head, in case I touch her eye!',
    explain: '“Gözüm üstünde” seni izliyorum demek. Ben de annemin gözü gerçekten başımın üstünde sandım!', explainEn: '“Gözüm üstünde” means I\'m watching you. I thought my mother\'s eye was really sitting on my head!',
    word: ['gözü üstünde olmak', 'to keep an eye on someone (lit. the eye is on)'] },
];
let lastJoke = -1;
function nextJoke(ctx) {
  const all = JOKES.map((_, i) => i).filter((i) => i !== lastJoke);
  const fresh = all.filter((i) => !ctx.flag(`simit-j${i}`));
  lastJoke = fresh.length ? fresh[0] : all[Math.floor(Math.random() * all.length)];
  return `j${lastJoke}`;
}

/** After a joke: didn't get it (he explains it), laugh, another one, or a simit. */
const AFTER = (i) => [
  { tr: 'Anlamadım.', en: 'I didn\'t get it.', next: `x${i}` },
  { tr: 'Hahaha, çok komikmiş!', en: 'Hahaha, that was funny!', next: 'funny' },
  { tr: 'Başka ne var?', en: 'What else have you got?', next: (ctx) => nextJoke(ctx) },
  { tr: 'Bir simit alayım, lütfen.', en: 'I\'ll have a simit, please.', do: ['buy:simit:10'], next: 'sold' },
];

function nodes() {
  const out = {
    intro: { say: 'Simitler sıcak, susamlı! Ben Simitçi Cemal. Simit alana bir soğuk espri bedava!', en: 'Simits hot, with sesame! I\'m Cemal the simit seller. Buy a simit and a lame joke is free!',
      words: [['simitçi', 'simit seller'], ['susamlı', 'with sesame'], ['soğuk espri', 'a lame joke (lit. a cold joke)'], ['bedava', 'free (no money)']],
      options: [{ tr: 'Bir espri anlat!', en: 'Tell a joke!', do: ['flag:met-simitci'], next: 'j0' }, { tr: 'Bir simit alayım, lütfen.', en: 'I\'ll have a simit, please.', do: ['flag:met-simitci', 'buy:simit:10'], next: 'sold' }] },
    funny: { say: 'Hahaha! Beğenmene sevindim. Benim espriler soğuk ama simitler sıcak!', en: 'Hahaha! Glad you liked it. My jokes are cold but my simits are hot!',
      options: [{ tr: 'Başka ne var?', en: 'What else have you got?', next: (ctx) => nextJoke(ctx) }, { tr: 'Bir simit alayım, lütfen.', en: 'I\'ll have a simit, please.', do: ['buy:simit:10'], next: 'sold' }, { tr: 'Görüşürüz Cemal Abi!', en: 'See you, Cemal!' }] },
    sold: { say: 'Buyur, afiyet olsun! On lira. Çayla daha güzel olur.', en: 'Here you are, enjoy! Ten lira. It\'s even better with tea.',
      words: [['afiyet olsun', 'enjoy your meal']], options: [{ tr: 'Teşekkürler Cemal Abi!', en: 'Thanks, Cemal!' }] },
  };
  JOKES.forEach((j, i) => {
    const heard = `flag:simit-j${i}`; // (options carry the effects)
    out[`j${i}`] = { say: `${j.say} Hahaha!`, en: `${j.en} Hahaha!`, words: [j.word], options: AFTER(i).map((o) => ({ ...o, do: [heard, ...(o.do ?? [])] })) };
    out[`x${i}`] = { say: j.explain, en: j.explainEn, words: [j.word], options: AFTER(i).filter((o) => o.next !== `x${i}`) }; // the joke explained
  });
  return out;
}

export default {
  id: 'simitci',
  npcs: {
    simitci: {
      name: 'Simitçi Cemal', short: 'Cemal Abi', role: 'simitçi · simit seller',
      look: { shirt: 0xFFFFFF, vest: 0xC0392B, pants: 0x2A2F3A, skin: 0xE9B98F, hair: 0x2E2926, mustache: 0x2E2926, apron: true },
      face: '<svg width="52" height="52" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#F7D9A8"/><circle cx="32" cy="36" r="16" fill="#E9B98F"/><path d="M16 31q4-13 16-13t16 13q-5-5-16-5t-16 5z" fill="#2E2926"/><circle cx="26" cy="36" r="2" fill="#1B2440"/><circle cx="38" cy="36" r="2" fill="#1B2440"/><path d="M23 42q9-5 18 0" stroke="#2E2926" stroke-width="3" fill="none"/><path d="M25 46q7 4 14 0" stroke="#B83A5A" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
    },
  },
  voices: { simitci: man('Fenrir') },
  castAll: { simitci: ['village', 'simitci', 'stand'] },
  dialogues: { simitci: { start: (ctx) => (ctx.flag('met-simitci') ? nextJoke(ctx) : 'intro'), nodes: nodes() } },
};
