import { man, M2, GIRL, kidFace } from '../characters.js';

/**
 * The children's park in the village square (world/locations/VillageSquare.js PARK), where a new
 * game starts: Defne and Ayşe on the swings, Emre and Mert playing tag round the park. They are
 * there in the daytime — all day at the weekend, after school on school days — and talk like
 * children: who they are, what they play, the park's words.
 */
const pigtails = (hair) => `<circle cx="15" cy="35" r="6" fill="${hair}"/><circle cx="49" cy="35" r="6" fill="${hair}"/>`;

/** Round the open middle of the park; the second runner starts half-way round (he chases the first). */
const TAG = [
  { x: -38, z: 19.2, wait: 0.6 }, { x: -34.6, z: 19.6 }, { x: -33.4, z: 21.2, hop: true, wait: 1.6 }, { x: -36.2, z: 21.6 },
  { x: -39.6, z: 21.2, wait: 0.8 }, { x: -40.2, z: 19.4 }, { x: -37.4, z: 18.4, hop: true, wait: 1.2 },
];

/** At the weekend all day, on school days after school; never at night. */
const daytime = (spot) => (ch) => {
  const hour = Number(ch.time.split(':')[0]), weekday = (ch.day - 1) % 7; // 0 Sunday … 6 Saturday
  return hour >= 8 && hour < 19 && (weekday === 0 || weekday === 6 || hour >= 15) ? spot : null;
};

const met = (id) => `flag:met-${id}`;
/** Mom is calling you home (the very first task). */
const called = (ctx) => ctx.q === 'talk-mom';

