import { man, GIRL, kidFace } from '../characters.js';
/**
 * More days with the friends and the family:
 *   Monday (day 2) after school: Elif and Can call you to the library on the square and you read
 *     together; Kerem and Defne, two children who read there every day, sit in its corner.
 *   Wednesday evening (day 4): dad sends you to Yusuf Hoca at the mosque with a question (when the
 *     night prayer is called tomorrow: Thursday's chapter, 19:45).
 *   A second week (days 9–11): school every morning with a new lesson (content/lessons.js l5 family,
 *     l6 food, l7 sports), and in the afternoon a match on the square's pitch, a first ride on the
 *     horses with Hamdi the groom (free), and İsmail Dede at the chess board, where grandpa sends you
 *     to settle the score for him.
 * The quests the systems finish set their flags only while that quest is on (main.js: the goal, the
 * library pages, the chess game; systems/Animals.js: the ride).
 */
const HOME = {
  anne: ['house', 'kitchen', 'cook'],
  baba: ['house', 'sedirL', 'sitBench'],
  dede: ['house', 'sedirR', 'sitBench'],
  bakkal: ['village', 'bakkal', 'stand'],
};
const SCHOOL = {
  anne: null, baba: null, dede: null,
  ogretmen: ['classroom', 'teacher', 'teach'],
  elif: ['schoolyard', 'elif', 'stand'],
  can: ['schoolyard', 'can', 'stand'],
  zehra: ['schoolyard', 'zehra', 'stand'],
  bakkal: ['village', 'bakkal', 'stand'],
};
/** A school morning of the second week: a friend at the gate, the lesson, home. */
const schoolDay = (n, day, dayName, num, title, text, en, friend) => ({
  id: `d${day}-school`, day, time: '08:40', location: 'schoolyard', spawn: 'gate', lessonId: `l${n}`,
  cast: { ...SCHOOL },
  intro: { num: `${dayName} · Bölüm ${num}`, title, text, en },
  quests: [
    { ...friend },
    { id: `lesson-${n}`, title: 'Ders', obj: 'Sınıfa gir ve derse katıl', en: 'Enter the classroom and join the lesson', target: { hotspot: 'school.door' }, complete: { flag: `lesson-l${n}` }, minutes: 45 },
    { id: `go-home-${n}`, title: 'Okul bitti', obj: 'Okul bahçesinden çık', en: 'Leave the schoolyard', target: { hotspot: 'school.exit' } },
  ],
});
/** Library regulars: in their corner in the daytime (not at night). */
const daytime = (spot) => (ch) => { const h = Number(ch.time.split(':')[0]); return h >= 9 && h < 19 ? spot : null; };

