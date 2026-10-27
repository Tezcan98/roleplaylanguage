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
  bakkal: {
    start: (ctx) => {
      if (ctx.q === 'letter' && ctx.has('mektup')) return 'm1';
      if (ctx.q === 'sat-bakkal') return 'wedding';
      if (ctx.q === 'wedding-congrats') return 'wed1';
      if (ctx.q === 'wedding-halay' || ctx.q === 'wedding-home') return 'wedIdle';
      return ctx.q === 'buy' && !ctx.has('sut') ? 'b1' : 'shop';
    },
    nodes: {
      // grandpa's letter: the grocer's son is getting married
      m1: { ask: 'speak', say: 'Hoş geldin evlat! Elindeki ne?', en: "Welcome, kid! What's that in your hand?", words: [['göndermek', 'to send']],
        expect: ['Dedem bu mektubu gönderdi', 'Dedem mektup gönderdi', 'Dedemden mektup'], show: 'Dedem bu mektubu gönderdi.', showEn: 'My grandpa sent this letter.', next: 'm2' },
      m2: { ask: 'listen', say: 'Cumartesi oğlumun düğünü var! Dedene söyle, herkes davetli.', en: "My son's wedding is on Saturday! Tell your grandpa, everyone is invited.",
        prompt: 'Recep amca mektubu okudu. Ne dedi?', words: [['cumartesi', 'Saturday'], ['düğün', 'wedding'], ['davetli', 'invited'], ['oğul', 'son']],
        options: [
          { tr: 'Pazar günü okul yok.', en: 'No school on Sunday.', wrong: true },
          { tr: 'Cumartesi köyde düğün var.', en: "There's a wedding in the village on Saturday.", next: 'm3' },
          { tr: 'Cuma günü pazar kurulacak.', en: 'There will be a market on Friday.', wrong: true },
        ] },
      m3: { say: 'Dedene selam söyle!', en: 'Say hello to your grandpa for me!', words: [['selam söylemek', 'to send regards']],
        options: [{ tr: 'Söylerim Recep amca!', en: 'I will, uncle Recep!', do: ['take:mektup', 'flag:letter-delivered'] }] },
      wedding: { say: 'Bu akşam oğlumun düğünü var! Şimdi hazırlık yapıyoruz. Akşam meydanda davul zurna çalacak, hep birlikte halay çekeceğiz. Sen de gel!', en: "Tonight is my son's wedding! We are getting ready now. In the evening the drum and zurna will play in the square, and we'll all dance the halay together. You come too!", words: [['düğün', 'wedding'], ['davul', 'drum'], ['zurna', 'zurna (a shrill folk pipe)']], options: [{ tr: 'Hayırlı olsun Recep amca! Gelirim.', en: "Congratulations, uncle Recep! I'll come.", do: ['quest'] }, { tr: 'Yardım edebilir miyim?', en: 'Can I help?', next: 'weddingHelp' }] },
      weddingHelp: { say: 'Sağ ol evlat! Sen akşam erken gel, halayda ilk sen dur. Kolay gelsin bana dersen o da yeter!', en: 'Thanks, kid! Come early in the evening and be the first in the halay. Saying “kolay gelsin” to me is help enough!', options: [{ tr: 'Kolay gelsin Recep amca!', en: 'Take it easy, uncle Recep!', next: 'weddingSagol' }] },
      weddingSagol: { say: 'Sağ ol, sağ ol! Akşam görüşürüz.', en: 'Thanks, thanks! See you tonight.', options: [{ tr: 'Görüşürüz!', en: 'See you!', do: ['quest'] }] },
      wed1: { say: 'Gel evlat, düğünümüze hoş geldin!', en: 'Come, kid, welcome to our wedding!', words: [['gelin', 'bride'], ['damat', 'groom'], ['Allah mesut etsin', 'may God make them happy (said to a family at a wedding)']],
        options: [{ tr: 'Hoş bulduk! Allah mesut etsin Recep amca.', en: 'Glad to be here! May God make them happy, uncle Recep.', next: 'wed2' }, { tr: 'Hoş bulduk! Gelin ile damat çok güzel olmuş.', en: 'Glad to be here! The bride and groom look lovely.', next: 'wed2' }] },
      wed2: { say: 'Amin, sağ ol evlat! Bak, herkes çeşmenin önünde halay çekiyor. Sen de katıl!', en: "Amen, thank you, kid! Look, everyone is dancing the halay in front of the fountain. You join in too!", words: [['halay çekmek', 'to dance the halay']],
        options: [{ tr: 'Hemen katılıyorum!', en: "I'm joining right away!", do: ['quest'] }, { tr: 'Halay nasıl çekilir?', en: 'How do you dance the halay?', next: 'wed3' }] },
      wed3: { say: 'Çok kolay! Yan yana durursunuz, serçe parmaklarınızı tutarsınız. Davula göre sağa iki adım, sola bir adım!', en: 'Very easy! You stand side by side and hold each other’s little fingers. With the drum: two steps right, one step left!', words: [['adım', 'step'], ['serçe parmak', 'little finger']],
        options: [{ tr: 'Anladım, hadi!', en: 'Got it, come on!', do: ['quest'] }] },
      wedIdle: { say: 'Hadi, halay seni bekliyor!', en: 'Come on, the halay is waiting for you!', options: [{ tr: 'Geliyorum!', en: "I'm coming!" }] },
      b1: { ask: 'order', say: 'Hoş geldin! Ne vereyim?', en: 'Welcome! What can I get you?', words: [['vermek', 'to give']],
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
        options: [{ tr: 'Teşekkür ederim!', en: 'Thank you!', do: ['take:para:25', 'give:ekmek', 'give:sut'], next: 'bp1' }, { tr: 'Sağ olun Recep amca!', en: 'Thank you, uncle Recep!', do: ['take:para:25', 'give:ekmek', 'give:sut'], next: 'bp1' }] },
      // the flag on his awning: Palestine (after the first shopping, day 2)
      bp1: { say: 'Brandamdaki bayrağı gördün mü? O Filistin bayrağı.', en: 'Did you see the flag on my awning? That is the flag of Palestine.', words: [['bayrak', 'flag'], ['branda', 'awning']],
        options: [{ tr: 'Gördüm! Neden astınız?', en: 'I saw it! Why did you hang it?', next: 'bp2' }] },
      bp2: { say: 'Filistin’deki kardeşlerimizi unutmamak için. Orada çocuklar bir ekmek bile zor buluyor. Biz ekmeğimizi alırken onları da düşünelim, onlar için dua edelim.', en: 'So that we never forget our brothers and sisters in Palestine. There, children can hardly find even a loaf of bread. When we buy our bread, let us think of them too and pray for them.',
        words: [['unutmak', 'to forget'], ['düşünmek', 'to think (of)'], ['dua etmek', 'to pray (make a supplication)']],
        options: [{ tr: 'Ben de onlar için dua ediyorum.', en: 'I pray for them too.', next: 'bp3' }, { tr: 'Çok üzücü Recep amca.', en: 'It is very sad, uncle Recep.', next: 'bp3' }] },
      bp3: { say: 'Allah onların yardımcısı olsun. Hadi evlat, annen seni bekliyor. İyi akşamlar!', en: 'May Allah help them. Off you go, kid, your mom is waiting for you. Good evening!', words: [['yardımcı', 'helper']],
        options: [{ tr: 'Amin! İyi akşamlar!', en: 'Amen! Good evening!' }] },
      // shopping: the shop window with the shelves (prices, paid from the bag)
      shop: { say: 'Hoş geldin! Ne istersin? Ekmek, süt, simit, ayran, peynir, yumurta… hepsi taze.', en: 'Welcome! What would you like? Bread, milk, simit, ayran, cheese, eggs… all fresh.',
        words: [['bakkal', 'grocer'], ['taze', 'fresh'], ['istemek', 'to want']],
        options: [
          { tr: 'Hoş bulduk! Rafa bakayım.', en: 'Glad to be here! Let me look at the shelves.', do: ['market:bakkal'] }, // the shop window (ui/MarketView.js)
          { tr: 'Hoş bulduk, sadece bakıyorum.', en: "Glad to be here, I'm just looking." },
        ] },
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
        case 'wake-2': return 'mGreet';
        case 'morning-3': return 'mGreet3';
        case 'morning-4': return 'mGreet4';
        case 'talk-mom-weekend': return 'weekend';
        case 'wedding-congrats': case 'wedding-halay': return 'wedMom';
        case 'wedding-home': return 'wedHome';
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
      // you come home from the park: mom called you
      bored: { say: 'Günaydın oğlum, geldin mi? Parkta eğlendin mi?', en: 'Good morning, son, are you back? Did you have fun in the park?', words: [['günaydın', 'good morning'], ['eğlenmek', 'to have fun']],
        options: [{ tr: 'Evet, çok eğlendim!', en: 'Yes, I had a lot of fun!', next: 'b2' }, { tr: 'Evet, ama şimdi canım sıkılıyor.', en: "Yes, but now I'm bored.", next: 'b2' }] },
      b2: { say: 'Deden bahçede, yardıma ihtiyacı var. Git, ona yardım et.', en: 'Grandpa is in the garden, he needs help. Go and help him.', words: [['ihtiyaç', 'need'], ['yardım etmek', 'to help']],
        options: [{ tr: 'Tamam anne!', en: 'Okay mom!', next: 'b3' }, { tr: 'Hava soğuk mu?', en: 'Is it cold?', next: 'b3' }] },
      b3: { say: 'Hava biraz soğuk. Önce montunu giy.', en: "It's a bit cold. Put on your jacket first.", words: [['soğuk', 'cold'], ['mont', 'jacket']],
        options: [{ tr: 'Montum nerede?', en: 'Where is my jacket?', next: 'b4' }, { tr: 'Tamam, giyiyorum. Nerede?', en: "Okay, I'm putting it on. Where is it?", next: 'b4' }] },
      b4: { say: 'Kapının yanında, askıda.', en: 'Next to the door, on the hanger.', words: [['kapı', 'door']],
        options: [{ tr: 'Tamam.', en: 'Okay.', next: 'quiz' }, { tr: 'Teşekkürler anne.', en: 'Thanks mom.', next: 'quiz' }] },
      quiz: { say: 'Söyle bakalım: Montun nerede?', en: "Tell me then: where's your jacket?", hint: 'Nerede? → -da / -de: kapının yanında',
        options: [
          { tr: 'Kapının yanına.', en: 'To (beside) the door. — “nerede?” wants -da, not -a', wrong: true },
          { tr: 'Kapının yanında.', en: 'Next to the door.', next: 'b6', do: ['quest'] },
          { tr: 'Mutfakta.', en: 'In the kitchen.', wrong: true },
        ] },
      b6: { say: 'Aferin! Hadi, montunu al.', en: 'Well done! Go on, take your jacket.', words: [['aferin', 'well done']], options: [{ tr: 'Tamam anne!', en: 'Okay mom!' }, { tr: 'Hemen alıyorum!', en: "I'm getting it right away!" }] },
      wedMom: { say: 'Ne güzel bir düğün! Önce Recep amcayı tebrik et, sonra halaya katıl.', en: 'What a lovely wedding! First congratulate uncle Recep, then join the halay.', options: [{ tr: 'Tamam anne!', en: 'Okay mom!' }] },
      wedHome: { say: 'Maşallah, çok güzel halay çektin! Geç oldu, hadi eve gidelim.', en: 'Well done, you danced the halay beautifully! It is late, come on, let’s go home.', words: [['geç', 'late']],
        options: [{ tr: 'Hadi gidelim. Çok eğlendim!', en: "Let's go. I had so much fun!", do: ['quest'] }, { tr: 'Biraz daha kalalım mı?', en: 'Shall we stay a little longer?', next: 'wedLate' }] },
      wedLate: { say: 'Yarın erken kalkacağız oğlum. Hadi, herkese iyi geceler de.', en: 'We will get up early tomorrow, son. Come on, say good night to everyone.', options: [{ tr: 'İyi geceler herkese!', en: 'Good night, everyone!', do: ['quest'] }] },
      jacketWhere: { say: 'Montun kapının yanında, askıda.', en: 'Your jacket is next to the door, on the hanger.', options: [{ tr: 'Tamam.', en: 'Okay.' }] },
      goOut: { say: 'Mont sana çok yakışmış! Hadi, dışarı çık.', en: 'The jacket looks great on you! Go on, go outside.', words: [['yakışmak', 'to suit, look good on']],
        options: [{ tr: 'Görüşürüz anne!', en: 'See you mom!' }, { tr: 'Hoşça kal anne!', en: 'Bye, mom!' }, { tr: 'Teşekkürler anne!', en: 'Thanks mom!' }] },
      busy: { say: 'Sofrayı hazırlıyorum. Deden bahçede, baban arabanın yanında.', en: "I'm setting the table. Grandpa is in the garden, dad is by the car.", words: [['sofra', 'dining table / spread']],
        options: [{ tr: 'Kolay gelsin anne!', en: 'Take it easy mom! (said to someone working)' }] },
      tomWait: { say: 'Domatesler nerede? Bahçeden üç tane topla.', en: 'Where are the tomatoes? Pick three from the garden.', words: [['üç', 'three'], ['toplamak', 'to pick']],
        options: [{ tr: 'Tamam, topluyorum.', en: "Okay, I'm picking them." }, { tr: 'Hemen getiriyorum!', en: "I'll bring them right away!" }] },
      tomAsk: { say: 'Domatesleri getirdin mi? Kaç tane?', en: 'Did you bring the tomatoes? How many?', hint: 'Sayıdan sonra çoğul eki gelmez: üç domates (“üç domatesler” değil).',
        options: [
          { tr: 'Üç domatesler getirdim.', en: 'I brought three tomatoes. — no -ler after a number', wrong: true },
          { tr: 'İki domates getirdim.', en: 'I brought two tomatoes.', wrong: true },
          { tr: 'Üç domates getirdim.', en: 'I brought three tomatoes.', next: 'tom2', do: ['take:domates', 'quest'] },
        ] },
      tom2: { say: 'Aferin oğlum! Kahvaltı hazır. Herkes sofraya!', en: 'Well done son! Breakfast is ready. Everyone to the table!', 
        options: [{ tr: 'Afiyet olsun!', en: 'Enjoy the meal!', do: ['chapter'] }, { tr: 'Yaşasın, çok acıktım!', en: "Hooray, I'm very hungry!", do: ['chapter'] }] },

      // --- breakfast ---
      br1: { ask: 'speak', say: 'Kahvaltı nasıldı? Beğendin mi?', en: 'How was breakfast? Did you like it?', words: [['eline sağlık', 'bless your hands (thanks for food someone made)']],
        expect: ['Çok güzeldi, eline sağlık anne', 'Eline sağlık anne', 'Çok güzeldi eline sağlık', 'Eline sağlık'], show: 'Çok güzeldi, eline sağlık anne!', showEn: 'It was lovely, bless your hands mom!',
        next: 'br2' },
      br2: { say: 'Afiyet olsun oğlum! Öğleden sonra bana yardım edersin, değil mi?', en: "Enjoy, son! You'll help me in the afternoon, won't you?", 
        options: [{ tr: 'Tabii anne!', en: 'Of course, mom!', do: ['quest', 'chapter'] }, { tr: 'Olur. Ne yapacağız?', en: 'Sure. What will we do?', do: ['quest', 'chapter'] }] },
      brIdle: { say: 'Afiyet olsun! Peynir de ye, zeytin de ye.', en: 'Enjoy! Eat some cheese and olives too.', words: [['peynir', 'cheese'], ['zeytin', 'olive']],
        options: [{ tr: 'Teşekkürler anne.', en: 'Thanks mom.' }] },

      // --- afternoon: listening check ---
      ln1: { ask: 'listen', say: 'Oğlum, ipteki çamaşırları topla: çorap, havlu ve gömlek.', en: 'Son, collect the laundry on the line: sock, towel and shirt.',
        prompt: 'Annen ne dedi? Dinle ve seç.', words: [['çamaşır', 'laundry'], ['çorap', 'sock'], ['havlu', 'towel'], ['gömlek', 'shirt']],
        options: [
          { tr: '“Domatesleri topla.”', en: '“Pick the tomatoes.”', wrong: true },
          { tr: '“Çamaşırları topla.”', en: '“Collect the laundry.”', next: 'ln2' },
          { tr: '“Televizyonu kapat.”', en: '“Switch off the TV.”', wrong: true },
        ] },
      ln2: { say: 'Evet! İpte üç şey var. Hepsini bana getir.', en: 'Yes! There are three things on the line. Bring them all to me.', 
        options: [{ tr: 'Hemen topluyorum!', en: "I'm collecting them right away!", do: ['quest'] }, { tr: 'Tamam anne, getiriyorum.', en: "Okay mom, I'm bringing them.", do: ['quest'] }] },
      lw: { say: 'İpte çorap, havlu ve gömlek var. Hepsini getir.', en: 'There is a sock, a towel and a shirt on the line. Bring them all.', options: [{ tr: 'Tamam anne.', en: 'Okay mom.' }] },
      lq: { ask: 'order', say: 'Aferin! Söyle bakalım, ne getirdin?', en: 'Well done! Tell me, what did you bring?', answer: 'Çorap, havlu ve gömlek getirdim.', answerEn: 'I brought a sock, a towel and a shirt.', prompt: 'Cümleyi kur:',
        next: 'ln3', do: ['take:camasir', 'quest'] },
      ln3: { say: 'Maşallah, çok yardımcı oldun! Teşekkür ederim oğlum. Akşama kadar biraz dinlen.', en: 'Well done, you were a great help! Thank you, son. Rest a little until the evening.', words: [['yardımcı olmak', 'to be a help']],
        options: [{ tr: 'Rica ederim anne!', en: "You're welcome, mom!", do: ['chapter'] }, { tr: 'Başka işin var mı?', en: 'Is there anything else to do?', next: 'ln4' }] },
      ln4: { say: 'Yok oğlum, sağ ol. Akşam yemeğinde görüşürüz.', en: 'No, son, thank you. See you at dinner.', words: [['sağ ol', 'thanks']],
        options: [{ tr: 'Tamam anne.', en: 'Okay mom.', do: ['chapter'] }] },
      lm: { say: 'Deden sedirde seni bekliyor, sana bir masal anlatacak.', en: 'Grandpa is waiting for you on the sofa, he will tell you a tale.', options: [{ tr: 'Gidiyorum!', en: "I'm going!" }] },

      // --- dinner ---
      dm1: { ask: 'listen', optionsAreMeanings: true, say: 'Çorba çok sıcak, dikkat et!', en: 'The soup is very hot, be careful!', prompt: 'Annen ne dedi?', words: [['sıcak', 'hot']],
        options: [
          { tr: 'The soup is cold, eat it quickly!', en: '', wrong: true },
          { tr: 'The soup is very hot, be careful!', en: '', next: 'dm2' },
          { tr: 'The bread is hot, be careful!', en: '', wrong: true },
        ] },
      dm2: { ask: 'speak', say: 'Mercimek çorbası nasıl olmuş?', en: 'How did the lentil soup turn out?', words: [['lezzetli', 'delicious']],
        expect: ['Çok lezzetli olmuş', 'Çok lezzetli', 'Çok güzel olmuş', 'Harika olmuş'], show: 'Çok lezzetli olmuş!', showEn: 'It turned out very delicious!',
        next: 'dm3' },
      dm3: { say: 'Afiyet olsun canım!', en: 'Enjoy it, dear!', options: [{ tr: 'Eline sağlık anne!', en: 'Bless your hands, mom!', do: ['quest', 'chapter'] }] },
      dmIdle: { say: 'Çorbanı iç, soğumasın.', en: "Drink your soup before it gets cold.", words: [['içmek', 'to drink'], ['soğumak', 'to get cold']],
        options: [{ tr: 'Tamam anne.', en: 'Okay mom.' }] },

      // --- night ---
      n1: { say: 'Saat dokuz buçuk. Yarın okul var!', en: "It's half past nine. There's school tomorrow!", words: [['yarın', 'tomorrow']],
        options: [{ tr: 'Yarın pazartesi mi?', en: 'Is tomorrow Monday?', next: 'n2' }] },
      n2: { say: 'Evet, pazartesi. Kitabını çantana koy. Kitabın rafta.', en: 'Yes, Monday. Put your book in your bag. Your book is on the shelf.', words: [['çanta', 'bag']],
        options: [{ tr: 'Tamam anne.', en: 'Okay mom.', do: ['quest'] }] },
      n3: { say: 'Kitabın rafta, kırmızı kapaklı olan.', en: 'Your book is on the shelf, the one with the red cover.', words: [['kırmızı', 'red'], ['kapak', 'cover']],
        options: [{ tr: 'Buluyorum.', en: "I'll find it." }] },
      gn1: { ask: 'speak', say: 'Hadi, yatma zamanı. Bana ne diyorsun?', en: 'Come on, bedtime. What do you say to me?', words: [['yatmak', 'to go to bed']],
        expect: ['İyi geceler anne', 'İyi geceler'], show: 'İyi geceler anne!', showEn: 'Good night mom!', next: 'gn2' },
      gn2: { say: 'İyi geceler oğlum. Tatlı rüyalar!', en: 'Good night son. Sweet dreams!', words: [['iyi geceler', 'good night'], ['Allah rahatlık versin', 'sleep well (lit. may God give you rest)']],
        options: [{ tr: 'Sana da anne!', en: 'You too, mom!', do: ['quest'] }, { tr: 'İyi geceler anne, Allah rahatlık versin.', en: 'Good night mom, sleep well.', do: ['quest'] }] },
      gn3: { say: 'Hadi yatağına! Uyku vakti.', en: 'Off to bed! Sleep time.', words: [['yatak', 'bed'], ['uyku', 'sleep']], options: [{ tr: 'Tamam.', en: 'Okay.' }] },

      // --- homework evening ---
      hwGo: { say: 'Hoş geldin oğlum! Okul nasıldı? Hadi, önce ödevini yap. Masanda çalış.', en: 'Welcome home son! How was school? Come on, do your homework first. Work at your desk.', words: [['ödev', 'homework'], ['masa', 'desk / table']],
        options: [{ tr: 'Tamam anne, hemen yapıyorum.', en: "Okay mom, I'm doing it right away." }] },
      hw1: { ask: 'speak', say: 'Ödevini yaptın mı?', en: 'Did you do your homework?', words: [['ödev', 'homework']],
        expect: ['Evet, ödevimi yaptım', 'Ödevimi yaptım', 'Evet yaptım'], show: 'Evet, ödevimi yaptım!', showEn: 'Yes, I did my homework!', next: 'hw2' },
      hw2: { say: 'Aferin sana! Çok çalışkansın. Bir ricam var: bakkaldan bir ekmek ve bir süt alır mısın? Al, otuz lira.', en: "Well done! You're so hard-working. I have a favour to ask: will you buy a bread and a milk at the grocer? Here, thirty lira.",
        words: [['bakkal', 'grocer'], ['para', 'money']],
        options: [{ tr: 'Tamam anne, hemen giderim!', en: "Okay mom, I'll go right away!", do: ['give:para:30', 'quest', 'credits:2'] }] },
      shRemind: { say: 'Bakkal köy meydanında. Bahçe kapısından çık, meydana git. Ekmek ve süt, unutma!', en: "The grocer is in the village square. Go out of the garden gate to the square. Bread and milk, don't forget!",
        words: [['meydan', 'square'], ['çıkmak', 'to go out']], options: [{ tr: 'Unutmam!', en: "I won't forget!" }, { tr: 'Tamam anne, gidiyorum.', en: "Okay mom, I'm going." }] },
      shBack: { say: 'Ekmeği ve sütü aldın mı? Aferin! Paranın üstü ne kadar?', en: 'Did you get the bread and milk? Great! How much change is there?', hint: '30 − 25 = 5',
        options: [
          { tr: 'On lira.', en: 'Ten lira.', wrong: true },
          { tr: 'Beş lira.', en: 'Five lira.', next: 'shDone' },
          { tr: 'Yirmi lira.', en: 'Twenty lira.', wrong: true },
        ] },
      shDone: { say: 'Hesabın çok iyi! Beş lira senin olsun, harçlık. Deden de seni çağırıyor.', en: 'Your maths is great! Keep the five lira, pocket money. Grandpa is calling you too.',
        words: [['harçlık', 'pocket money']],
        options: [{ tr: 'Teşekkürler anne!', en: 'Thanks mom!', do: ['take:ekmek', 'take:sut', 'quest'] }, { tr: 'Sağ ol anne!', en: 'Thanks, mom!', do: ['take:ekmek', 'take:sut', 'quest'] }] },
      warnTvHomework: { say: 'Oğlum! Ödevin varken televizyon izlenmez. Önce ödev, sonra oyun!', en: 'Son! No TV while you have homework. Homework first, then play!', words: [['ödev', 'homework'], ['önce', 'first']],
        options: [{ tr: 'Tamam anne, ödevimi yapıyorum.', en: "Okay mom, I'm doing my homework.", next: 'sorry' }, { tr: 'Ama sadece beş dakika!', en: 'But only five minutes!', next: 'noBut' }] },

      // --- house rules (opened by FreeActionSystem) ---
      warnTvMeal: { say: 'Oğlum! Sofrada televizyon izlenmez. Kapat onu!', en: "Son! We don't watch TV at the table. Switch it off!", words: [['kapatmak', 'to switch off']],
        options: [{ tr: 'Tamam anne, kapatıyorum.', en: "Okay mom, I'm switching it off.", next: 'sorry' }, { tr: 'Ama çizgi film var!', en: "But there's a cartoon on!", next: 'noBut' }] },
      warnTvWork: { say: 'Oğlum! İşin bitmedi, televizyon sonra!', en: "Son! Your job isn't done, TV later!", words: [['iş', 'job / work'], ['sonra', 'later']],
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
      m1: { ask: 'order', say: 'Günaydın uykucu! İyi uyudun mu?', en: 'Good morning sleepyhead! Did you sleep well?', words: [['uyumak', 'to sleep']],
        answer: 'Günaydın anne, çok iyi uyudum.', answerEn: 'Good morning mom, I slept very well.', next: 'm2' },
      m2: { ask: 'listen', say: 'Okul saat dokuzda başlıyor. Geç kalma!', en: "School starts at nine. Don't be late!", prompt: 'Okul saat kaçta başlıyor?', words: [['geç kalmak', 'to be late']],
        options: [
          { tr: 'Saat sekizde.', en: 'At eight.', wrong: true },
          { tr: 'Saat dokuzda.', en: 'At nine.', next: 'm3' },
          { tr: 'Saat onda.', en: 'At ten.', wrong: true },
        ] },
      m3: { say: 'Aferin! Montunu giy, bahçe kapısından okula git.', en: 'Well done! Put on your jacket and go to school through the garden gate.', words: [['okul', 'school']],
        options: [{ tr: 'Görüşürüz anne!', en: 'See you mom!', do: ['quest'] }] },
      weekend: { say: 'Cumartesi arkadaşlarınla buluşabilirsin. Pazar günü de ailece bahçede olalım.', en: 'You can meet your friends on Saturday. On Sunday let’s spend time in the garden as a family.', words: [['cumartesi', 'Saturday'], ['pazar', 'Sunday']], options: [{ tr: 'Tamam anne!', en: 'Okay mom!', do: ['quest'] }] },
      m4: { say: 'Okula geç kalma! Yol bahçe kapısından.', en: "Don't be late for school! The way is through the garden gate.", options: [{ tr: 'Tamam anne!', en: 'Okay mom!' }] },
      mGreet: { say: 'Günaydın oğlum! Kahvaltını yaptın mı? Okula geç kalma.', en: "Good morning son! Did you have breakfast? Don't be late for school.", words: [['günaydın', 'good morning'], ['kahvaltı', 'breakfast']],
        options: [{ tr: 'Günaydın anne! Görüşürüz.', en: 'Good morning mom! See you.', do: ['quest'] }, { tr: 'Yaptım anne, okula gidiyorum.', en: "I did, mom, I'm going to school.", do: ['quest'] }] },
      mGreet3: { say: 'Günaydın! Çantanı hazırladın mı? Kalemini ve defterini unutma.', en: "Good morning! Have you packed your bag? Don't forget your pencil and notebook.", words: [['hazırlamak', 'to prepare'], ['unutmak', 'to forget']],
        options: [{ tr: 'Hazırladım anne.', en: "I've packed it, mom.", do: ['quest'] }, { tr: 'Kalemim nerede?', en: 'Where is my pencil?', next: 'mPen' }] },
      mPen: { say: 'Masanın üstünde, kitabının yanında. Hadi, geç kalma!', en: "On the table, next to your book. Come on, don't be late!", options: [{ tr: 'Buldum! Görüşürüz anne.', en: 'Found it! See you, mom.', do: ['quest'] }] },
      mGreet4: { say: 'Günaydın! Bugün cuma, okulun son günü. Hafta sonu ne yapacaksın?', en: "Good morning! Today is Friday, the last school day. What will you do at the weekend?", words: [['cuma', 'Friday'], ['hafta sonu', 'weekend']],
        options: [{ tr: 'Arkadaşlarımla oynayacağım!', en: 'I will play with my friends!', do: ['quest'] }, { tr: 'Dedeme yardım edeceğim.', en: 'I will help my grandpa.', do: ['quest'] }] },
    },
  },

  dede: {
    start(ctx) {
      switch (ctx.q) {
        case 'talk-mom': case 'take-jacket': case 'go-out': case 'talk-dede': return 'd1';
        case 'bucket': return ctx.has('kova') ? 'dq' : 'dw';
        case 'bread': return 'br1';
        case 'bring-bread': return 'brW';
        case 'place-bread': return 'br3';
        case 'talk-dede-night': return 'nightChat';
        case 'talk-dede-3': return 'midweekChat';
        case 'dede-filistin': return 'fl1';
        case 'sun-dede': return 'sunChat';
        case 'laundry-listen': case 'laundry': return 'later';
        case 'masal': return 'kazan.start';
        case 'letter':
          if (ctx.flag('letter-delivered')) return 'ltBack';
          return ctx.has('mektup') ? 'ltWait' : 'lt1';
        default: return nextTale(ctx) ?? 'allTold';
      }
    },
    nodes: {
      d1: { say: 'Hoş geldin evladım! Bak, domatesler kızarmış, ne güzel olmuş!', en: 'Welcome, my child! Look, the tomatoes have turned red, how nice they are!', words: [['hoş geldin', 'welcome'], ['hoş bulduk', 'glad to be here (the answer to “hoş geldin”)']],
        options: [{ tr: 'Hoş bulduk dede! Ne yapıyorsun?', en: 'Glad to be here, grandpa! What are you doing?', next: 'd2' }, { tr: 'Hoş bulduk! Kolay gelsin dede.', en: 'Glad to be here! Take it easy, grandpa. (said to someone working)', next: 'd2k' }] },
      d2: { say: 'Domateslere su veriyorum. Ama kova lazım. Kovayı getirir misin?', en: 'I am watering the tomatoes. But I need the bucket. Will you bring the bucket?', words: [['domates', 'tomato'], ['kova', 'bucket']],
        options: [{ tr: 'Tabii dede! Kova nerede?', en: 'Sure! Where is the bucket?', next: 'd3' }, { tr: 'Olur. Kova nerede?', en: 'All right. Where is the bucket?', next: 'd3' }] },
      d2k: { say: 'Sağ ol evladım! Domateslere su veriyorum. Ama kova lazım. Kovayı getirir misin?', en: 'Thank you, my child! I am watering the tomatoes. But I need the bucket. Will you bring the bucket?', words: [['sağ ol', 'thanks (the answer to “kolay gelsin”)'], ['domates', 'tomato'], ['kova', 'bucket']],
        options: [{ tr: 'Tabii dede! Kova nerede?', en: 'Sure! Where is the bucket?', next: 'd3' }] },
      d3: { say: 'Evin yanında, çeşmenin önünde.', en: 'Next to the house, in front of the tap.', words: [['çeşme', 'tap / fountain']],
        options: [{ tr: 'Hemen getiriyorum!', en: "I'm bringing it right away!", do: ['quest:talk-dede'] }, { tr: 'Tamam dede, geliyorum.', en: "Okay grandpa, I'm coming.", do: ['quest:talk-dede'] }] },
      dw: { say: 'Kova evin yanında, çeşmenin önünde.', en: 'The bucket is next to the house, in front of the tap.', options: [{ tr: 'Tamam dede.', en: 'Okay grandpa.' }] },
      dq: { say: 'Aa, getirdin mi? Söyle bakalım, bu ne?', en: 'Oh, did you bring it? Tell me, what is this?', hint: 'kova = bucket',
        options: [
          { tr: 'Bu kovalar.', en: 'These are buckets. — but there is only one', wrong: true },
          { tr: 'Bu bir kova.', en: 'This is a bucket.', next: 'd5', do: ['take:kova', 'quest'] },
          { tr: 'Bu bir kovada.', en: 'This is in a bucket. — “bu ne?” wants no -da', wrong: true },
        ] },
      d5: { say: 'Aferin! Şimdi babana git, seni çağırıyor.', en: 'Well done! Now go to your dad, he is calling you.', options: [{ tr: 'Tamam dede!', en: 'Okay grandpa!' }, { tr: 'Hemen gidiyorum!', en: "I'm going right away!" }] },

      // --- breakfast ---
      br1: { ask: 'listen', say: 'Evladım, bana ekmek getirir misin?', en: 'My child, will you bring me some bread?', prompt: 'Deden ne istiyor?', words: [['ekmek', 'bread'], ['getirmek', 'to bring']],
        options: [
          { tr: 'Çay istiyor.', en: 'He wants tea.', wrong: true },
          { tr: 'Ekmek istiyor.', en: 'He wants bread.', next: 'br2' },
          { tr: 'Su istiyor.', en: 'He wants water.', wrong: true },
        ] },
      br2: { say: 'Ekmek mutfakta, tezgahın üstünde.', en: 'The bread is in the kitchen, on the counter.', words: [['mutfak', 'kitchen']],
        options: [{ tr: 'Hemen getiriyorum!', en: "I'm bringing it right away!", do: ['quest'] }, { tr: 'Tamam dede.', en: 'Okay grandpa.', do: ['quest'] }] },
      brW: { say: 'Ekmek mutfakta, tezgahın üstünde.', en: 'The bread is in the kitchen, on the counter.', options: [{ tr: 'Tamam dede.', en: 'Okay grandpa.' }] },
      br3: { ask: 'speak', say: 'Getirdin mi? Ver bakalım.', en: 'Did you bring it? Let me have it.', expect: ['Buyurun dede', 'Buyur dede', 'Buyurun'], show: 'Buyurun dede.', showEn: 'Here you are, grandpa.',
        words: [['buyurun', 'here you are (polite)']], next: 'br4' },
      br4: { say: 'Sağ ol evladım! Ne kibar çocuksun. Ekmeği sofranın ortasına koy, herkes alsın.', en: 'Thank you my child! What a polite kid you are. Put the bread in the middle of the table so everyone can have some.',
        words: [['sağ ol', 'thanks'], ['kibar', 'polite'], ['orta', 'middle']],
        options: [{ tr: 'Tamam dede!', en: 'Okay grandpa!' }] },

      lt1: { say: 'Gel evladım. Bu mektubu bakkal Recep amcaya götürür müsün? Dükkânı köy meydanında.', en: 'Come, my child. Will you take this letter to Recep the grocer? His shop is in the village square.',
        words: [['mektup', 'letter'], ['götürmek', 'to take (somewhere)']],
        options: [{ tr: 'Tabii dede, hemen götürüyorum!', en: "Of course grandpa, I'm taking it right away!", do: ['give:mektup'] }, { tr: 'Olur dede, şimdi götürürüm.', en: "All right grandpa, I'll take it now.", do: ['give:mektup'] }] },
      ltWait: { say: 'Mektubu Recep amcaya verdin mi? Bakkal dükkânı meydanda.', en: 'Did you give the letter to Recep? The grocer’s shop is in the square.',
        options: [{ tr: 'Gidiyorum dede.', en: "I'm going, grandpa." }] },
      ltBack: { ask: 'order', say: 'Geldin mi evladım? Recep amca ne dedi?', en: 'You are back, my child? What did Recep say?',
        answer: 'Cumartesi köyde düğün var.', answerEn: "There's a wedding in the village on Saturday.", next: 'ltEnd' },
      ltEnd: { say: 'Düğün mü? Ne güzel! Davul zurna çalar, hep beraber halay çekeriz.', en: 'A wedding? How lovely! The drum and pipe will play and we will all dance the halay together.',
        words: [['düğün', 'wedding']],
        options: [{ tr: 'Ben de halay çekeceğim!', en: "I'll dance the halay too!", do: ['quest'] }, { tr: 'Halayı bilmiyorum ama öğrenirim!', en: "I don't know the halay, but I'll learn!", do: ['quest'] }] },
      later: { say: 'Önce annene yardım et. Sonra gel, sana güzel bir masal anlatacağım.', en: "Help your mom first. Then come, I'll tell you a nice tale.", options: [{ tr: 'Tamam dede!', en: 'Okay grandpa!' }] },
      allTold: { say: 'Bütün masallarımı anlattım! Hangisini tekrar dinlemek istersin?', en: 'I have told all my tales! Which one would you like to hear again?',
        options: TALES.map((t) => ({ tr: t.title, en: '', next: `${t.id}.start` })) },
      // --- week chats (Monday night, Tuesday, Sunday) ---
      nightChat: { say: 'Yarın yine okul var. Erken yatarsan sabah dinç kalkarsın.', en: 'School is tomorrow again. If you go to bed early, you will wake up fresh.', words: [['erken', 'early']], options: [{ tr: 'İyi geceler dede!', en: 'Good night grandpa!', do: ['quest'] }, { tr: 'Sana da iyi geceler dede, Allah rahatlık versin.', en: 'Good night to you too, grandpa, sleep well.', do: ['quest'] }] },
      // Palestine (day 3, after the cauldron tale): we live in peace, Gaza's children don't; pray for them, and don't
      // be afraid to speak up against the oppression — against the oppression, never with bad words about people
      fl1: { say: 'Masal güzeldi, değil mi? Şimdi sana önemli bir şey anlatacağım evladım.', en: 'The tale was nice, wasn’t it? Now I will tell you something important, my child.', words: [['önemli', 'important']],
        options: [{ tr: 'Anlat dede, dinliyorum.', en: 'Tell me, grandpa, I am listening.', next: 'fl2' }] },
      fl2: { say: 'Biz burada huzur içindeyiz. Sıcak evimiz, sofrada yemeğimiz var; okula gidiyor, oyun oynuyoruz. Ama Filistin’de, Gazze’de çocuklar böyle yaşayamıyor.', en: 'Here we live in peace. We have a warm home and food on the table; we go to school and play. But in Palestine, in Gaza, children cannot live like this.',
        words: [['huzur', 'peace (of mind)'], ['Filistin', 'Palestine'], ['sofra', 'the meal spread / table']],
        options: [{ tr: 'Neden dede?', en: 'Why, grandpa?', next: 'fl3' }] },
      fl3: { say: 'Orada büyük bir zulüm var. Evler yıkılıyor, çok insan ölüyor, çocuklar aç ve susuz kalıyor. Buna soykırım diyorlar.', en: 'There is great oppression there. Homes are destroyed, many people are dying, children are left hungry and thirsty. People call it genocide.',
        words: [['zulüm', 'oppression, cruelty'], ['yıkılmak', 'to be destroyed'], ['aç', 'hungry'], ['soykırım', 'genocide']],
        options: [{ tr: 'Çok üzüldüm dede.', en: 'I am very sad, grandpa.', next: 'fl4' }, { tr: 'Biz ne yapabiliriz?', en: 'What can we do?', next: 'fl4' }] },
      fl4: { say: 'Önce elimizdekilere şükredeceğiz. Sonra dua edeceğiz. Her namazdan sonra Filistinli kardeşlerimiz için de dua et, olur mu?', en: 'First we will be thankful for what we have. Then we will pray. After every prayer, pray for our Palestinian brothers and sisters too, all right?',
        words: [['şükretmek', 'to give thanks (to God)'], ['dua etmek', 'to pray (make a supplication)'], ['kardeş', 'brother / sister']],
        options: [{ tr: 'Olur dede, dua edeceğim.', en: 'All right grandpa, I will pray.', next: 'fl5' }] },
      fl5: { say: 'Bir de şunu unutma: Zulmü görünce susma. İnternette, sosyal medyada doğruyu söylemekten korkma. Ama kimseye kötü söz söyleme; biz zulme karşıyız.', en: 'And don’t forget this: when you see oppression, don’t stay silent. Don’t be afraid to tell the truth on the internet and social media. But never say bad words to anyone; we are against oppression.',
        words: [['susmak', 'to stay silent'], ['doğru', 'the truth, right'], ['korkmak', 'to be afraid'], ['karşı olmak', 'to be against']],
        options: [{ tr: 'Anladım dede.', en: 'I understand, grandpa.', next: 'fl6' }] },
      fl6: { say: 'Söyle bakalım: Bir zulüm gördüğümüzde ne yaparız?', en: 'Tell me then: what do we do when we see oppression?', hint: 'dua, doğru',
        options: [
          { tr: 'Susarız.', en: 'We stay silent.', wrong: true },
          { tr: 'Dua ederiz, doğruyu söyleriz.', en: 'We pray and tell the truth.', next: 'fl7' },
          { tr: 'Unuturuz.', en: 'We forget it.', wrong: true },
        ] },
      fl7: { say: 'Aferin evladım. Allah bütün mazlumların yardımcısı olsun.', en: 'Well done, my child. May Allah help all the oppressed.', words: [['mazlum', 'the oppressed']],
        options: [{ tr: 'Amin dede.', en: 'Amen, grandpa.', do: ['quest'] }] },
      midweekChat: { say: 'Yarın bahçede domateslere bakacağım. Hafta sonu da arkadaşlarınla buluşursun.', en: 'I will check the tomatoes tomorrow. At the weekend you can meet your friends.', words: [['yarın', 'tomorrow'], ['hafta sonu', 'weekend']], options: [{ tr: 'Tamam dede!', en: 'Okay grandpa!', do: ['quest'] }] },
      sunChat: { say: 'Güzel bir hafta geçirdin. Al bakalım, bu da harçlığın. Şimdi biraz dinlenip arkadaşlarının yanına gidebilirsin.', en: 'You had a good week. Here you go, this is your pocket money. Now you can rest a little and go see your friends.', words: [['hafta', 'week'], ['dinlenmek', 'to rest'], ['el öpmek', 'to kiss an elder’s hand and touch it to your forehead (respect)']], options: [{ tr: '(Dedenin elini öper) Sağ ol dede, Allah razı olsun!', en: '(kisses grandpa’s hand) Thank you grandpa, God bless you!', do: ['pocket-money:10', 'quest'] }, { tr: 'Teşekkürler dede!', en: 'Thanks grandpa!', do: ['quest'] }] },
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
      b1: { say: 'Oğlum, gel! Araba çalışmıyor, tamir ediyorum. Anahtarı bulur musun?', en: 'Son, come! The car won’t start, I’m fixing it. Can you find the wrench?', words: [['tamir etmek', 'to repair'], ['anahtar', 'wrench / key']],
        options: [{ tr: 'Kolay gelsin baba! Anahtar nerede?', en: 'Take it easy, dad! Where is the wrench?', next: 'b1k' }, { tr: 'Anahtar nerede?', en: 'Where is the wrench?', next: 'b2' }] },
      b1k: { say: 'Sağ ol oğlum! Üzüm asmasının altında, masanın üstünde.', en: 'Thanks, son! Under the grapevine, on the table.', words: [['sağ ol', 'thanks (the answer to “kolay gelsin”)'], ['altında', 'under'], ['masa', 'table'], ['üstünde', 'on']],
        options: [{ tr: 'Buluyorum!', en: "I'll find it!", do: ['quest:talk-dad'] }] },
      b2: { say: 'Üzüm asmasının altında, masanın üstünde.', en: 'Under the grapevine, on the table.', words: [['altında', 'under'], ['masa', 'table'], ['üstünde', 'on']],
        options: [{ tr: 'Buluyorum!', en: "I'll find it!", do: ['quest:talk-dad'] }, { tr: 'Tamam baba, bakıyorum.', en: "Okay dad, I'm looking.", do: ['quest:talk-dad'] }] },
      bw: { say: 'Anahtar masanın üstünde, asmanın altında.', en: 'The wrench is on the table, under the vine.', options: [{ tr: 'Tamam.', en: 'Okay.' }] },
      bq: { say: 'Buldun mu? Aferin! Anahtar neredeydi?', en: 'Did you find it? Great! Where was the wrench?', hint: 'masa = table, üstünde = on',
        options: [
          { tr: 'Masanın altındaydı.', en: 'It was under the table.', wrong: true },
          { tr: 'Masanın üstüneydi.', en: 'It was onto the table. — “neredeydi?” wants -da', wrong: true },
          { tr: 'Masanın üstündeydi.', en: 'It was on the table.', next: 'b4', do: ['take:anahtar', 'quest'] },
        ] },
      b4: { say: 'Sen bir tanesin! Annen domates istiyor. Bahçeden üç domates topla, eve götür.', en: "You're the best! Mom wants tomatoes. Pick three tomatoes from the garden and take them home.", words: [['üç', 'three']],
        options: [{ tr: 'Tamam baba!', en: 'Okay dad!' }, { tr: 'Hemen topluyorum!', en: "I'm picking them right away!" }] },
      tools: { say: 'Bugün alet çantasını düzenledim. Hafta sonu arabaya bakacağız.', en: 'I organized the toolbox today. We will look at the car on the weekend.', words: [['alet', 'tool'], ['çanta', 'bag'], ['düzenlemek', 'to organize']], options: [{ tr: 'Ben de yardım ederim baba.', en: 'I will help too, dad.', do: ['quest'] }, { tr: 'Hafta sonu ben de gelirim baba.', en: "I'll come too at the weekend, dad.", do: ['quest'] }] },
      idle: { say: 'Araba neredeyse hazır!', en: 'The car is almost ready!', words: [['neredeyse', 'almost']],
        options: [{ tr: 'Kolay gelsin baba!', en: 'Take it easy dad!' }, { tr: 'Baba, harçlık verir misin?', en: 'Dad, can I have some pocket money?', next: 'harclik' }] },
      harclik: { say: 'Al bakalım, yirmi lira. Bakkalda ne alacağını düşün, boşa harcama!', en: "Here you go, twenty lira. Think about what you'll buy at the grocer's, don't waste it!",
        words: [['harçlık', 'pocket money'], ['yirmi', 'twenty'], ['harcamak', 'to spend']],
        options: [{ tr: 'Teşekkür ederim baba!', en: 'Thank you, dad!', do: ['pocket-money:20'] }] },

      // --- breakfast: build the sentence ---
      t1: { ask: 'order', say: 'Oğlum, çay ister misin?', en: 'Son, would you like some tea?', words: [['çay', 'tea'], ['içmek', 'to drink']],
        answer: 'Olur baba, içerim.', answerEn: "Sure dad, I'll have some.", next: 't2' },
      t2: { say: 'Buyur. Şeker ister misin?', en: 'Here you go. Would you like sugar?', words: [['şeker', 'sugar']],
        options: [{ tr: 'Yok, sağ ol.', en: 'No, thanks.', next: 't3' }, { tr: 'Bir tane alayım.', en: "I'll take one.", next: 't3' }] },
      t3: { say: 'Afiyet olsun!', en: 'Enjoy!', options: [{ tr: 'Sağ ol baba!', en: 'Thanks dad!', do: ['quest'] }, { tr: 'Eline sağlık baba.', en: 'Bless your hands, dad.', do: ['quest'] }] },
      meal: { say: 'Annen çok güzel yemek yapıyor, değil mi?', en: 'Your mom cooks really well, right?', words: [['yemek yapmak', 'to cook']],
        options: [{ tr: 'Evet, çok güzel!', en: 'Yes, very good!' }] },
      carOk: { say: 'Araba çalışıyor! Senin sayende.', en: 'The car is running! Thanks to you.', words: [['çalışmak', 'to work / run'], ['sayende', 'thanks to you']],
        options: [{ tr: 'Rica ederim baba!', en: "You're welcome, dad!" }] },

      // --- dinner: tell about your day ---
      dn1: { ask: 'speak', say: 'Oğlum, bugün ne yaptın?', en: 'Son, what did you do today?', prompt: 'Babana anlat! Mesela:', words: [['bugün', 'today']],
        expect: ['Dedeme yardım ettim', 'Babama yardım ettim', 'Anneme yardım ettim', 'Domates topladım', 'Çamaşırları topladım', 'Masal dinledim', 'Kova getirdim'],
        show: 'Dedeme yardım ettim.', showEn: 'I helped my grandpa. (or: Domates topladım. / Çamaşırları topladım.)', next: 'dn2' },
      dn2: { say: 'Aferin! Çok çalışkansın.', en: "Well done! You're very hard-working.",
        options: [{ tr: 'Teşekkürler baba!', en: 'Thanks dad!', do: ['quest'] }, { tr: 'Sen de çok çalıştın baba.', en: 'You worked hard too, dad.', do: ['quest'] }] },
      tv: { say: 'Haberleri izliyorum. Sen de yat, geç oldu.', en: "I'm watching the news. You go to bed too, it's late.", words: [['haber', 'news'], ['izlemek', 'to watch'], ['geç', 'late']],
        options: [{ tr: 'İyi geceler baba!', en: 'Good night dad!' }] },
    },
  },

  elif: {
    start: (ctx) => {
      if (ctx.q === 'sun-friends') return 'sunMeet';
      if (ctx.q === 'sat-elif') return 'friendMeet';
      if (ctx.q === 'chat-weekend') return 'friendFri';
      if (ctx.q === 'friend-plan') return 'friendPlan';
      return ctx.q === 'meet-elif' ? 'e1' : ctx.loc === 'classroom' ? 'eClass' : 'eIdle';
    },
    nodes: {
      sunMeet: { say: 'Bu hafta çok eğlendik! Haftaya yine meydanda buluşalım mı?', en: 'We had so much fun this week! Shall we meet at the square again next week?', words: [['eğlenmek', 'to have fun'], ['haftaya', 'next week']],
        options: [{ tr: 'Tabii, haftaya görüşürüz!', en: 'Sure, see you next week!', do: ['quest'] }] },
      friendPlan: { say: 'Hafta sonu yaklaşıyor! Cumartesi köy meydanında buluşalım mı?', en: 'The weekend is coming! Shall we meet at the village square on Saturday?', words: [['buluşmak', 'to meet'], ['hafta sonu', 'weekend']], options: [{ tr: 'Tabii, buluşalım!', en: 'Sure, let’s meet!', do: ['quest'] }, { tr: 'Saat kaçta?', en: 'At what time?', next: 'friendTime' }] },
      friendTime: { say: 'Sabah dokuzda, çeşmenin yanında. Can ve Zehra da gelecek.', en: 'At nine in the morning, by the fountain. Can and Zehra are coming too.', words: [['sabah', 'morning']], options: [{ tr: 'Tamam, orada olurum!', en: "Okay, I'll be there!", do: ['quest'] }] },
      friendFri: { say: 'Yarın cumartesi! Sabah meydanda buluşuyoruz, unutmadın değil mi? Akşam da düğün var!', en: "Tomorrow is Saturday! We're meeting in the square in the morning, you haven't forgotten, have you? And there's a wedding in the evening!", words: [['düğün', 'wedding']], options: [{ tr: 'Unutmadım, gelirim!', en: "I haven't forgotten, I'll come!", do: ['quest'] }, { tr: 'Düğün kimin?', en: 'Whose wedding is it?', next: 'friendWho' }] },
      friendWho: { say: 'Bakkal Recep amcanın oğlunun! Bütün köy davetli. Halay çekeceğiz!', en: "Recep the grocer's son's! The whole village is invited. We'll dance the halay!", words: [['halay', 'halay (a line dance)']], options: [{ tr: 'Ne güzel! Görüşürüz.', en: 'How nice! See you.', do: ['quest'] }] },
      friendMeet: { say: 'Sonunda hafta sonu! Bugün okul yok. Hadi meydanda biraz oynayalım.', en: "Finally the weekend! No school today. Let's play in the square for a while.", words: [['sonunda', 'finally']], options: [{ tr: 'Hadi oynayalım!', en: "Let's play!", do: ['quest'] }, { tr: 'Akşam düğüne geliyor musun?', en: 'Are you coming to the wedding tonight?', next: 'friendWed' }] },
      friendWed: { say: 'Tabii! Annemle geleceğim. Halayda yan yana duralım!', en: "Of course! I'll come with my mom. Let's stand side by side in the halay!", options: [{ tr: 'Olur, anlaştık!', en: "Okay, it's a deal!", do: ['quest'] }] },
      e1: { ask: 'speak', say: 'Merhaba! Sen yeni misin? Adın ne?', en: "Hi! Are you new? What's your name?", words: [['yeni', 'new'], ['ad', 'name']],
        expect: ['Benim adım', 'Adım'], keywords: ['adım'], show: 'Benim adım … (kendi adın)', showEn: 'My name is … (your own name)', next: 'e2' },
      e2: { say: 'Memnun oldum! Ben Elif. Bu da Can, o çok komik.', en: "Nice to meet you! I'm Elif. This is Can, he's very funny.", words: [['memnun oldum', 'nice to meet you']],
        options: [{ tr: 'Ben de memnun oldum!', en: 'Nice to meet you too!', next: 'e3' }, { tr: 'Memnun oldum Elif!', en: 'Nice to meet you, Elif!', next: 'e3' }] },
      e3: { say: 'Hadi, ders başlıyor! Sınıf kapısı orada.', en: "Come on, the lesson is starting! The classroom door is there.", words: [['ders', 'lesson'], ['sınıf', 'classroom']],
        options: [{ tr: 'Hadi gidelim!', en: "Let's go!", do: ['quest'] }, { tr: 'Tamam, geliyorum!', en: "Okay, I'm coming!", do: ['quest'] }] },
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
        options: [{ tr: 'Ben Türkçeyi seviyorum.', en: 'I like Turkish.', do: ['quest:meet-can'] }, { tr: 'Ben de matematiği seviyorum.', en: 'I like maths too.', do: ['quest:meet-can'] }] },
    },
  },

  zehra: {
    start: (ctx) => (ctx.q === 'sat-zehra' ? 'friendMeet' : 'z1'),
    nodes: {
      friendMeet: { say: 'Ben de geldim! Yarın için bir planımız var mı?', en: 'I’m here too! Do we have a plan for tomorrow?', words: [['plan', 'plan'], ['yarın', 'tomorrow']], options: [{ tr: 'Yarın yine buluşalım.', en: 'Let’s meet again tomorrow.', do: ['quest'] }] },
      z1: { say: 'Merhaba! Kalemin var mı? Benimki kayboldu.', en: 'Hi! Do you have a pencil? Mine got lost.', words: [['kalem', 'pencil'], ['kaybolmak', 'to get lost']],
        options: [{ tr: 'Al, benim kalemimi kullan.', en: 'Here, use my pencil.', next: 'z2' }, { tr: 'Maalesef yok.', en: "Sorry, I don't.", next: 'z3' }] },
      z2: { say: 'Çok teşekkür ederim! Çok naziksin.', en: "Thank you so much! You're very kind.", words: [['nazik', 'kind']], options: [{ tr: 'Rica ederim.', en: "You're welcome.", do: ['quest:meet-zehra'] }] },
      z3: { say: 'Olsun, öğretmenden isterim.', en: "Never mind, I'll ask the teacher.", options: [{ tr: 'Tamam.', en: 'Okay.', do: ['quest:meet-zehra'] }] },
    },
  },

  ogretmen: {
    start: (ctx) => (['teacher-2', 'teacher-3'].includes(ctx.q) ? 'dailyTask' : ctx.q === 'homework-assign' ? 't1' : ctx.q === 'lesson' ? 'tWait' : 'tIdle'),
    nodes: {
      dailyTask: { say: 'Bugün de güzel çalıştın. Evde kısa bir tekrar yapman yeterli.', en: 'You worked well today too. A short review at home is enough.', words: [['tekrar', 'review'], ['yeterli', 'enough']], options: [{ tr: 'Tamam öğretmenim!', en: 'Okay, teacher!', do: ['quest'] }, { tr: 'Evde tekrar ederim öğretmenim.', en: "I'll review it at home, teacher.", do: ['quest'] }] },
      tWait: { say: 'Hoş geldin! Yerine otur, ders başlıyor.', en: 'Welcome! Take your seat, the lesson is starting.', options: [{ tr: 'Tamam öğretmenim.', en: 'Okay, teacher.' }] },
      t1: { say: 'Bugün çok güzel çalıştın! Ödevin: kitabındaki Ünite 1.', en: 'You worked really well today! Your homework: Unit 1 in your book.', words: [['ödev', 'homework'], ['çalışmak', 'to work / study']],
        options: [{ tr: 'Tamam öğretmenim! Evde yaparım.', en: "Okay teacher! I'll do it at home.", next: 't2' }, { tr: 'Tamam, evde hemen başlarım.', en: "Okay, I'll start right away at home.", next: 't2' }] },
      t2: { ask: 'speak', say: 'Okuldan çıkarken ne diyoruz?', en: 'What do we say when we leave school?', expect: ['Hoşça kalın öğretmenim', 'Hoşça kalın', 'Görüşürüz öğretmenim'], show: 'Hoşça kalın öğretmenim!', showEn: 'Goodbye, teacher!',
        words: [['hoşça kalın', 'goodbye (said by the one leaving)']], next: 't3' },
      t3: { say: 'Güle güle! Yarın görüşürüz.', en: 'Bye! See you tomorrow.', words: [['güle güle', 'goodbye (said to the one leaving)']],
        options: [{ tr: 'Yarın görüşürüz!', en: 'See you tomorrow!', do: ['quest'] }, { tr: 'Hoşça kalın öğretmenim!', en: 'Goodbye, teacher!', do: ['quest'] }] },
      tIdle: { say: 'Yarın görüşürüz, ödevini unutma!', en: "See you tomorrow, don't forget your homework!", options: [{ tr: 'Unutmam!', en: "I won't!" }] },
    },
  },
};
