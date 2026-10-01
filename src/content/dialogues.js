import { nextTale, taleNodes, TALES } from './tales.js';

/**
 * Conversation graphs. `start(ctx)` picks the entry node from the game state
 * (quest ids are unique, so most characters simply switch on `ctx.q`).
 *
 * Node types (see DialogueController):
 *   choice (default) — options: [{ tr, en, next?, do?, wrong? }]
 *   listen — like choice, but `say` is only heard until answered
 *   order  — answer: 'sentence to rebuild'
 *   speak  — expect: ['accepted', ...], show?: 'what to read'
 */
export const DIALOGUES = {
  muhtar: {
    start: (ctx) => {
      if (ctx.q === 'letter' && ctx.has('mektup')) return 'm1';
      if (ctx.q === 'sat-muhtar') return 'wedding';
      return ctx.q === 'go-school' ? 'school' : 'idle';
    },
    nodes: {
      m1: { ask: 'speak', say: 'Hoş geldin evlat! Elindeki ne?', en: "Welcome, kid! What's that in your hand?", words: [['göndermek', 'to send']],
        expect: ['Dedem bu mektubu gönderdi', 'Dedem mektup gönderdi', 'Dedemden mektup'], show: 'Dedem bu mektubu gönderdi.', showEn: 'My grandpa sent this letter.', next: 'm2' },
      m2: { ask: 'listen', say: 'Cumartesi köyde düğün var! Dedene söyle, herkes davetli.', en: "There's a wedding in the village on Saturday! Tell your grandpa, everyone is invited.",
        prompt: 'Muhtar mektubu okudu. Ne dedi?', words: [['cumartesi', 'Saturday'], ['düğün', 'wedding'], ['davetli', 'invited']],
        options: [
          { tr: 'Pazar günü okul yok.', en: 'No school on Sunday.', wrong: true },
          { tr: 'Cumartesi köyde düğün var.', en: "There's a wedding in the village on Saturday.", next: 'm3' },
          { tr: 'Cuma günü pazar kurulacak.', en: 'There will be a market on Friday.', wrong: true },
        ] },
      m3: { say: 'Dedene selam söyle!', en: 'Say hello to your grandpa for me!', words: [['selam söylemek', 'to send regards']],
        options: [{ tr: 'Söylerim muhtar amca!', en: 'I will, uncle muhtar!', do: ['take:mektup', 'flag:letter-delivered'] }] },
      wedding: { say: 'Cumartesi köyde düğün var! Meydanda hazırlık yapıyoruz. Arkadaşlarınla da eğlenebilirsin.', en: 'There is a wedding in the village on Saturday! We are preparing in the square. You can have fun with your friends too.', words: [['düğün', 'wedding'], ['hazırlık', 'preparation'], ['eğlenmek', 'to have fun']], options: [{ tr: 'Çok güzel! Yardım ederim.', en: 'Great! I will help.', do: ['quest'] }] },
      idle: { say: 'Hoş geldin evlat! Ben köyün muhtarı Hasan.', en: "Welcome, kid! I'm Hasan, the village headman.", words: [['köy', 'village'], ['meydan', 'square'], ['muhtar', 'village headman']],
        options: [{ tr: 'Merhaba muhtar amca!', en: 'Hello, uncle muhtar!' }] },
      school: { say: 'Okul yolu bahçe kapısından. Geç kalma!', en: "The way to school is through the garden gate. Don't be late!", words: [['yol', 'road / way'], ['geç kalmak', 'to be late']],
        options: [{ tr: 'Teşekkür ederim muhtar amca!', en: 'Thank you, uncle muhtar!' }] },
    },
  },

  bakkal: {
    start: (ctx) => (ctx.q === 'buy' && !ctx.has('sut') ? 'b1' : 'shop'),
    nodes: {
      b1: { ask: 'order', say: 'Hoş geldin Ahmet! Ne istiyorsun?', en: 'Welcome Ahmet! What would you like?', words: [['istemek', 'to want']],
        answer: 'Bir ekmek ve bir süt lütfen.', answerEn: 'A bread and a milk, please.', next: 'b2' },
      b2: { ask: 'listen', say: 'Ekmek on lira, süt on beş lira.', en: 'Bread is ten lira, milk is fifteen lira.', prompt: 'Dinle: toplam kaç lira?',
        hint: '10 + 15 = 25 (yirmi beş)', words: [['on', 'ten'], ['on beş', 'fifteen'], ['lira', 'lira (money)'], ['toplam', 'total']],
        options: [
          { tr: 'Otuz lira.', en: 'Thirty lira.', wrong: true },
          { tr: 'Yirmi beş lira.', en: 'Twenty-five lira.', next: 'b3' },
          { tr: 'On beş lira.', en: 'Fifteen lira.', wrong: true },
        ] },
      b3: { say: 'Evet, yirmi beş lira. Buyur, ekmeğin ve sütün.', en: "Yes, twenty-five lira. Here's your bread and milk.", words: [['yirmi beş', 'twenty-five']],
        options: [{ tr: 'Buyurun, otuz lira.', en: 'Here you are, thirty lira.', next: 'b4' }] },
      b4: { say: 'Teşekkürler. Paranın üstü beş lira. Annene selam söyle!', en: "Thanks. Your change is five lira. Say hello to your mom!", words: [['paranın üstü', 'change (money)'], ['beş', 'five']],
        options: [{ tr: 'Teşekkür ederim, iyi akşamlar!', en: 'Thank you, good evening!', do: ['take:para:25', 'give:ekmek', 'give:sut'] }] },
      shop: { say: 'Hoş geldin! Bakkalda ekmek, süt, peynir ve zeytin var.', en: 'Welcome! The shop has bread, milk, cheese and olives.',
        words: [['bakkal', 'grocer'], ['ekmek', 'bread'], ['süt', 'milk'], ['peynir', 'cheese'], ['zeytin', 'olive']],
        options: [{ tr: 'Bir ekmek lütfen.', en: 'One bread, please.' }, { tr: 'Sadece bakıyorum.', en: "I'm just looking." }] },
    },
  },

  anne: {
    start(ctx) {
      switch (ctx.q) {
        case 'talk-mom': return 'bored';
        case 'take-jacket': return 'jacketWhere';
        case 'go-out': return 'goOut';
        case 'tomatoes': return ctx.count('domates') >= 3 ? 'tomAsk' : 'tomWait';
        case 'thanks-mom': return 'br1';
        case 'laundry-listen': return 'ln1';
        case 'laundry': return ctx.count('camasir') >= 3 ? 'lq' : 'lw';
        case 'masal': return 'lm';
        case 'dinner-mom': return 'dm1';
        case 'mom-night': return 'n1';
        case 'take-book': return 'n3';
        case 'goodnight': return 'gn1';
        case 'sleep': return 'gn3';
        case 'wake': return 'm1';
        case 'homework': return 'hwGo';
        case 'wake-2': case 'morning-3': case 'morning-4': return 'm4';
        case 'talk-mom-weekend': return 'weekend';
        case 'show-mom': return 'hw1';
        case 'buy': return ctx.has('sut') ? 'shBack' : 'shRemind';
        default: break;
      }
      switch (ctx.chapter) {
        case 'd1-breakfast': return 'brIdle';
        case 'd1-dinner': return 'dmIdle';
        case 'd2-morning': return 'm4';
        default: return 'busy';
      }
    },
    nodes: {
      // --- Sunday morning ---
      bored: { say: 'Günaydın Ahmet! Neyin var? Neden üzgünsün?', en: "Good morning Ahmet! What's wrong? Why are you sad?", words: [['üzgün', 'sad'], ['günaydın', 'good morning']],
        options: [{ tr: 'Canım sıkılıyor.', en: "I'm bored.", next: 'b2' }, { tr: 'Televizyonda hiçbir şey yok.', en: "There's nothing on TV.", next: 'b2' }] },
      b2: { say: 'Dışarısı çok güzel! Deden bahçede. Git, ona yardım et.', en: "It's lovely outside! Grandpa is in the garden. Go help him.", words: [['dışarı', 'outside'], ['yardım etmek', 'to help']],
        options: [{ tr: 'Tamam anne!', en: 'Okay mom!', next: 'b3' }, { tr: 'Hava soğuk mu?', en: 'Is it cold?', next: 'b3' }] },
      b3: { say: 'Hava biraz soğuk. Önce montunu giy.', en: "It's a bit cold. Put on your jacket first.", words: [['soğuk', 'cold'], ['mont', 'jacket']],
        options: [{ tr: 'Montum nerede?', en: 'Where is my jacket?', next: 'b4' }] },
      b4: { say: 'Kapının yanında, askıda.', en: 'Next to the door, on the hanger.', words: [['kapı', 'door'], ['yanında', 'next to'], ['askı', 'hanger']],
        options: [{ tr: 'Tamam.', en: 'Okay.', next: 'quiz' }] },
      quiz: { say: 'Söyle bakalım: Montun nerede?', en: "Tell me then: where's your jacket?", hint: 'kapı = door',
        options: [
          { tr: 'Mutfakta.', en: 'In the kitchen.', wrong: true },
          { tr: 'Kapının yanında.', en: 'Next to the door.', next: 'b6', do: ['quest'] },
          { tr: 'Bahçede.', en: 'In the garden.', wrong: true },
        ] },
      b6: { say: 'Aferin! Hadi, montunu al.', en: 'Well done! Go on, take your jacket.', words: [['aferin', 'well done']], options: [{ tr: 'Tamam anne!', en: 'Okay mom!' }] },
      jacketWhere: { say: 'Montun kapının yanında, askıda.', en: 'Your jacket is next to the door, on the hanger.', options: [{ tr: 'Tamam.', en: 'Okay.' }] },
      goOut: { say: 'Mont sana çok yakışmış! Hadi, dışarı çık.', en: 'The jacket looks great on you! Go on, go outside.', words: [['yakışmak', 'to suit, look good on']],
        options: [{ tr: 'Görüşürüz anne!', en: 'See you mom!' }] },
      busy: { say: 'Sofrayı hazırlıyorum. Deden bahçede, baban arabanın yanında.', en: "I'm setting the table. Grandpa is in the garden, dad is by the car.", words: [['sofra', 'dining table / spread']],
        options: [{ tr: 'Kolay gelsin anne!', en: 'Take it easy mom! (said to someone working)' }] },
      tomWait: { say: 'Domatesler nerede? Bahçeden üç tane topla.', en: 'Where are the tomatoes? Pick three from the garden.', words: [['üç', 'three'], ['toplamak', 'to pick']],
        options: [{ tr: 'Tamam, topluyorum.', en: "Okay, I'm picking them." }] },
      tomAsk: { say: 'Domatesleri getirdin mi? Kaç tane?', en: 'Did you bring the tomatoes? How many?', hint: 'üç = three',
        options: [
          { tr: 'İki domates getirdim.', en: 'I brought two tomatoes.', wrong: true },
          { tr: 'Beş domates getirdim.', en: 'I brought five tomatoes.', wrong: true },
          { tr: 'Üç domates getirdim.', en: 'I brought three tomatoes.', next: 'tom2', do: ['take:domates', 'quest'] },
        ] },
      tom2: { say: 'Aferin oğlum! Kahvaltı hazır. Herkes sofraya!', en: 'Well done son! Breakfast is ready. Everyone to the table!', words: [['hazır', 'ready']],
        options: [{ tr: 'Afiyet olsun!', en: 'Enjoy the meal!', do: ['chapter'] }] },

      // --- breakfast ---
      br1: { ask: 'speak', say: 'Kahvaltı nasıldı? Beğendin mi?', en: 'How was breakfast? Did you like it?', words: [['beğenmek', 'to like']],
        expect: ['Çok güzeldi, eline sağlık anne', 'Eline sağlık anne', 'Çok güzeldi eline sağlık', 'Eline sağlık'], show: 'Çok güzeldi, eline sağlık anne!', showEn: 'It was lovely, bless your hands mom!',
        next: 'br2' },
      br2: { say: 'Afiyet olsun oğlum! Öğleden sonra bana yardım edersin, değil mi?', en: "Enjoy, son! You'll help me in the afternoon, won't you?", words: [['öğleden sonra', 'afternoon']],
        options: [{ tr: 'Tabii anne!', en: 'Of course, mom!', do: ['quest', 'chapter'] }] },
      brIdle: { say: 'Afiyet olsun! Peynir de ye, zeytin de ye.', en: 'Enjoy! Eat some cheese and olives too.', words: [['peynir', 'cheese'], ['zeytin', 'olive']],
        options: [{ tr: 'Teşekkürler anne.', en: 'Thanks mom.' }] },

      // --- afternoon: listening check ---
      ln1: { ask: 'listen', say: 'Ahmet, ipteki çamaşırları topla: çorap, havlu ve gömlek.', en: 'Ahmet, collect the laundry on the line: sock, towel and shirt.',
        prompt: 'Annen ne istiyor? Dinle ve seç.', words: [['çamaşır', 'laundry'], ['ip', 'rope / line'], ['çorap', 'sock'], ['havlu', 'towel'], ['gömlek', 'shirt']],
        options: [
          { tr: 'Domatesleri toplamamı istiyor.', en: 'She wants me to pick the tomatoes.', wrong: true },
          { tr: 'Çamaşırları toplamamı istiyor.', en: 'She wants me to collect the laundry.', next: 'ln2' },
          { tr: 'Televizyonu kapatmamı istiyor.', en: 'She wants me to switch off the TV.', wrong: true },
        ] },
      ln2: { say: 'Evet! İpte üç şey var. Hepsini bana getir.', en: 'Yes! There are three things on the line. Bring them all to me.', words: [['hepsi', 'all of them']],
        options: [{ tr: 'Hemen topluyorum!', en: "I'm collecting them right away!", do: ['quest'] }] },
      lw: { say: 'İpte çorap, havlu ve gömlek var. Hepsini getir.', en: 'There is a sock, a towel and a shirt on the line. Bring them all.', options: [{ tr: 'Tamam anne.', en: 'Okay mom.' }] },
      lq: { ask: 'order', say: 'Aferin! Söyle bakalım, ne getirdin?', en: 'Well done! Tell me, what did you bring?', answer: 'Çorap, havlu ve gömlek getirdim.', answerEn: 'I brought a sock, a towel and a shirt.', prompt: 'Cümleyi kur:',
        next: 'ln3', do: ['take:camasir', 'quest'] },
      ln3: { say: 'Çok yardımseversin! Deden seni çağırıyor, sana bir masal anlatacak.', en: "You're so helpful! Grandpa is calling you, he'll tell you a tale.", words: [['yardımsever', 'helpful']],
        options: [{ tr: 'Masal mı? Yaşasın!', en: 'A tale? Hooray!' }] },
      lm: { say: 'Deden asmanın altında seni bekliyor.', en: 'Grandpa is waiting for you under the vine.', options: [{ tr: 'Gidiyorum!', en: "I'm going!" }] },

      // --- dinner ---
      dm1: { ask: 'listen', say: 'Çorba çok sıcak, dikkat et!', en: 'The soup is very hot, be careful!', prompt: 'Annen ne dedi?', words: [['sıcak', 'hot'], ['dikkat etmek', 'to be careful']],
        options: [
          { tr: 'The soup is cold, eat it quickly!', en: '', wrong: true },
          { tr: 'The soup is very hot, be careful!', en: '', next: 'dm2' },
          { tr: 'The bread is hot, be careful!', en: '', wrong: true },
        ] },
      dm2: { ask: 'speak', say: 'Mercimek çorbası nasıl olmuş?', en: 'How did the lentil soup turn out?', words: [['mercimek', 'lentil'], ['lezzetli', 'delicious']],
        expect: ['Çok lezzetli olmuş', 'Çok lezzetli', 'Çok güzel olmuş', 'Harika olmuş'], show: 'Çok lezzetli olmuş!', showEn: 'It turned out very delicious!',
        next: 'dm3' },
      dm3: { say: 'Afiyet olsun canım!', en: 'Enjoy it, dear!', options: [{ tr: 'Eline sağlık anne!', en: 'Bless your hands, mom!', do: ['quest', 'chapter'] }] },
      dmIdle: { say: 'Çorbanı iç, soğumasın.', en: "Drink your soup before it gets cold.", words: [['içmek', 'to drink'], ['soğumak', 'to get cold']],
        options: [{ tr: 'Tamam anne.', en: 'Okay mom.' }] },

      // --- night ---
      n1: { say: 'Saat dokuz buçuk. Yarın okul var!', en: "It's half past nine. There's school tomorrow!", words: [['saat', 'hour / clock'], ['buçuk', 'half past'], ['yarın', 'tomorrow']],
        options: [{ tr: 'Yarın pazartesi mi?', en: 'Is tomorrow Monday?', next: 'n2' }] },
      n2: { say: 'Evet, pazartesi. Kitabını çantana koy. Kitabın rafta.', en: 'Yes, Monday. Put your book in your bag. Your book is on the shelf.', words: [['pazartesi', 'Monday'], ['çanta', 'bag'], ['raf', 'shelf']],
        options: [{ tr: 'Tamam anne.', en: 'Okay mom.', do: ['quest'] }] },
      n3: { say: 'Kitabın rafta, kırmızı kapaklı olan.', en: 'Your book is on the shelf, the one with the red cover.', words: [['kırmızı', 'red'], ['kapak', 'cover']],
        options: [{ tr: 'Buluyorum.', en: "I'll find it." }] },
      gn1: { ask: 'speak', say: 'Hadi, yatma zamanı. Bana ne diyorsun?', en: 'Come on, bedtime. What do you say to me?', words: [['yatmak', 'to go to bed'], ['zaman', 'time']],
        expect: ['İyi geceler anne', 'İyi geceler'], show: 'İyi geceler anne!', showEn: 'Good night mom!', next: 'gn2' },
      gn2: { say: 'İyi geceler oğlum. Tatlı rüyalar!', en: 'Good night son. Sweet dreams!', words: [['iyi geceler', 'good night'], ['rüya', 'dream'], ['tatlı', 'sweet']],
        options: [{ tr: 'Sana da anne!', en: 'You too, mom!', do: ['quest'] }] },
      gn3: { say: 'Hadi yatağına! Uyku vakti.', en: 'Off to bed! Sleep time.', words: [['yatak', 'bed'], ['uyku', 'sleep']], options: [{ tr: 'Tamam.', en: 'Okay.' }] },

      // --- homework evening ---
      hwGo: { say: 'Hoş geldin oğlum! Okul nasıldı? Hadi, önce ödevini yap. Masanda çalış.', en: 'Welcome home son! How was school? Come on, do your homework first. Work at your desk.', words: [['ödev', 'homework'], ['masa', 'desk / table']],
        options: [{ tr: 'Tamam anne, hemen yapıyorum.', en: "Okay mom, I'm doing it right away." }] },
      hw1: { ask: 'speak', say: 'Ödevini yaptın mı?', en: 'Did you do your homework?', words: [['yapmak', 'to do']],
        expect: ['Evet, ödevimi yaptım', 'Ödevimi yaptım', 'Evet yaptım'], show: 'Evet, ödevimi yaptım!', showEn: 'Yes, I did my homework!', next: 'hw2' },
      hw2: { say: 'Aferin sana! Çok çalışkansın. Bir ricam var: bakkaldan bir ekmek ve bir süt alır mısın? Al, otuz lira.', en: "Well done! You're so hard-working. I have a favour to ask: will you buy a bread and a milk at the grocer? Here, thirty lira.",
        words: [['rica', 'favour / request'], ['bakkal', 'grocer'], ['otuz', 'thirty'], ['para', 'money']],
        options: [{ tr: 'Tamam anne, hemen giderim!', en: "Okay mom, I'll go right away!", do: ['give:para:30', 'quest', 'credits:2'] }] },
      shRemind: { say: 'Bakkal köy meydanında. Avludan doğuya, sağa doğru yürü. Ekmek ve süt, unutma!', en: "The grocer is in the village square. Walk east from the yard, to the right. Bread and milk, don't forget!",
        words: [['doğu', 'east'], ['sağ', 'right']], options: [{ tr: 'Unutmam!', en: "I won't forget!" }] },
      shBack: { say: 'Ekmeği ve sütü aldın mı? Aferin! Paranın üstü ne kadar?', en: 'Did you get the bread and milk? Great! How much change is there?', hint: '30 − 25 = 5',
        options: [
          { tr: 'On lira.', en: 'Ten lira.', wrong: true },
          { tr: 'Beş lira.', en: 'Five lira.', next: 'shDone' },
          { tr: 'Yirmi lira.', en: 'Twenty lira.', wrong: true },
        ] },
      shDone: { say: 'Hesabın çok iyi! Beş lira senin olsun, harçlık. Deden de seni çağırıyor.', en: 'Your maths is great! Keep the five lira, pocket money. Grandpa is calling you too.',
        words: [['hesap', 'maths / bill'], ['harçlık', 'pocket money']],
        options: [{ tr: 'Teşekkürler anne!', en: 'Thanks mom!', do: ['take:ekmek', 'take:sut', 'quest'] }] },
      warnTvHomework: { say: 'Ahmet! Ödevin varken televizyon izlenmez. Önce ödev, sonra oyun!', en: 'Ahmet! No TV while you have homework. Homework first, then play!', words: [['ödev', 'homework'], ['önce', 'first']],
        options: [{ tr: 'Tamam anne, ödevimi yapıyorum.', en: "Okay mom, I'm doing my homework.", next: 'sorry' }, { tr: 'Ama sadece beş dakika!', en: 'But only five minutes!', next: 'noBut' }] },

      // --- house rules (opened by FreeActionSystem) ---
      warnTvMeal: { say: 'Ahmet! Sofrada televizyon izlenmez. Kapat onu!', en: "Ahmet! We don't watch TV at the table. Switch it off!", words: [['kapatmak', 'to switch off']],
        options: [{ tr: 'Tamam anne, kapatıyorum.', en: "Okay mom, I'm switching it off.", next: 'sorry' }, { tr: 'Ama çizgi film var!', en: "But there's a cartoon on!", next: 'noBut' }] },
      warnTvWork: { say: 'Ahmet! İşin bitmedi, televizyon sonra!', en: "Ahmet! Your job isn't done, TV later!", words: [['iş', 'job / work'], ['sonra', 'later']],
        options: [{ tr: 'Haklısın anne.', en: "You're right, mom.", next: 'sorry' }, { tr: 'Beş dakika, lütfen!', en: 'Five minutes, please!', next: 'noBut' }] },
      warnTvNight: { say: 'Saat çok geç! Televizyon yok, yatağa!', en: "It's very late! No TV, to bed!", words: [['geç', 'late']],
        options: [{ tr: 'Peki anne.', en: 'All right, mom.', next: 'sorry' }] },
      noBut: { say: 'Aması yok! Önce kurallar.', en: 'No buts! Rules first.', words: [['kural', 'rule']],
        options: [{ tr: 'Peki…', en: 'Okay…', next: 'sorry' }] },
      sorry: { ask: 'speak', say: 'Ne diyoruz?', en: 'What do we say?', expect: ['Özür dilerim anne', 'Özür dilerim'], show: 'Özür dilerim anne.', showEn: "I'm sorry, mom.",
        words: [['özür dilerim', "I'm sorry"]], next: 'forgive' },
      forgive: { say: 'Aferin, seni seviyorum. Hadi, işine dön.', en: 'Good, I love you. Go on, back to your job.', words: [['sevmek', 'to love']],
        options: [{ tr: 'Ben de seni seviyorum anne!', en: 'I love you too, mom!' }] },

      // --- Monday morning ---
      m1: { ask: 'order', say: 'Günaydın uykucu! İyi uyudun mu?', en: 'Good morning sleepyhead! Did you sleep well?', words: [['uykucu', 'sleepyhead'], ['uyumak', 'to sleep']],
        answer: 'Günaydın anne, çok iyi uyudum.', answerEn: 'Good morning mom, I slept very well.', next: 'm2' },
      m2: { ask: 'listen', say: 'Okul saat dokuzda başlıyor. Geç kalma!', en: "School starts at nine. Don't be late!", prompt: 'Okul saat kaçta başlıyor?', words: [['başlamak', 'to start'], ['geç kalmak', 'to be late'], ['dokuz', 'nine']],
        options: [
          { tr: 'Saat sekizde.', en: 'At eight.', wrong: true },
          { tr: 'Saat dokuzda.', en: 'At nine.', next: 'm3' },
          { tr: 'Saat onda.', en: 'At ten.', wrong: true },
        ] },
      m3: { say: 'Aferin! Montunu giy, bahçe kapısından okula git.', en: 'Well done! Put on your jacket and go to school through the garden gate.', words: [['okul', 'school']],
        options: [{ tr: 'Görüşürüz anne!', en: 'See you mom!', do: ['quest'] }] },
      nightChat: { say: 'Yarın yine okul var. Erken yatarsan sabah dinç kalkarsın.', en: 'School is tomorrow again. If you go to bed early, you will wake up fresh.', words: [['erken', 'early'], ['dinç', 'fresh / energetic']], options: [{ tr: 'İyi geceler dede!', en: 'Good night grandpa!', do: ['quest'] }] },
      midweekChat: { say: 'Yarın bahçede domateslere bakacağım. Hafta sonu da arkadaşlarınla buluşursun.', en: 'I will check the tomatoes tomorrow. At the weekend you can meet your friends.', words: [['yarın', 'tomorrow'], ['hafta sonu', 'weekend']], options: [{ tr: 'Tamam dede!', en: 'Okay grandpa!', do: ['quest'] }] },
      sunChat: { say: 'Güzel bir hafta geçirdin. Şimdi biraz dinlenip arkadaşlarının yanına gidebilirsin.', en: 'You had a good week. Now you can rest a little and go see your friends.', words: [['hafta', 'week'], ['dinlenmek', 'to rest']], options: [{ tr: 'Teşekkürler dede!', en: 'Thanks grandpa!', do: ['quest'] }] },
      weekend: { say: 'Cumartesi arkadaşlarınla buluşabilirsin. Pazar günü de ailece bahçede olalım.', en: 'You can meet your friends on Saturday. On Sunday let’s spend time in the garden as a family.', words: [['cumartesi', 'Saturday'], ['pazar', 'Sunday']], options: [{ tr: 'Tamam anne!', en: 'Okay mom!', do: ['quest'] }] },
      m4: { say: 'Okula geç kalma! Yol bahçe kapısından.', en: "Don't be late for school! The way is through the garden gate.", options: [{ tr: 'Tamam anne!', en: 'Okay mom!', do: ['quest'] }] },
    },
  },

  dede: {
    start(ctx) {
      switch (ctx.q) {
        case 'talk-mom': case 'take-jacket': case 'go-out': case 'talk-dede': return 'd1';
        case 'bucket': return ctx.has('kova') ? 'dq' : 'dw';
        case 'bread': return 'br1';
        case 'talk-dede-night': return 'nightChat';
        case 'talk-dede-3': return 'midweekChat';
        case 'sun-dede': return 'sunChat';
        case 'bring-bread': return ctx.has('ekmek') ? 'br3' : 'brW';
        case 'laundry-listen': case 'laundry': return 'later';
        case 'masal': return 'kazan.start';
        case 'letter':
          if (ctx.flag('letter-delivered')) return 'ltBack';
          return ctx.has('mektup') ? 'ltWait' : 'lt1';
        default: return nextTale(ctx) ?? 'allTold';
      }
    },
    nodes: {
      d1: { say: 'Ahmet! Hoş geldin evladım. Montun çok güzel!', en: 'Ahmet! Welcome my child. Your jacket is lovely!', words: [['hoş geldin', 'welcome'], ['evladım', 'my child']],
        options: [{ tr: 'Teşekkürler dede! Ne yapıyorsun?', en: 'Thanks grandpa! What are you doing?', next: 'd2' }] },
      d2: { say: 'Domates ekiyorum. Ama su lazım. Kovayı getirir misin?', en: 'I am planting tomatoes. But I need water. Will you bring the bucket?', words: [['domates', 'tomato'], ['su', 'water'], ['kova', 'bucket'], ['lazım', 'needed']],
        options: [{ tr: 'Tabii dede! Kova nerede?', en: 'Sure! Where is the bucket?', next: 'd3' }] },
      d3: { say: 'Evin yanında, çeşmenin önünde.', en: 'Next to the house, in front of the tap.', words: [['çeşme', 'tap / fountain'], ['önünde', 'in front of']],
        options: [{ tr: 'Hemen getiriyorum!', en: "I'm bringing it right away!", do: ['quest:talk-dede'] }] },
      dw: { say: 'Kova evin yanında, çeşmenin önünde.', en: 'The bucket is next to the house, in front of the tap.', options: [{ tr: 'Tamam dede.', en: 'Okay grandpa.' }] },
      dq: { say: 'Aa, getirdin mi? Söyle bakalım, bu ne?', en: 'Oh, did you bring it? Tell me, what is this?', hint: 'kova = bucket',
        options: [
          { tr: 'Bu bir araba.', en: 'This is a car.', wrong: true },
          { tr: 'Bu bir kova.', en: 'This is a bucket.', next: 'd5', do: ['take:kova', 'quest'] },
          { tr: 'Bu bir elma.', en: 'This is an apple.', wrong: true },
        ] },
      d5: { say: 'Aferin! Şimdi babana git, seni çağırıyor.', en: 'Well done! Now go to your dad, he is calling you.', words: [['çağırmak', 'to call']], options: [{ tr: 'Tamam dede!', en: 'Okay grandpa!' }] },

      // --- breakfast ---
      br1: { ask: 'listen', say: 'Ahmet, bana ekmek getirir misin?', en: 'Ahmet, will you bring me some bread?', prompt: 'Deden ne istiyor?', words: [['ekmek', 'bread'], ['getirmek', 'to bring']],
        options: [
          { tr: 'Çay istiyor.', en: 'He wants tea.', wrong: true },
          { tr: 'Ekmek istiyor.', en: 'He wants bread.', next: 'br2' },
          { tr: 'Su istiyor.', en: 'He wants water.', wrong: true },
        ] },
      br2: { say: 'Ekmek mutfakta, tezgahın üstünde.', en: 'The bread is in the kitchen, on the counter.', words: [['mutfak', 'kitchen'], ['tezgah', 'counter']],
        options: [{ tr: 'Hemen getiriyorum!', en: "I'm bringing it right away!", do: ['quest'] }] },
      brW: { say: 'Ekmek mutfakta, tezgahın üstünde.', en: 'The bread is in the kitchen, on the counter.', options: [{ tr: 'Tamam dede.', en: 'Okay grandpa.' }] },
      br3: { ask: 'speak', say: 'Getirdin mi? Ver bakalım.', en: 'Did you bring it? Let me have it.', expect: ['Buyurun dede', 'Buyur dede', 'Buyurun'], show: 'Buyurun dede.', showEn: 'Here you are, grandpa.',
        words: [['buyurun', 'here you are (polite)']], next: 'br4' },
      br4: { say: 'Sağ ol evladım! Ne kibar çocuksun.', en: 'Thank you my child! What a polite kid you are.', words: [['sağ ol', 'thanks'], ['kibar', 'polite']],
        options: [{ tr: 'Afiyet olsun dede!', en: 'Enjoy, grandpa!', do: ['take:ekmek', 'quest'] }] },

      lt1: { say: 'Ahmet, gel evladım. Bu mektubu muhtara götürür müsün? Muhtar köy meydanında, beyaz binada.', en: 'Ahmet, come my child. Will you take this letter to the muhtar? He is in the village square, at the white building.',
        words: [['mektup', 'letter'], ['götürmek', 'to take (somewhere)'], ['beyaz', 'white']],
        options: [{ tr: 'Tabii dede, hemen götürüyorum!', en: "Of course grandpa, I'm taking it right away!", do: ['give:mektup'] }] },
      ltWait: { say: 'Mektubu muhtara verdin mi? Muhtar meydanda, beyaz binanın önünde.', en: 'Did you give the letter to the muhtar? He is in the square, in front of the white building.',
        options: [{ tr: 'Gidiyorum dede.', en: "I'm going, grandpa." }] },
      ltBack: { ask: 'order', say: 'Geldin mi evladım? Muhtar ne dedi?', en: 'You are back, my child? What did the muhtar say?',
        answer: 'Cumartesi köyde düğün var.', answerEn: "There's a wedding in the village on Saturday.", next: 'ltEnd' },
      ltEnd: { say: 'Düğün mü? Ne güzel! Davul zurna çalar, hep beraber halay çekeriz.', en: 'A wedding? How lovely! The drum and pipe will play and we will all dance the halay together.',
        words: [['davul', 'drum'], ['zurna', 'folk pipe'], ['halay', 'circle folk dance']],
        options: [{ tr: 'Ben de halay çekeceğim!', en: "I'll dance the halay too!", do: ['quest'] }] },
      later: { say: 'Önce annene yardım et. Sonra gel, sana güzel bir masal anlatacağım.', en: "Help your mom first. Then come, I'll tell you a nice tale.", options: [{ tr: 'Tamam dede!', en: 'Okay grandpa!' }] },
      allTold: { say: 'Bütün masallarımı anlattım! Hangisini tekrar dinlemek istersin?', en: 'I have told all my tales! Which one would you like to hear again?',
        options: TALES.map((t) => ({ tr: t.title, en: '', next: `${t.id}.start` })) },
      ...taleNodes(),
    },
  },

  baba: {
    start(ctx) {
      switch (ctx.q) {
        case 'talk-mom': case 'take-jacket': case 'go-out': case 'talk-dede': case 'bucket': return 'wait';
        case 'talk-dad': return 'b1';
        case 'talk-baba-tools': return 'tools';
        case 'wrench': return ctx.has('anahtar') ? 'bq' : 'bw';
        case 'talk-baba-tools': return 'tools';
        case 'tea': return 't1';
        case 'dinner-dad': return 'dn1';
        default: break;
      }
      switch (ctx.chapter) {
        case 'd1-breakfast': case 'd1-dinner': return 'meal';
        case 'd1-afternoon': return 'carOk';
        case 'd1-night': return 'tv';
        default: return 'idle';
      }
    },
    nodes: {
      wait: { say: 'Merhaba oğlum! Önce dedene yardım et.', en: 'Hi son! Help your grandpa first.', words: [['önce', 'first']], options: [{ tr: 'Tamam baba.', en: 'Okay dad.' }] },
      b1: { say: 'Ahmet, gel! Lastik patladı. Anahtarı bulur musun?', en: 'Ahmet, come! A tire burst. Can you find the wrench?', words: [['lastik', 'tire'], ['anahtar', 'wrench / key']],
        options: [{ tr: 'Anahtar nerede?', en: 'Where is the wrench?', next: 'b2' }] },
      b2: { say: 'Üzüm asmasının altında, masanın üstünde.', en: 'Under the grapevine, on the table.', words: [['altında', 'under'], ['masa', 'table'], ['üstünde', 'on']],
        options: [{ tr: 'Buluyorum!', en: "I'll find it!", do: ['quest:talk-dad'] }] },
      bw: { say: 'Anahtar masanın üstünde, asmanın altında.', en: 'The wrench is on the table, under the vine.', options: [{ tr: 'Tamam.', en: 'Okay.' }] },
      bq: { say: 'Buldun mu? Aferin! Anahtar neredeydi?', en: 'Did you find it? Great! Where was the wrench?', hint: 'masa = table, üstünde = on',
        options: [
          { tr: 'Arabanın içindeydi.', en: 'It was in the car.', wrong: true },
          { tr: 'Evdeydi.', en: 'It was at home.', wrong: true },
          { tr: 'Masanın üstündeydi.', en: 'It was on the table.', next: 'b4', do: ['take:anahtar', 'quest'] },
        ] },
      b4: { say: 'Sen bir tanesin! Annen domates istiyor. Bahçeden üç domates topla, eve götür.', en: "You're the best! Mom wants tomatoes. Pick three tomatoes from the garden and take them home.", words: [['istemek', 'to want'], ['üç', 'three']],
        options: [{ tr: 'Tamam baba!', en: 'Okay dad!' }] },
      tools: { say: 'Bugün alet çantasını düzenledim. Hafta sonu arabaya bakacağız.', en: 'I organized the toolbox today. We will look at the car on the weekend.', words: [['alet', 'tool'], ['çanta', 'bag'], ['düzenlemek', 'to organize']], options: [{ tr: 'Ben de yardım ederim baba.', en: 'I will help too, dad.', do: ['quest'] }] },
      idle: { say: 'Araba neredeyse hazır!', en: 'The car is almost ready!', words: [['neredeyse', 'almost']], options: [{ tr: 'Kolay gelsin baba!', en: 'Take it easy dad!' }] },

      // --- breakfast: build the sentence ---
      t1: { ask: 'order', say: 'Oğlum, çay ister misin?', en: 'Son, would you like some tea?', words: [['çay', 'tea'], ['bardak', 'glass']],
        answer: 'Evet, bir bardak çay lütfen.', answerEn: 'Yes, a glass of tea please.', next: 't2' },
      t2: { say: 'Buyur. Şeker ister misin?', en: 'Here you go. Would you like sugar?', words: [['şeker', 'sugar']],
        options: [{ tr: 'Hayır, teşekkürler.', en: 'No, thanks.', next: 't3' }, { tr: 'Evet, bir tane lütfen.', en: 'Yes, one please.', next: 't3' }] },
      t3: { say: 'Afiyet olsun!', en: 'Enjoy!', options: [{ tr: 'Teşekkürler baba!', en: 'Thanks dad!', do: ['quest'] }] },
      meal: { say: 'Annen çok güzel yemek yapıyor, değil mi?', en: 'Your mom cooks really well, right?', words: [['yemek yapmak', 'to cook']],
        options: [{ tr: 'Evet, çok güzel!', en: 'Yes, very good!' }] },
      carOk: { say: 'Araba çalışıyor! Senin sayende.', en: 'The car is running! Thanks to you.', words: [['çalışmak', 'to work / run'], ['sayende', 'thanks to you']],
        options: [{ tr: 'Rica ederim baba!', en: "You're welcome, dad!" }] },

      // --- dinner: tell about your day ---
      dn1: { ask: 'speak', say: 'Ahmet, bugün ne yaptın?', en: 'Ahmet, what did you do today?', prompt: 'Babana anlat! Mesela:', words: [['bugün', 'today'], ['yapmak', 'to do']],
        expect: ['Dedeme yardım ettim', 'Babama yardım ettim', 'Anneme yardım ettim', 'Domates topladım', 'Çamaşırları topladım', 'Masal dinledim', 'Kova getirdim'],
        show: 'Dedeme yardım ettim.', showEn: 'I helped my grandpa. (or: Domates topladım. / Masal dinledim.)', next: 'dn2' },
      dn2: { say: 'Aferin! Çok çalışkansın.', en: "Well done! You're very hard-working.", words: [['çalışkan', 'hard-working']],
        options: [{ tr: 'Teşekkürler baba!', en: 'Thanks dad!', do: ['quest'] }] },
      tv: { say: 'Haberleri izliyorum. Sen de yat, geç oldu.', en: "I'm watching the news. You go to bed too, it's late.", words: [['haber', 'news'], ['izlemek', 'to watch'], ['geç', 'late']],
        options: [{ tr: 'İyi geceler baba!', en: 'Good night dad!' }] },
    },
  },

  elif: {
    start: (ctx) => {
      if (['friend-plan', 'chat-weekend', 'sat-elif', 'sun-friends'].includes(ctx.q)) return 'friendMeet';
      return ctx.q === 'meet-elif' ? 'e1' : ctx.loc === 'classroom' ? 'eClass' : 'eIdle';
    },
    nodes: {
      friendMeet: { say: 'Hafta sonu yaklaşıyor! Cumartesi köy meydanında buluşalım mı?', en: 'The weekend is coming! Shall we meet at the village square on Saturday?', words: [['buluşmak', 'to meet'], ['hafta sonu', 'weekend']], options: [{ tr: 'Tabii, buluşalım!', en: 'Sure, let’s meet!', do: ['quest'] }] },
      e1: { ask: 'speak', say: 'Merhaba! Sen yeni misin? Adın ne?', en: "Hi! Are you new? What's your name?", words: [['yeni', 'new'], ['ad', 'name']],
        expect: ['Benim adım Ahmet', 'Adım Ahmet', 'Ben Ahmet'], show: 'Benim adım Ahmet.', showEn: 'My name is Ahmet.', next: 'e2' },
      e2: { say: 'Memnun oldum Ahmet! Ben Elif. Bu da Can, o çok komik.', en: "Nice to meet you Ahmet! I'm Elif. This is Can, he's very funny.", words: [['memnun oldum', 'nice to meet you']],
        options: [{ tr: 'Ben de memnun oldum!', en: 'Nice to meet you too!', next: 'e3' }] },
      e3: { say: 'Hadi, ders başlıyor! Sınıf kapısı orada.', en: "Come on, the lesson is starting! The classroom door is there.", words: [['ders', 'lesson'], ['sınıf', 'classroom']],
        options: [{ tr: 'Hadi gidelim!', en: "Let's go!", do: ['quest'] }] },
      eClass: { say: 'Öğretmenimiz çok iyi, değil mi?', en: "Our teacher is very nice, isn't she?", words: [['öğretmen', 'teacher']],
        options: [{ tr: 'Evet, çok iyi!', en: 'Yes, very nice!' }] },
      eIdle: { say: 'Teneffüste top oynayalım mı?', en: 'Shall we play ball at break time?', words: [['teneffüs', 'break (school)']],
        options: [{ tr: 'Olur!', en: 'Sure!' }] },
    },
  },

  can: {
    start: (ctx) => (ctx.q === 'sat-can' ? 'friendMeet' : 'c1'),
    nodes: {
      friendMeet: { say: 'Bugün çok güzel! Biraz top oynayalım mı?', en: 'Today is great! Shall we play ball?', words: [['oynamak', 'to play']], options: [{ tr: 'Evet, oynayalım!', en: 'Yes, let’s play!', do: ['quest'] }] },
      c1: { ask: 'listen', say: 'Bugün matematik dersi var mı?', en: 'Is there a maths lesson today?', prompt: 'Can ne soruyor?', words: [['matematik', 'maths'], ['bugün', 'today']],
        options: [
          { tr: 'Bugün matematik dersi var mı?', en: 'Is there a maths lesson today?', next: 'c2' },
          { tr: 'Bugün hava güzel mi?', en: 'Is the weather nice today?', wrong: true },
          { tr: 'Matematik kitabın var mı?', en: 'Do you have a maths book?', wrong: true },
        ] },
      c2: { say: 'Ben matematiği çok seviyorum. Sen hangi dersi seviyorsun?', en: 'I love maths. Which lesson do you like?', words: [['sevmek', 'to love / like']],
        options: [{ tr: 'Ben Türkçeyi seviyorum.', en: 'I like Turkish.' }, { tr: 'Ben de matematiği seviyorum.', en: 'I like maths too.' }] },
    },
  },

  zehra: {
    start: (ctx) => (ctx.q === 'sat-zehra' ? 'friendMeet' : 'z1'),
    nodes: {
      friendMeet: { say: 'Ben de geldim! Yarın için bir planımız var mı?', en: 'I’m here too! Do we have a plan for tomorrow?', words: [['plan', 'plan'], ['yarın', 'tomorrow']], options: [{ tr: 'Yarın yine buluşalım.', en: 'Let’s meet again tomorrow.', do: ['quest'] }] },
      z1: { say: 'Merhaba! Kalemin var mı? Benimki kayboldu.', en: 'Hi! Do you have a pencil? Mine got lost.', words: [['kalem', 'pencil'], ['kaybolmak', 'to get lost']],
        options: [{ tr: 'Al, benim kalemimi kullan.', en: 'Here, use my pencil.', next: 'z2' }, { tr: 'Maalesef yok.', en: "Sorry, I don't.", next: 'z3' }] },
      z2: { say: 'Çok teşekkür ederim! Çok naziksin.', en: "Thank you so much! You're very kind.", words: [['nazik', 'kind']], options: [{ tr: 'Rica ederim.', en: "You're welcome." }] },
      z3: { say: 'Olsun, öğretmenden isterim.', en: "Never mind, I'll ask the teacher.", options: [{ tr: 'Tamam.', en: 'Okay.' }] },
    },
  },

  ogretmen: {
    start: (ctx) => (['teacher-2', 'teacher-3'].includes(ctx.q) ? 'dailyTask' : ctx.q === 'homework-assign' ? 't1' : ctx.q === 'lesson' ? 'tWait' : 'tIdle'),
    nodes: {
      dailyTask: { say: 'Bugün de güzel çalıştın. Evde kısa bir tekrar yapman yeterli.', en: 'You worked well today too. A short review at home is enough.', words: [['tekrar', 'review'], ['yeterli', 'enough']], options: [{ tr: 'Tamam öğretmenim!', en: 'Okay, teacher!', do: ['quest'] }] },
      tWait: { say: 'Hoş geldin! Yerine otur, ders başlıyor.', en: 'Welcome! Take your seat, the lesson is starting.', options: [{ tr: 'Tamam öğretmenim.', en: 'Okay, teacher.' }] },
      t1: { say: 'Ahmet, bugün çok güzel çalıştın! Ödevin: kitabındaki Ünite 1.', en: 'Ahmet, you worked really well today! Your homework: Unit 1 in your book.', words: [['ödev', 'homework'], ['ünite', 'unit'], ['çalışmak', 'to work / study']],
        options: [{ tr: 'Tamam öğretmenim! Evde yaparım.', en: "Okay teacher! I'll do it at home.", next: 't2' }] },
      t2: { ask: 'speak', say: 'Okuldan çıkarken ne diyoruz?', en: 'What do we say when we leave school?', expect: ['Hoşça kalın öğretmenim', 'Hoşça kalın', 'Görüşürüz öğretmenim'], show: 'Hoşça kalın öğretmenim!', showEn: 'Goodbye, teacher!',
        words: [['hoşça kalın', 'goodbye (said by the one leaving)']], next: 't3' },
      t3: { say: 'Güle güle Ahmet! Yarın görüşürüz.', en: 'Bye Ahmet! See you tomorrow.', words: [['güle güle', 'goodbye (said to the one leaving)']],
        options: [{ tr: 'Yarın görüşürüz!', en: 'See you tomorrow!', do: ['quest'] }] },
      tIdle: { say: 'Yarın görüşürüz, ödevini unutma!', en: "See you tomorrow, don't forget your homework!", options: [{ tr: 'Unutmam!', en: "I won't!" }] },
    },
  },
};
