/**
 * Things Ahmet can do any time, outside the quest chain. Each one teaches a few words,
 * takes some in-game time and may break a house rule (see HOUSE_RULES).
 *
 * { label, think (bubble over Ahmet), say (what he learns to say), words, minutes, anim? }
 */
export const FREE_ACTIONS = {
  tv: {
    label: 'Televizyon izle', think: 'Çizgi film izliyorum!', say: 'Televizyon izledim.', minutes: 30, anim: 'tv',
    words: [['televizyon', 'television'], ['çizgi film', 'cartoon'], ['izlemek', 'to watch']],
  },
  water: {
    label: 'Su iç', think: 'Oh, soğuk su!', say: 'Bir bardak su içtim.', minutes: 2,
    words: [['su', 'water'], ['bardak', 'glass'], ['içmek', 'to drink']],
  },
  read: {
    label: 'Kitap oku', think: 'Bu kitap çok güzel.', say: 'Kitap okudum.', minutes: 20,
    words: [['kitap', 'book'], ['okumak', 'to read'], ['sayfa', 'page']],
  },
  window: {
    label: 'Pencereden bak',
    think: (c) => (c.isNight ? 'Dışarısı karanlık. Gökyüzünde ay var.' : 'Hava güneşli. Kuşlar uçuyor.'),
    say: (c) => (c.isNight ? 'Hava karanlık.' : 'Hava güneşli.'),
    minutes: 2,
    words: (c) => (c.isNight ? [['karanlık', 'dark'], ['ay', 'moon'], ['yıldız', 'star']] : [['güneşli', 'sunny'], ['kuş', 'bird'], ['hava', 'weather / air']]),
  },
  wash: {
    label: 'Elini yıka', think: 'Ellerim tertemiz!', say: 'Ellerimi yıkadım.', minutes: 3,
    words: [['el', 'hand'], ['yıkamak', 'to wash'], ['temiz', 'clean']],
  },
  water_garden: {
    label: 'Bahçeyi sula', think: 'Domateslerin suya ihtiyacı var!', say: 'Bahçeyi suladım.', minutes: 15, anim: 'water',
    words: [['sulamak', 'to water'], ['bahçe', 'garden'], ['bitki', 'plant']],
  },
  ball: {
    label: 'Topa vur', think: 'Gol!', say: 'Topa vurdum!', // kicked by running into the ball; no time passes
    words: [['top', 'ball'], ['vurmak', 'to kick / hit'], ['gol', 'goal']],
  },
  cat: {
    label: 'Kediyi sev', think: 'Miyav! Kedi mutlu.', say: 'Kediyi sevdim.', minutes: 3,
    words: [['kedi', 'cat'], ['sevmek', 'to love / to pet'], ['mutlu', 'happy']],
  },
  make_tea: {
    label: 'Çay hazırla', think: 'Çayı demliyorum.', say: 'Çay hazırladım.', minutes: 5,
    words: [['çay', 'tea'], ['demlemek', 'to brew'], ['hazırlamak', 'to prepare']],
  },
  set_table: {
    label: 'Sofrayı hazırla', think: 'Herkes için sofrayı hazırlıyorum.', say: 'Sofrayı hazırladım.', minutes: 8,
    words: [['sofra', 'table / meal spread'], ['tabak', 'plate'], ['hazırlamak', 'to prepare']],
  },
  wash_dishes: {
    label: 'Bulaşıkları yıka', think: 'Tabakları yıkıyorum.', say: 'Bulaşıkları yıkadım.', minutes: 10,
    words: [['bulaşık', 'dish / dirty dishes'], ['yıkamak', 'to wash'], ['tabak', 'plate']],
  },
  sweep_house: {
    label: 'Odayı süpür', think: 'Ev biraz daha temiz oldu.', say: 'Odayı süpürdüm.', minutes: 10,
    words: [['süpürmek', 'to sweep'], ['temiz', 'clean'], ['oda', 'room']],
  },
  water_plant: {
    label: 'Çiçeği sula', think: 'Çiçeğin biraz suya ihtiyacı var.', say: 'Çiçeği suladım.', minutes: 3,
    words: [['çiçek', 'flower'], ['ihtiyaç', 'need'], ['sulamak', 'to water']],
  },
  village_fountain: {
    label: 'Çeşmeden su iç', think: 'Çeşmenin suyu serin!', say: 'Çeşmeden su içtim.', minutes: 2,
    words: [['çeşme', 'fountain / tap'], ['serin', 'cool'], ['su içmek', 'to drink water']],
  },
  village_well: {
    label: 'Kuyuyu incele', think: 'Kuyunun içi çok derin.', say: 'Kuyuyu inceledim.', minutes: 2,
    words: [['kuyu', 'well'], ['derin', 'deep'], ['incelemek', 'to examine']],
  },
  village_tea: {
    label: 'Çay iç', think: 'Oh, sıcacık çay!', say: 'Çay bahçesinde oturup çay içtim.', minutes: 10,
    words: [['çay bahçesi', 'tea garden'], ['bardak', 'glass'], ['şeker', 'sugar']],
  },
  village_bench: {
    label: 'Bankta otur', think: 'Meydanda biraz dinleniyorum.', say: 'Bankta oturdum.', minutes: 5,
    words: [['bank', 'bench'], ['dinlenmek', 'to rest'], ['meydan', 'square']],
  },
  village_shop: {
    label: 'Bakkalın tezgahına bak', think: 'Bakkalda birçok şey var.', say: 'Bakkalın tezgahına baktım.', minutes: 2,
    words: [['tezgah', 'counter'], ['alışveriş', 'shopping'], ['bakkal', 'grocer']],
  },
};

/**
 * House rules. When a free action matches `on` and `when(ctx)` is true, the action is
 * stopped and `by` reacts: face to face (dialogue `node`) if in the same place,
 * otherwise by calling out from afar (`shout`).
 */
export const HOUSE_RULES = [
  {
    id: 'tv-homework', on: 'tv', by: 'anne', node: 'warnTvHomework',
    when: (c) => c.q === 'homework',
    shout: ['Ahmet! Önce ödevini yap!', 'Ahmet! Do your homework first!'],
  },
  {
    id: 'tv-at-table', on: 'tv', by: 'anne', node: 'warnTvMeal',
    when: (c) => ['d1-breakfast', 'd1-dinner'].includes(c.chapter),
    shout: ['Ahmet! Sofrada televizyon yok!', 'Ahmet! No TV at the table!'],
  },
  {
    id: 'tv-with-duty', on: 'tv', by: 'anne', node: 'warnTvWork',
    when: (c) => c.hasDuty,
    shout: ['Ahmet! Önce işini bitir, sonra televizyon!', 'Ahmet! Finish your job first, then TV!'],
  },
  {
    id: 'tv-bedtime', on: 'tv', by: 'anne', node: 'warnTvNight',
    when: (c) => c.chapter === 'd1-night' && c.reached('goodnight'),
    shout: ['Ahmet! Yatma saati geldi!', "Ahmet! It's bedtime!"],
  },
];
