/**
 * Conversation graphs. `start(ctx)` picks the entry node from game state.
 * Option fields: tr, en, next (node id or 'end'), do (effects), wrong (strike-through + hint).
 */
export const DIALOGUES = {
  anne: {
    start(ctx) {
      switch (ctx.q) {
        case 'talk-mom': return 'bored';
        case 'take-jacket': return 'jacketWhere';
        case 'go-out': return 'goOut';
        case 'tomatoes': return ctx.count('domates') >= 3 ? 'tomAsk' : 'tomWait';
        case 'free': return 'after';
        default: return 'busy';
      }
    },
    nodes: {
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
        options: [{ tr: 'Afiyet olsun!', en: 'Enjoy the meal!', do: ['finish'] }] },
      after: { say: 'Çayını iç, soğumasın.', en: 'Drink your tea before it gets cold.', words: [['içmek', 'to drink']],
        options: [{ tr: 'Eline sağlık anne!', en: 'Bless your hands, mom!' }] },
    },
  },

  dede: {
    start(ctx) {
      if (!ctx.reached('bucket')) return 'd1';
      if (ctx.q === 'bucket') return ctx.has('kova') ? 'dq' : 'dw';
      return 'idle';
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
      idle: { say: 'Domatesler büyüyor. Güneş çok güzel bugün.', en: 'The tomatoes are growing. The sun is lovely today.', words: [['güneş', 'sun'], ['bugün', 'today']],
        options: [{ tr: 'Kolay gelsin dede!', en: 'Take it easy grandpa!' }] },
    },
  },

  baba: {
    start(ctx) {
      if (!ctx.reached('talk-dad')) return 'wait';
      if (ctx.q === 'talk-dad') return 'b1';
      if (ctx.q === 'wrench') return ctx.has('anahtar') ? 'bq' : 'bw';
      return 'idle';
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
      idle: { say: 'Araba neredeyse hazır!', en: 'The car is almost ready!', words: [['neredeyse', 'almost']], options: [{ tr: 'Kolay gelsin baba!', en: 'Take it easy dad!' }] },
    },
  },
};
