/**
 * Grandpa's interactive tales (Nasreddin Hoca). Each tale is a small dialogue graph that
 * mixes listening, speaking, word order and a final question. Node ids are local; they
 * are prefixed with the tale id when merged into grandpa's dialogue (`kazan.start`).
 * Finishing a tale sets the flag `tale-<id>`.
 */
export const TALES = [
  {
    id: 'kazan', title: 'Kazan doğurdu',
    nodes: {
      start: { say: 'Gel otur evladım. Sana Nasreddin Hoca\'nın kazan masalını anlatayım.', en: "Come sit, my child. Let me tell you Nasreddin Hodja's cauldron tale.", words: [['masal', 'tale'], ['kazan', 'cauldron']],
        options: [{ tr: 'Anlat dede!', en: 'Tell me, grandpa!', next: 'k2' }] },
      k2: { say: 'Bir gün Hoca, komşusundan büyük bir kazan ödünç alır.', en: 'One day the Hodja borrows a big cauldron from his neighbour.', words: [['komşu', 'neighbour'], ['ödünç almak', 'to borrow']],
        options: [{ tr: 'Sonra ne olmuş?', en: 'What happened next?', next: 'k3' }] },
      k3: { say: 'Hoca kazanı geri verir. Kazanın içinde küçük bir tencere var!', en: 'The Hodja gives the cauldron back. There is a small pot inside it!', words: [['geri vermek', 'to give back'], ['tencere', 'pot'], ['küçük', 'small']],
        options: [{ tr: 'Tencere mi? Neden?', en: 'A pot? Why?', next: 'k4' }] },
      k4: { ask: 'listen', say: 'Kazanınız doğurdu!', en: 'Your cauldron gave birth!', prompt: 'Hoca komşusuna ne dedi? Dinle!',
        words: [['doğurmak', 'to give birth']],
        options: [
          { tr: 'Kazanınız doğurdu!', en: 'Your cauldron gave birth!', next: 'k5' },
          { tr: 'Kazanınız kırıldı!', en: 'Your cauldron broke!', wrong: true },
          { tr: 'Kazanınız kayboldu!', en: 'Your cauldron got lost!', wrong: true },
        ] },
      k5: { say: 'Komşu çok sevinir, tencereyi alır. Bir hafta sonra Hoca yine kazanı ister.', en: 'The neighbour is very happy and takes the pot. A week later the Hodja asks for the cauldron again.', words: [['sevinmek', 'to be glad'], ['hafta', 'week']],
        options: [{ tr: 'Bu sefer ne olmuş?', en: 'What happened this time?', next: 'k6' }] },
      k6: { say: 'Hoca kazanı geri vermez. Komşu sorar: “Kazanım nerede?” Hoca üzgün üzgün der ki…', en: "The Hodja doesn't give it back. The neighbour asks: “Where's my cauldron?” The Hodja sadly says…",
        options: [{ tr: 'Ne der?', en: 'What does he say?', next: 'k7' }] },
      k7: { ask: 'speak', say: 'Hadi, Hoca gibi söyle: “Kazanınız öldü!”', en: 'Come on, say it like the Hodja: “Your cauldron died!”', expect: ['Kazanınız öldü'], show: 'Kazanınız öldü!', words: [['ölmek', 'to die']],
        next: 'k8' },
      k8: { say: 'Komşu kızar: “Kazan ölür mü hiç?” Hoca güler: “Doğurduğuna inandın, öldüğüne neden inanmıyorsun?”', en: "The neighbour gets angry: “Can a cauldron die?” The Hodja laughs: “You believed it gave birth, why not that it died?”", words: [['inanmak', 'to believe'], ['kızmak', 'to get angry']],
        options: [{ tr: 'Ha ha! Çok komik!', en: 'Ha ha! Very funny!', next: 'k9' }] },
      k9: { say: 'Söyle bakalım: Hoca komşusundan ne ödünç aldı?', en: 'Tell me: what did the Hodja borrow from his neighbour?', hint: 'kazan = cauldron',
        options: [
          { tr: 'Bir tencere.', en: 'A pot.', wrong: true },
          { tr: 'Bir kazan.', en: 'A cauldron.', next: 'end', do: ['flag:tale-kazan'] },
          { tr: 'Bir eşek.', en: 'A donkey.', wrong: true },
        ] },
      end: { say: 'Aferin! Masal bitti. Açgözlü olma, olur mu?', en: "Well done! The tale is over. Don't be greedy, okay?", words: [['açgözlü', 'greedy']],
        options: [{ tr: 'Olur dede! Çok teşekkürler.', en: 'Okay grandpa! Thank you so much.' }] },
    },
  },

  {
    id: 'kurk', title: 'Ye kürküm ye',
    nodes: {
      start: { say: 'Bugün sana “Ye kürküm ye” masalını anlatayım mı?', en: 'Shall I tell you the “Eat, my fur coat, eat” tale today?', words: [['kürk', 'fur coat']],
        options: [{ tr: 'Evet, lütfen!', en: 'Yes, please!', next: 'u2' }, { tr: 'Kürk ne demek?', en: 'What does kürk mean?', next: 'u1b' }] },
      u1b: { say: 'Kürk, çok pahalı ve sıcak bir palto. Zenginler giyer.', en: 'A kürk is a very expensive, warm coat. Rich people wear it.', words: [['pahalı', 'expensive'], ['zengin', 'rich']],
        options: [{ tr: 'Anladım. Anlat dede!', en: 'Got it. Tell me, grandpa!', next: 'u2' }] },
      u2: { say: 'Hoca bir düğüne gider. Üstünde eski, yırtık elbiseler var.', en: 'The Hodja goes to a wedding. He is wearing old, torn clothes.', words: [['düğün', 'wedding'], ['eski', 'old'], ['elbise', 'clothes']],
        options: [{ tr: 'Sonra?', en: 'Then?', next: 'u3' }] },
      u3: { say: 'Kimse ona “Hoş geldin” demez. Kimse yemek vermez.', en: 'Nobody says “Welcome” to him. Nobody gives him food.', words: [['kimse', 'nobody']],
        options: [{ tr: 'Çok ayıp!', en: 'How rude!', next: 'u4' }] },
      u4: { say: 'Hoca eve gider, güzel kürkünü giyer ve düğüne geri döner.', en: 'The Hodja goes home, puts on his nice fur coat and comes back to the wedding.', words: [['giymek', 'to wear'], ['geri dönmek', 'to come back']],
        options: [{ tr: 'Şimdi ne olur?', en: 'What happens now?', next: 'u5' }] },
      u5: { ask: 'listen', say: 'Buyurun Hocam, başköşeye oturun!', en: 'Please, Hodja, sit at the head of the table!', prompt: 'İnsanlar Hoca\'ya ne der? Dinle!', words: [['buyurun', 'please / here you are'], ['oturmak', 'to sit']],
        options: [
          { tr: 'Git buradan!', en: 'Go away!', wrong: true },
          { tr: 'Buyurun Hocam, başköşeye oturun!', en: 'Please, Hodja, sit at the head of the table!', next: 'u6' },
          { tr: 'Yemek bitti.', en: 'The food is finished.', wrong: true },
        ] },
      u6: { say: 'Çorba gelir. Hoca kürkünün kolunu çorbaya sokar ve der ki…', en: 'The soup arrives. The Hodja dips the sleeve of his fur coat into the soup and says…', words: [['kol', 'sleeve / arm'], ['çorba', 'soup']],
        options: [{ tr: 'Ne der?', en: 'What does he say?', next: 'u7' }] },
      u7: { ask: 'speak', say: 'Hoca gibi söyle!', en: 'Say it like the Hodja!', expect: ['Ye kürküm ye'], show: 'Ye kürküm ye!', showEn: 'Eat, my fur coat, eat!', next: 'u8' },
      u8: { say: '“Bu yemek bana değil, kürküme!” der Hoca.', en: '“This food is not for me, it is for my fur coat!” says the Hodja.',
        options: [{ tr: 'Ha ha! Haklı!', en: "Ha ha! He's right!", next: 'u9' }] },
      u9: { ask: 'order', say: 'Masalın dersini cümle yap bakalım.', en: "Make the tale's lesson into a sentence.", answer: 'İnsanlar kıyafete bakmamalı.', answerEn: 'People should not judge by clothes.', prompt: 'Cümleyi kur:',
        next: 'end', do: ['flag:tale-kurk'] },
      end: { say: 'Aferin! İnsanı kıyafetiyle değil, kalbiyle tanı.', en: 'Well done! Know people by their heart, not their clothes.', words: [['kalp', 'heart'], ['kıyafet', 'clothing']],
        options: [{ tr: 'Çok güzel bir masal!', en: 'What a lovely tale!' }] },
    },
  },

  {
    id: 'maya', title: 'Göle maya çalmak',
    nodes: {
      start: { say: 'Bir gün Hoca gölün kenarına gider. Elinde bir kase yoğurt var.', en: 'One day the Hodja goes to the lakeside. He has a bowl of yoghurt in his hand.', words: [['göl', 'lake'], ['yoğurt', 'yoghurt'], ['kase', 'bowl']],
        options: [{ tr: 'Yoğurtla ne yapacak?', en: 'What will he do with yoghurt?', next: 'm2' }] },
      m2: { say: 'Yoğurdu kaşık kaşık göle koyar. Buna “maya çalmak” denir.', en: 'He puts the yoghurt into the lake spoon by spoon. This is called “adding starter culture”.', words: [['kaşık', 'spoon'], ['maya', 'yeast / starter']],
        options: [{ tr: 'Göl yoğurt olur mu?', en: 'Can a lake become yoghurt?', next: 'm3' }] },
      m3: { say: 'İnsanlar gülerler: “Hocam, göl hiç yoğurt olur mu?”', en: 'People laugh: “Hodja, can a lake ever become yoghurt?”', words: [['gülmek', 'to laugh']],
        options: [{ tr: 'Hoca ne cevap verir?', en: 'What does the Hodja answer?', next: 'm4' }] },
      m4: { ask: 'listen', say: 'Ya tutarsa!', en: 'But what if it works!', prompt: 'Hoca\'nın cevabı ne? Dinle!',
        options: [
          { tr: 'Haklısınız.', en: "You're right.", wrong: true },
          { tr: 'Ya tutarsa!', en: 'But what if it works!', next: 'm5' },
          { tr: 'Yarın gelin.', en: 'Come tomorrow.', wrong: true },
        ] },
      m5: { ask: 'speak', say: 'Sen de söyle, umutla!', en: 'You say it too, with hope!', expect: ['Ya tutarsa'], show: 'Ya tutarsa!', words: [['umut', 'hope']], next: 'm6' },
      m6: { say: 'Söyle bakalım: Hoca göle ne koydu?', en: 'Tell me: what did the Hodja put into the lake?', hint: 'yoğurt = yoghurt',
        options: [
          { tr: 'Süt.', en: 'Milk.', wrong: true },
          { tr: 'Yoğurt.', en: 'Yoghurt.', next: 'end', do: ['flag:tale-maya'] },
          { tr: 'Şeker.', en: 'Sugar.', wrong: true },
        ] },
      end: { say: 'Aferin! Umudunu hiç kaybetme evladım.', en: 'Well done! Never lose your hope, my child.', words: [['kaybetmek', 'to lose']],
        options: [{ tr: 'Kaybetmem dede!', en: "I won't, grandpa!" }] },
    },
  },

  {
    id: 'esek', title: 'Eşeğe ters binmek',
    nodes: {
      start: { say: 'Hoca\'nın bir eşeği var. Bir gün eşeğine ters biner!', en: 'The Hodja has a donkey. One day he rides it backwards!', words: [['eşek', 'donkey'], ['ters', 'backwards'], ['binmek', 'to ride / get on']],
        options: [{ tr: 'Ters mi? Neden?', en: 'Backwards? Why?', next: 'e2' }] },
      e2: { say: 'Öğrencileri arkasından yürüyor. Herkes soruyor: “Hocam, neden ters bindin?”', en: 'His students are walking behind him. Everyone asks: “Hodja, why are you riding backwards?”', words: [['öğrenci', 'student'], ['arkasında', 'behind']],
        options: [{ tr: 'Hoca ne diyor?', en: 'What does the Hodja say?', next: 'e3' }] },
      e3: { say: '“Düz binsem, size sırtımı dönerim. Bu ayıp olur!”', en: "“If I rode forwards, I'd turn my back on you. That would be rude!”", words: [['sırt', 'back'], ['ayıp', 'rude / shameful']],
        options: [{ tr: 'Ha ha, akıllı Hoca!', en: 'Ha ha, clever Hodja!', next: 'e4' }] },
      e4: { ask: 'order', say: 'Hoca eşeğine nasıl bindi? Cümleyi kur.', en: 'How did the Hodja ride his donkey? Build the sentence.', answer: 'Hoca eşeğine ters bindi.', answerEn: 'The Hodja rode his donkey backwards.', next: 'e5' },
      e5: { say: 'Son soru: Hoca\'nın arkasında kim vardı?', en: 'Last question: who was behind the Hodja?', hint: 'öğrenci = student',
        options: [
          { tr: 'Öğrencileri.', en: 'His students.', next: 'end', do: ['flag:tale-esek'] },
          { tr: 'Komşusu.', en: 'His neighbour.', wrong: true },
          { tr: 'Karısı.', en: 'His wife.', wrong: true },
        ] },
      end: { say: 'Aferin! Hoca hem komik hem de kibar.', en: 'Well done! The Hodja is both funny and polite.', words: [['kibar', 'polite'], ['komik', 'funny']],
        options: [{ tr: 'Bir masal daha anlat!', en: 'Tell another tale!' }] },
    },
  },

  {
    id: 'ay', title: 'Ay kuyuya düştü',
    nodes: {
      start: { say: 'Bir gece Hoca kuyuya bakar. Suyun içinde ay var!', en: 'One night the Hodja looks into the well. The moon is in the water!', words: [['kuyu', 'well'], ['ay', 'moon'], ['gece', 'night']],
        options: [{ tr: 'Ay kuyuya mı düşmüş?', en: 'Did the moon fall into the well?', next: 'a2' }] },
      a2: { say: 'Hoca öyle sanar. “Ay\'ı kurtarmalıyım!” der ve kuyuya bir ip atar.', en: 'The Hodja thinks so. “I must save the moon!” he says and throws a rope into the well.', words: [['kurtarmak', 'to save'], ['ip', 'rope']],
        options: [{ tr: 'Sonra?', en: 'Then?', next: 'a3' }] },
      a3: { say: 'İpi çeker, çeker… İp kopar, Hoca sırtüstü yere düşer!', en: 'He pulls and pulls… The rope snaps and the Hodja falls flat on his back!', words: [['çekmek', 'to pull'], ['düşmek', 'to fall']],
        options: [{ tr: 'Eyvah!', en: 'Oh no!', next: 'a4' }] },
      a4: { ask: 'listen', say: 'Oh olsun, ay yerine kavuştu!', en: 'Good, the moon is back in its place!', prompt: 'Hoca gökyüzüne bakıp ne der? Dinle!', words: [['gökyüzü', 'sky']],
        options: [
          { tr: 'Belim ağrıyor!', en: 'My back hurts!', wrong: true },
          { tr: 'Ay nerede?', en: 'Where is the moon?', wrong: true },
          { tr: 'Oh olsun, ay yerine kavuştu!', en: 'Good, the moon is back in its place!', next: 'a5' },
        ] },
      a5: { ask: 'speak', say: 'Sen de gökyüzüne bak ve söyle: “Ay gökyüzünde!”', en: 'Look at the sky too and say: “The moon is in the sky!”', expect: ['Ay gökyüzünde'], show: 'Ay gökyüzünde!', next: 'end', do: ['flag:tale-ay'] },
      end: { say: 'Aferin! Ay kuyuya düşmez, suda sadece görüntüsü var.', en: "Well done! The moon can't fall into a well, only its reflection is in the water.", words: [['görüntü', 'reflection / image']],
        options: [{ tr: 'Ha ha, Hoca çok komik!', en: 'Ha ha, the Hodja is so funny!' }] },
    },
  },
];

/** The entry node of the next tale grandpa hasn't told yet (null when all are told). */
export function nextTale(ctx) {
  const t = TALES.find((x) => !ctx.flag(`tale-${x.id}`));
  return t ? `${t.id}.start` : null;
}

/** Prefix every node id (and `next` pointer) with the tale id. */
export function taleNodes() {
  const out = {};
  for (const t of TALES) {
    const fix = (n) => `${t.id}.${n}`;
    for (const [id, node] of Object.entries(t.nodes)) {
      const copy = { ...node };
      if (copy.next) copy.next = fix(copy.next);
      if (copy.options) copy.options = copy.options.map((o) => (o.next ? { ...o, next: fix(o.next) } : o));
      out[`${t.id}.${id}`] = copy;
    }
  }
  return out;
}
