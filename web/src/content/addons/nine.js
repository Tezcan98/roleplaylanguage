/**
 * Fatma Nine (grandma) sits on the sedir at home. She doesn't announce lessons — she just
 * talks to you like a grandmother: did you pray, which surahs do you know, how was school,
 * stories from the old days, a cookie she baked. Every visit is a different little chat
 * (some end with a short question); after all of them she starts again from a different
 * one each game hour.
 */
const ok = (tr, en, more = {}) => ({ tr, en, ...more });

/** Each chat: `start` node plus its own nodes; ids are prefixed with the chat id. */
const CHATS = [
  { id: 'namaz', nodes: {
    start: { say: 'Gel kuzum, gel otur yanıma. Söyle bakayım, bugün namazını kıldın mı?', en: 'Come my dear, sit by me. Tell me, did you pray today?',
      words: [['kuzum', 'my dear (lit. my lamb)'], ['namaz kılmak', 'to pray (salah)']],
      options: [ok('Evet nine, kıldım.', 'Yes grandma, I did.', { next: 'yes' }), ok('Daha kılmadım.', "Not yet.", { next: 'no' })] },
    yes: { say: 'Maşallah! Allah kabul etsin. Hangi vakti kıldın?', en: 'Mashallah! May Allah accept it. Which prayer did you pray?',
      words: [['vakit', 'time (of prayer)'], ['kabul etmek', 'to accept']],
      options: [ok('Sabah namazını.', 'The morning prayer.', { next: 'end' }), ok('Öğle namazını.', 'The noon prayer.', { next: 'end' }), ok('Akşam namazını.', 'The evening prayer.', { next: 'end' })] },
    no: { say: 'Haydi kuzum, vakit geçmeden kıl. Önce abdestini al, sonra seccadeni ser.', en: 'Come on my dear, pray before the time passes. First make your wudu, then lay out your prayer rug.',
      words: [['abdest', 'ritual washing (wudu)'], ['seccade', 'prayer rug']],
      options: [ok('Tamam nine, şimdi kılacağım.', "All right grandma, I'll pray now.", { next: 'end' })] },
    end: { say: 'Namaz dinin direğidir. Bunu hiç unutma, olur mu?', en: 'Prayer is the pillar of the religion. Never forget that, all right?',
      words: [['direk', 'pillar']], options: [ok('Unutmam nine.', "I won't forget, grandma.")] },
  } },
  { id: 'sure', nodes: {
    start: { say: 'Hangi sureleri ezbere biliyorsun kuzum? Bir söyle bakayım.', en: 'Which surahs do you know by heart, my dear? Tell me.',
      words: [['sure', 'surah (chapter of the Quran)'], ['ezbere bilmek', 'to know by heart']],
      options: [ok('Fatiha’yı biliyorum.', 'I know al-Fatiha.', { next: 'fatiha' }), ok('İhlas’ı biliyorum.', 'I know al-Ikhlas.', { next: 'ihlas' }), ok('Daha bilmiyorum nine.', "I don't know any yet, grandma.", { next: 'learn' })] },
    fatiha: { say: 'Ne güzel! Fatiha’yı namazın her rekatında okuruz. “Elhamdülillahi rabbil alemin…” Devamı nasıl?', en: 'How lovely! We recite al-Fatiha in every rak‘ah of the prayer. “Alhamdu lillahi rabbil ‘alamin…” How does it go on?',
      words: [['rekat', 'rak‘ah (unit of the prayer)'], ['devam', 'continuation']],
      options: [ok('Errahmanirrahim…', 'Ar-rahmanir-rahim…', { next: 'quiz' }), ok('Unuttum nine.', 'I forgot, grandma.', { next: 'quiz' })] },
    ihlas: { say: 'Maşallah! “Kul huvallahu ehad.” İhlas, Allah’ın bir olduğunu anlatır.', en: 'Mashallah! “Qul huwa Allahu ahad.” Al-Ikhlas tells us that Allah is One.',
      words: [['bir', 'one']], options: [ok('Bunu bilmiyordum.', "I didn't know that.", { next: 'quiz' })] },
    learn: { say: 'Üzülme, ben sana öğretirim. Önce Fatiha ile başlarız; her gün bir ayet, olur mu?', en: "Don't worry, I'll teach you. We'll start with al-Fatiha; one verse every day, all right?",
      words: [['ayet', 'verse'], ['öğretmek', 'to teach']], options: [ok('Olur nine!', 'All right grandma!', { next: 'quiz' })] },
    quiz: { say: 'Söyle bakalım: namazın her rekatında hangi sureyi okuruz?', en: 'Tell me then: which surah do we recite in every rak‘ah of the prayer?', hint: 'Fatiha',
      options: [ok('İhlas’ı.', 'Al-Ikhlas.', { wrong: true }), ok('Fatiha’yı.', 'Al-Fatiha.', { next: 'end' }), ok('Hiçbirini.', 'None.', { wrong: true })] },
    end: { say: 'Aferin kuzum! Sen bunları öğrendikçe ninen çok mutlu oluyor.', en: 'Well done my dear! Grandma is so happy when you learn these.',
      options: [ok('Ben de mutluyum nine.', "I'm happy too, grandma.")] },
  } },
  { id: 'okul', nodes: {
    start: { say: 'Okul nasıl gidiyor? Öğretmenin sana bugün ne öğretti?', en: 'How is school going? What did your teacher teach you today?',
      words: [['okul', 'school'], ['öğretmen', 'teacher']],
      options: [ok('Yeni kelimeler öğrendim.', 'I learned new words.', { next: 'words' }), ok('Sayıları öğrendim.', 'I learned the numbers.', { next: 'numbers' })] },
    words: { say: 'Aferin! Bana bir tane söyle bakalım, “kitap” ne demek?', en: 'Well done! Tell me one then: what does “kitap” mean?', optionsAreMeanings: true,
      options: [ok('pen', '', { wrong: true }), ok('book', '', { next: 'end' }), ok('door', '', { wrong: true })] },
    numbers: { say: 'Say bakalım: bir, iki, üç… Sonra ne gelir?', en: 'Count then: one, two, three… What comes next?',
      options: [ok('Beş.', 'Five.', { wrong: true }), ok('Dört.', 'Four.', { next: 'end' }), ok('On.', 'Ten.', { wrong: true })] },
    end: { say: 'Maşallah, ne çalışkan bir torunum var! Beşikten mezara kadar ilim öğrenilir.', en: 'Mashallah, what a hard-working grandchild I have! Knowledge is sought from the cradle to the grave.',
      words: [['torun', 'grandchild'], ['çalışkan', 'hard-working'], ['ilim', 'knowledge']],
      options: [ok('Teşekkür ederim nine.', 'Thank you, grandma.')] },
  } },
  { id: 'abdest', nodes: {
    start: { say: 'Abdest almayı biliyor musun kuzum?', en: 'Do you know how to make wudu, my dear?', words: [['abdest almak', 'to make wudu (ritual washing)']],
      options: [ok('Biliyorum nine.', 'I know, grandma.', { next: 'quiz' }), ok('Tam bilmiyorum.', "I don't know it well.", { next: 'teach' })] },
    teach: { say: 'Önce “Bismillah” deriz. Ellerimizi üç kere yıkarız, sonra ağzımıza ve burnumuza su veririz, yüzümüzü yıkarız.', en: 'First we say “Bismillah”. We wash our hands three times, then rinse our mouth and nose, and wash our face.',
      words: [['el', 'hand'], ['ağız', 'mouth'], ['burun', 'nose'], ['yüz', 'face']],
      options: [ok('Sonra ne yaparız?', 'Then what do we do?', { next: 'teach2' })] },
    teach2: { say: 'Sonra kollarımızı yıkarız, başımızı meshederiz, kulaklarımızı sileriz, en son ayaklarımızı yıkarız.', en: 'Then we wash our arms, wipe our head, wipe our ears, and last we wash our feet.',
      words: [['kol', 'arm'], ['baş', 'head'], ['kulak', 'ear'], ['ayak', 'foot']],
      options: [ok('Anladım nine.', 'I understand, grandma.', { next: 'quiz' })] },
    quiz: { say: 'O zaman söyle: abdeste ne ile başlarız?', en: 'Then tell me: what do we begin wudu with?', hint: 'Bismillah, el',
      options: [ok('Ayaklarımızı yıkarız.', 'We wash our feet.', { wrong: true }), ok('Besmele çekip ellerimizi yıkarız.', 'We say Bismillah and wash our hands.', { next: 'end' }), ok('Saçımızı tararız.', 'We comb our hair.', { wrong: true })] },
    end: { say: 'Maşallah! Temizlik imandandır.', en: 'Mashallah! Cleanliness is part of faith.', words: [['temizlik', 'cleanliness'], ['iman', 'faith']],
      options: [ok('Amin nine.', 'Amen, grandma.')] },
  } },
  { id: 'eskiden', nodes: {
    start: { say: 'Ben senin yaşındayken bu köyde elektrik yoktu, biliyor musun? Akşamları gaz lambası yakardık.', en: 'When I was your age there was no electricity in this village, did you know? In the evenings we lit an oil lamp.',
      words: [['yaş', 'age'], ['elektrik', 'electricity'], ['lamba', 'lamp']],
      options: [ok('Gerçekten mi? Televizyon da yok muydu?', 'Really? Was there no TV either?', { next: 'tv' })] },
    tv: { say: 'Yoktu tabii! Akşamları ninem bize masal anlatırdı, biz de sobanın başında dinlerdik.', en: 'Of course not! In the evenings my grandmother told us tales, and we listened by the stove.',
      words: [['masal', 'tale'], ['soba', 'stove']],
      options: [ok('Çok güzelmiş nine.', 'That sounds lovely, grandma.', { next: 'end' })] },
    end: { say: 'Güzeldi kuzum. Suyu da çeşmeden kovayla taşırdık. Siz şimdi çok şanslısınız, şükredin.', en: 'It was lovely, my dear. We carried water from the fountain in buckets too. You are very lucky now — be thankful.',
      words: [['taşımak', 'to carry'], ['şükretmek', 'to give thanks (to God)']],
      options: [ok('Elhamdülillah.', 'Alhamdulillah.')] },
  } },
  { id: 'kurabiye', nodes: {
    start: { say: 'Acıktın mı kuzum? Al bakalım, bu kurabiyeleri ben yaptım.', en: 'Are you hungry, my dear? Here, I made these cookies.',
      words: [['acıkmak', 'to get hungry'], ['kurabiye', 'cookie']],
      options: [ok('Elinize sağlık nine!', 'Bless your hands, grandma!', { next: 'end' }), ok('Tokum, teşekkür ederim.', "I'm full, thank you.", { next: 'full' })] },
    full: { say: 'Bir tane ye, bir şey olmaz! Ninesinin kurabiyesi geri çevrilmez.', en: "Have one, it won't hurt! You can't say no to grandma's cookies.",
      words: [['geri çevirmek', 'to turn down']], options: [ok('Peki nine, bir tane.', 'All right grandma, just one.', { next: 'end' })] },
    end: { say: 'Afiyet olsun! Yemeğe başlarken ne deriz?', en: 'Enjoy! What do we say when we start eating?',
      words: [['afiyet olsun', 'enjoy your meal'], ['elinize sağlık', 'bless your hands (thanks for the food)']],
      options: [ok('Bismillah.', 'Bismillah.', { next: 'end2' }), ok('Güle güle.', 'Goodbye.', { wrong: true })] },
    end2: { say: 'Aferin. Bitince de “Elhamdülillah” deriz.', en: 'Well done. And when we finish we say “Alhamdulillah”.', options: [ok('Elhamdülillah!', 'Alhamdulillah!')] },
  } },
  { id: 'kardes', nodes: {
    start: { say: 'Ali’yle iyi geçiniyor musun? O daha küçük, ona iyi bir abi ol.', en: 'Are you getting on well with Ali? He is still little; be a good big brother to him.',
      words: [['geçinmek', 'to get along'], ['küçük', 'little, young']],
      options: [ok('Evet nine, onu çok seviyorum.', 'Yes grandma, I love him very much.', { next: 'end' }), ok('Bazen beni kızdırıyor.', 'Sometimes he makes me angry.', { next: 'angry' })] },
    angry: { say: 'Kızınca hemen bağırma. Sabret, onunla güzelce konuş. Sabrın sonu selamettir.', en: "Don't shout as soon as you get angry. Be patient and talk to him kindly. Patience ends in well-being.",
      words: [['kızmak', 'to get angry'], ['sabretmek', 'to be patient']], options: [ok('Tamam nine.', 'All right grandma.', { next: 'end' })] },
    end: { say: 'Kardeş sevgisi çok kıymetlidir kuzum. Birbirinize sahip çıkın.', en: 'The love between siblings is very precious, my dear. Look after each other.',
      words: [['kıymetli', 'precious'], ['sahip çıkmak', 'to look after']], options: [ok('Söz veriyorum nine.', 'I promise, grandma.')] },
  } },
  { id: 'vakit', nodes: {
    start: { say: 'Bir soru soracağım, bakalım bilecek misin: günde kaç vakit namaz kılarız?', en: "I'll ask you a question, let's see if you know: how many times a day do we pray?",
      options: [ok('İki vakit.', 'Two times.', { wrong: true }), ok('Beş vakit.', 'Five times.', { next: 'names' }), ok('On vakit.', 'Ten times.', { wrong: true })] },
    names: { say: 'Doğru! Sabah, öğle, ikindi, akşam ve yatsı. Şimdi hangi vakit, biliyor musun?', en: 'Right! Fajr, dhuhr, asr, maghrib and isha. Do you know which prayer time it is now?',
      words: [['sabah', 'morning (fajr)'], ['öğle', 'noon (dhuhr)'], ['ikindi', 'afternoon (asr)'], ['akşam', 'evening (maghrib)'], ['yatsı', 'night (isha)']],
      options: [ok('Dedeme soracağım.', "I'll ask grandpa.", { next: 'end' }), ok('Ezanı dinlerim.', "I'll listen for the call to prayer.", { next: 'end' })] },
    end: { say: 'Akıllı çocuk! Ezanı duyunca işini bırakır, namaza hazırlanırız.', en: 'Clever child! When we hear the call to prayer, we put down our work and get ready to pray.',
      words: [['ezan', 'call to prayer']], options: [ok('Tamam nine.', 'All right grandma.')] },
  } },
  { id: 'selam', nodes: {
    start: { say: 'Eve girerken selam verdin mi bakayım?', en: 'Did you say salaam when you came into the house?', words: [['selam vermek', 'to greet (say salaam)']],
      options: [ok('Selamünaleyküm nine!', 'Peace be upon you, grandma!', { next: 'end' }), ok('Unuttum.', 'I forgot.', { next: 'forgot' })] },
    forgot: { say: 'O zaman şimdi ver! “Selamünaleyküm” de bakalım.', en: 'Then say it now! Say “Selamünaleyküm”.', options: [ok('Selamünaleyküm nine!', 'Peace be upon you, grandma!', { next: 'end' })] },
    end: { say: 'Aleykümselam kuzum! Selamı yaymak sünnettir; kim önce verirse onun sevabı daha çok.', en: 'And peace be upon you, my dear! Spreading the greeting is a sunnah; whoever greets first gets more reward.',
      words: [['sünnet', 'the Prophet’s way (sunnah)'], ['sevap', 'reward (for a good deed)']], options: [ok('Bundan sonra hep önce ben vereceğim.', "From now on I'll always greet first.")] },
  } },
  { id: 'kuran', nodes: {
    start: { say: 'Kur’an okumayı öğreniyor musun? Elif, be, te, se… Harfleri biliyor musun?', en: 'Are you learning to read the Quran? Alif, ba, ta, tha… Do you know the letters?',
      words: [['harf', 'letter (of the alphabet)'], ['okumak', 'to read']],
      options: [ok('Biraz biliyorum.', 'I know a little.', { next: 'end' }), ok('Bana öğretir misin?', 'Will you teach me?', { next: 'teach' })] },
    teach: { say: 'Tabii öğretirim! Akşam yemeğinden sonra gel, birlikte okuruz.', en: "Of course I'll teach you! Come after dinner and we'll read together.",
      words: [['birlikte', 'together']], options: [ok('Gelirim nine!', "I'll come, grandma!", { next: 'end' })] },
    end: { say: 'Her gün biraz oku kuzum. Damlaya damlaya göl olur.', en: 'Read a little every day, my dear. Drop by drop a lake is formed.',
      words: [['damla', 'drop'], ['göl', 'lake']], options: [ok('İnşallah nine.', 'God willing, grandma.')] },
  } },
];

