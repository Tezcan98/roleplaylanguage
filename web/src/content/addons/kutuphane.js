import { man } from '../characters.js';
/**
 * The open library on the village square and its librarian, Aslan Bey: a quiet man who
 * talks in riddles and half-told stories. Every visit is a different mysterious little
 * conversation (some with a riddle to solve); after all of them they come round again.
 */
const TALKS = [
  { id: 'soru', nodes: {
    start: { say: 'Hoş geldin genç misafir. Kitaplar konuşmaz derler… ama doğru soruyu sorarsan cevap verirler.', en: 'Welcome, young guest. They say books do not talk… but if you ask the right question, they answer.',
      words: [['misafir', 'guest'], ['soru', 'question'], ['cevap', 'answer']],
      options: [{ tr: 'Hangi soru?', en: 'Which question?', next: 'b' }, { tr: 'Ben sadece bakıyorum.', en: "I'm just looking.", next: 'c' }] },
    b: { say: 'Her şey bir soruyla başlar. Mesela: bu köyün en eski kitabı hangisi? Onu henüz kimse sonuna kadar okumadı.', en: 'Everything starts with a question. For example: which is the oldest book of this village? Nobody has read it to the end yet.',
      words: [['eski', 'old'], ['sonuna kadar', 'to the end']], options: [{ tr: 'Ben okuyabilir miyim?', en: 'Can I read it?', next: 'd' }] },
    c: { say: 'Bakmak da güzeldir. Bazen kitap seni seçer, sen kitabı değil.', en: 'Looking is fine too. Sometimes the book chooses you, not you the book.',
      words: [['seçmek', 'to choose']], options: [{ tr: 'İlginç…', en: 'Interesting…' }] },
    d: { say: 'Belki bir gün. Önce harfleri, sonra kelimeleri, sonra sessizliği öğrenmelisin.', en: 'Maybe one day. First you must learn the letters, then the words, then the silence.',
      words: [['harf', 'letter'], ['kelime', 'word'], ['sessizlik', 'silence']], options: [{ tr: 'Sessizliği mi?', en: 'The silence?' }] },
  } },
  { id: 'bilmece1', nodes: {
    start: { say: 'Sana bir bilmece sorayım. Yaprakları var ama ağaç değil, sırtı var ama insan değil. Nedir?', en: "Let me ask you a riddle. It has leaves but it isn't a tree; it has a back but it isn't a person. What is it?",
      words: [['bilmece', 'riddle'], ['yaprak', 'leaf; page'], ['sırt', 'back; spine']],
      options: [{ tr: 'Kitap!', en: 'A book!', next: 'ok' }, { tr: 'Kedi.', en: 'A cat.', wrong: true }, { tr: 'Masa.', en: 'A table.', wrong: true }] },
    ok: { say: 'Bildin. “Yaprak” hem ağacın yaprağı hem kitabın sayfasıdır. Kelimeler iki yüzlüdür, dikkat et.', en: 'You got it. “Yaprak” is both a leaf of a tree and a page of a book. Words have two faces — be careful.',
      words: [['sayfa', 'page'], ['dikkat etmek', 'to be careful']], options: [{ tr: 'Çok güzelmiş!', en: "That's lovely!" }] },
  } },
  { id: 'raf', nodes: {
    start: { say: 'Bu rafta üç kitap eksik. Biri gece gitti, biri sabah döndü, biri hiç gelmedi.', en: 'Three books are missing from this shelf. One left at night, one came back in the morning, one never came at all.',
      words: [['raf', 'shelf'], ['eksik', 'missing'], ['dönmek', 'to come back']],
      options: [{ tr: 'Hiç gelmeyen kitap nerede?', en: 'Where is the book that never came?', next: 'b' }, { tr: 'Gece giden kim?', en: 'Who left at night?', next: 'c' }] },
    b: { say: 'Belki de henüz yazılmadı. Belki de onu sen yazacaksın.', en: 'Maybe it has not been written yet. Maybe you will write it.', words: [['yazmak', 'to write'], ['henüz', 'yet']], options: [{ tr: 'Ben mi?', en: 'Me?' }] },
    c: { say: 'Bunu kahvehanedeki Rıfat da merak ediyor. Ama ona söyleme, yoksa bütün köy duyar.', en: 'Rıfat at the coffeehouse wonders about that too. But do not tell him, or the whole village will hear.',
      words: [['merak etmek', 'to wonder'], ['duymak', 'to hear']], options: [{ tr: 'Söylemem.', en: "I won't tell." }] },
  } },
  { id: 'isik', nodes: {
    start: { say: 'Dün gece kütüphanenin lambası yanıyordu. Ama ben evdeydim…', en: 'Last night the library lamp was on. But I was at home…',
      words: [['lamba', 'lamp'], ['yanmak', 'to be on (light); to burn']],
      options: [{ tr: 'Kim vardı?', en: 'Who was here?', next: 'b' }, { tr: 'Belki unuttunuz.', en: 'Maybe you forgot it.', next: 'c' }] },
    b: { say: 'Belki bir okuyucu, belki bir hikâye. Hikâyeler bazen kendi kendine okunmak ister.', en: 'Maybe a reader, maybe a story. Stories sometimes want to be read all by themselves.',
      words: [['okuyucu', 'reader'], ['kendi kendine', 'by itself']], options: [{ tr: 'Biraz korkutucu…', en: 'A bit scary…' }] },
    c: { say: 'Akıllı çocuk. En basit cevap çoğu zaman doğrudur. Çoğu zaman…', en: 'Clever child. The simplest answer is usually right. Usually…',
      words: [['basit', 'simple'], ['çoğu zaman', 'usually']], options: [{ tr: 'Çoğu zaman mı?', en: 'Usually?' }] },
  } },
  { id: 'bilmece2', nodes: {
    start: { say: 'Bir bilmece daha: gündüz uyur, gece uyanır; gökyüzünde yalnız dolaşır. Nedir?', en: 'One more riddle: it sleeps by day and wakes at night; it wanders the sky alone. What is it?',
      words: [['gündüz', 'daytime'], ['gökyüzü', 'sky'], ['yalnız', 'alone']],
      options: [{ tr: 'Güneş.', en: 'The sun.', wrong: true }, { tr: 'Ay!', en: 'The moon!', next: 'ok' }, { tr: 'Kuş.', en: 'A bird.', wrong: true }] },
    ok: { say: 'Doğru, Ay. Rıfat Ay’a kimsenin gitmediğini söylüyormuş… Sen ne dersin?', en: 'Right, the moon. Rıfat says nobody ever went to the moon… What do you say?',
      options: [{ tr: 'Bence gittiler!', en: 'I think they did!', next: 'end' }, { tr: 'Bilmiyorum.', en: "I don't know.", next: 'end' }] },
    end: { say: 'Güzel. Bir şeye inanmadan önce kitaplara sor. Kitaplar sabırlıdır.', en: 'Good. Before you believe something, ask the books. Books are patient.',
      words: [['sabırlı', 'patient']], options: [{ tr: 'Tamam Aslan Bey.', en: 'All right, Aslan Bey.' }] },
  } },
  { id: 'anahtar', nodes: {
    start: { say: 'Bu anahtar hangi kapıyı açar, biliyor musun? Ben kırk yıldır arıyorum.', en: 'Do you know which door this key opens? I have been looking for forty years.',
      words: [['anahtar', 'key'], ['kapı', 'door'], ['aramak', 'to look for']],
      options: [{ tr: 'Kütüphanenin kapısını mı?', en: 'The library door?', next: 'b' }, { tr: 'Hazine sandığını!', en: 'A treasure chest!', next: 'c' }] },
    b: { say: 'Kütüphanenin kapısı yok ki, baksana. Burası herkese açık.', en: "The library has no door — look. This place is open to everyone.", words: [['açık', 'open']], options: [{ tr: 'Doğru!', en: 'True!' }] },
    c: { say: 'Belki. Ama bazı hazineler sandıkta değil, kafanın içindedir.', en: 'Maybe. But some treasures are not in a chest — they are inside your head.',
      words: [['hazine', 'treasure'], ['kafa', 'head']], options: [{ tr: 'Öğrendiklerim gibi mi?', en: 'Like the things I learn?' }] },
  } },
];

