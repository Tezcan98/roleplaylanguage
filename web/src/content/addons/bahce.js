import { DIALOGUES } from '../dialogues.js';
const grandpaStoryStart = DIALOGUES.dede.start;

export const gardenStep = (c) => {
  if (String(c.q ?? '').startsWith('farm-')) return c.q;
  if (!c.flag('farm-sidequest') || c.flag('farm-watered') || c.story?.paused || c.online) return null;
  return !c.flag('farm-hoed') ? 'farm-hoe' : !c.flag('farm-planted') ? 'farm-sow' : 'farm-water';
};

/** The player learns to plant their own garden on the second morning. */
export default {
  id: 'bahce',
  quests: [{ chapter: 'd2-homework', after: 'buy', quests: [
    { id: 'farm-seeds', title: 'Dedeyle ekim', obj: 'Bahçede dedenle konuş, üç tohum al', en: 'Talk to grandpa in the yard and get three seeds', target: { npc: 'dede' }, minutes: 2 },
    { id: 'farm-hoe', title: 'Toprağı hazırla', obj: c => c.garden?.objective() ?? 'Bahçenin yanındaki çapayı al, üç toprağı tek tek çapala', en: c => c.garden?.objectiveEn() ?? 'Go to your garden bed and hoe the soil', target: c => c.garden?.target() ?? { hotspot: 'yard.myGarden' }, complete: { flag: 'farm-hoed' }, minutes: 2 },
    { id: 'farm-sow', title: 'Tohum ek', obj: (c) => c.garden?.objective() ?? `Üç tohumu tek tek ek (${c.state.flags['farm-sown'] ?? 0}/3)`, en: c => c.garden?.objectiveEn() ?? 'Sow three seeds, one at a time', target: c => c.garden?.target() ?? { hotspot: 'yard.myGarden' }, complete: { flag: 'farm-planted' }, minutes: 2 },
    { id: 'farm-water', title: 'Can suyu', obj: c => c.garden?.objective() ?? 'Ektiğin tohumları sula', en: c => c.garden?.objectiveEn() ?? 'Water the seeds you planted', target: c => c.garden?.target() ?? { hotspot: 'yard.myGarden' }, complete: { flag: 'farm-watered' }, minutes: 2 },
  ] }],

  kindNames: {
    tohum: { tr: 'fasulye tohumu', en: 'bean seed' },
    'domates-tohumu': { tr: 'domates tohumu', en: 'tomato seed' },
    'biber-tohumu': { tr: 'biber tohumu', en: 'pepper seed' },
  },
  hotspots: {
    'yard.myGarden': { available: (c) => !c.flag('farm-seeds-given'), label: (c) => gardenStep(c) === 'farm-hoe' ? 'Toprağı çapala' : gardenStep(c) === 'farm-sow' ? `Tohum ek (${c.state.flags['farm-sown'] ?? 0}/3)` : gardenStep(c) === 'farm-water' ? 'Can suyu ver' : 'Kendi bahçen', use: ['my-garden'] },
  },
  dialogues: {
    dede: { start: (c) => {
      if (c.q === 'farm-seeds') return 'farmIntro';
      if (['farm-hoe', 'farm-sow', 'farm-water'].includes(c.q)) return 'farmContinue';
      // On day two the guided lesson follows mom's shopping task, before the letter.
      if ((c.state?.day ?? c.day) === 2 && !c.flag('farm-sidequest')) return undefined;
      if (!c.online && !c.story?.paused && (c.state?.day ?? c.day ?? 1) >= 2 && !c.flag('farm-seeds-given')) return 'farmOffer';
      return undefined;
    }, nodes: {
      farmOffer: { say: 'İstersen sana bahçeni ekmeyi öğreteyim. Birkaç tohum vereyim mi?', en: 'I can teach you to plant your garden. Would you like some seeds?',
        options: [{ tr: 'Bahçemi ekmeyi öğrenmek istiyorum.', en: 'Teach me to plant.', next: 'farmTools' }, { tr: 'Önce sana başka bir şey sorayım.', en: 'First, let me ask you something else.', next: (c) => grandpaStoryStart(c) ?? 'end' }] },
      farmIntro: { say: 'Dün söz vermiştim. Bugün kendi bahçeni ekeceğiz! Dışarıda, bahçenin yanında seni bekliyorum. Birlikte toprağı çapalayıp üç tohum ekeceğiz, sonra sulayacağız.', en: 'I promised yesterday. Today we will plant your garden! I am waiting outside beside your garden. We will hoe the soil, plant three seeds and water them together.', words: [['çapa', 'hoe'], ['tohum', 'seed'], ['sulamak', 'to water']],
        options: [{ tr: 'Hazırım dede!', en: 'I am ready, grandpa!', next: 'farmTools' }] },
      farmContinue: { say: 'Ben buradayım evladım. Önce bahçemizi bitirelim: toprağı çapala, tohumları ek, sonra sula.', en: 'I am here, my child. Let us finish our garden first: hoe the soil, sow the seeds, then water them.', options: [{ tr: 'Tamam dede, birlikte yapalım.', en: 'Okay grandpa, let us do it together.' }] },
      farmTools: { say: 'Al bakalım, üç fasulye tohumu. Tohumları çantana koydum. Çapa ve sulama kabı bahçenin yanında. Üç küçük çukur aç, her birine bir tohum koy ve üzerini toprakla ört.', en: 'Here are three bean seeds. I put the seeds in your bag. The hoe and watering can are beside the garden. Make three small holes, put one seed in each and cover them with soil.', words: [['fasulye', 'bean'], ['toprak', 'soil']],
        options: [{ tr: 'Önce toprağı çapalayacağım.', en: 'First I will hoe the soil.', do: ['farm-seeds', 'quest:farm-seeds'] }] },
      myGarden: { say: 'Burası senin bahçen evladım. Yarın sana burayı ekmeyi öğreteyim. Birkaç tohum vereceğim; birlikte çapalar, eker ve sularız.', en: "This is your garden, my child. Tomorrow I will teach you how to plant it. I will give you some seeds; we will hoe, sow and water together.",
        words: [['bahçe', 'garden'], ['tohum', 'seed'], ['tohum ekmek', 'to sow, to plant'], ['büyümek', 'to grow (up)']],
        options: [{ tr: 'Söz mü dede?', en: 'Promise, grandpa?', next: 'myGarden2' }] },
      myGarden2: { say: 'Söz! Sabırlı ol; her şeyin bir vakti var.', en: 'Promise! Be patient; everything has its time.', words: [['sabırlı', 'patient'], ['vakit', 'time']],
        options: [{ tr: 'Sabırsızlanıyorum!', en: "I can't wait!" }] },
    } },
    manav: { nodes: {
      seeds: { say: 'Tohum mu arıyorsun? Deden sana bahçede ekim yapmayı öğretecek. Önce onunla konuş.', en: "Looking for seeds? Your grandpa will teach you to plant in the garden. Talk to him first.",
        words: [['tohum', 'seed'], ['küçük', 'little, young']], options: [{ tr: 'Tamam, sonra gelirim.', en: "Okay, I'll come back later." }] },
    } },
  },
};