/** First a chat not had yet; once all were had, a different one each game hour. */
function nextChat(ctx) {
  const fresh = CHATS.find((c) => !ctx.flag(`nine-${c.id}`));
  if (fresh) return `${fresh.id}.start`;
  const s = ctx.state ?? { day: 1, minutes: 0 };
  return `${CHATS[(s.day * 24 + Math.floor(s.minutes / 60)) % CHATS.length].id}.start`;
}

/** Prefix node ids; the chat is marked as had on its last line (options without `next`). */
function chatNodes() {
  const nodes = {};
  CHATS.forEach(({ id, nodes: own }) => Object.entries(own).forEach(([k, n]) => {
    nodes[`${id}.${k}`] = {
      ...n,
      options: n.options.map((o) => (o.wrong ? o : o.next ? { ...o, next: `${id}.${o.next}` } : { ...o, do: [...(o.do ?? []), `flag:nine-${id}`] })),
    };
  }));
  return nodes;
}

export const NINE_CHATS = CHATS;

export default {
  id: 'nine',
  npcs: {
    nine: {
      name: 'Fatma Nine', short: 'Nine', role: 'nine · grandma',
      look: { shirt: 0x8C6E9E, skirt: 0x4E3B5C, pants: 0x4E3B5C, skin: 0xE9B98F, headscarf: 0xF3EFE8, glasses: true, scale: 0.9 },
      face: '<svg width="52" height="52" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#D8C4E8"/><path d="M12 50q0-30 20-32q20 2 20 32z" fill="#F3EFE8"/><circle cx="32" cy="37" r="14" fill="#E9B98F"/><path d="M17 33q4-13 15-13t15 13q-6-6-15-6t-15 6z" fill="#F3EFE8"/><circle cx="26" cy="37" r="4" fill="none" stroke="#1B2440" stroke-width="1.6"/><circle cx="38" cy="37" r="4" fill="none" stroke="#1B2440" stroke-width="1.6"/><circle cx="26" cy="37" r="1.3" fill="#1B2440"/><circle cx="38" cy="37" r="1.3" fill="#1B2440"/><path d="M27 45q5 3 10 0" stroke="#9B6570" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
    },
  },
  voices: { nine: { id: 'tr-nine', female: true, pitch: 1 } },
  // on the middle of the sedir all day; asleep on the first night
  castAll: { nine: ['house', 'sedirM', 'sitBench'] },
  cast: { 'd1-night': { nine: null } },
  dialogues: { nine: { start: nextChat, nodes: chatNodes() } },
};
