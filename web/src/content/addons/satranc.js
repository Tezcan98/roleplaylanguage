import { man, M2 } from '../characters.js';
/**
 * İsmail Dede runs the giant chess board on the square (systems/ChessGame.js): you tell him
 * which colour you want, he seats the players, keeps the time and the score board, and
 * plays against you himself if you ask him nicely.
 */
/** What Dede says first depends on the board: free, half full, a game on, or you are already at it. */
function dedeStart(ctx) {
  const me = ctx.chess?.me;
  if (!me) return 'i1';
  if (me.color && me.drawOfferedToMe) return 'drawOffered';
  if (me.color) return me.phase === 'playing' ? 'playing' : 'waiting';
  if (me.inLine) return 'inLine';
  if (me.phase === 'playing' || me.phase === 'over') return 'busy';
  if (me.phase === 'waiting') return 'half';
  return 'i1';
}

export default {
  id: 'satranc',
  npcs: {
    ismail: {
      name: 'İsmail Dede', short: 'İsmail Dede', role: 'satranç ustası · chess master',
      look: { shirt: 0xE8E2D0, vest: 0x5B4636, pants: 0x3A3326, skin: 0xE2B48C, sides: 0xEEEEEE, mustache: 0xEEEEEE, cap: 0x6B4F3A },
      face: '<svg width="52" height="52" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#E6D8C4"/><circle cx="32" cy="36" r="16" fill="#E2B48C"/><path d="M16 38q1-10 5-13v12zM48 38q-1-10-5-13v12z" fill="#EEEEEE"/><path d="M15 26q17-10 34 0v-3q-17-9-34 0z" fill="#6B4F3A"/><circle cx="26" cy="36" r="2" fill="#1B2440"/><circle cx="38" cy="36" r="2" fill="#1B2440"/><path d="M20 41q12 16 24 0q-4 6-12 6t-12-6z" fill="#EEEEEE"/></svg>',
    },
  },
  voices: { ismail: man('Algieba', M2) },
  castAll: { ismail: ['village', 'chessDede', 'sitBench'] },
  dialogues: {
    ismail: { start: dedeStart, nodes: {
      i1: { say: 'Hoş geldin evlat! Bu tahta benden sorulur. Beyaz mı olmak istersin, siyah mı? İstersen benimle de oynarsın.', en: 'Welcome, child! This board is in my charge. Do you want to be white or black? If you like, you can play with me too.',
        words: [['satranç', 'chess'], ['beyaz', 'white'], ['siyah', 'black'], ['tahta', 'board']],
        options: [
          { tr: 'Beyaz olmak istiyorum.', en: 'I want to be white.', next: 'seated', do: ['chess-ask:w'] },
          { tr: 'Siyah olmak istiyorum.', en: 'I want to be black.', next: 'seated', do: ['chess-ask:b'] },
          { tr: 'Seninle oynamak istiyorum, Dede.', en: 'I want to play with you, Dede.', next: 'vsDede', do: ['chess-dede:w'] },
          { tr: 'Sonra gelirim.', en: "I'll come later." },
        ] },
      half: { say: 'Bir oyuncu bekliyor. Karşısına geçmek ister misin?', en: 'A player is waiting. Would you like to play against them?',
        options: [
          { tr: 'Evet, ben oynarım!', en: 'Yes, I will play!', next: 'seated', do: ['chess-ask:free'] },
          { tr: 'Hayır, sadece izleyeceğim.', en: "No, I'll just watch." },
        ] },
      busy: { say: 'Şimdi bir oyun var. Sıradaki oyunda oynamak ister misin?', en: 'There is a game on now. Would you like to play in the next game?',
        options: [
          { tr: 'Evet, sıraya yaz beni: beyaz.', en: 'Yes, put me in line: white.', next: 'queued', do: ['chess-ask:w'] },
          { tr: 'Evet, sıraya yaz beni: siyah.', en: 'Yes, put me in line: black.', next: 'queued', do: ['chess-ask:b'] },
          { tr: 'Hayır, izleyeceğim.', en: "No, I'll watch." },
        ] },
      seated: { say: 'Tamam! Diğer renk gelince oyun başlar. Sıra sende olunca taşının yanına git, al ve yeşil kareye götür.', en: 'All right! The game starts when someone takes the other colour. On your turn, go to your piece, take it and carry it to a green square.',
        words: [['sıra', 'turn'], ['taş', 'piece']], options: [{ tr: 'Anladım, Dede.', en: 'Understood, Dede.' }] },
      vsDede: { say: 'Haydi bakalım! Sen beyazsın, ilk hamle senin. Taşını al, yeşil kareye götür.', en: 'Come on then! You are white, the first move is yours. Take your piece and carry it to a green square.',
        options: [{ tr: 'Hazırım!', en: "I'm ready!" }] },
      queued: { say: 'Yazdım. Bu oyun bitince sıra sende.', en: 'Noted. When this game is over, it is your turn.', options: [{ tr: 'Teşekkürler, Dede.', en: 'Thank you, Dede.' }] },
      playing: { say: 'Oyun sürüyor evlat. Sıra sende olunca taşını al ve yeşil kareye götür. Ne istersin?', en: 'The game is on, child. On your turn take your piece and carry it to a green square. What would you like?',
        options: [
          { tr: 'Devam ediyorum.', en: "I'm carrying on." },
          { tr: 'Beraberlik teklif ediyorum.', en: 'I offer a draw.', next: 'drawSent', do: ['chess-draw'] },
          { tr: 'Pes ediyorum.', en: 'I give up.', next: 'resigned', do: ['chess-resign'] },
        ] },
      waiting: { say: 'Rakibini bekliyoruz. Biri gelince oyun başlar.', en: 'We are waiting for your opponent. The game starts when someone comes.',
        options: [{ tr: 'Bekliyorum.', en: "I'll wait." }, { tr: 'Vazgeçtim, Dede.', en: "I've changed my mind, Dede.", do: ['chess-leave'] }] },
      inLine: { say: 'Sıradasın evlat, bu oyun bitince oynarsın.', en: 'You are in line, child; you play when this game is over.',
        options: [{ tr: 'Tamam.', en: 'Okay.' }, { tr: 'Sıradan çıkmak istiyorum.', en: 'I want to leave the line.', do: ['chess-leave'] }] },
      drawSent: { say: 'Peki evlat, söylüyorum. Bakalım ne diyecek.', en: "All right, child, I'll pass it on. Let's see what the answer is.",
        words: [['beraberlik', 'a draw'], ['teklif etmek', 'to offer']], options: [{ tr: 'Teşekkürler, Dede.', en: 'Thank you, Dede.' }] },
      drawOffered: { say: 'Rakibin beraberlik teklif ediyor. Kabul ediyor musun?', en: 'Your opponent offers a draw. Do you accept?',
        words: [['kabul etmek', 'to accept']],
        options: [
          { tr: 'Kabul ediyorum.', en: 'I accept.', do: ['chess-draw-accept'] },
          { tr: 'Hayır, oyuna devam.', en: 'No, let’s play on.', do: ['chess-draw-decline'] },
        ] },
      resigned: { say: 'Olsun evlat, bir dahaki sefere! Satranç sabır ister.', en: 'Never mind, child — next time! Chess needs patience.', options: [{ tr: 'Teşekkürler, Dede.', en: 'Thank you, Dede.' }] },
    } },
  },
};
