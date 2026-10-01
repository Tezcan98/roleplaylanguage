/**
 * The village square's tea garden: Osman the tea maker (çaycı) at the çay ocağı. Ordering tea
 * practises polite requests and numbers (how many sugars); free chat with him on Gemini.
 */
export default {
  id: 'meydan',
  npcs: {
    cayci: {
      name: 'Çaycı Osman', short: 'Çaycı', role: 'çaycı · tea maker',
      look: { shirt: 0xFFFFFF, vest: 0x8E2B1E, pants: 0x2A2F3A, skin: 0xE9B98F, hair: 0x2E2926, mustache: 0x2E2926, apron: true },
      face: '<svg width="52" height="52" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#F2C9A0"/><circle cx="32" cy="36" r="16" fill="#E9B98F"/><path d="M16 31q4-13 16-13t16 13q-5-5-16-5t-16 5z" fill="#2E2926"/><circle cx="26" cy="36" r="2" fill="#1B2440"/><circle cx="38" cy="36" r="2" fill="#1B2440"/><path d="M23 43q9-6 18 0q-9 3-18 0z" fill="#2E2926"/></svg>',
    },
  },
  voices: { cayci: { id: 'tr_TR-fahrettin-medium', pitch: 0.95 } },
  castAll: { cayci: ['village', 'cayci', 'stand'] },
  dialogues: {
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
