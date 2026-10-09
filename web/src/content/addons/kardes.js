import { man, M2 } from '../characters.js';
/**
 * Ali, the little brother (6). He runs around the house, jumps on the bed now and then
 * (mom tells him off) and keeps asking "Abi, bu ne?" — each talk is a picture quiz on a
 * thing in the house, so the house words come back again and again. When you go out into
 * the garden he comes along and plays near you (`follow`, see main.js).
 */
const THINGS = [
  { tr: 'yatak', en: 'bed', icon: '🛏️', wrong: ['masa', 'kapı'] },
  { tr: 'sandalye', en: 'chair', icon: '🪑', wrong: ['yatak', 'pencere'] },
  { tr: 'televizyon', en: 'television', icon: '📺', wrong: ['kitap', 'halı'] },
  { tr: 'kitap', en: 'book', icon: '📕', wrong: ['bardak', 'kapı'] },
  { tr: 'pencere', en: 'window', icon: '🪟', wrong: ['kapı', 'masa'] },
  { tr: 'kapı', en: 'door', icon: '🚪', wrong: ['pencere', 'yatak'] },
  { tr: 'lamba', en: 'lamp', icon: '💡', wrong: ['çaydanlık', 'halı'] },
  { tr: 'çaydanlık', en: 'teapot', icon: '🫖', wrong: ['bardak', 'lamba'] },
  { tr: 'bardak', en: 'glass', icon: '🥛', wrong: ['tabak', 'kitap'] },
  { tr: 'tabak', en: 'plate', icon: '🍽️', wrong: ['bardak', 'sandalye'] },
  { tr: 'halı', en: 'carpet', icon: '🟥', wrong: ['yatak', 'lamba'] },
  { tr: 'saat', en: 'clock', icon: '🕰️', wrong: ['televizyon', 'kitap'] },
];

/** Little chats with no quiz: he is a child, not a teacher. */
const CHATS = [
  { say: 'Abi, bak! Benim oyuncak arabam kırmızı. Senin en sevdiğin renk ne?', en: 'Look, big brother! My toy car is red. What is your favourite colour?',
    words: [['oyuncak', 'toy'], ['en sevdiğin', 'your favourite'], ['renk', 'colour']],
    options: [{ tr: 'Benim en sevdiğim renk mavi.', en: 'My favourite colour is blue.' }, { tr: 'Ben yeşili seviyorum.', en: 'I like green.' }] },
  { say: 'Abi, ben altı yaşındayım. Sen kaç yaşındasın?', en: 'Big brother, I am six years old. How old are you?',
    words: [['yaş', 'age'], ['kaç', 'how many']],
    options: [{ tr: 'Ben on yaşındayım.', en: 'I am ten years old.' }, { tr: 'Senden büyüğüm!', en: 'I am older than you!' }] },
  { say: 'Abi, sayı sayabiliyorum! Bir, iki, üç, dört, beş!', en: 'Big brother, I can count! One, two, three, four, five!',
    words: [['saymak', 'to count'], ['sayı', 'number']],
    options: [{ tr: 'Aferin! Altı, yedi, sekiz!', en: 'Well done! Six, seven, eight!' }, { tr: 'Çok güzel saydın, Ali.', en: 'You counted very well, Ali.' }] },
  { say: 'Abi, acıktım. Annem ne pişiriyor?', en: 'Big brother, I am hungry. What is mum cooking?',
    words: [['acıkmak', 'to get hungry'], ['pişirmek', 'to cook']],
    options: [{ tr: 'Bilmiyorum, mutfağa bakalım.', en: 'I don’t know, let’s look in the kitchen.' }, { tr: 'Galiba çorba pişiriyor.', en: 'I think she is cooking soup.' }] },
  { say: 'Abi, dışarıda top oynayalım mı?', en: 'Big brother, shall we play ball outside?',
    words: [['top', 'ball'], ['dışarıda', 'outside']],
    options: [{ tr: 'Tamam, birazdan çıkalım.', en: 'Okay, let’s go out in a bit.' }, { tr: 'Şimdi olmaz, işim var.', en: 'Not now, I have work to do.' }] },
];

let lastThing = -1, lastChat = -1;
/**
 * What he comes with this time: now and then just a chat; otherwise a thing to name — the ones
 * not asked yet first, then any but the last one (he used to ask about the bed for ever once all
 * twelve were done, and the same thing again after a closed talk).
 */
