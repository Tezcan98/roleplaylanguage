/**
 * İsmail Dede runs the giant chess board on the square (systems/ChessGame.js): you tell him
 * which colour you want, he seats the players, keeps the time and the score board, and
 * plays against you himself if you ask him nicely.
 */
export default {
  id: 'satranc',
  npcs: {
    ismail: {
      name: 'İsmail Dede', short: 'İsmail Dede', role: 'satranç ustası · chess master',
      look: { shirt: 0xE8E2D0, vest: 0x5B4636, pants: 0x3A3326, skin: 0xE2B48C, sides: 0xEEEEEE, mustache: 0xEEEEEE, cap: 0x6B4F3A },
      face: '<svg width="52" height="52" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#E6D8C4"/><circle cx="32" cy="36" r="16" fill="#E2B48C"/><path d="M16 38q1-10 5-13v12zM48 38q-1-10-5-13v12z" fill="#EEEEEE"/><path d="M15 26q17-10 34 0v-3q-17-9-34 0z" fill="#6B4F3A"/><circle cx="26" cy="36" r="2" fill="#1B2440"/><circle cx="38" cy="36" r="2" fill="#1B2440"/><path d="M20 41q12 16 24 0q-4 6-12 6t-12-6z" fill="#EEEEEE"/></svg>',
    },
  },
  voices: { ismail: { id: 'tr_TR-fettah-medium', pitch: 0.8 } },
  castAll: { ismail: ['village', 'chessDede', 'sitBench'] },
  dialogues: {
    ismail: { start: () => 'i1', nodes: {
      i1: { say: 'Hoş geldin evlat! Bu tahta benden sorulur. Beyaz mı olmak istersin, siyah mı? İstersen benimle de oynarsın.', en: 'Welcome, child! This board is in my charge. Do you want to be white or black? If you like, you can play with me too.',
        words: [['satranç', 'chess'], ['beyaz', 'white'], ['siyah', 'black'], ['tahta', 'board']],
        options: [{ tr: 'Tahtaya bakalım.', en: "Let's look at the board.", do: ['chess'] }, { tr: 'Sonra gelirim.', en: "I'll come later." }] },
    } },
  },
};
