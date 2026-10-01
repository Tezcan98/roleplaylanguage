/**
 * Sunday night: the family prays the yatsı (night) prayer together, led by grandpa.
 * Teaches the wudu (abdest) steps — body parts and verbs — and the prayer postures.
 * Quests: hear the ezan → take abdest at the washbasin → stand on the prayer rugs.
 */
export default {
  id: 'prayer',

  quests: [{
    chapter: 'd1-night', after: 'take-book',
    quests: [
      { id: 'yatsi-ezan', title: 'Yatsı vakti', obj: 'Dedenle konuş', en: 'Talk to grandpa', target: { npc: 'dede' }, minutes: 5 },
      { id: 'abdest', title: 'Abdest', obj: 'Lavaboda abdest al', en: 'Do the ablution (abdest) at the washbasin', target: { hotspot: 'house.lavabo' }, complete: { flag: 'abdest-done' }, minutes: 10 },
      { id: 'namaz', title: 'Ailecek namaz', obj: 'Seccadeye geç, namaza dur', en: 'Go to the prayer rugs and join the prayer', target: { hotspot: 'house.seccade' }, complete: { flag: 'prayed-yatsi' }, minutes: 15 },
    ],
  }],

  // grandpa stays up for the prayer (he goes to bed right after it)
  cast: { 'd1-night': { dede: ['house', 'sedirR', 'sitBench'] } },

  hotspots: {
    'house.lavabo': { label: 'Abdest al', use: ['talk:dede:ab1'], available: (c) => c.q === 'abdest' },
    'house.sinkwash': { label: 'Elini yıka', use: ['free:wash'] },
    'house.seccade': { label: 'Namaza dur', use: ['prayer'], available: (c) => c.q === 'namaz' },
  },

  dialogues: {
    dede: {
      start: (ctx) => ({ 'yatsi-ezan': 'ez1', abdest: 'abWait', namaz: 'nmWait' })[ctx.q],
      nodes: {
        ez1: { ask: 'listen', say: 'Yatsı ezanı okunuyor. Hadi, abdest alıp ailecek namaz kılalım.', en: "The call to the night prayer is sounding. Come, let's do our ablution and pray together as a family.",
          prompt: 'Deden ne diyor?', words: [['yatsı', 'night prayer'], ['ezan', 'call to prayer'], ['abdest', 'ablution'], ['namaz', 'prayer'], ['ailecek', 'as a family']],
          options: [
            { tr: 'Televizyon izleyelim.', en: "Let's watch TV.", wrong: true },
            { tr: 'Ailecek namaz kılalım.', en: "Let's pray together as a family.", next: 'ez2' },
            { tr: 'Yatağa gidelim.', en: "Let's go to bed.", wrong: true },
          ] },
        ez2: { say: 'Önce abdest alalım. Lavabo, kitaplığın yanında.', en: "First let's do our ablution. The washbasin is next to the bookshelf.", words: [['lavabo', 'washbasin'], ['önce', 'first']],
          options: [{ tr: 'Tamam dede, geliyorum.', en: "Okay grandpa, I'm coming.", do: ['quest'] }] },
        abWait: { say: 'Lavabo kitaplığın yanında, evladım.', en: 'The washbasin is next to the bookshelf, my child.', options: [{ tr: 'Tamam dede.', en: 'Okay grandpa.' }] },
        ab1: { say: 'Abdeste “Bismillah” deyip başlarız. Önce ellerimizi üç kere yıkarız.', en: 'We begin the ablution by saying “Bismillah”. First we wash our hands three times.', words: [['el', 'hand'], ['yıkamak', 'to wash'], ['üç kere', 'three times']],
          options: [{ tr: 'Ellerimi yıkadım.', en: 'I washed my hands.', next: 'ab2' }] },
        ab2: { ask: 'order', say: 'Sonra ağzımızı ve burnumuzu yıkarız. Sen söyle bakalım.', en: 'Then we wash our mouth and nose. You say it.', words: [['ağız', 'mouth'], ['burun', 'nose']],
          answer: 'Ağzımı ve burnumu yıkadım.', answerEn: 'I washed my mouth and my nose.', next: 'ab3' },
        ab3: { say: 'Sonra yüzümüzü ve kollarımızı yıkarız. Başımızı ve kulaklarımızı ıslak elle meshederiz.', en: 'Then we wash our face and arms. We wipe our head and ears with wet hands.',
          words: [['yüz', 'face'], ['kol', 'arm'], ['baş', 'head'], ['kulak', 'ear'], ['meshetmek', 'to wipe with wet hands']],
          options: [{ tr: 'Tamam dede.', en: 'Okay grandpa.', next: 'ab4' }] },
        ab4: { say: 'Söyle bakalım: En son neyi yıkarız?', en: 'Tell me: what do we wash last?', hint: 'ayak = foot',
          options: [
            { tr: 'Ellerimizi.', en: 'Our hands.', wrong: true },
            { tr: 'Ayaklarımızı.', en: 'Our feet.', next: 'ab5' },
            { tr: 'Saçımızı.', en: 'Our hair.', wrong: true },
          ] },
        ab5: { say: 'Aferin! Abdestimiz tamam. Annen seccadeleri serdi, hadi namaza.', en: 'Well done! Our ablution is complete. Your mom has laid out the prayer rugs, come to prayer.',
          words: [['ayak', 'foot'], ['seccade', 'prayer rug'], ['sermek', 'to lay out']],
          options: [{ tr: 'Hadi dede!', en: "Let's go, grandpa!", do: ['flag:abdest-done'] }] },
        nmWait: { say: 'Ben imam olacağım, siz arkamda saf tutun.', en: 'I will lead the prayer; you line up behind me.', words: [['imam', 'prayer leader'], ['saf', 'row (of worshippers)']],
          options: [{ tr: 'Tamam dede.', en: 'Okay grandpa.' }] },
      },
    },
    anne: {
      start: (ctx) => (['yatsi-ezan', 'abdest', 'namaz'].includes(ctx.q) ? 'prayMom' : undefined),
      nodes: {
        prayMom: { say: 'Seccadeleri seriyorum. Abdestini aldıysan namaza gel.', en: "I'm laying out the prayer rugs. If you've done your ablution, come to prayer.", words: [['seccade', 'prayer rug']],
          options: [{ tr: 'Geliyorum anne.', en: "I'm coming, mom." }] },
      },
    },
  },
};