function nextTalk(ctx) {
  if (Math.random() < 0.35) {
    lastChat = (lastChat + 1 + Math.floor(Math.random() * (CHATS.length - 1))) % CHATS.length;
    return `c${lastChat}`;
  }
  const all = THINGS.map((_, i) => i).filter((i) => i !== lastThing);
  const fresh = all.filter((i) => !ctx.flag(`kardes-${THINGS[i].tr}`));
  lastThing = fresh.length ? fresh[0] : all[Math.floor(Math.random() * all.length)];
  return `q${lastThing}`;
}

function nodes() {
  const out = {};
  THINGS.forEach((t, i) => {
    // no meanings under the choices: only the right one had one, and it gave the answer away
    const opts = [{ tr: t.tr, en: '', next: `ok${i}` }, ...t.wrong.map((w) => ({ tr: w, en: '', wrong: true }))];
    out[`q${i}`] = {
      say: `Abi, bu ne? ${t.icon}`, en: 'Big brother, what is this?', hint: `${t.icon} = ${t.tr}`,
      options: [opts[1], opts[0], opts[2]],
    };
    out[`ok${i}`] = {
      say: `Evet! Bu bir ${t.tr}. Sen çok biliyorsun abi!`, en: `Yes! This is a ${t.en}. You know so much, big brother!`,
      words: [[t.tr, t.en]],
      options: [{ tr: 'Aferin sana, Ali!', en: 'Well done, Ali!', do: [`flag:kardes-${t.tr}`] }],
    };
  });
  CHATS.forEach((c, i) => { out[`c${i}`] = c; });
  // he is family: no introductions, he just wants to play
  out.hello = {
    say: 'Abi! Abi! Çok sıkıldım. Oyun oynayalım mı?', en: 'Big brother! Big brother! I am so bored. Shall we play?',
    words: [['sıkılmak', 'to be bored'], ['oyun oynamak', 'to play a game']],
    options: [{ tr: 'Tamam Ali, oynayalım!', en: 'All right Ali, let’s play!', next: 'q0', do: ['flag:met-kardes'] }],
  };
  return out;
}

export const KARDES_THINGS = THINGS;

export default {
  id: 'kardes',
  npcs: {
    kardes: {
      name: 'Ali', short: 'Ali', role: 'kardeş · little brother',
      look: { shirt: 0x3E8E4A, pants: 0x2F6FDB, skin: 0xF2C49B, hair: 0x3B2418, scale: 0.6 },
      face: '<svg width="52" height="52" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#C8F0C0"/><circle cx="32" cy="37" r="14" fill="#F2C49B"/><path d="M18 34c1-10 7-14 14-14s13 4 14 14c-4-5-9-6-14-6s-10 1-14 6z" fill="#3B2418"/><circle cx="27" cy="38" r="2.2" fill="#1B2440"/><circle cx="37" cy="38" r="2.2" fill="#1B2440"/><path d="M27 44q5 5 10 0" stroke="#B83A5A" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>',
      // where he runs around the house (open floor only); `jump` = on the bed
      route: [ // salon → through the doorway into his room → on Ahmet's bed → back
        { x: 0.8, z: -2.6, wait: 2 }, { x: 2.5, z: -1.2 }, { x: 2.6, z: 0.7, wait: 1.5 }, { x: 4.2, z: 2.7 },
        { x: 8.5, z: 2.7 }, { x: 9.6, z: 1.3 }, { x: 11.2, z: 1.3, jump: true, wait: 5 }, { x: 9.6, z: 1.3 }, { x: 8.5, z: 2.7, wait: 2 },
        { x: 4.2, z: 2.7 }, { x: 1.2, z: 2.6 }, { x: -1.3, z: 2.0, wait: 2 }, { x: 1.2, z: 2.6 }, { x: 2.6, z: 0.7 }, { x: 2.5, z: -1.2, wait: 1 },
      ],
    },
  },
  voices: { kardes: man('Fenrir', M2) },
  castAll: { kardes: ['house', 'start', 'roam'] },
  dialogues: { kardes: { start: (ctx) => (ctx.flag('met-kardes') ? nextTalk(ctx) : 'hello'), nodes: nodes() } },
};
