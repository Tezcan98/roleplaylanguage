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
  l2: {
    id: 'l2', title: 'Sınıf eşyaları ve yönler', titleEn: 'Classroom objects and directions', cost: 1,
    questions: [
      { q: 'Bu ne? (kalem)', en: 'What is this? (pencil)', hint: 'Bu bir kalem.',
        expect: ['Bu bir kalem', 'Kalem'], keywords: ['kalem'],
        botAnswers: ['Bu bir kalem.', 'Kalem!'], botWrong: ['Bu bir kitap.', 'Masa.'] },
      { q: 'Kitap nerede?', en: 'Where is the book?', hint: 'Masanın üstünde.',
        expect: ['Masanın üstünde', 'Kitap masanın üstünde'], keywords: ['üstünde', 'masa'],
        botAnswers: ['Masanın üstünde.', 'Kitap masada.'], botWrong: ['Bahçede.', 'Çantanın altında.'] },
      { q: 'Sağ elin hangisi?', en: 'Which is your right hand?', hint: 'Sağ = right',
        expect: ['Sağ elim', 'Bu sağ elim'], keywords: ['sağ'],
        botAnswers: ['Sağ elim!', 'Bu sağ taraf.'], botWrong: ['Sol elim.', 'Arkam.'] },
      { q: 'Pencere nerede?', en: 'Where is the window?', hint: 'Pencere sınıfta.',
        expect: ['Pencere sınıfta', 'Sınıfta'], keywords: ['sınıf'],
        botAnswers: ['Pencere sınıfta.', 'Sınıfta.'], botWrong: ['Bahçede.', 'Mutfakta.'] },
    ],
  },
  l3: {
    id: 'l3', title: 'Günlük hayat ve planlar', titleEn: 'Daily life and plans', cost: 1,
    questions: [
      { q: 'Bugün ne yapıyorsun?', en: 'What are you doing today?', hint: 'Bugün okula gidiyorum.',
        expect: ['Bugün okula gidiyorum', 'Okula gidiyorum'], keywords: ['okula', 'gidiyorum'],
        botAnswers: ['Bugün okula gidiyorum.', 'Ders çalışıyorum.'], botWrong: ['Dün uyudum.', 'Yarın.'] },
      { q: 'Hafta sonu ne yapacaksın?', en: 'What will you do at the weekend?', hint: 'Arkadaşlarımla buluşacağım.',
        expect: ['Arkadaşlarımla buluşacağım', 'Arkadaşlarımla buluşacağım'], keywords: ['arkadaşlarımla'],
        botAnswers: ['Arkadaşlarımla buluşacağım.', 'Köye gideceğim.'], botWrong: ['Okula gideceğim.', 'Dün buluştum.'] },
      { q: 'Saat kaç?', en: 'What time is it?', hint: 'Saat dokuz.',
        expect: ['Saat dokuz', 'Dokuz'], keywords: ['dokuz'],
        botAnswers: ['Saat dokuz.', 'Dokuz.'], botWrong: ['Saat üç.', 'On iki.'] },
      { q: 'Akşam ne yapıyorsun?', en: 'What do you do in the evening?', hint: 'Akşam kitap okuyorum.',
        expect: ['Akşam kitap okuyorum', 'Kitap okuyorum'], keywords: ['kitap', 'okuyorum'],
        botAnswers: ['Akşam kitap okuyorum.', 'Ailemle konuşuyorum.'], botWrong: ['Okula gidiyorum.', 'Kahvaltı yapıyorum.'] },
    ],
  },

};

/** Exactly three classmates + the player = four students per classroom. */
export const CLASSMATE_BOTS = [
  { id: 'elif', name: 'Elif', skill: 0.8, seat: 'seat3' },
  { id: 'can', name: 'Can', skill: 0.55, seat: 'seat5' },
  { id: 'zehra', name: 'Zehra', skill: 0.65, seat: 'seat2' },
];