/** Postures shown during the family prayer, in order (a short demonstration, one rak'ah). */
export const PRAYER_STEPS = [
  { pose: 'kiyam', seconds: 4, title: 'Kıyam', text: 'Ayakta durulur, eller bağlanır.', en: 'Standing, hands folded.' },
  { pose: 'ruku', seconds: 3, title: 'Rükû', text: 'Eğilinir, eller dizlere konur.', en: 'Bowing, hands on the knees.' },
  { pose: 'kiyam', seconds: 2, title: 'Kıyam', text: 'Tekrar doğrulunur.', en: 'Standing up again.' },
  { pose: 'secde', seconds: 3, title: 'Secde', text: 'Alın ve burun yere konur.', en: 'Prostration: forehead and nose on the ground.' },
  { pose: 'oturus', seconds: 2, title: 'Oturuş', text: 'Dizler üstünde kısa bir oturuş.', en: 'A short sitting on the knees.' },
  { pose: 'secde', seconds: 3, title: 'Secde', text: 'İkinci secde.', en: 'The second prostration.' },
  { pose: 'oturus', seconds: 3, title: 'Oturuş', text: 'Son oturuş.', en: 'The final sitting.' },
  { pose: 'selamR', seconds: 1.6, title: 'Selam', text: 'Önce sağa selam verilir…', en: 'First the greeting to the right…' },
  { pose: 'selamL', seconds: 1.6, title: 'Selam', text: '…sonra sola.', en: '…then to the left.' },
];

export const PRAYER_WORDS = [['kıyam', 'standing (in prayer)'], ['rükû', 'bowing'], ['secde', 'prostration'], ['oturuş', 'sitting'], ['selam', 'greeting'], ['cemaat', 'congregation'], ['Allah kabul etsin', 'may God accept it']];