export default {
  id: 'park',
  npcs: {
    defne: {
      name: 'Defne', short: 'Defne', role: 'parktaki çocuk · a child in the park',
      look: { shirt: 0xF48FB1, skirt: 0x7E57C2, pants: 0x7E57C2, skin: 0xF2C49B, hair: 0x8B5A2B, bun: true, scale: 0.6 },
      face: kidFace('#FCE4EC', '#F2C49B', '#8B5A2B', pigtails('#8B5A2B')),
    },
    ayse: {
      name: 'Ayşe', short: 'Ayşe', role: 'parktaki çocuk · a child in the park',
      look: { shirt: 0x4FC3F7, skirt: 0xF9A825, pants: 0xF9A825, skin: 0xE9B98F, hair: 0x1B1B1B, bun: true, scale: 0.58 },
      face: kidFace('#E1F5FE', '#E9B98F', '#1B1B1B', pigtails('#1B1B1B')),
    },
    emre: {
      name: 'Emre', short: 'Emre', role: 'parktaki çocuk · a child in the park',
      look: { shirt: 0xE53935, pants: 0x37474F, skin: 0xF2C49B, hair: 0x5B3A29, scale: 0.64 },
      face: kidFace('#FFE0B2', '#F2C49B', '#5B3A29'),
      route: TAG,
    },
    mert: {
      name: 'Mert', short: 'Mert', role: 'parktaki çocuk · a child in the park',
      look: { shirt: 0x43A047, pants: 0x1E3A6B, skin: 0xD9A47A, hair: 0x2B1D14, scale: 0.62 },
      face: kidFace('#DCEDC8', '#D9A47A', '#2B1D14'),
      route: [...TAG.slice(3), ...TAG.slice(0, 3)],
    },
  },
  voices: { defne: GIRL, ayse: GIRL, emre: man('Puck', M2), mert: man('Fenrir', M2) },
  castAll: {
    defne: daytime(['village', 'swing1', 'swing']),
    ayse: daytime(['village', 'swing3', 'swing']),
    emre: daytime(['village', 'parkRun', 'roam']),
    mert: daytime(['village', 'parkRun2', 'roam']),
  },
  dialogues: {
    defne: {
      start: (ctx) => (ctx.flag('met-defne') ? 'chat' : 'hello'),
      nodes: {
        hello: { say: 'Merhaba! Ben Defne. Salıncakta sallanıyorum, çok eğlenceli!', en: 'Hi! I’m Defne. I’m on the swing, it’s so much fun!',
          words: [['salıncak', 'swing'], ['sallanmak', 'to swing']],
          options: [{ tr: 'Merhaba Defne! Ben de sallanabilir miyim?', en: 'Hi Defne! Can I swing too?', next: 'free' }, { tr: 'Merhaba! Çok yükseğe çıkıyorsun!', en: 'Hi! You go really high!', next: 'free' }] },
        free: { say: 'Tabii! Ortadaki salıncak boş. Ama sıkı tutun!', en: 'Of course! The middle swing is free. But hold on tight!',
          words: [['boş', 'empty, free'], ['sıkı tutmak', 'to hold tight']],
          options: [{ tr: 'Tamam, teşekkürler!', en: 'Okay, thanks!', do: [met('defne')] }] },
        chat: { say: 'Sallan sallan, yükseğe çık! Gökyüzüne dokunacağım!', en: 'Swing, swing, go up high! I’m going to touch the sky!',
          words: [['yüksek', 'high'], ['dokunmak', 'to touch']],
          options: [{ tr: 'Dikkat et, düşme!', en: 'Careful, don’t fall!' }, { tr: 'Sen çok cesursun!', en: 'You are very brave!' }] },
      },
    },
    ayse: {
      start: (ctx) => (ctx.flag('met-ayse') ? 'chat' : 'hello'),
      nodes: {
        hello: { say: 'Selam! Ben Ayşe. Sen bu köyde mi oturuyorsun?', en: 'Hello! I’m Ayşe. Do you live in this village?',
          words: [['oturmak', 'to sit; to live (somewhere)']],
          options: [{ tr: 'Evet, ailemle burada yaşıyorum.', en: 'Yes, I live here with my family.', next: 'a2' }, { tr: 'Evet, evimiz meydanın yanında.', en: 'Yes, our house is next to the square.', next: 'a2' }] },
        a2: { say: 'Ne güzel! O zaman her gün parkta oynayabiliriz.', en: 'How nice! Then we can play in the park every day.',
          words: [['her gün', 'every day'], ['park', 'park, playground']],
          options: [{ tr: 'Olur, yarın yine gelirim!', en: 'Sure, I’ll come again tomorrow!', do: [met('ayse')] }] },
        chat: { say: 'Kum havuzunda kale yaptık. Gördün mü?', en: 'We built a castle in the sandbox. Did you see it?',
          words: [['kum', 'sand'], ['kale', 'castle']],
          options: [{ tr: 'Evet, çok güzel olmuş!', en: 'Yes, it looks great!' }, { tr: 'Hayır, hemen bakıyorum.', en: 'No, I’ll have a look right now.' }] },
      },
    },
    emre: {
      start: (ctx) => (ctx.flag('met-emre') ? 'chat' : called(ctx) ? 'helloCalled' : 'hello'),
      nodes: {
        hello: { say: 'Hey! Ben Emre. Kovalamaca oynuyoruz. Sen de oynar mısın?', en: 'Hey! I’m Emre. We’re playing tag. Do you want to play too?',
          words: [['kovalamaca', 'tag (the chasing game)']],
          options: [{ tr: 'Olur, ben de oynarım!', en: 'Sure, I’ll play too!', next: 'e2' }, { tr: 'Sonra oynarım, şimdi işim var.', en: 'I’ll play later, I have something to do now.', next: 'home' }] },
        helloCalled: { say: 'Hey! Ben Emre. Kovalamaca oynuyoruz. Sen de oynar mısın?', en: 'Hey! I’m Emre. We’re playing tag. Do you want to play too?',
          words: [['kovalamaca', 'tag (the chasing game)']],
          options: [{ tr: 'Olur, ben de oynarım!', en: 'Sure, I’ll play too!', next: 'e2' }, { tr: 'Şimdi olmaz, annem beni çağırıyor.', en: 'Not now, my mom is calling me.', next: 'home' }] },
        e2: { say: 'Mert ebe! Kaç, yakalanma!', en: 'Mert is “it”! Run, don’t get caught!',
          words: [['ebe', '“it” (the one who chases)'], ['yakalamak', 'to catch']],
          options: [{ tr: 'Hadi, kaçıyorum!', en: 'Come on, I’m running!', do: [met('emre')] }] },
        home: { say: 'Tamam, sonra gel! Görüşürüz!', en: 'Okay, come later! See you!',
          options: [{ tr: 'Görüşürüz Emre!', en: 'See you, Emre!', do: [met('emre')] }] },
        chat: { say: 'Kaydıraktan kayalım mı? Ben en hızlı kayarım!', en: 'Shall we go down the slide? I slide the fastest!',
          words: [['kaydırak', 'slide'], ['kaymak', 'to slide']],
          options: [{ tr: 'Hadi yarışalım!', en: 'Let’s race!' }, { tr: 'Ben de çok hızlıyım!', en: 'I’m very fast too!' }] },
      },
    },
    mert: {
      start: (ctx) => (ctx.flag('met-mert') ? 'chat' : 'hello'),
      nodes: {
        hello: { say: 'Ben Mert! Ebe benim, seni yakalayacağım!', en: 'I’m Mert! I’m “it”, I’m going to catch you!',
          words: [['ebe', '“it” (the one who chases)']],
          options: [{ tr: 'Yakalayamazsın!', en: 'You can’t catch me!', next: 'm2' }, { tr: 'Tamam, ben kaçıyorum!', en: 'Okay, I’m running away!', next: 'm2' }] },
        m2: { say: 'Ha ha, yakaladım! Şimdi ebe sensin!', en: 'Ha ha, got you! Now you’re “it”!',
          words: [['yakalamak', 'to catch']],
          options: [{ tr: 'Peki, şimdi ben kovalıyorum!', en: 'All right, now I’m chasing!', do: [met('mert')] }] },
        chat: { say: 'Tahterevalliye binelim mi? Bir yukarı, bir aşağı!', en: 'Shall we get on the seesaw? Up and down!',
          words: [['tahterevalli', 'seesaw'], ['yukarı', 'up'], ['aşağı', 'down']],
          options: [{ tr: 'Hadi binelim!', en: 'Let’s get on!' }, { tr: 'Tamam, ama yavaş!', en: 'Okay, but slowly!' }] },
      },
    },
  },
};
