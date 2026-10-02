/**
 * Conversations the villagers have among themselves in the square's sitting places (see
 * systems/TalkAreas.js). Sit down nearby and you hear them, with the meaning underneath.
 * Short, everyday A1–A2 Turkish: greetings, weather, family, prices, tea, backgammon, chess.
 */
export const TALKS = {
  cay: [
    [
      { who: 'huseyin', tr: 'Günaydın Kadir! Nasılsın?', en: 'Good morning Kadir! How are you?' },
      { who: 'kadir', tr: 'İyiyim, sağ ol. Sen nasılsın?', en: 'I’m fine, thanks. How are you?' },
      { who: 'huseyin', tr: 'Ben de iyiyim. Hava bugün çok güzel.', en: 'I’m fine too. The weather is very nice today.' },
      { who: 'kadir', tr: 'Evet, güneşli. Bir çay daha içelim mi?', en: 'Yes, it’s sunny. Shall we have another tea?' },
      { who: 'huseyin', tr: 'Osman! İki çay lütfen!', en: 'Osman! Two teas please!' },
      { who: 'cayci', tr: 'Hemen geliyor!', en: 'Coming right up!' },
    ],
    [
      { who: 'kadir', tr: 'Hadi, tavla oynayalım.', en: 'Come on, let’s play backgammon.' },
      { who: 'huseyin', tr: 'Tamam. Zarları sen at.', en: 'Okay. You throw the dice.' },
      { who: 'kadir', tr: 'Altı ile beş! Çok iyi.', en: 'Six and five! Very good.' },
      { who: 'huseyin', tr: 'Bugün şanslısın, Kadir.', en: 'You’re lucky today, Kadir.' },
      { who: 'kadir', tr: 'Ben her gün şanslıyım!', en: 'I’m lucky every day!' },
    ],
    [
      { who: 'huseyin', tr: 'Oğlun ne yapıyor? İstanbul’da mı?', en: 'What is your son doing? Is he in Istanbul?' },
      { who: 'kadir', tr: 'Evet, İstanbul’da çalışıyor. Öğretmen.', en: 'Yes, he works in Istanbul. He is a teacher.' },
      { who: 'huseyin', tr: 'Maşallah! Ne zaman geliyor?', en: 'Mashallah! When is he coming?' },
      { who: 'kadir', tr: 'Bayramda geliyor, inşallah.', en: 'He is coming for the holiday, God willing.' },
    ],
    [
      { who: 'kadir', tr: 'Domates bugün kaç lira?', en: 'How much are tomatoes today?' },
      { who: 'huseyin', tr: 'Bilmiyorum. Rıza’ya soralım.', en: 'I don’t know. Let’s ask Rıza.' },
      { who: 'kadir', tr: 'Dün çok pahalıydı.', en: 'It was very expensive yesterday.' },
      { who: 'huseyin', tr: 'Her şey pahalı, kardeşim.', en: 'Everything is expensive, my brother.' },
    ],
    [
      { who: 'huseyin', tr: 'Yarın yağmur yağacak mı?', en: 'Will it rain tomorrow?' },
      { who: 'kadir', tr: 'Radyo öyle diyor.', en: 'The radio says so.' },
      { who: 'huseyin', tr: 'İyi, tarlalar çok kuru.', en: 'Good, the fields are very dry.' },
      { who: 'cayci', tr: 'Çaylar taze, beyler!', en: 'The tea is fresh, gentlemen!' },
      { who: 'kadir', tr: 'Eline sağlık, Osman.', en: 'Thank you for making it, Osman.' },
    ],
    [
      { who: 'kadir', tr: 'Akşam camiye gidiyor musun?', en: 'Are you going to the mosque this evening?' },
      { who: 'huseyin', tr: 'Evet, yatsıda görüşürüz.', en: 'Yes, see you at the night prayer.' },
      { who: 'kadir', tr: 'Tamam. Allah’a emanet ol.', en: 'Okay. Go with God.' },
    ],
  ],
  // İsmail Dede talks to whoever watches the game (one line at a time)
  chess: [
    [{ who: 'ismail', tr: 'Satranç sabır ister.', en: 'Chess needs patience.' }],
    [{ who: 'ismail', tr: 'At L gibi gider.', en: 'The knight moves like an L.' }],
    [{ who: 'ismail', tr: 'Fil çapraz gider.', en: 'The bishop moves diagonally.' }],
    [{ who: 'ismail', tr: 'Kale düz gider: ileri, geri, sağa, sola.', en: 'The rook goes straight: forward, back, right, left.' }],
    [{ who: 'ismail', tr: 'Vezir en güçlü taştır.', en: 'The queen is the strongest piece.' }],
    [{ who: 'ismail', tr: 'Şahını koru! Şah giderse oyun biter.', en: 'Protect your king! If the king falls, the game is over.' }],
    [{ who: 'ismail', tr: 'Ben gençken her akşam satranç oynardım.', en: 'When I was young, I played chess every evening.' }],
    [{ who: 'ismail', tr: 'Piyon geri gidemez, hep ileri gider.', en: 'A pawn can’t go back, it always goes forward.' }],
  ],
};

/** İsmail Dede reacts to the moves on the giant board. */
export const CHESS_COMMENTS = {
  move: {
    p: { tr: 'Piyon ileri gitti.', en: 'The pawn went forward.' },
    n: { tr: 'At oynadı. Güzel!', en: 'The knight moved. Nice!' },
    b: { tr: 'Fil çapraz gitti.', en: 'The bishop went diagonally.' },
    r: { tr: 'Kale oynadı.', en: 'The rook moved.' },
    q: { tr: 'Vezir çıktı! Dikkat!', en: 'The queen is out! Careful!' },
    k: { tr: 'Şah bir adım gitti.', en: 'The king took one step.' },
  },
  capture: {
    p: { tr: 'Vay! Piyonu aldı!', en: 'Wow! It took the pawn!' },
    n: { tr: 'Vay! Atı aldı!', en: 'Wow! It took the knight!' },
    b: { tr: 'Vay! Fili aldı!', en: 'Wow! It took the bishop!' },
    r: { tr: 'Vay! Kaleyi aldı!', en: 'Wow! It took the rook!' },
    q: { tr: 'Aman! Veziri aldı!', en: 'Oh no! It took the queen!' },
  },
  check: { tr: 'Şah! Şaha dikkat!', en: 'Check! Watch the king!' },
  mate: { tr: 'Şah mat! Tebrikler!', en: 'Checkmate! Congratulations!' },
};
