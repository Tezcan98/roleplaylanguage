/**
 * The story script. A chapter fixes the time, where everyone is and the quest chain.
 * Characters only move between chapters, so nobody teleports in front of the player.
 *
 * Quest fields: id, title, obj/en (string or ctx => string), target (or ctx => target),
 * complete ({ pick: kind } | { enter: locationId }; default: a dialogue `quest` effect),
 * minutes (in-game time the task takes), intro (card shown when it starts), final.
 */
export const STORY = {
  chapters: [
    {
      id: 'd1-morning', day: 1, time: '08:00', location: 'house', spawn: 'start',
      cast: {
        anne: ['house', 'kitchen', 'cook'],
        dede: ['yard', 'garden', 'garden'],
        baba: ['yard', 'car', 'repair'],
      },
      intro: {
        num: 'Bölüm 1', title: 'Canım sıkılıyor',
        text: 'Pazar sabahı. Ahmet evde. Televizyonda hiçbir şey yok. Annesi mutfakta çay demliyor.',
        en: "Sunday morning. Ahmet is at home. There's nothing on TV. His mom is brewing tea in the kitchen.",
      },
      think: 'Canım sıkılıyor…',
      quests: [
        { id: 'talk-mom', title: 'Canım sıkılıyor', obj: 'Annenle konuş', en: 'Talk to your mom', target: { npc: 'anne' } },
        { id: 'take-jacket', title: 'Mont', obj: 'Montunu al', en: 'Take your jacket (next to the door)', target: { item: 'mont' }, complete: { pick: 'mont' }, minutes: 5 },
        { id: 'go-out', title: 'Dışarısı', obj: 'Kapıdan dışarı çık', en: 'Go out the door', target: { hotspot: 'house.door' }, complete: { enter: 'yard' }, minutes: 2 },
        {
          id: 'talk-dede', title: 'Dedeye merhaba', obj: 'Dedenle konuş', en: 'Talk to your grandpa', target: { npc: 'dede' },
          intro: {
            num: 'Bölüm 2', title: 'Avluda',
            text: 'Dışarısı güneşli. Dede bahçede, baba arabanın başında. Herkesin bir işi var!',
            en: "It's sunny outside. Grandpa's in the garden, dad's at the car. Everyone has a job!",
          },
        },
        {
          id: 'bucket', title: 'Kova',
          obj: (c) => (c.has('kova') ? 'Kovayı dedene götür' : 'Kovayı bul'),
          en: (c) => (c.has('kova') ? 'Take the bucket to grandpa' : 'Find the bucket (by the tap)'),
          target: (c) => (c.has('kova') ? { npc: 'dede' } : { item: 'kova' }),
          minutes: 15,
        },
        { id: 'talk-dad', title: 'Babanın arabası', obj: 'Babanla konuş', en: 'Talk to your dad', target: { npc: 'baba' } },
        {
          id: 'wrench', title: 'Anahtar',
          obj: (c) => (c.has('anahtar') ? 'Anahtarı babana götür' : 'Anahtarı bul'),
          en: (c) => (c.has('anahtar') ? 'Take the wrench to dad' : 'Find the wrench (under the vine)'),
          target: (c) => (c.has('anahtar') ? { npc: 'baba' } : { item: 'anahtar' }),
          minutes: 15,
        },
        {
          id: 'tomatoes', title: 'Kahvaltı',
          obj: (c) => (c.count('domates') >= 3 ? 'Domatesleri annene götür (evde)' : `Bahçeden domates topla (${c.count('domates')}/3)`),
          en: (c) => (c.count('domates') >= 3 ? 'Take the tomatoes to mom (at home)' : 'Pick tomatoes in the garden'),
          target: (c) => (c.count('domates') >= 3 ? { npc: 'anne' } : { kind: 'domates' }),
          minutes: 20,
        },
        { id: 'free', title: 'Afiyet olsun!', obj: 'Serbestçe dolaş, konuş', en: 'Explore and chat freely', target: null, final: true },
      ],
      outro: {
        num: 'Bölüm sonu', title: 'Afiyet olsun!', button: 'Dolaşmaya devam',
        text: (words) => `Bütün görevleri bitirdin. ${words} kelime öğrendin. Şimdi serbestçe dolaşabilir, herkesle konuşabilirsin.`,
        en: 'You finished every quest. Now you can explore and chat with everyone.',
      },
    },
  ],
};
