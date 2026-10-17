/**
 * Sunday afternoon: "Gizemli zarf". Grandpa sends a sealed envelope to an old friend, Aslan
 * Bey at the library. On the way: a glass of tea without sugar from Osman the çaycı (Aslan Bey
 * drinks it like that, always at the same hour), and from Cemil at the kahvehane the words
 * Aslan Bey expects to hear first (the password the two of them played with as young men).
 * The envelope is a surprise: grandpa invites his old school friends to meet again, and Aslan
 * Bey answers with a card — "Pazartesi". No secrets kept from the family, just a surprise not to
 * spoil. A girl does the coffeehouse step at Cemal's simit cart instead (the kahvehane is the
 * old men's place).
 */
export default {
  id: 'zarf',
  kindNames: {
    zarf: { tr: 'kapalı zarf', en: 'sealed envelope' },
    cay: { tr: 'şekersiz çay', en: 'tea without sugar' },
    kart: { tr: 'kart', en: 'card' },
  },
  chapters: [{
    after: 'd7-morning',
    chapter: {
      id: 'd7-afternoon', day: 8, time: '14:30', location: 'yard', spawn: 'houseDoor',
      cast: {
        anne: ['yard', 'laundry', 'laundry'],
        baba: ['yard', 'car', 'repair'],
        dede: ['yard', 'pergolaSeat', 'sitBench'],
        elif: null, can: null, zehra: null,
        bakkal: ['village', 'bakkal', 'stand'],
      },
      intro: {
        num: 'Pazar · Bölüm 24', title: 'Gizemli zarf',
        text: 'Öğleden sonra dede asmanın altında oturuyor. Elinde eski, kapalı bir zarf var. Seni çağırıyor…',
        en: 'In the afternoon grandpa is sitting under the vine. He has an old, sealed envelope in his hand. He is calling you…',
      },
      quests: [
        { id: 'zarf-dede', title: 'Gizemli zarf', obj: 'Dedenle konuş', en: 'Talk to grandpa', target: { npc: 'dede' }, minutes: 10 },
        { id: 'zarf-cay', title: 'Şekersiz çay', obj: 'Çay bahçesinde Çaycı Osman’dan Aslan Bey için bir çay al', en: 'Get a tea for Aslan Bey from Osman at the tea garden', target: { npc: 'cayci' }, minutes: 10 },
        { id: 'zarf-kahve', title: 'Parola', obj: (c) => (c.girl ? 'Simitçi Cemal’le konuş' : 'Kahvehanede Cemil Usta ile konuş'), en: (c) => (c.girl ? 'Talk to Cemal the simit seller' : 'Talk to Cemil at the coffeehouse'), target: (c) => (c.girl ? { npc: 'simitci' } : { npc: 'kahveci' }), minutes: 10 },
        { id: 'zarf-aslan', title: 'Eski dost', obj: 'Zarfı kütüphanedeki Aslan Bey’e ver', en: 'Give the envelope to Aslan Bey at the library', target: { npc: 'aslanBey' }, minutes: 15 },
        { id: 'zarf-geri', title: 'Cevap', obj: 'Eve dön, kartı dedene ver', en: 'Go home and give the card to grandpa', target: { npc: 'dede' }, after: ['chapter'], minutes: 15 },
      ],
    },
  }],
  dialogues: {
    dede: {
      start: (ctx) => ({ 'zarf-dede': 'zf1', 'zarf-cay': 'zfWait', 'zarf-kahve': 'zfWait', 'zarf-aslan': 'zfWait', 'zarf-geri': 'zfBack' })[ctx.q],
      nodes: {
        zf1: { say: 'Gel evladım, otur şöyle yanıma. Sana önemli bir iş vereceğim.', en: 'Come my child, sit here next to me. I am going to give you an important job.',
          words: [['önemli', 'important'], ['iş', 'job, work']],
          options: [{ tr: 'Ne işi dede?', en: 'What job, grandpa?', next: 'zf2' }] },
        zf2: { say: 'Bu kapalı zarfı kütüphanedeki Aslan Bey’e götür. Eski bir dostumdur. İçinde bir sürpriz var, o yüzden zarfı açma.', en: 'Take this sealed envelope to Aslan Bey at the library. He is an old friend of mine. There is a surprise inside, so don’t open it.',
          words: [['zarf', 'envelope'], ['kapalı', 'closed, sealed'], ['dost', 'friend'], ['sürpriz', 'surprise']],
          options: [{ tr: 'Zarfın içinde ne var?', en: 'What is in the envelope?', next: 'zf3' }, { tr: 'Tamam dede, sürprizi bozmam.', en: "All right grandpa, I won't spoil the surprise.", next: 'zf3' }] },
        zf3: { say: 'Söylersem sürpriz olmaz ki evladım! (güler) Hah, bir de… Aslan’a boş elle gitme. Çaycı Osman’dan ona bir çay al. Şekersiz içer.', en: 'If I tell you, it won’t be a surprise, my child! (laughs) Oh, and one more thing… don’t go to Aslan empty-handed. Get him a tea from Osman the tea maker. He drinks it without sugar.',
          words: [['boş elle', 'empty-handed'], ['şekersiz', 'without sugar']],
          options: [{ tr: 'Anladım dede!', en: 'Got it, grandpa!', do: ['give:zarf', 'quest'] }] },
        zfWait: { say: 'Zarf hâlâ sende mi? Aslan kütüphanede, sürprizi o açacak.', en: 'Do you still have the envelope? Aslan is at the library, he is the one to open the surprise.',
          options: [{ tr: 'Gidiyorum dede.', en: "I'm going, grandpa." }] },
        zfBack: { ask: 'listen', say: 'Geldin mi? Aslan ne verdi sana?', en: 'You are back? What did Aslan give you?', prompt: 'Dede ne soruyor? Doğru cevabı seç.',
          options: [
            { tr: 'Bir çay verdi.', en: 'He gave me a tea.', wrong: true },
            { tr: 'Bir kart verdi. Üstünde “Pazartesi” yazıyor.', en: 'He gave me a card. It says “Monday” on it.', next: 'zfEnd' },
            { tr: 'Hiçbir şey vermedi.', en: 'He gave me nothing.', wrong: true },
          ] },
        zfEnd: { say: 'Pazartesi, ha! Demek geliyor! (güler) Sürpriz şuydu evladım: eski okul arkadaşlarımızla pazartesi buluşuyoruz. Aslan’la gençken çok yer gezdik, çok güldük.', en: 'Monday, eh! So he is coming! (laughs) Here is the surprise, my child: we are meeting our old school friends on Monday. Aslan and I travelled a lot when we were young, and laughed a lot.',
          words: [['gezmek', 'to travel around'], ['okul arkadaşı', 'school friend']],
          options: [{ tr: 'Ne güzel bir sürpriz dede!', en: 'What a lovely surprise, grandpa!', do: ['take:kart', 'quest'] }, { tr: 'Annemle babama da anlatayım mı?', en: 'Shall I tell mom and dad too?', next: 'zfTell' }] },
        zfTell: { say: 'Tabii anlat! Onlar da gelsin, sofrayı birlikte kurarız.', en: 'Of course, tell them! Let them come too, we will set the table together.',
          options: [{ tr: 'Hemen anlatıyorum!', en: "I'm telling them right away!", do: ['take:kart', 'quest'] }] },
      },
    },
    cayci: {
      start: (ctx) => (ctx.q === 'zarf-cay' ? 'zc1' : undefined),
      nodes: {
        zc1: { ask: 'speak', say: 'Hoş geldin evlat! Ne alırsın?', en: 'Welcome, kid! What will you have?',
          expect: ['Şekersiz bir çay lütfen', 'Bir çay lütfen şekersiz', 'Bir şekersiz çay lütfen'], keywords: ['çay', 'şekersiz'],
          show: 'Şekersiz bir çay lütfen.', showEn: 'A tea without sugar, please.', words: [['şekersiz', 'without sugar']], next: 'zc2' },
        zc2: { say: 'Şekersiz mi? Aslan Bey’e mi götüreceksin? Hep şekersiz içer. Hem de her gün aynı saatte. Tuhaf adamdır ama iyi adamdır.', en: 'Without sugar? Are you taking it to Aslan Bey? He always drinks it without sugar. And every day at the same hour. A strange man, but a good man.',
          words: [['tuhaf', 'strange'], ['aynı saatte', 'at the same hour']],
          options: [{ tr: 'Nereden bildiniz?', en: 'How did you know?', next: 'zc3' }] },
        zc3: { say: 'Bu meydanda çaycı her şeyi bilir evlat. Al, sıcak sıcak götür. Dökme!', en: 'In this square the tea maker knows everything, kid. Here, take it while it is hot. Don’t spill it!',
          words: [['dökmek', 'to spill'], ['sıcak', 'hot']],
          options: [{ tr: 'Teşekkür ederim Osman amca!', en: 'Thank you, uncle Osman!', do: ['give:cay', 'quest'] }] },
      },
    },
    kahveci: {
      start: (ctx) => (ctx.q === 'zarf-kahve' ? 'zk1' : undefined),
      nodes: {
        zk1: { say: 'Elindeki zarf mı? Dikkat et, şuradaki Rıfat Amca görürse sürprizi bütün köye anlatır! (güler)', en: 'Is that an envelope in your hand? Careful, if Rıfat Amca over there sees it, he will tell the whole village about the surprise! (laughs)',
          words: [['sürpriz', 'surprise'], ['anlatmak', 'to tell']],
          options: [{ tr: 'Aslan Bey’e götürüyorum.', en: "I'm taking it to Aslan Bey.", next: 'zk2' }] },
        zk2: { say: 'Demek deden gönderdi… Dinle: Aslan Bey’in yanına gidince önce şunu söyle — “Kartal yuvasına döndü.” Gençken onların parolasıydı, bir oyun.', en: 'So your grandpa sent it… Listen: when you go to Aslan Bey, first say this — “The eagle has returned to its nest.” Your grandpa always used to say that.',
          words: [['kartal', 'eagle'], ['yuva', 'nest'], ['dönmek', 'to return']],
          options: [{ tr: 'Neden öyle söylüyorum?', en: 'Why do I say that?', next: 'zk3' }] },
        zk3: { ask: 'order', say: 'Ben sadece çay taşırım evlat. Ama bazı sözler kırk yıl unutulmaz. Hadi, bir kere söyle bakalım.', en: 'I just carry tea, kid. But some words are not forgotten in forty years. Come on, say it once.',
          answer: 'Kartal yuvasına döndü.', answerEn: 'The eagle has returned to its nest.', next: 'zk4' },
        zk4: { say: 'Aferin. Şimdi git, ama koşma; çay dökülür!', en: "Well done. Now go, but don't run, or the tea will spill!",
          words: [['dökülmek', 'to spill']],
          options: [{ tr: 'Tamam Cemil usta.', en: 'All right, master Cemil.', do: ['quest'] }] },
      },
    },
    simitci: {
      start: (ctx) => (ctx.q === 'zarf-kahve' ? 'zs1' : undefined),
      nodes: {
        zs1: { say: 'Elindeki zarf mı? Deden mi gönderdi? Aslan Bey’e götürüyorsun, değil mi?', en: 'Is that an envelope in your hand? Did your grandpa send it? You are taking it to Aslan Bey, aren’t you?',
          words: [['göndermek', 'to send']],
          options: [{ tr: 'Evet, nereden bildiniz?', en: 'Yes, how did you know?', next: 'zs2' }] },
        zs2: { say: 'Simitçi her şeyi duyar! Dinle: Aslan Bey’in yanına gidince önce şunu söyle — “Kartal yuvasına döndü.” Gençken onların parolasıydı, bir oyun.', en: 'A simit seller hears everything! Listen: when you go to Aslan Bey, first say this — “The eagle has returned to its nest.” It was their password when they were young, a game.',
          words: [['kartal', 'eagle'], ['yuva', 'nest'], ['parola', 'password']],
          options: [{ tr: 'Ne güzel bir oyun!', en: 'What a nice game!', next: 'zs3' }] },
        zs3: { ask: 'order', say: 'Hadi, bir kere söyle bakalım.', en: 'Come on, say it once.', answer: 'Kartal yuvasına döndü.', answerEn: 'The eagle has returned to its nest.', next: 'zs4' },
        zs4: { say: 'Aferin! Şimdi git, ama koşma; çay dökülür!', en: "Well done! Now go, but don't run, or the tea will spill!",
          options: [{ tr: 'Tamam Cemal Abi, sağ ol!', en: 'Okay, Cemal, thanks!', do: ['quest'] }] },
      },
    },
    aslanBey: {
      start: (ctx) => (ctx.q === 'zarf-aslan' ? 'za1' : undefined),
      nodes: {
        za1: { ask: 'speak', say: 'Buyurun genç misafir… Bana bir şey mi söyleyecektin?', en: 'Yes, young guest… Did you have something to tell me?',
          expect: ['Kartal yuvasına döndü'], keywords: ['kartal', 'yuva'], show: 'Kartal yuvasına döndü.', showEn: 'The eagle has returned to its nest.', next: 'za2' },
        za2: { say: '…Ve baykuş hâlâ uyanık. Demek Hüseyin seni gönderdi. Zarfı ver bakalım.', en: '…And the owl is still awake. So Hüseyin sent you. Let me have the envelope.',
          words: [['baykuş', 'owl'], ['uyanık', 'awake']],
          options: [{ tr: 'Buyurun: zarf ve şekersiz çayınız.', en: 'Here you are: the envelope and your tea without sugar.', do: ['take:zarf', 'take:cay'], next: 'za3' }] },
        za3: { say: 'Şekersiz… Hüseyin hiçbir şeyi unutmaz. (Zarfı açar, okur, gülümser.) Kırk yıl önce aynı okulda okuduk. O zaman da böyle parolalarla oynardık!', en: 'Without sugar… Hüseyin never forgets anything. (He opens the envelope, reads, smiles.) Forty years ago we went to the same school. Back then too we played with passwords like that!',
          words: [['parola', 'password'], ['gülümsemek', 'to smile']],
          options: [{ tr: 'Ne işi yapıyordunuz Aslan Bey?', en: 'What work did you do, Aslan Bey?', next: 'za4' }] },
        za4: { say: 'Ben öğretmendim evlat; şimdi de kitaplarla yaşıyorum. Kitaplar her şeyi anlatır, yeter ki oku.', en: 'I was a teacher, kid; now I live with books. Books tell you everything, as long as you read.',
          words: [['öğretmen', 'teacher'], ['okumak', 'to read']],
          options: [{ tr: 'Dedem sizi çok seviyor.', en: 'My grandpa is very fond of you.', next: 'za5' }, { tr: 'Ben de çok kitap okumak istiyorum.', en: 'I want to read a lot of books too.', next: 'za5' }] },
        za5: { say: 'Ne güzel! Al, bu kartı dedene ver. Üstünde tek bir kelime var: “Pazartesi.” Gerisini o anlar. Sürprizimiz tamam!', en: 'How lovely! Here, give this card to your grandpa. There is only one word on it: “Monday.” He will understand the rest. Our surprise is ready!',
          words: [['kart', 'card'], ['kelime', 'word'], ['pazartesi', 'Monday']],
          options: [{ tr: 'Hemen götürüyorum!', en: "I'm taking it right away!", do: ['give:kart', 'quest'] }] },
      },
    },
  },
};
