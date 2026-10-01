/**
 * Classroom lessons — a graded A1 sequence in the order Turkish-for-foreigners courses
 * (TÖMER, Yunus Emre Enstitüsü "Yedi İklim" A1) usually take: greetings and introducing
 * yourself → numbers and age → objects and places in the classroom → days and time.
 * See docs/CURRICULUM.md.
 *
 * Every lesson runs in three stages:
 *   teach     the teacher presents: says a line, writes `board` on the chalkboard, shows
 *             `words`; `repeat` steps ask the student to say it after her (speech).
 *   practice  controlled exercises for the student alone: choice / listen / order.
 *   questions free answers out loud, in turn with the classmates. `q` starts in lower case
 *             because the teacher puts the student's name in front ("Elif, kaç yaşındasın?").
 *             expect: accepted answers (fuzzy), keywords: any answer containing one counts.
 *             botAnswers / botWrong: what the classmates say ({name} = the classmate's name).
 */
export const LESSONS = {
  l1: {
    id: 'l1', level: 'A1.1', cost: 1,
    title: 'Merhaba! Selamlaşma ve tanışma', titleEn: 'Hello! Greetings and introductions',
    goals: [['Selamlaşmak', 'Greeting people'], ['Adını söylemek', 'Saying your name'], ['Hâl hatır sormak', 'Asking how someone is']],
    teach: [
      { board: ['Merhaba!', 'Hoş geldiniz!'], say: 'Merhaba çocuklar, hoş geldiniz! Bugün selamlaşmayı ve tanışmayı öğreneceğiz.', en: 'Hello children, welcome! Today we will learn to greet people and introduce ourselves.',
        words: [['merhaba', 'hello'], ['hoş geldiniz', 'welcome (to you all)']] },
      { board: ['Günaydın! (sabah)', 'İyi günler! (gündüz)', 'İyi akşamlar! (akşam)'], say: 'Sabah “Günaydın” deriz. Gündüz “İyi günler”, akşam “İyi akşamlar” deriz.', en: 'In the morning we say “Günaydın”. During the day “İyi günler”, in the evening “İyi akşamlar”.',
        words: [['günaydın', 'good morning'], ['iyi günler', 'good day'], ['iyi akşamlar', 'good evening']] },
      { repeat: true, board: ['Günaydın!'], say: 'Hep birlikte söyleyelim: Günaydın!', en: 'Let’s say it together: Günaydın!', expect: ['Günaydın'] },
      { board: ['Benim adım Zeynep.', 'Senin adın ne?', '— Benim adım …'], say: 'Benim adım Zeynep. Ben sizin öğretmeninizim. Senin adın ne? Cevap verirken “Benim adım …” deriz.', en: 'My name is Zeynep. I am your teacher. What is your name? When we answer we say “My name is …”.',
        words: [['benim adım', 'my name is'], ['senin adın ne?', 'what is your name?'], ['öğretmen', 'teacher']] },
      { repeat: true, board: ['Benim adım Ahmet.'], say: 'Şimdi sen söyle: Benim adım Ahmet.', en: 'Now you say it: My name is Ahmet.', expect: ['Benim adım Ahmet'] },
      { board: ['Nasılsın?', '— İyiyim, teşekkür ederim.', 'Sen nasılsın?'], say: 'Bir arkadaşımıza “Nasılsın?” diye sorarız. Cevap: “İyiyim, teşekkür ederim. Sen nasılsın?”', en: 'We ask a friend “Nasılsın?” (How are you?). The answer: “I’m fine, thank you. How are you?”',
        words: [['nasılsın?', 'how are you?'], ['iyiyim', 'I am fine'], ['teşekkür ederim', 'thank you']] },
      { board: ['Hoşça kal! (giden)', 'Güle güle! (kalan)'], say: 'Ayrılırken giden kişi “Hoşça kal”, kalan kişi “Güle güle” der.', en: 'When parting, the one who leaves says “Hoşça kal”, the one who stays says “Güle güle”.',
        words: [['hoşça kal', 'goodbye (said by the one leaving)'], ['güle güle', 'goodbye (said to the one leaving)']] },
    ],
    practice: [
      { activity: 'listen', say: 'Günaydın!', en: 'Good morning!', speaker: 'ogretmen', prompt: 'Öğretmen ne dedi?',
        options: [{ tr: 'İyi akşamlar!', en: '', wrong: true }, { tr: 'Günaydın!', en: '' }, { tr: 'Hoşça kal!', en: '', wrong: true }] },
      { activity: 'choice', say: 'Akşam ne deriz?', en: 'What do we say in the evening?', hint: 'akşam = evening',
        options: [{ tr: 'Günaydın!', en: '', wrong: true }, { tr: 'İyi günler!', en: '', wrong: true }, { tr: 'İyi akşamlar!', en: '' }] },
      { activity: 'order', say: 'Cümleyi kur.', en: 'Build the sentence.', answer: 'Benim adım Ahmet.', answerEn: 'My name is Ahmet.' },
      { activity: 'choice', say: '“Nasılsın?” Ne cevap verirsin?', en: '“How are you?” What do you answer?', hint: 'iyiyim = I am fine',
        options: [{ tr: 'İyiyim, teşekkür ederim.', en: '' }, { tr: 'Benim adım Elif.', en: '', wrong: true }, { tr: 'Güle güle.', en: '', wrong: true }] },
    ],
    intro: { say: 'Çok güzel! Şimdi sırayla size soru soracağım.', en: 'Very good! Now I will ask you questions in turn.' },
    questions: [
      { q: 'senin adın ne?', en: 'what is your name?', hint: 'Benim adım …',
        expect: ['Benim adım Ahmet', 'Adım Ahmet'], keywords: ['adım'],
        botAnswers: ['Benim adım {name}.', 'Adım {name}.'], botWrong: ['Benim adın ne?', 'Ben… şey…'] },
      { q: 'nasılsın?', en: 'how are you?', hint: 'İyiyim, teşekkür ederim.',
        expect: ['İyiyim teşekkür ederim', 'İyiyim'], keywords: ['iyiyim'],
        botAnswers: ['İyiyim, teşekkür ederim.', 'İyiyim, sen nasılsın?'], botWrong: ['Günaydın.', 'Benim adım Can.'] },
      { q: 'sabah okula gelince öğretmenine ne dersin?', en: 'what do you say to your teacher when you arrive at school in the morning?', hint: 'Günaydın öğretmenim!',
        expect: ['Günaydın öğretmenim', 'Günaydın'], keywords: ['günaydın'],
        botAnswers: ['Günaydın öğretmenim!', 'Günaydın!'], botWrong: ['İyi geceler!', 'Güle güle!'] },
      { q: 'okuldan çıkarken ne dersin?', en: 'what do you say when you leave school?', hint: 'Hoşça kalın!',
        expect: ['Hoşça kalın', 'Hoşça kal'], keywords: ['hoşça'],
        botAnswers: ['Hoşça kalın öğretmenim!', 'Hoşça kalın!'], botWrong: ['Günaydın!', 'Hoş geldiniz!'] },
    ],
  },

  l2: {
    id: 'l2', level: 'A1.1', cost: 1,
    title: 'Sayılar ve yaş', titleEn: 'Numbers and age',
    goals: [['1’den 10’a kadar saymak', 'Counting from 1 to 10'], ['Yaşını söylemek', 'Saying your age'], ['“Kaç?” sorusu', 'The question “how many?”']],
    teach: [
      { board: ['1 bir   2 iki   3 üç', '4 dört   5 beş'], say: 'Bugün sayıları öğreneceğiz. Bir, iki, üç, dört, beş.', en: 'Today we will learn numbers. One, two, three, four, five.',
        words: [['bir', 'one'], ['iki', 'two'], ['üç', 'three'], ['dört', 'four'], ['beş', 'five']] },
      { repeat: true, board: ['bir, iki, üç, dört, beş'], say: 'Benimle sayın: bir, iki, üç, dört, beş.', en: 'Count with me: one, two, three, four, five.', expect: ['Bir iki üç dört beş'] },
      { board: ['6 altı   7 yedi   8 sekiz', '9 dokuz   10 on'], say: 'Devam ediyoruz: altı, yedi, sekiz, dokuz, on.', en: 'We continue: six, seven, eight, nine, ten.',
        words: [['altı', 'six'], ['yedi', 'seven'], ['sekiz', 'eight'], ['dokuz', 'nine'], ['on', 'ten']] },
      { repeat: true, board: ['altı, yedi, sekiz, dokuz, on'], say: 'Şimdi sen say: altı, yedi, sekiz, dokuz, on.', en: 'Now you count: six, seven, eight, nine, ten.', expect: ['Altı yedi sekiz dokuz on'] },
      { board: ['Kaç?', 'Kaç kalem var? — Üç kalem var.'], say: 'Sayıyı “Kaç?” diye sorarız. Kaç kalem var? Üç kalem var. Sayıdan sonra kelime tekil kalır: üç kalem.', en: 'We ask for a number with “Kaç?” (how many). How many pencils are there? There are three pencils. After a number the word stays singular: üç kalem.',
        words: [['kaç?', 'how many?'], ['var', 'there is / there are']] },
      { board: ['Kaç yaşındasın?', '— On yaşındayım.'], say: 'Yaşımızı böyle söyleriz. Kaç yaşındasın? On yaşındayım.', en: 'This is how we say our age. How old are you? I am ten years old.',
        words: [['kaç yaşındasın?', 'how old are you?'], ['on yaşındayım', 'I am ten years old']] },
      { board: ['3 + 2 = 5', 'Üç artı iki, beş eder.'], say: 'Toplama da yapabiliriz: üç artı iki, beş eder.', en: 'We can add too: three plus two makes five.',
        words: [['artı', 'plus'], ['eder', 'makes, equals']] },
    ],
    practice: [
      { activity: 'listen', say: 'Yedi.', en: 'Seven.', speaker: 'ogretmen', prompt: 'Hangi sayıyı duydun?',
        options: [{ tr: 'iki', en: '', wrong: true }, { tr: 'yedi', en: '' }, { tr: 'dokuz', en: '', wrong: true }] },
      { activity: 'choice', say: 'Dört artı dört kaç eder?', en: 'What is four plus four?', hint: '4 + 4 = 8',
        options: [{ tr: 'Altı.', en: '', wrong: true }, { tr: 'Sekiz.', en: '' }, { tr: 'Dokuz.', en: '', wrong: true }] },
      { activity: 'order', say: 'Cümleyi kur.', en: 'Build the sentence.', answer: 'Ben on yaşındayım.', answerEn: 'I am ten years old.' },
      { activity: 'choice', say: 'Hangisi doğru?', en: 'Which one is correct?', hint: 'Sayıdan sonra tekil: üç kalem',
        options: [{ tr: 'Üç kalemler var.', en: '', wrong: true }, { tr: 'Üç kalem var.', en: '' }, { tr: 'Kalem üç var.', en: '', wrong: true }] },
    ],
    intro: { say: 'Aferin! Şimdi soru-cevap zamanı.', en: 'Well done! Now it’s question-and-answer time.' },
    questions: [
      { q: 'kaç yaşındasın?', en: 'how old are you?', hint: 'On yaşındayım.',
        expect: ['On yaşındayım', 'Dokuz yaşındayım', 'On bir yaşındayım'], keywords: ['yaşındayım'],
        botAnswers: ['On yaşındayım.', 'Dokuz yaşındayım.'], botWrong: ['On yaş.', 'Yaşım on bir mi?'] },
      { q: 'iki artı üç kaç eder?', en: 'what is two plus three?', hint: 'beş = five',
        expect: ['Beş', 'Beş eder'], keywords: ['beş'],
        botAnswers: ['Beş eder.', 'Beş!'], botWrong: ['Altı!', 'Dört.'] },
      { q: 'bir elde kaç parmak var?', en: 'how many fingers are there on one hand?', hint: 'Beş parmak var.',
        expect: ['Beş parmak var', 'Beş'], keywords: ['beş'],
        botAnswers: ['Beş parmak var.', 'Beş.'], botWrong: ['On parmak var.', 'Üç.'] },
      { q: 'sınıfta kaç öğrenci var?', en: 'how many students are there in the class?', hint: 'Dört öğrenci var.',
        expect: ['Dört öğrenci var', 'Dört'], keywords: ['dört'],
        botAnswers: ['Dört öğrenci var.', 'Dört!'], botWrong: ['On öğrenci var.', 'İki.'] },
    ],
  },

  l3: {
    id: 'l3', level: 'A1.2', cost: 1,
    title: 'Sınıfım: Bu ne? Nerede?', titleEn: 'My classroom: What is this? Where is it?',
    goals: [['Sınıf eşyalarını tanımak', 'Naming classroom objects'], ['“Bu ne?” diye sormak', 'Asking “What is this?”'], ['Yer söylemek: -da / -de', 'Saying where: -da / -de']],
    teach: [
      { board: ['Bu ne?', '— Bu bir kalem.', '— Bu bir kitap.'], say: 'Bugün sınıfımızdaki eşyaları öğreneceğiz. Bu ne? Bu bir kalem. Bu bir kitap.', en: 'Today we will learn the things in our classroom. What is this? This is a pencil. This is a book.',
        words: [['bu', 'this'], ['ne?', 'what?'], ['kalem', 'pencil'], ['kitap', 'book']] },
      { board: ['defter   masa   sandalye', 'tahta   çanta'], say: 'Bu defter. Bu masa. Bu sandalye. Bu tahta. Bu da çanta.', en: 'This is a notebook. This is a desk. This is a chair. This is the board. And this is a bag.',
        words: [['defter', 'notebook'], ['masa', 'desk / table'], ['sandalye', 'chair'], ['tahta', 'board'], ['çanta', 'bag']] },
      { repeat: true, board: ['Bu bir kalem.'], say: 'Sen söyle: Bu bir kalem.', en: 'You say it: This is a pencil.', expect: ['Bu bir kalem'] },
      { board: ['masa → masada', 'çanta → çantada', 'sınıf → sınıfta'], say: 'Bir şeyin nerede olduğunu “-da, -de” ile söyleriz. Kitap masada. Kalem çantada. Biz sınıftayız.', en: 'We say where something is with “-da, -de”. The book is on the desk. The pencil is in the bag. We are in the classroom.',
        words: [['nerede?', 'where?'], ['masada', 'on the desk'], ['çantada', 'in the bag']] },
      { repeat: true, board: ['Kitap nerede?', '— Kitap masada.'], say: 'Kitap nerede? Sen cevap ver: Kitap masada.', en: 'Where is the book? You answer: The book is on the desk.', expect: ['Kitap masada'] },
      { board: ['Çantamda kitap var.', 'Çantamda top yok.'], say: 'Bir şey varsa “var”, yoksa “yok” deriz. Çantamda kitap var. Çantamda top yok.', en: 'If something is there we say “var”, if not “yok”. There is a book in my bag. There is no ball in my bag.',
        words: [['var', 'there is'], ['yok', 'there is not']] },
    ],
    practice: [
      { activity: 'choice', say: 'Bu ne? ✏️', en: 'What is this? ✏️', hint: 'kalem = pencil',
        options: [{ tr: 'Bu bir kitap.', en: '', wrong: true }, { tr: 'Bu bir kalem.', en: '' }, { tr: 'Bu bir masa.', en: '', wrong: true }] },
      { activity: 'listen', say: 'Kalem çantada.', en: 'The pencil is in the bag.', speaker: 'ogretmen', prompt: 'Ne duydun?',
        options: [{ tr: 'Kalem çantada.', en: '' }, { tr: 'Kalem masada.', en: '', wrong: true }, { tr: 'Kitap çantada.', en: '', wrong: true }] },
      { activity: 'order', say: 'Cümleyi kur.', en: 'Build the sentence.', answer: 'Defter masada.', answerEn: 'The notebook is on the desk.' },
      { activity: 'choice', say: 'Boşluğu doldur: “Biz sınıf___ız.”', en: 'Fill the gap: “We are in the classroom.”', hint: 'sınıf → sınıfta (f sert ünsüz: -ta)',
        options: [{ tr: 'ta', en: '' }, { tr: 'da', en: '', wrong: true }, { tr: 'de', en: '', wrong: true }] },
    ],
    intro: { say: 'Çok iyi! Şimdi sorularım var.', en: 'Very good! Now I have some questions.' },
    questions: [
      { q: 'bu ne? (kalemi gösteriyor)', en: 'what is this? (she points at a pencil)', hint: 'Bu bir kalem.',
        expect: ['Bu bir kalem', 'Kalem'], keywords: ['kalem'],
        botAnswers: ['Bu bir kalem.', 'Kalem!'], botWrong: ['Bu bir kitap.', 'Masa.'] },
      { q: 'kitap nerede?', en: 'where is the book?', hint: 'Kitap masada.',
        expect: ['Kitap masada', 'Masada'], keywords: ['masada', 'çantada'],
        botAnswers: ['Kitap masada.', 'Masada.'], botWrong: ['Kitap nerede?', 'Bahçe.'] },
      { q: 'çantanda ne var?', en: 'what is in your bag?', hint: 'Çantamda kitap var.',
        expect: ['Çantamda kitap var', 'Kitap var'], keywords: ['var'],
        botAnswers: ['Çantamda kitap var.', 'Çantamda defter ve kalem var.'], botWrong: ['Çanta.', 'Kitap yok mu?'] },
      { q: 'tahta ne renk?', en: 'what colour is the board?', hint: 'Tahta yeşil.',
        expect: ['Tahta yeşil', 'Yeşil'], keywords: ['yeşil'],
        botAnswers: ['Tahta yeşil.', 'Yeşil!'], botWrong: ['Kırmızı.', 'Mavi.'] },
    ],
  },

  l4: {
    id: 'l4', level: 'A1.2', cost: 1,
    title: 'Günler ve saat', titleEn: 'Days and time',
    goals: [['Haftanın günleri', 'The days of the week'], ['Saati sormak ve söylemek', 'Asking and telling the time'], ['var / yok ile plan', 'Plans with var / yok']],
    teach: [
      { board: ['Pazartesi  Salı  Çarşamba', 'Perşembe  Cuma', 'Cumartesi  Pazar'], say: 'Haftada yedi gün var: Pazartesi, Salı, Çarşamba, Perşembe, Cuma, Cumartesi, Pazar.', en: 'There are seven days in a week: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday.',
        words: [['hafta', 'week'], ['gün', 'day'], ['Pazartesi', 'Monday'], ['Cuma', 'Friday'], ['Pazar', 'Sunday']] },
      { repeat: true, board: ['Pazartesi, Salı, Çarşamba'], say: 'Tekrar edin: Pazartesi, Salı, Çarşamba.', en: 'Repeat: Monday, Tuesday, Wednesday.', expect: ['Pazartesi Salı Çarşamba'] },
      { board: ['Bugün günlerden ne?', '— Bugün Cuma.', 'Yarın Cumartesi.'], say: 'Günü böyle sorarız: Bugün günlerden ne? Bugün Cuma. Yarın Cumartesi.', en: 'We ask for the day like this: What day is it today? Today is Friday. Tomorrow is Saturday.',
        words: [['bugün', 'today'], ['yarın', 'tomorrow'], ['dün', 'yesterday']] },
      { board: ['Saat kaç?', '— Saat dokuz.', '— Saat on buçuk.'], say: 'Saati sorarız: Saat kaç? Saat dokuz. Yarım saat için “buçuk” deriz: saat on buçuk.', en: 'We ask the time: What time is it? It is nine o’clock. For half past we say “buçuk”: half past ten.',
        words: [['saat kaç?', 'what time is it?'], ['buçuk', 'half past']] },
      { repeat: true, board: ['Saat dokuz.'], say: 'Sen söyle: Saat dokuz.', en: 'You say it: It is nine o’clock.', expect: ['Saat dokuz'] },
      { board: ['Cumartesi okul var mı?', '— Hayır, okul yok.', 'Hafta sonu = Cumartesi + Pazar'], say: 'Cumartesi okul var mı? Hayır, okul yok. Cumartesi ve Pazar hafta sonu.', en: 'Is there school on Saturday? No, there is no school. Saturday and Sunday are the weekend.',
        words: [['hafta sonu', 'weekend'], ['var mı?', 'is there?']] },
    ],
    practice: [
      { activity: 'choice', say: 'Pazartesiden sonra hangi gün gelir?', en: 'Which day comes after Monday?', hint: 'Pazartesi, Salı, Çarşamba…',
        options: [{ tr: 'Salı.', en: '' }, { tr: 'Pazar.', en: '', wrong: true }, { tr: 'Cuma.', en: '', wrong: true }] },
      { activity: 'listen', say: 'Saat on buçuk.', en: 'It is half past ten.', speaker: 'ogretmen', prompt: 'Saat kaç?',
        options: [{ tr: 'Saat on.', en: '', wrong: true }, { tr: 'Saat on buçuk.', en: '' }, { tr: 'Saat dokuz buçuk.', en: '', wrong: true }] },
      { activity: 'order', say: 'Cümleyi kur.', en: 'Build the sentence.', answer: 'Cumartesi okul yok.', answerEn: 'There is no school on Saturday.' },
      { activity: 'choice', say: 'Hafta sonu hangi günler?', en: 'Which days are the weekend?', hint: 'hafta sonu = weekend',
        options: [{ tr: 'Pazartesi ve Salı.', en: '', wrong: true }, { tr: 'Cumartesi ve Pazar.', en: '' }, { tr: 'Çarşamba ve Cuma.', en: '', wrong: true }] },
    ],
    intro: { say: 'Harika! Şimdi sırayla soruyorum.', en: 'Great! Now I am asking in turn.' },
    questions: [
      { q: 'bugün günlerden ne?', en: 'what day is it today?', hint: 'Bugün Cuma.',
        expect: ['Bugün Cuma', 'Cuma'], keywords: ['pazartesi', 'salı', 'çarşamba', 'perşembe', 'cuma', 'cumartesi', 'pazar'],
        botAnswers: ['Bugün Cuma.', 'Cuma!'], botWrong: ['Bugün saat dokuz.', 'Yarın.'] },
      { q: 'saat kaç?', en: 'what time is it?', hint: 'Saat dokuz.',
        expect: ['Saat dokuz', 'Dokuz'], keywords: ['saat'],
        botAnswers: ['Saat dokuz.', 'Saat dokuz buçuk.'], botWrong: ['Bugün Cuma.', 'Dokuz gün.'] },
      { q: 'cumartesi okul var mı?', en: 'is there school on Saturday?', hint: 'Hayır, okul yok.',
        expect: ['Hayır okul yok', 'Cumartesi okul yok'], keywords: ['yok'],
        botAnswers: ['Hayır, okul yok.', 'Cumartesi okul yok.'], botWrong: ['Evet, okul var.', 'Evet.'] },
      { q: 'yarın hangi gün?', en: 'what day is tomorrow?', hint: 'Yarın Cumartesi.',
        expect: ['Yarın Cumartesi', 'Cumartesi'], keywords: ['pazartesi', 'salı', 'çarşamba', 'perşembe', 'cuma', 'cumartesi', 'pazar'],
        botAnswers: ['Yarın Cumartesi.', 'Cumartesi!'], botWrong: ['Dün Perşembe.', 'Saat on.'] },
    ],
  },
};

/** Exactly three classmates + the player = four students per classroom. */
export const CLASSMATE_BOTS = [
  { id: 'elif', name: 'Elif', skill: 0.8, seat: 'seat3' },
  { id: 'can', name: 'Can', skill: 0.55, seat: 'seat5' },
  { id: 'zehra', name: 'Zehra', skill: 0.65, seat: 'seat2' },
];
