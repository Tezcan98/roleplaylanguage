/**
 * The village square's tea garden: Osman the tea maker (çaycı) at the çay ocağı. Ordering tea
 * practises polite requests and numbers (how many sugars); free chat with him on Gemini.
 * Regulars: Hüseyin and Kadir at their tavla table (İsmail Dede, satranc.js, comments on the chess) — they
 * chat among themselves (content/talks.js), which you hear when you sit down near them.
 */
const face = (hair, beard) => `<svg width="52" height="52" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#E6D8C4"/><circle cx="32" cy="36" r="16" fill="#E2B48C"/><path d="M16 31q4-13 16-13t16 13q-5-5-16-5t-16 5z" fill="${hair}"/><circle cx="26" cy="36" r="2" fill="#1B2440"/><circle cx="38" cy="36" r="2" fill="#1B2440"/>${beard ? `<path d="M20 40q12 18 24 0q-4 6-12 6t-12-6z" fill="${hair}"/>` : `<path d="M23 43q9-6 18 0q-9 3-18 0z" fill="${hair}"/>`}</svg>`;
export default {
  id: 'meydan',
  npcs: {
    cayci: {
      name: 'Çaycı Osman', short: 'Çaycı', role: 'çaycı · tea maker',
      look: { shirt: 0xFFFFFF, vest: 0x8E2B1E, pants: 0x2A2F3A, skin: 0xE9B98F, hair: 0x2E2926, mustache: 0x2E2926, apron: true },
      face: '<svg width="52" height="52" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#F2C9A0"/><circle cx="32" cy="36" r="16" fill="#E9B98F"/><path d="M16 31q4-13 16-13t16 13q-5-5-16-5t-16 5z" fill="#2E2926"/><circle cx="26" cy="36" r="2" fill="#1B2440"/><circle cx="38" cy="36" r="2" fill="#1B2440"/><path d="M23 43q9-6 18 0q-9 3-18 0z" fill="#2E2926"/></svg>',
    },
    huseyin: {
      name: 'Hüseyin Amca', short: 'Hüseyin', role: 'çay bahçesinin müdavimi · tea garden regular',
      look: { shirt: 0x6E7B5A, vest: 0x3A3F4A, pants: 0x2A2F3A, skin: 0xE2B48C, hair: 0xD8D8D8, mustache: 0xD8D8D8 },
      face: face('#D8D8D8', false),
    },
    kadir: {
      name: 'Kadir Amca', short: 'Kadir', role: 'tavlacı · backgammon player',
      look: { shirt: 0x8A6E4B, pants: 0x3A3326, skin: 0xD9A77E, hair: 0x5A5048, mustache: 0x5A5048 },
      face: face('#5A5048', false),
    },
  },
  voices: {
    cayci: { id: 'tr_TR-fahrettin-medium', pitch: 1.06 },
    huseyin: { id: 'tr_TR-fahrettin-medium', pitch: 0.85 },
    kadir: { id: 'tr_TR-fettah-medium', pitch: 0.9 },
  },
  castAll: {
    cayci: ['village', 'cayci', 'stand'],
    huseyin: ['village', 'regular1', 'sitBench'],
    kadir: ['village', 'regular2', 'sitBench'],
  },
  dialogues: {
    huseyin: { start: () => 'h1', nodes: {
      h1: { say: 'Selamünaleyküm evlat! Bir sandalyeye otur, bir çay iç. Biz burada sohbet ediyoruz.', en: 'Peace be upon you, child! Sit on a chair and have a tea. We are chatting here.',
        words: [['sohbet etmek', 'to chat'], ['sandalye', 'chair']],
        options: [{ tr: 'Aleykümselam! Teşekkür ederim.', en: 'And peace be upon you! Thank you.' }] },
    } },
    kadir: { start: () => 'k1', nodes: {
      k1: { say: 'Tavla biliyor musun? Zarı atarsın, pulları oynarsın.', en: 'Do you know backgammon? You throw the dice and move the pieces.',
        words: [['tavla', 'backgammon'], ['zar', 'dice']],
        options: [{ tr: 'Biraz biliyorum.', en: 'I know a little.' }, { tr: 'Hayır, bilmiyorum.', en: 'No, I don’t know it.' }] },
    } },
    cayci: {
      start: () => 'c1',
      nodes: {
        c1: { say: 'Hoş geldin! Taze çay demlendi. Bir çay ister misin?', en: 'Welcome! Fresh tea has just brewed. Would you like a tea?',
          words: [['taze', 'fresh'], ['demlenmek', 'to brew (tea)']],
          options: [
            { tr: 'Evet, bir çay lütfen.', en: 'Yes, one tea please.', next: 'c2' },
            { tr: 'Hayır, teşekkür ederim.', en: 'No, thank you.', next: 'cNo' },
          ] },
        c2: { say: 'Buyurun. Kaç şeker?', en: 'Here you are. How many sugars?', words: [['kaç şeker?', 'how many sugars?']],
          options: [
            { tr: 'Bir şeker, lütfen.', en: 'One sugar, please.', next: 'c3' },
            { tr: 'Şekersiz olsun.', en: 'Without sugar, please.', next: 'c3' },
            { tr: 'İki şeker.', en: 'Two sugars.', next: 'c3' },
          ] },
        c3: { ask: 'speak', say: 'Afiyet olsun! Çay içerken ne dersin?', en: 'Enjoy! What do you say over tea?', expect: ['Çok güzel olmuş', 'Eline sağlık', 'Teşekkür ederim'], keywords: ['güzel', 'sağlık', 'teşekkür'],
          show: 'Eline sağlık, çok güzel olmuş!', hint: 'Eline sağlık = thank you for making it',
          do: ['free:village_tea'] },
        cNo: { say: 'Peki, istediğin zaman gel. Masalarda oturup sohbet edebilirsin.', en: 'All right, come whenever you like. You can sit at the tables and chat.',
          options: [{ tr: 'Tamam, teşekkürler.', en: 'Okay, thanks.' }] },
      },
    },
  },
};
