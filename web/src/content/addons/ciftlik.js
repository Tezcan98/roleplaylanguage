/**
 * Farm chores with the animals in the yard (systems/Animals.js):
 *   day 4 afternoon — grandpa shows how to milk Sarıkız the cow; the warm milk goes to mom;
 *   day 8 morning   — hay for the sheep, then counting them for grandpa (numbers, plurals).
 * The animal's action ("İneği sağ", "Koyunlara saman ver") shows when you are next to it during
 * its quest; it sets the quest's flag (Animals `tasks`).
 */
export default {
  id: 'ciftlik',
  kindNames: { saman: { tr: 'saman', en: 'hay' } },
  // the quest arrows point where the animals graze (radius ~0: never offered); the action itself is next to the animal
  hotspots: {
    'yard.cow': { label: 'İnek' },
    'yard.sheep': { label: 'Koyunlar' },
  },
  quests: [
    {
      chapter: 'd4-home', after: 'water-garden-2',
      quests: [
        { id: 'cow-dede', title: 'Sarıkız', obj: 'Dedenle konuş', en: 'Talk to grandpa', target: { npc: 'dede' }, minutes: 5 },
        { id: 'cow-milk', title: 'Sarıkız', obj: 'Bahçedeki ineği sağ', en: 'Milk the cow in the yard', target: { hotspot: 'yard.cow' }, complete: { flag: 'cow-milked' }, minutes: 15 },
        { id: 'cow-mom', title: 'Taze süt', obj: 'Sütü annene götür', en: 'Take the milk to mom', target: { npc: 'anne' }, minutes: 5 },
      ],
    },
    {
      chapter: 'd7-morning', after: 'sun-dede',
      quests: [
        { id: 'sheep-feed', title: 'Koyunlar', obj: 'Koyunlara saman ver', en: 'Give the sheep some hay', target: { hotspot: 'yard.sheep' }, complete: { flag: 'sheep-fed' }, minutes: 10 },
        { id: 'sheep-count', title: 'Koyunlar', obj: 'Dedene koyunları anlat', en: 'Tell grandpa about the sheep', target: { npc: 'dede' }, minutes: 5 },
      ],
    },
  ],
  dialogues: {
    dede: {
      start: (ctx) => ({ 'cow-dede': 'cw1', 'cow-milk': 'cwRemind', 'sheep-feed': 'shRemind', 'sheep-count': 'sh1' })[ctx.q],
      nodes: {
        cw1: { say: 'Gel bakalım Ahmet. Sarıkız\'ın sütü doldu, onu sağma zamanı. Kovayı ineğin altına koy, yavaş yavaş sağ. Sarıkız sakin bir inektir, korkma.',
          en: 'Come here, Ahmet. Sarıkız is full of milk, it\'s time to milk her. Put the bucket under the cow and milk slowly. Sarıkız is a calm cow, don\'t be afraid.',
          words: [['inek', 'cow'], ['sağmak', 'to milk'], ['süt', 'milk'], ['sakin', 'calm'], ['korkmak', 'to be afraid']],
          options: [{ tr: 'Tamam dede, hemen sağarım!', en: 'Okay grandpa, I\'ll milk her right away!', do: ['quest'] }, { tr: 'Biraz korkuyorum ama denerim.', en: 'I\'m a bit scared, but I\'ll try.', do: ['quest'] }] },
        cwRemind: { say: 'Sarıkız bahçenin köşesinde otluyor. Yanına git, sağ onu.', en: 'Sarıkız is grazing in the corner of the yard. Go next to her and milk her.',
          words: [['otlamak', 'to graze']], options: [{ tr: 'Gidiyorum.', en: 'I\'m going.' }] },
        shRemind: { say: 'Saman ağılın yanında. Koyunların yanına git, samanı ver.', en: 'The hay is by the pen. Go to the sheep and give them the hay.',
          words: [['ağıl', 'sheepfold, pen']], options: [{ tr: 'Tamam dede.', en: 'Okay grandpa.' }] },
        sh1: { ask: 'choice', say: 'Aferin! Söyle bakalım, kaç koyunumuz var?', en: 'Well done! Tell me, how many sheep do we have?',
          words: [['kaç', 'how many'], ['koyun', 'sheep']],
          options: [
            { tr: 'Üç koyunumuz var.', en: 'We have three sheep.', next: 'sh2' },
            { tr: 'Üç koyunlarımız var.', en: 'We have three sheeps.', wrong: true },
            { tr: 'Beş koyunumuz var.', en: 'We have five sheep.', wrong: true },
          ] },
        sh2: { say: 'Doğru! Sayıdan sonra çoğul eki gelmez: "üç koyun", "üç koyunlar" değil. Bir de kuzumuz olacak inşallah!',
          en: 'Right! After a number there\'s no plural ending: "üç koyun", not "üç koyunlar". And we\'ll have a lamb too, God willing!',
          words: [['kuzu', 'lamb'], ['çoğul', 'plural']],
          options: [{ tr: 'Kuzu mu? Yaşasın!', en: 'A lamb? Hooray!', do: ['quest'] }] },
      },
    },
    anne: {
      start: (ctx) => (ctx.q === 'cow-mom' ? 'cm1' : undefined),
      nodes: {
        cm1: { say: 'Oo, taze süt! Ellerine sağlık. Akşam bunu kaynatırım, sabah da yoğurt mayalarız.', en: 'Oh, fresh milk! Well done (lit. health to your hands). I\'ll boil it tonight, and in the morning we\'ll make yogurt.',
          words: [['taze', 'fresh'], ['kaynatmak', 'to boil'], ['yoğurt mayalamak', 'to make yogurt']],
          options: [{ tr: 'Afiyet olsun anne!', en: 'Enjoy, mom!', do: ['take:sut', 'quest'] }] },
      },
    },
  },
};