export default {
  id: 'gunler',
  npcs: {
    kerem: {
      name: 'Kerem', short: 'Kerem', role: 'kütüphanede okuyan çocuk · a boy who reads at the library',
      look: { shirt: 0x27AE60, pants: 0x4A4F5A, skin: 0xE9B98F, hair: 0x3B2416, scale: 0.78 },
      face: kidFace('#BFE3C6', '#E9B98F', '#3B2416'),
    },
    defne: {
      name: 'Defne', short: 'Defne', role: 'kütüphanede okuyan kız · a girl who reads at the library',
      look: { shirt: 0x9B59B6, skirt: 0x34495E, pants: 0x34495E, skin: 0xF2C49B, hair: 0x5B3A29, bun: true, scale: 0.75 },
      face: kidFace('#E8D3F2', '#F2C49B', '#5B3A29'),
    },
  },
  voices: { kerem: man('Puck'), defne: GIRL },
  castAll: {
    kerem: daytime(['village', 'libKid1', 'sitBench']),
    defne: daytime(['village', 'libKid2', 'sitBench']),
  },

  chapters: [
    {
      after: 'd2-school',
      chapter: {
        id: 'd2-library', day: 2, time: '15:30', location: 'village', spawn: 'schoolRoad',
        cast: {
          ...HOME,
          ogretmen: null, zehra: null,
          elif: ['village', 'kitap3', 'sitBench'],
          can: ['village', 'kitap2', 'sitBench'],
        },
        intro: {
          num: 'Pazartesi · Bölüm 9', title: 'Kütüphanede',
          text: 'Okul çıkışı Elif seni çağırdı: “Kütüphaneye gidelim, beraber kitap okuyalım!” Can da geliyor. Kütüphane köy meydanında.',
          en: 'After school Elif called you: “Let’s go to the library and read together!” Can is coming too. The library is on the village square.',
        },
        quests: [
          { id: 'lib-elif', title: 'Kütüphane', obj: 'Kütüphanede Elif ile konuş', en: 'Talk to Elif at the library', target: { npc: 'elif' }, minutes: 5 },
          { id: 'lib-read', title: 'Beraber okuyalım', obj: 'Elif’in yanındaki tabureye otur ve kitap oku', en: 'Sit on the stool next to Elif and read a book', target: { hotspot: 'village.kitap4' }, complete: { flag: 'lib-read-together' }, minutes: 40 },
          { id: 'lib-can', title: 'Kitap sohbeti', obj: 'Can ile okuduğun kitabı konuş', en: 'Talk with Can about the book you read', target: { npc: 'can' }, after: ['chapter'], minutes: 10 },
        ],
      },
    },
    {
      after: 'd4-home',
      chapter: {
        id: 'd4-imam', day: 4, time: '19:00', location: 'house', spawn: 'door',
        cast: { ...HOME, ogretmen: null, elif: null, can: null, zehra: null },
        intro: {
          num: 'Çarşamba · Bölüm 18', title: 'Hocaya bir soru',
          text: 'Akşam oldu. Babanın aklında bir soru var ve cevabını camideki Yusuf Hoca biliyor.',
          en: 'It is evening. Dad has a question on his mind, and Yusuf Hoca at the mosque knows the answer.',
        },
        quests: [
          { id: 'imam-baba', title: 'Babanın sorusu', obj: 'Babanla konuş', en: 'Talk to dad', target: { npc: 'baba' }, minutes: 5 },
          { id: 'imam-ask', title: 'Hocaya soru', obj: 'Meydandaki camiye git, Yusuf Hoca’ya babanın sorusunu sor', en: 'Go to the mosque on the square and ask Yusuf Hoca dad’s question', target: { npc: 'imam' }, minutes: 20 },
          { id: 'imam-back', title: 'Cevap', obj: 'Eve dön, cevabı babana söyle', en: 'Go home and tell dad the answer', target: { npc: 'baba' }, after: ['chapter'], minutes: 10 },
        ],
      },
    },
    // the second week: d7-afternoon (Sunday) is the last chapter of the first one
    {
      after: 'd7-afternoon',
      chapter: schoolDay(5, 9, 'Pazartesi', 27, 'Yeni hafta, yeni ders',
        'Yeni bir hafta başladı! Bugün derste aileni anlatmayı öğreneceksin: annem, babam, kardeşim…',
        'A new week has begun! Today in class you will learn to talk about your family: my mother, my father, my sibling…',
        { id: 'w2-can', title: 'Can’ın daveti', obj: 'Can ile konuş', en: 'Talk to Can', target: { npc: 'can' }, minutes: 5 }),
    },
    {
      after: 'd9-school',
      chapter: {
        id: 'd9-match', day: 9, time: '16:00', location: 'village', spawn: 'schoolRoad',
        cast: {
          ...HOME, ogretmen: null,
          can: ['village', 'kickoff', 'stand'],
          elif: ['village', 'pitchElif', 'stand'],
          zehra: ['village', 'pitchZehra', 'stand'],
        },
        intro: {
          num: 'Pazartesi · Bölüm 28', title: 'Halı sahada maç',
          text: 'Okuldan sonra arkadaşların meydandaki halı sahada. Can seni takımına çağırıyor: maç zamanı!',
          en: 'After school your friends are at the pitch on the square. Can is calling you to his team: match time!',
        },
        quests: [
          { id: 'hs-can', title: 'Takım', obj: 'Halı sahada Can ile konuş', en: 'Talk to Can on the pitch', target: { npc: 'can' }, minutes: 5 },
          { id: 'hs-goal', title: 'Gol at!', obj: 'Topa vur, kaleye bir gol at', en: 'Kick the ball and score a goal', target: { npc: 'can' }, complete: { flag: 'hs-goal-scored' }, minutes: 40 },
          { id: 'hs-end', title: 'Maç bitti', obj: 'Hakem Zehra ile konuş', en: 'Talk to Zehra, the referee', target: { npc: 'zehra' }, after: ['chapter'], minutes: 10 },
        ],
      },
    },
    {
      after: 'd9-match',
      chapter: schoolDay(6, 10, 'Salı', 29, 'Ne istersin?',
        'Salı sabahı. Bugün derste yiyecekleri ve bir şey istemeyi öğreneceksin: “Su istiyorum, lütfen.”',
        'Tuesday morning. Today in class you will learn food, and how to ask for things: “I want water, please.”',
        { id: 'w2-elif', title: 'Elif’in sürprizi', obj: 'Elif ile konuş', en: 'Talk to Elif', target: { npc: 'elif' }, minutes: 5 }),
    },
    {
      after: 'd10-school',
      chapter: {
        id: 'd10-ride', day: 10, time: '16:00', location: 'village', spawn: 'schoolRoad',
        cast: { ...HOME, ogretmen: null, can: null, zehra: null, elif: ['village', 'stableElif', 'stand'] },
        intro: {
          num: 'Salı · Bölüm 30', title: 'Atlara binelim',
          text: 'Elif atların yanında seni bekliyor. Seyis Hamdi Amca bugün size ata binmeyi öğretecek!',
          en: 'Elif is waiting for you by the horses. Hamdi the groom is going to teach you to ride today!',
        },
        quests: [
          { id: 'at-elif', title: 'Atların yanında', obj: 'Atların yanında Elif ile konuş', en: 'Talk to Elif by the horses', target: { npc: 'elif' }, minutes: 5 },
          { id: 'at-seyis', title: 'Seyisin kuralı', obj: 'Seyis Hamdi Amca ile konuş', en: 'Talk to Hamdi the groom', target: { npc: 'seyis' }, minutes: 10 },
          { id: 'at-bin', title: 'Ata bin!', obj: 'Bir atın yanına git ve ata bin (bu biniş hediye)', en: 'Go to a horse and ride it (this ride is a gift)', target: { npc: 'seyis' }, complete: { flag: 'at-bin-ridden' }, minutes: 30 },
          { id: 'at-end', title: 'Ne güzeldi!', obj: 'Attan in, Elif ile konuş', en: 'Get off the horse and talk to Elif', target: { npc: 'elif' }, after: ['chapter'], minutes: 10 },
        ],
      },
    },
    {
      after: 'd10-ride',
      chapter: schoolDay(7, 11, 'Çarşamba', 31, 'Sporlar ve oyunlar',
        'Çarşamba sabahı. Bugün derste sporları ve sevdiğin şeyleri anlatmayı öğreneceksin: “Futbol oynamayı severim.”',
        'Wednesday morning. Today in class you will learn sports, and to say what you like doing: “I like playing football.”',
        { id: 'w2-zehra', title: 'Zehra’nın sorusu', obj: 'Zehra ile konuş', en: 'Talk to Zehra', target: { npc: 'zehra' }, minutes: 5 }),
    },
    {
      after: 'd11-school',
      chapter: {
        id: 'd11-chess', day: 11, time: '16:30', location: 'yard', spawn: 'houseDoor',
        cast: {
          anne: ['yard', 'laundry', 'laundry'],
          baba: ['house', 'sedirL', 'sitBench'],
          dede: ['yard', 'pergolaSeat', 'sitBench'],
          ogretmen: null, elif: null, can: null, zehra: null,
          bakkal: ['village', 'bakkal', 'stand'],
        },
        intro: {
          num: 'Çarşamba · Bölüm 32', title: 'Satrançta rövanş',
          text: 'Okuldan döndün. Dede asmanın altında, biraz dalgın. Meydandaki eski dostu İsmail Dede onu satrançta yenmiş…',
          en: 'You are back from school. Grandpa is under the vine, a little lost in thought. His old friend İsmail Dede on the square beat him at chess…',
        },
        quests: [
          { id: 'chess-dede', title: 'Dedenin derdi', obj: 'Dedenle konuş', en: 'Talk to grandpa', target: { npc: 'dede' }, minutes: 10 },
          { id: 'chess-play', title: 'Rövanş', obj: 'Meydana git, İsmail Dede ile bir oyun satranç oyna', en: 'Go to the square and play a game of chess with İsmail Dede', target: { npc: 'ismail' }, complete: { flag: 'chess-dede-played' }, minutes: 45 },
          { id: 'chess-back', title: 'Haberi götür', obj: 'Eve dön, maçı dedene anlat', en: 'Go home and tell grandpa about the game', target: { npc: 'dede' }, after: ['chapter'], minutes: 10 },
        ],
      },
    },
  ],

  dialogues: {
    elif: {
      start: (ctx) => {
        const q = { 'lib-elif': 'libCall', 'lib-read': 'libShh', 'w2-elif': 'w2e1', 'at-elif': 'atCall', 'at-seyis': 'atWait', 'at-bin': 'atWait', 'at-end': 'atEnd' }[ctx.q];
        if (q) return q;
        if (ctx.chapter === 'd2-library') return 'libShh';
        if (ctx.chapter === 'd9-match') return 'hsKeeper';
        return undefined;
      },
      nodes: {
        libCall: { say: 'Geldin! Burası köyün kütüphanesi. Can de burada. Gel, beraber kitap okuyalım!', en: 'You came! This is the village library. Can is here too. Come, let’s read together!',
          words: [['kütüphane', 'library'], ['beraber', 'together'], ['kitap okumak', 'to read a book']],
          options: [{ tr: 'Çok güzel fikir!', en: 'Great idea!', next: 'libQuiet' }] },
        libQuiet: { say: 'Ama kütüphanede sessiz olmalıyız. Yavaş konuş, tamam mı? Yanımdaki tabureye otur.', en: 'But we must be quiet in the library. Speak softly, okay? Sit on the stool next to me.',
          words: [['sessiz', 'quiet'], ['yavaş', 'slowly; softly'], ['tabure', 'stool']],
          options: [{ tr: 'Tamam, sessiz olurum.', en: 'Okay, I’ll be quiet.', do: ['quest'] }] },
        libShh: { say: 'Şşş! Yanıma otur, kitabını oku.', en: 'Shh! Sit next to me and read your book.', options: [{ tr: 'Tamam.', en: 'Okay.' }] },
        hsKeeper: { say: 'Ben kaleciyim, kolay kolay gol yemem!', en: 'I’m the goalkeeper, I don’t let goals in easily!', words: [['kaleci', 'goalkeeper'], ['gol yemek', 'to let in a goal']],
          options: [{ tr: 'Göreceğiz!', en: 'We’ll see!' }] },
        w2e1: { say: 'Günaydın! Sana bir sürprizim var: okuldan sonra Hamdi Amca bize atlara binmeyi öğretecek!', en: 'Good morning! I have a surprise for you: after school Uncle Hamdi is going to teach us to ride the horses!',
          words: [['sürpriz', 'surprise'], ['öğretmek', 'to teach'], ['okuldan sonra', 'after school']],
          options: [{ tr: 'Gerçekten mi? Çok sevindim!', en: 'Really? I’m so happy!', next: 'w2e2' }] },
        w2e2: { say: 'Ama önce ders var. Bugün yiyecekleri öğreneceğiz. Ben çok acıktım bile!', en: 'But first there is the lesson. Today we will learn food. I’m already very hungry!',
          words: [['acıkmak', 'to get hungry'], ['bile', 'already; even']],
          options: [{ tr: 'Hadi sınıfa gidelim!', en: 'Let’s go to class!', do: ['quest'] }] },
        atCall: { say: 'Geldin! Bak, ne güzel atlar! Hamdi Amca bizi bekliyor.', en: 'You came! Look, what lovely horses! Uncle Hamdi is waiting for us.',
          words: [['at', 'horse'], ['beklemek', 'to wait']],
          options: [{ tr: 'Hadi gidelim!', en: 'Let’s go!', do: ['quest'] }] },
        atWait: { say: 'Hamdi Amca’yı dinle, sonra sen bin. Ben seni izleyeceğim!', en: 'Listen to Uncle Hamdi, then you ride. I’ll watch you!', options: [{ tr: 'Tamam!', en: 'Okay!' }] },
        atEnd: { say: 'Çok güzel bindin! Hamdi Amca atın adının Yıldız olduğunu söyledi. Şimdi sıra bende!', en: 'You rode so well! Uncle Hamdi said the horse’s name is Yıldız (Star). Now it’s my turn!',
          words: [['yıldız', 'star'], ['sıra bende', 'it’s my turn']],
          options: [{ tr: 'Dizginleri sıkı tut!', en: 'Hold the reins tight!', do: ['quest'] }] },
      },
    },

    can: {
      start: (ctx) => {
        const q = { 'lib-elif': 'libShh', 'lib-read': 'libShh', 'lib-can': 'libCan', 'w2-can': 'w2c1', 'hs-can': 'hsCan', 'hs-goal': 'hsGo', 'hs-end': 'hsGo' }[ctx.q];
        return q ?? (ctx.chapter === 'd2-library' ? 'libShh' : undefined);
      },
      nodes: {
        libShh: { say: 'Şşş… Kitabımın en heyecanlı yerindeyim!', en: 'Shh… I’m at the most exciting part of my book!', words: [['heyecanlı', 'exciting']],
          options: [{ tr: 'Pardon!', en: 'Sorry!' }] },
        libCan: { say: 'Ben bir macera kitabı okuyorum. Sen ne okudun? Beğendin mi?', en: 'I’m reading an adventure book. What did you read? Did you like it?',
          words: [['macera', 'adventure'], ['beğenmek', 'to like']],
          options: [{ tr: 'Evet, çok beğendim!', en: 'Yes, I liked it a lot!', next: 'libCan2' }, { tr: 'Biraz zordu ama güzeldi.', en: 'It was a bit hard, but nice.', next: 'libCan2' }] },
        libCan2: { say: 'Her gün biraz okursak çok kelime öğreniriz. Yarın okulda görüşürüz!', en: 'If we read a little every day, we learn lots of words. See you at school tomorrow!',
          words: [['her gün', 'every day'], ['görüşürüz', 'see you']],
          options: [{ tr: 'Görüşürüz Can!', en: 'See you, Can!', do: ['quest'] }] },
        w2c1: { say: 'Günaydın! Bugün okuldan sonra meydandaki halı sahada maç yapıyoruz. Sen de gelsene!', en: 'Good morning! After school today we are playing a match on the pitch on the square. Why don’t you come too?',
          words: [['halı saha', 'artificial-grass pitch'], ['maç yapmak', 'to play a match']],
          options: [{ tr: 'Tabii gelirim!', en: 'Of course I’ll come!', next: 'w2c2' }, { tr: 'Ben iyi oynayamam ama gelirim.', en: 'I can’t play well, but I’ll come.', next: 'w2c2' }] },
        w2c2: { say: 'Harika! Şimdi derse gidelim. Bugün aileyi öğreneceğiz.', en: 'Great! Now let’s go to class. Today we will learn the family.',
          words: [['aile', 'family']],
          options: [{ tr: 'Hadi!', en: 'Come on!', do: ['quest'] }] },
        hsCan: { say: 'Geldin! Sen bizim takımdasın. Elif kaleci, Zehra da hakem.', en: 'You came! You are on our team. Elif is the goalkeeper, and Zehra is the referee.',
          words: [['takım', 'team'], ['kaleci', 'goalkeeper'], ['hakem', 'referee']],
          options: [{ tr: 'Kurallar ne?', en: 'What are the rules?', next: 'hsRules' }] },
        hsRules: { say: 'Çok kolay! Topa koş, kaleye doğru vur. Top kaleye girerse gol olur!', en: 'Very easy! Run to the ball and kick it towards the goal. If the ball goes into the goal, it’s a goal!',
          words: [['kale', 'goal (the frame)'], ['vurmak', 'to kick, to hit'], ['gol atmak', 'to score a goal']],
          options: [{ tr: 'Hadi oynayalım!', en: 'Let’s play!', do: ['quest'] }] },
        hsGo: { say: 'Topa koş ve kaleye vur! Bir gol at!', en: 'Run to the ball and kick it at the goal! Score a goal!', options: [{ tr: 'Tamam!', en: 'Okay!' }] },
      },
    },

    zehra: {
      start: (ctx) => ({ 'hs-can': 'hsRef', 'hs-goal': 'hsRef', 'hs-end': 'hsEnd', 'w2-zehra': 'w2z1' })[ctx.q],
      nodes: {
        hsRef: { say: 'Ben hakemim! Düdüğümü duyunca maç başlar.', en: 'I am the referee! When you hear my whistle, the match starts.', words: [['düdük', 'whistle']],
          options: [{ tr: 'Hazırım!', en: 'I’m ready!' }] },
        hsEnd: { say: 'Gooool! Harika vurdun! Ben hakemim ama yine de seni alkışlıyorum!', en: 'Goooal! Great shot! I’m the referee, but I’m clapping for you anyway!',
          words: [['alkışlamak', 'to clap'], ['yine de', 'anyway']],
          options: [{ tr: 'Teşekkürler! Çok eğlendim.', en: 'Thanks! I had a lot of fun.', next: 'hsEnd2' }] },
        hsEnd2: { say: 'Elif yarın sizi bir yere götürecekmiş. Bakalım nereye!', en: 'Elif is going to take you somewhere tomorrow. Let’s see where!',
          words: [['götürmek', 'to take (someone somewhere)']],
          options: [{ tr: 'Çok merak ettim!', en: 'I’m so curious!', do: ['quest'] }] },
        w2z1: { say: 'Günaydın! Ben yüzmeyi çok severim. Sen hangi sporu seversin?', en: 'Good morning! I love swimming. Which sport do you like?',
          words: [['yüzmek', 'to swim'], ['spor', 'sport']],
          options: [
            { tr: 'Ben futbol oynamayı severim.', en: 'I like playing football.', next: 'w2z2' },
            { tr: 'Ben ata binmeyi severim.', en: 'I like riding horses.', next: 'w2z2' },
            { tr: 'Ben satranç oynamayı severim.', en: 'I like playing chess.', next: 'w2z2' },
          ] },
        w2z2: { say: 'Ne güzel! Bugün derste sporları öğreneceğiz. Hadi sınıfa!', en: 'How nice! Today in class we will learn sports. Come on, to class!',
          options: [{ tr: 'Hadi gidelim!', en: 'Let’s go!', do: ['quest'] }] },
      },
    },

    baba: {
      start: (ctx) => ({ 'imam-baba': 'imB1', 'imam-ask': 'imWait', 'imam-back': 'imBack' })[ctx.q],
      nodes: {
        imB1: { say: 'Oğlum, gel bir dakika. Yarın akşam evde dedenle beraber yatsı namazı kılacağız. Vakitler her gün biraz değişiyor; yarın yatsı ezanı saat kaçta, en iyi Hoca bilir.', en: 'Son, come here a minute. Tomorrow evening we will pray the night prayer at home with grandpa. The prayer times change a little every day; the Hoca knows best when the call to the night prayer is tomorrow.',
          words: [['yatsı', 'the night prayer'], ['ezan', 'the call to prayer'], ['saat kaçta?', 'at what time?']],
          options: [{ tr: 'Ben sorarım baba!', en: 'I’ll ask, dad!', next: 'imB2' }] },
        imB2: { say: 'Aferin! Meydandaki camiye git, Yusuf Hoca’ya sor: “Yatsı ezanı saat kaçta?” Sonra gel, bana söyle.', en: 'Well done! Go to the mosque on the square and ask Yusuf Hoca: “What time is the call to the night prayer?” Then come and tell me.',
          words: [['sormak', 'to ask'], ['söylemek', 'to tell, to say']],
          options: [{ tr: 'Tamam baba, hemen gidiyorum.', en: 'Okay dad, I’m going right away.', do: ['quest'] }] },
        imWait: { say: 'Hocaya sordun mu? Yusuf Hoca caminin avlusunda dolaşıyor.', en: 'Did you ask the Hoca? Yusuf Hoca walks round the mosque’s courtyard.',
          options: [{ tr: 'Gidiyorum baba.', en: 'I’m going, dad.' }] },
        imBack: { say: 'Geldin mi? Hoca ne dedi, yatsı ezanı saat kaçta?', en: 'You’re back? What did the Hoca say, what time is the call to the night prayer?', hint: 'çeyrek = quarter',
          options: [
            { tr: 'Saat sekizde.', en: 'At eight o’clock.', wrong: true },
            { tr: 'Sekize çeyrek kala.', en: 'At a quarter to eight.', next: 'imB3' },
            { tr: 'Dokuzu çeyrek geçe.', en: 'At a quarter past nine.', wrong: true },
          ] },
        imB3: { say: 'Sekize çeyrek kala, tamam. Yarın akşam hep beraber kılarız. Hoca başka bir şey dedi mi?', en: 'A quarter to eight, okay. Tomorrow evening we will pray all together. Did the Hoca say anything else?',
          words: [['hep beraber', 'all together']],
          options: [{ tr: 'Sana selam söyledi, baba!', en: 'He sends you his greetings, dad!', next: 'imB4' }] },
        imB4: { say: 'Aleykümselam! Sağ ol oğlum, bugün çok işime yaradın.', en: 'And peace be upon him! Thank you, son, you were a great help today.',
          words: [['işe yaramak', 'to be useful, to help']],
          options: [{ tr: 'Rica ederim baba!', en: 'You’re welcome, dad!', do: ['quest'] }] },
      },
    },

    imam: {
      start: (ctx) => (ctx.q === 'imam-ask' ? 'imQ' : undefined),
      nodes: {
        imQ: { say: 'Hayırlı akşamlar evlat! Hoş geldin. Bana bir şey mi soracaktın?', en: 'Good evening, child! Welcome. Did you want to ask me something?',
          options: [{ tr: 'Hocam, babam soruyor: Yarın yatsı ezanı saat kaçta?', en: 'Hoca, my dad is asking: what time is the call to the night prayer tomorrow?', next: 'imA' }] },
        imA: { say: 'Güzel soru! Yarın akşam yatsı ezanı sekize çeyrek kala okunacak, yani yedi kırk beşte. Babana selam söyle!', en: 'A good question! Tomorrow evening the call to the night prayer will be at a quarter to eight, that is, at seven forty-five. Give my greetings to your dad!',
          words: [['çeyrek', 'quarter'], ['sekize çeyrek kala', 'at a quarter to eight'], ['selam söylemek', 'to pass on greetings']],
          options: [{ tr: 'Teşekkürler Hocam, söylerim!', en: 'Thank you, Hoca, I’ll tell him!', next: 'imA2' }] },
        imA2: { say: 'Bir şey daha: soru sormaktan hiç çekinme. Soru sormak, öğrenmenin yarısıdır.', en: 'One more thing: never be shy about asking. Asking is half of learning.',
          words: [['çekinmek', 'to be shy, to hesitate'], ['yarısı', 'half of it']],
          options: [{ tr: 'Unutmam Hocam!', en: 'I won’t forget, Hoca!', do: ['quest'] }] },
      },
    },

    seyis: {
      start: (ctx) => ({ 'at-elif': 'atHello', 'at-seyis': 'atGift', 'at-bin': 'atGo2' })[ctx.q],
      nodes: {
        atHello: { say: 'Hoş geldin evlat! Elif seni bekliyor, önce onunla konuş.', en: 'Welcome, child! Elif is waiting for you, talk to her first.', options: [{ tr: 'Tamam Hamdi Amca.', en: 'Okay, Uncle Hamdi.' }] },
        atGift: { say: 'Hoş geldiniz çocuklar! Bugünkü ilk binişiniz benden hediye. Önce kuralı söyleyeyim: ata arkasından yaklaşma, hep yanından git.', en: 'Welcome, children! Your first ride today is my gift. First the rule: don’t come up to a horse from behind, always go from the side.',
          words: [['hediye', 'gift'], ['yaklaşmak', 'to come near'], ['arkasından', 'from behind'], ['yanından', 'from the side']],
          options: [{ tr: 'Neden arkasından olmaz?', en: 'Why not from behind?', next: 'atWhy' }, { tr: 'Anladım, yanından giderim.', en: 'I see, I’ll go from the side.', next: 'atGo' }] },
        atWhy: { say: 'Çünkü at arkasını göremez. Korkar ve tekme atabilir.', en: 'Because a horse can’t see behind it. It gets scared and may kick.',
          words: [['korkmak', 'to be scared'], ['tekme atmak', 'to kick']],
          options: [{ tr: 'Tamam, dikkat ederim.', en: 'Okay, I’ll be careful.', next: 'atGo' }] },
        atGo: { say: 'Aferin! Şimdi bir atın yanına git ve “Ata bin” de. Dizginleri sıkı tut!', en: 'Well done! Now go next to a horse and choose “Ride”. Hold the reins tight!',
          words: [['dizgin', 'reins']],
          options: [{ tr: 'Hazırım!', en: 'I’m ready!', do: ['quest'] }] },
        atGo2: { say: 'Hadi, bir atın yanına git ve bin! Bu biniş benden.', en: 'Go on, go next to a horse and ride it! This ride is on me.', options: [{ tr: 'Gidiyorum!', en: 'I’m going!' }] },
      },
    },

    dede: {
      start: (ctx) => {
        if (ctx.q === 'chess-dede') return 'satB1';
        if (ctx.q === 'chess-play') return 'satWait';
        if (ctx.q === 'chess-back') return ctx.flag('chess-dede-won') ? 'satWin' : ctx.flag('chess-dede-draw') ? 'satDraw' : 'satLose';
        return undefined;
      },
      nodes: {
        satB1: { say: 'Gel evladım, otur şöyle. Geçen hafta İsmail’le satranç oynadık… ve beni yendi!', en: 'Come, my child, sit here. Last week İsmail and I played chess… and he beat me!',
          words: [['yenmek', 'to beat (in a game)'], ['geçen hafta', 'last week']],
          options: [{ tr: 'Olsun dede, oyun bu!', en: 'Never mind, grandpa, it’s only a game!', next: 'satB2' }] },
        satB2: { say: 'Olsun ama bütün meydana anlatıyor! (güler) Hadi git, benim yerime onunla bir oyun oyna. Hesabını sor!', en: 'Fine, but he is telling the whole square! (laughs) Go on, play a game with him in my place. Settle the score!',
          words: [['hesap sormak', 'to settle the score (lit. to ask for the account)'], ['benim yerime', 'in my place']],
          options: [{ tr: 'Merak etme dede, onu yeneceğim!', en: 'Don’t worry, grandpa, I’ll beat him!', next: 'satB3' }] },
        satB3: { say: 'İşte benim torunum! Ama unutma: kazanmak da kaybetmek de oyunun parçası. Önemli olan güzel oynamak.', en: 'That’s my grandchild! But remember: winning and losing are both part of the game. What matters is playing well.',
          words: [['torun', 'grandchild'], ['kazanmak', 'to win'], ['kaybetmek', 'to lose']],
          options: [{ tr: 'Tamam dede!', en: 'Okay, grandpa!', do: ['quest'] }] },
        satWait: { say: 'İsmail meydanda, satranç tahtasının yanında oturur. Haydi bakalım!', en: 'İsmail sits by the chess board on the square. Off you go!',
          options: [{ tr: 'Gidiyorum dede.', en: 'I’m going, grandpa.' }] },
        satWin: { say: 'Ne? İsmail’i yendin mi? Helal olsun evladım! Bu akşam bütün meydana ben anlatacağım! (güler)', en: 'What? You beat İsmail? Well done, my child! This evening I will tell the whole square! (laughs)',
          words: [['helal olsun', 'well done (lit. may it be rightfully yours)']],
          options: [{ tr: 'Sen öğrettin dede!', en: 'You taught me, grandpa!', do: ['quest'] }] },
        satDraw: { say: 'Berabere mi? Fena değil! İsmail’e karşı berabere kalmak da büyük iş.', en: 'A draw? Not bad! A draw against İsmail is a big thing too.',
          words: [['berabere kalmak', 'to draw (a game)'], ['fena değil', 'not bad']],
          options: [{ tr: 'Bir dahaki sefere kazanacağım!', en: 'Next time I’ll win!', do: ['quest'] }] },
        satLose: { say: 'Kaybettin mi? Olsun evladım, ben de kaybettim. İsmail çok usta. Bir dahaki sefere beraber çalışırız.', en: 'You lost? Never mind, my child, I lost too. İsmail is a real master. Next time we will practise together.',
          words: [['usta', 'master, skilled'], ['bir dahaki sefere', 'next time'], ['çalışmak', 'to practise, to work']],
          options: [{ tr: 'Tamam dede, beraber çalışalım!', en: 'Okay, grandpa, let’s practise together!', do: ['quest'] }] },
      },
    },

    // İsmail Dede: the rematch while no game of mine is on (a game on: his usual lines, satranc.js)
    ismail: {
      start: (ctx) => (ctx.q === 'chess-play' && !ctx.chess?.me?.color ? 'revans' : undefined),
      nodes: {
        revans: { say: 'Hah! Hüseyin’in torunu! Dedenin yerine rövanş almaya mı geldin? Otur bakalım!', en: 'Ha! Hüseyin’s grandchild! Have you come for a rematch in your grandpa’s place? Sit down, then!',
          words: [['rövanş', 'rematch'], ['torun', 'grandchild']],
          options: [{ tr: 'Evet, seninle oynamak istiyorum!', en: 'Yes, I want to play with you!', next: 'clockDede' }, { tr: 'Biraz sonra gelirim.', en: 'I’ll come a bit later.' }] },
      },
    },

    kerem: { start: () => 'k1', nodes: {
      k1: { say: 'Merhaba! Ben Kerem. Her gün okuldan sonra buraya gelip kitap okurum. En sevdiğim kitap Nasreddin Hoca’nın fıkraları.', en: 'Hi! I’m Kerem. Every day after school I come here and read. My favourite book is the jokes of Nasreddin Hoca.',
        words: [['fıkra', 'a short funny story'], ['en sevdiğim', 'my favourite']],
        options: [{ tr: 'Ben de onları severim!', en: 'I like them too!', next: 'k2' }, { tr: 'Ben onu okumadım.', en: 'I haven’t read it.', next: 'k2' }] },
      k2: { say: 'Bir tanesini anlatayım mı? Hoca bir gün eşeğine ters binmiş. “Neden ters bindin?” demişler. “Ben ters binmedim, eşek ters duruyor!” demiş.', en: 'Shall I tell you one? One day the Hoca sat on his donkey backwards. “Why are you sitting backwards?” they asked. “I’m not sitting backwards, the donkey is standing the wrong way!” he said.',
        words: [['eşek', 'donkey'], ['ters', 'backwards, the wrong way']],
        options: [{ tr: 'Hahaha, çok komik!', en: 'Hahaha, very funny!' }] },
    } },
    defne: { start: () => 'f1', nodes: {
      f1: { say: 'Selam! Ben Defne. Şu an bir şiir kitabı okuyorum. Şiir sever misin?', en: 'Hi! I’m Defne. Right now I’m reading a book of poems. Do you like poems?',
        words: [['şiir', 'poem']],
        options: [{ tr: 'Evet, severim.', en: 'Yes, I do.', next: 'f2' }, { tr: 'Pek bilmiyorum.', en: 'I don’t really know.', next: 'f2' }] },
      f2: { say: 'Benim en sevdiğim satır şu: “Kitaplar bize kanat olur.” Güzel, değil mi?', en: 'My favourite line is this one: “Books become wings for us.” Lovely, isn’t it?',
        words: [['satır', 'line (of text)'], ['kanat', 'wing']],
        options: [{ tr: 'Çok güzel!', en: 'Very lovely!' }] },
    } },
  },
};
