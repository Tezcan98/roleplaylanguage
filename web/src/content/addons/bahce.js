/**
 * The player's own little garden bed in the yard. Planting comes in a later version: for
 * now grandpa (and the greengrocer, if you ask for seeds) say you are still a bit too young.
 */
export default {
  id: 'bahce',
  hotspots: {
    'yard.myGarden': { label: 'Kendi bahçen', use: ['my-garden'] },
  },
  dialogues: {
    dede: { nodes: {
      myGarden: { say: 'Burası senin bahçen olacak evladım. Domates, biber, fasulye ekeceğiz. Ama yaşın daha küçük; biraz büyü, sonra manavdan tohum alır, birlikte ekeriz.', en: "This will be your own garden, my child. We'll plant tomatoes, peppers and beans. But you're still young; grow a little, then we'll buy seeds at the greengrocer's and plant them together.",
        words: [['bahçe', 'garden'], ['tohum', 'seed'], ['ekmek', 'to sow, to plant'], ['büyümek', 'to grow (up)']],
        options: [{ tr: 'Söz mü dede?', en: 'Promise, grandpa?', next: 'myGarden2' }] },
      myGarden2: { say: 'Söz! Sabırlı ol; her şeyin bir vakti var.', en: 'Promise! Be patient; everything has its time.', words: [['sabırlı', 'patient'], ['vakit', 'time']],
        options: [{ tr: 'Sabırsızlanıyorum!', en: "I can't wait!" }] },
    } },
    manav: { nodes: {
      seeds: { say: 'Domates tohumu mu? Var tabii. Ama sen daha küçüksün evlat. Biraz büyü, deden de gelsin, o zaman veririm.', en: "Tomato seeds? Of course I have some. But you're still little, child. Grow a bit, bring your grandpa along, and then I'll give you some.",
        words: [['tohum', 'seed'], ['küçük', 'little, young']], options: [{ tr: 'Tamam, sonra gelirim.', en: "Okay, I'll come back later." }] },
    } },
  },
};