function nextTalk(ctx) {
  const fresh = TALKS.find((t) => !ctx.flag(`aslan-${t.id}`));
  if (fresh) return `${fresh.id}.start`;
  const s = ctx.state ?? { day: 1, minutes: 0 };
  return `${TALKS[(s.day * 24 + Math.floor(s.minutes / 60)) % TALKS.length].id}.start`;
}

function nodes() {
  const out = {};
  TALKS.forEach(({ id, nodes: own }) => Object.entries(own).forEach(([k, n]) => {
    out[`${id}.${k}`] = { ...n, options: n.options.map((o) => (o.wrong ? o : o.next ? { ...o, next: `${id}.${o.next}` } : { ...o, do: [`flag:aslan-${id}`] })) };
  }));
  return out;
}

export default {
  id: 'kutuphane',
  npcs: {
    aslanBey: {
      name: 'Aslan Bey', short: 'Aslan Bey', role: 'kütüphaneci · librarian',
      look: { shirt: 0x2F4050, vest: 0x6B4F3A, pants: 0x2A2F3A, skin: 0xE9B98F, hair: 0xB8BCC4, mustache: 0x8A8E96, glasses: true },
      face: '<svg width="52" height="52" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#B7C9D6"/><circle cx="32" cy="36" r="16" fill="#E9B98F"/><path d="M15 31q2-15 17-15t17 15q-6-6-17-6t-17 6z" fill="#B8BCC4"/><circle cx="26" cy="36" r="4.5" fill="none" stroke="#1B2440" stroke-width="1.8"/><circle cx="38" cy="36" r="4.5" fill="none" stroke="#1B2440" stroke-width="1.8"/><path d="M30.5 36h3" stroke="#1B2440" stroke-width="1.8"/><circle cx="26" cy="36" r="1.4" fill="#1B2440"/><circle cx="38" cy="36" r="1.4" fill="#1B2440"/><path d="M24 43q8-5 16 0q-8 3-16 0z" fill="#8A8E96"/></svg>',
    },
  },
  voices: { aslanBey: man('Schedar') },
  castAll: { aslanBey: ['village', 'aslanBey', 'stand'] },
  dialogues: { aslanBey: { start: nextTalk, nodes: nodes() } },
};
