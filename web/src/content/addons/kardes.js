/**
 * Ali, the little brother (6). He runs around the house, jumps on the bed now and then
 * (mom tells him off) and keeps asking "Abi, bu ne?" — each talk is a picture quiz on a
 * thing in the house, so the house words come back again and again.
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

/** A different thing each time (by how many he has asked so far). */
function nextThing(ctx) {
  const asked = THINGS.filter((t) => ctx.flag(`kardes-${t.tr}`)).length;
  return `q${asked % THINGS.length}`;
}

function nodes() {
  const out = {};
  THINGS.forEach((t, i) => {
    const opts = [{ tr: t.tr, en: t.en, next: `ok${i}` }, ...t.wrong.map((w) => ({ tr: w, en: '', wrong: true }))];
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
  out.hello = {
    say: 'Abi! Benim adım Ali. Ben altı yaşındayım. Oyun oynayalım mı?', en: 'Big brother! My name is Ali. I am six years old. Shall we play?',
    words: [['kardeş', 'little brother / sister'], ['oyun oynamak', 'to play a game']],
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
      route: [
        { x: 0.8, z: -2.6, wait: 2 }, { x: 2.5, z: -1.2 }, { x: 2.6, z: 0.7, wait: 1.5 }, { x: 1.2, z: 2.6 },
        { x: 2.3, z: 3.0 }, { x: 4.7, z: 3.0, jump: true, wait: 5 }, { x: 2.3, z: 3.0 }, { x: 1.2, z: 2.6, wait: 2 },
        { x: -1.3, z: 2.0, wait: 2 }, { x: 1.2, z: 2.6 }, { x: 2.6, z: 0.7 }, { x: 2.5, z: -1.2, wait: 1 },
      ],
    },
  },
  voices: { kardes: { id: 'tr_TR-fahrettin-medium', pitch: 1.55 } },
  castAll: { kardes: ['house', 'start', 'roam'] },
  dialogues: { kardes: { start: (ctx) => (ctx.flag('met-kardes') ? nextThing(ctx) : 'hello'), nodes: nodes() } },
};
