/**
 * Classroom lessons. The teacher asks; students answer out loud.
 * expect: accepted answers (fuzzy matched), keywords: any answer containing one is accepted.
 * botAnswers / botWrong: what the bot classmates say.
 */
export const LESSONS = {
  l1: {
    id: 'l1', title: 'Tanışma ve sayılar', titleEn: 'Introductions and numbers', cost: 1,
    questions: [
      { q: 'Günaydın çocuklar! Adın ne?', en: 'Good morning children! What is your name?', hint: 'Benim adım …',
        expect: ['Benim adım Ahmet', 'Adım Ahmet'], keywords: ['adım'],
        botAnswers: ['Benim adım Elif.', 'Adım Can.', 'Benim adım Zehra.'], botWrong: ['Ahmet adım benim?', 'Ben… şey…'] },
      { q: 'Kaç yaşındasın?', en: 'How old are you?', hint: 'On yaşındayım. (10 = on)',
        expect: ['On yaşındayım', 'Dokuz yaşındayım', 'On bir yaşındayım'], keywords: ['yaşındayım'],
        botAnswers: ['On yaşındayım.', 'Dokuz yaşındayım.'], botWrong: ['On yaş.', 'Yaşım on bir mi?'] },
      { q: 'Domates ne renk?', en: 'What colour is a tomato?', hint: 'kırmızı = red',
        expect: ['Kırmızı', 'Domates kırmızı'], keywords: ['kırmızı'],
        botAnswers: ['Kırmızı!', 'Domates kırmızı.'], botWrong: ['Mavi!', 'Yeşil.'] },
      { q: 'Üç artı iki kaç eder?', en: 'What is three plus two?', hint: 'beş = five',
        expect: ['Beş', 'Beş eder'], keywords: ['beş'],
        botAnswers: ['Beş!', 'Beş eder öğretmenim.'], botWrong: ['Altı!', 'Dört.'] },
      { q: 'Ailende kimler var?', en: 'Who is in your family?', hint: 'Annem, babam ve dedem var.',
        expect: ['Annem babam ve dedem var'], keywords: ['anne', 'baba', 'dede', 'kardeş', 'nene', 'babaanne'],
        botAnswers: ['Annem, babam ve kardeşim var.', 'Annem ve babam var.'], botWrong: ['Kedim var!', 'Bilmiyorum.'] },
    ],
  },
};

/** Exactly three classmates + the player = four students per classroom. */
export const CLASSMATE_BOTS = [
  { id: 'elif', name: 'Elif', skill: 0.8, seat: 'seat3' },
  { id: 'can', name: 'Can', skill: 0.55, seat: 'seat5' },
  { id: 'zehra', name: 'Zehra', skill: 0.65, seat: 'seat2' },
];
