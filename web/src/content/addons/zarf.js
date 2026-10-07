/**
 * Sunday afternoon: "Gizemli zarf". Grandpa sends a sealed envelope to an old friend, Aslan
 * Bey at the library. On the way: a glass of tea without sugar from Osman the çaycı (Aslan Bey
 * drinks it like that, always at the same hour), and from Cemil at the kahvehane the words
 * Aslan Bey expects to hear first. Aslan Bey answers in riddles — he used to do "book work"
 * in another city, under other names… — and sends grandpa back a card with one word on it.
 * Between us: Aslan Bey was in intelligence once. Nobody says so out loud.
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
        num: 'Pazar · Bölüm 23', title: 'Gizemli zarf',
        text: 'Öğleden sonra dede asmanın altında oturuyor. Elinde eski, kapalı bir zarf var. Seni çağırıyor…',
        en: 'In the afternoon grandpa is sitting under the vine. He has an old, sealed envelope in his hand. He is calling you…',
      },
      quests: [
        { id: 'zarf-dede', title: 'Gizemli zarf', obj: 'Dedenle konuş', en: 'Talk to grandpa', target: { npc: 'dede' }, minutes: 10 },
        { id: 'zarf-cay', title: 'Şekersiz çay', obj: 'Çay bahçesinde Çaycı Osman’dan Aslan Bey için bir çay al', en: 'Get a tea for Aslan Bey from Osman at the tea garden', target: { npc: 'cayci' }, minutes: 10 },
        { id: 'zarf-kahve', title: 'Kahvehane', obj: 'Kahvehanede Cemil Usta ile konuş', en: 'Talk to Cemil at the coffeehouse', target: { npc: 'kahveci' }, minutes: 10 },
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
        zf2: { say: 'Bu kapalı zarfı kütüphanedeki Aslan Bey’e götür. Eski bir dostumdur. Zarfı açma, kimseye de gösterme.', en: 'Take this sealed envelope to Aslan Bey at the library. He is an old friend of mine. Don’t open it, and don’t show it to anyone.',
          words: [['zarf', 'envelope'], ['kapalı', 'closed, sealed'], ['dost', 'friend'], ['göstermek', 'to show']],
          options: [{ tr: 'Zarfın içinde ne var?', en: 'What is in the envelope?', next: 'zf3' }, { tr: 'Tamam dede, kimseye göstermem.', en: "All right grandpa, I won't show anyone.", next: 'zf3' }] },
        zf3: { say: 'Bazı sorular sorulmaz evladım. Hah, bir de… Aslan’a boş elle gitme. Çaycı Osman’dan ona bir çay al. Şekersiz içer.', en: 'Some questions are not asked, my child. Oh, and one more thing… don’t go to Aslan empty-handed. Get him a tea from Osman the tea maker. He drinks it without sugar.',
          words: [['boş elle', 'empty-handed'], ['şekersiz', 'without sugar']],
          options: [{ tr: 'Anladım dede!', en: 'Got it, grandpa!', do: ['give:zarf', 'quest'] }] },
        zfWait: { say: 'Zarf hâlâ sende mi? Kimseye göstermedin, değil mi? Aslan kütüphanede.', en: "Do you still have the envelope? You haven't shown it to anyone, have you? Aslan is at the library.",
          options: [{ tr: 'Gidiyorum dede.', en: "I'm going, grandpa." }] },
        zfBack: { ask: 'listen', say: 'Geldin mi? Aslan ne verdi sana?', en: 'You are back? What did Aslan give you?', prompt: 'Dede ne soruyor? Doğru cevabı seç.',
          options: [
            { tr: 'Bir çay verdi.', en: 'He gave me a tea.', wrong: true },
            { tr: 'Bir kart verdi. Üstünde “Pazartesi” yazıyor.', en: 'He gave me a card. It says “Monday” on it.', next: 'zfEnd' },
            { tr: 'Hiçbir şey vermedi.', en: 'He gave me nothing.', wrong: true },
          ] },
        zfEnd: { say: 'Pazartesi, ha… (güler) Aslan’la gençken çok yer gezdik evladım. Çok yer, çok isim… Neyse. Bu konuştuklarımız aramızda kalsın.', en: 'Monday, eh… (laughs) Aslan and I travelled a lot when we were young, my child. Many places, many names… Never mind. Let what we said stay between us.',
          words: [['gezmek', 'to travel around'], ['aramızda kalsın', 'let it stay between us']],
          options: [{ tr: 'Aramızda kalsın dede!', en: 'Between us, grandpa!', do: ['take:kart', 'quest'] }] },
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
        zk1: { say: 'Elindeki zarf mı? Şşşt, sakla onu! Rıfat görürse bütün köy duyar.', en: "Is that an envelope in your hand? Shh, hide it! If Rıfat sees it, the whole village will hear about it.",
          words: [['saklamak', 'to hide'], ['duymak', 'to hear']],
          options: [{ tr: 'Aslan Bey’e götürüyorum.', en: "I'm taking it to Aslan Bey.", next: 'zk2' }] },
        zk2: { say: 'Demek deden gönderdi… Dinle: Aslan Bey’in yanına gidince önce şunu söyle — “Kartal yuvasına döndü.” Deden hep böyle derdi.', en: 'So your grandpa sent it… Listen: when you go to Aslan Bey, first say this — “The eagle has returned to its nest.” Your grandpa always used to say that.',
          words: [['kartal', 'eagle'], ['yuva', 'nest'], ['dönmek', 'to return']],
          options: [{ tr: 'Neden öyle söylüyorum?', en: 'Why do I say that?', next: 'zk3' }] },
        zk3: { ask: 'order', say: 'Ben sadece çay taşırım evlat. Ama bazı sözler kırk yıl unutulmaz. Hadi, bir kere söyle bakalım.', en: 'I just carry tea, kid. But some words are not forgotten in forty years. Come on, say it once.',
          answer: 'Kartal yuvasına döndü.', answerEn: 'The eagle has returned to its nest.', next: 'zk4' },
        zk4: { say: 'Aferin. Şimdi git, ama koşma. Koşan çocuk dikkat çeker.', en: "Well done. Now go, but don't run. A running child draws attention.",
          words: [['dikkat çekmek', 'to draw attention']],
          options: [{ tr: 'Tamam Cemil usta.', en: 'All right, master Cemil.', do: ['quest'] }] },
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
        za3: { say: 'Şekersiz… Hüseyin hiçbir şeyi unutmaz. (Zarfı açar, okur, gülümser.) Kırk yıl önce, başka bir şehirde, başka isimlerle… Neyse. Eski işler.', en: 'Without sugar… Hüseyin never forgets anything. (He opens the envelope, reads, smiles.) Forty years ago, in another city, under other names… Never mind. Old business.',
          words: [['şehir', 'city'], ['isim', 'name'], ['gülümsemek', 'to smile']],
          options: [{ tr: 'Ne işi yapıyordunuz Aslan Bey?', en: 'What work did you do, Aslan Bey?', next: 'za4' }] },
        za4: { say: 'Kitap işi evlat. Sadece kitap işi. Kitaplar da sır saklar, biliyor musun? En iyi saklanan şey, herkesin gördüğü yerdedir.', en: 'Book work, kid. Just book work. Books keep secrets too, you know? The best-hidden thing is in the place everyone can see.',
          words: [['sır saklamak', 'to keep a secret'], ['herkes', 'everyone']],
          options: [{ tr: 'Çok gizemli konuşuyorsunuz…', en: 'You talk very mysteriously…', next: 'za5' }] },
        za5: { say: 'Gizem kütüphanenin tozudur. Al, bu kartı dedene ver. Üstünde tek bir kelime var: “Pazartesi.” Gerisini o anlar. Bu konuştuklarımız da aramızda kalsın.', en: 'Mystery is the dust of a library. Here, give this card to your grandpa. There is only one word on it: “Monday.” He will understand the rest. And let what we said stay between us.',
          words: [['kart', 'card'], ['kelime', 'word'], ['pazartesi', 'Monday']],
          options: [{ tr: 'Aramızda kalsın.', en: 'Between us.', do: ['give:kart', 'quest'] }] },
      },
    },
  },
};
