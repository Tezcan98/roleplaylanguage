/**
 * The story script. A chapter fixes the day and time, where everyone is (`cast`:
 * npc → [location, anchor, behaviour] or null when away) and a quest chain.
 * Characters only move between chapters — behind a fade — so nobody teleports in view.
 *
 * Quest fields: id, title, obj/en (string or ctx => string), target (or ctx => target),
 * complete ({ pick: kind } | { enter: locationId } | { use: hotspotId } | { flag: name };
 * default: a dialogue `quest` effect), after (effects once done), minutes (in-game time
 * the task takes), intro (card), final.
 * Chapter `enter`: effects run when the chapter starts. A dialogue/hotspot effect
 * `chapter` moves the story on.
 */
/** The muhtar and the grocer are always at the village square. */
const VILLAGE_NPCS = { muhtar: ['village', 'muhtar', 'stand'], bakkal: ['village', 'bakkal', 'stand'] };

const FAMILY_AT_SOFRA = {
  dede: ['house', 'sofraN', 'sitFloor'],
  baba: ['house', 'sofraW', 'sitFloor'],
  anne: ['house', 'sofraE', 'sitFloor'],
};

const laundryCount = (c) => c.count('camasir');

export const STORY = {
  chapters: [
    {
      id: 'd1-morning', day: 1, time: '08:00', location: 'house', spawn: 'start',
      cast: {
        anne: ['house', 'kitchen', 'cook'],
        dede: ['yard', 'garden', 'garden'],
        baba: ['yard', 'car', 'repair'],
        ...VILLAGE_NPCS,
      },
      intro: {
        num: 'Pazar · Bölüm 1', title: 'Canım sıkılıyor',
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
            num: 'Pazar · Bölüm 2', title: 'Avluda',
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
          id: 'tomatoes', title: 'Domates',
          obj: (c) => (c.count('domates') >= 3 ? 'Domatesleri annene götür (evde)' : `Bahçeden domates topla (${c.count('domates')}/3)`),
          en: (c) => (c.count('domates') >= 3 ? 'Take the tomatoes to mom (at home)' : 'Pick tomatoes in the garden'),
          target: (c) => (c.count('domates') >= 3 ? { npc: 'anne' } : { kind: 'domates' }),
          minutes: 20,
        },
      ],
    },

    {
      id: 'd1-breakfast', day: 1, time: '09:30', location: 'house', spawn: 'sofraGuest',
      cast: { ...FAMILY_AT_SOFRA, ...VILLAGE_NPCS },
      intro: {
        num: 'Pazar · Bölüm 3', title: 'Kahvaltı',
        text: 'Bütün aile sofrada. Sıcak çay, peynir, zeytin, domates… Ama ekmek nerede?',
        en: 'The whole family is at the table. Hot tea, cheese, olives, tomatoes… But where is the bread?',
      },
      quests: [
        { id: 'sit-breakfast', title: 'Kahvaltıya otur', obj: 'Sofraya otur', en: 'Sit down for breakfast', target: { hotspot: 'house.sofra' }, complete: { use: 'house.sofra' } },
        { id: 'bread', title: 'Dedenin isteği', obj: 'Oturduğun yerden dedenle konuş', en: 'Talk to grandpa from the breakfast table', target: { npc: 'dede' } },
        {
          id: 'bring-bread', title: 'Ekmek',
          obj: (c) => (c.has('ekmek') ? 'Ekmeği sofraya koy' : 'Mutfaktan ekmeği al'),
          en: (c) => (c.has('ekmek') ? 'Put the bread on the table' : 'Get the bread from the kitchen'),
          target: (c) => (c.has('ekmek') ? { hotspot: 'house.breadTable' } : { item: 'ekmek' }),
          complete: (c) => (c.has('ekmek') ? { use: 'house.breadTable' } : { pick: 'ekmek' }),
          minutes: 5,
        },
        { id: 'tea', title: 'Çay', obj: 'Babanla konuş', en: 'Talk to your dad', target: { npc: 'baba' }, minutes: 15 },
        { id: 'thanks-mom', title: 'Eline sağlık', obj: 'Annene teşekkür et', en: 'Thank your mom', target: { npc: 'anne' }, minutes: 20 },
      ],
    },

    {
      id: 'd1-afternoon', day: 1, time: '14:00', location: 'yard', spawn: 'houseDoor',
      cast: {
        anne: ['yard', 'laundry', 'laundry'],
        dede: ['yard', 'pergolaSeat', 'sitBench'],
        baba: ['yard', 'car', 'repair'],
        ...VILLAGE_NPCS,
      },
      intro: {
        num: 'Pazar · Bölüm 4', title: 'Öğleden sonra',
        text: 'Güneş tepede. Annem çamaşırları ipe astı. Dede asmanın altında dinleniyor.',
        en: 'The sun is high. Mom hung the laundry on the line. Grandpa is resting under the vine.',
      },
      quests: [
        { id: 'laundry-listen', title: 'Annenin sesi', obj: 'Annenle konuş, dikkatle dinle', en: 'Talk to mom and listen carefully', target: { npc: 'anne' } },
        {
          id: 'laundry', title: 'Çamaşırlar',
          obj: (c) => (laundryCount(c) >= 3 ? 'Çamaşırları annene ver' : `İpteki çamaşırları topla (${laundryCount(c)}/3)`),
          en: (c) => (laundryCount(c) >= 3 ? 'Give the laundry to mom' : 'Collect the laundry from the line'),
          target: (c) => (laundryCount(c) >= 3 ? { npc: 'anne' } : { kind: 'camasir' }),
          minutes: 20,
        },
        { id: 'masal', title: 'Dedenin masalı', obj: 'Dedenin yanına otur, masal dinle', en: 'Sit with grandpa and listen to a tale', target: { npc: 'dede' }, complete: { flag: 'tale-kazan' }, after: ['chapter'], minutes: 60 },
      ],
    },

    {
      id: 'd1-dinner', day: 1, time: '19:30', location: 'house', spawn: 'sofraGuest',
      cast: { ...FAMILY_AT_SOFRA, ...VILLAGE_NPCS },
      enter: ['wear:jacket:off'],
      intro: {
        num: 'Pazar · Bölüm 5', title: 'Akşam yemeği',
        text: 'Hava karardı. Annem mercimek çorbası yaptı. Herkes sofrada, günü konuşuyor.',
        en: 'It got dark. Mom made lentil soup. Everyone is at the table, talking about the day.',
      },
      quests: [
        { id: 'dinner-dad', title: 'Bugün ne yaptın?', obj: 'Babana gününü anlat (sesli)', en: 'Tell dad about your day (out loud)', target: { npc: 'baba' } },
        { id: 'dinner-mom', title: 'Sıcak çorba', obj: 'Annenle konuş', en: 'Talk to mom', target: { npc: 'anne' }, minutes: 40 },
      ],
    },

    {
      id: 'd1-night', day: 1, time: '21:30', location: 'house', spawn: 'sofraGuest',
      cast: {
        anne: ['house', 'kitchen', 'cook'],
        baba: ['house', 'sedirL', 'watchTv'],
        dede: null, // already asleep
        ...VILLAGE_NPCS,
      },
      intro: {
        num: 'Pazar · Bölüm 6', title: 'Gece',
        text: 'Saat dokuz buçuk. Dışarısı karanlık. Dede uyudu. Yarın pazartesi, okul var!',
        en: "It's half past nine. It's dark outside. Grandpa is asleep. Tomorrow is Monday — school!",
      },
      quests: [
        { id: 'mom-night', title: 'Yarın okul var', obj: 'Annenle konuş', en: 'Talk to mom', target: { npc: 'anne' } },
        { id: 'take-book', title: 'Kitap', obj: 'Raftan kitabını al', en: 'Take your book from the shelf', target: { item: 'kitap' }, complete: { pick: 'kitap' }, minutes: 5 },
        { id: 'goodnight', title: 'İyi geceler', obj: 'Annene iyi geceler de (sesli)', en: 'Say good night to mom (out loud)', target: { npc: 'anne' }, minutes: 5 },
        { id: 'sleep', title: 'Uyku', obj: 'Yatağına git', en: 'Go to bed', target: { hotspot: 'house.bed' }, complete: { use: 'house.bed' } },
      ],
    },

    {
      id: 'd2-morning', day: 2, time: '07:30', location: 'house', spawn: 'bedside',
      cast: {
        anne: ['house', 'kitchen', 'cook'],
        dede: ['yard', 'garden', 'garden'],
        baba: null, // gone to work
        ...VILLAGE_NPCS,
      },
      intro: {
        num: 'Pazartesi · Bölüm 7', title: 'Okul sabahı',
        text: 'Günaydın! Kuşlar ötüyor. Baba işe gitti. Bugün okulun ilk günü.',
        en: "Good morning! Birds are singing. Dad has gone to work. Today is the first day of school.",
      },
      quests: [
        { id: 'wake', title: 'Günaydın', obj: 'Annene günaydın de', en: 'Say good morning to mom', target: { npc: 'anne' }, minutes: 20 },
        { id: 'jacket2', title: 'Mont', obj: 'Montunu al', en: 'Take your jacket', target: { item: 'mont2' }, complete: { pick: 'mont' }, minutes: 2 },
        { id: 'go-school', title: 'Okul yolu', obj: 'Bahçe kapısından okula git', en: 'Go to school through the garden gate', target: { hotspot: 'yard.gate' } },
      ],
    },

    {
      id: 'd2-school', day: 2, time: '08:40', location: 'schoolyard', spawn: 'gate',
      cast: {
        anne: null, baba: null, dede: null,
        ogretmen: ['classroom', 'teacher', 'teach'],
        elif: ['schoolyard', 'elif', 'stand'],
        can: ['schoolyard', 'can', 'stand'],
        zehra: ['classroom', 'seat2', 'sitBench'],
        ...VILLAGE_NPCS,
      },
      intro: {
        num: 'Pazartesi · Bölüm 8', title: 'Okulda',
        text: 'Köy İlkokulu. Bahçede çocuklar oynuyor. Bayrak dalgalanıyor. Ders birazdan başlayacak!',
        en: 'The village primary school. Children are playing in the yard. The flag is waving. The lesson starts soon!',
      },
      quests: [
        { id: 'meet-elif', title: 'Yeni arkadaş', obj: 'Elif ile tanış', en: 'Meet Elif', target: { npc: 'elif' } },
        { id: 'lesson', title: 'İlk ders', obj: 'Sınıfa gir, derse katıl', en: 'Enter the classroom and join the lesson', target: { hotspot: 'school.door' }, complete: { flag: 'lesson-l1' }, minutes: 45 },
        { id: 'homework-assign', title: 'Ödev', obj: 'Öğretmenle konuş', en: 'Talk to the teacher', target: { npc: 'ogretmen' }, minutes: 10 },
        { id: 'go-home', title: 'Eve dönüş', obj: 'Okul bahçesinden eve dön', en: 'Go home from the schoolyard', target: { hotspot: 'school.exit' } },
      ],
    },

    {
      id: 'd2-homework', day: 2, time: '17:00', location: 'house', spawn: 'door',
      cast: {
        anne: ['house', 'kitchen', 'cook'],
        baba: ['house', 'sedirL', 'sitBench'],
        dede: ['house', 'sedirR', 'sitBench'],
        ogretmen: null, elif: null, can: null, zehra: null,
        ...VILLAGE_NPCS,
      },
      intro: {
        num: 'Pazartesi · Bölüm 9', title: 'Ödev zamanı',
        text: 'Ahmet eve döndü. Baba işten geldi, dede sedirde dinleniyor. Ama önce ödev!',
        en: 'Ahmet is home. Dad is back from work, grandpa is resting on the sedir. But homework first!',
      },
      quests: [
        { id: 'homework', title: 'Ünite 1', obj: 'Masaya otur, kitabındaki Ünite 1\'i bitir', en: 'Sit at the desk and finish Unit 1 in your book', target: { hotspot: 'house.desk' }, complete: { flag: 'homework-u1' }, minutes: 45 },
        { id: 'show-mom', title: 'Aferin', obj: 'Annene ödevini anlat', en: 'Tell mom about your homework', target: { npc: 'anne' } },
        {
          id: 'buy', title: 'Bakkal',
          obj: (c) => (c.has('sut') ? 'Ekmekle sütü annene götür' : 'Köy meydanındaki bakkaldan ekmek ve süt al'),
          en: (c) => (c.has('sut') ? 'Take the bread and milk to mom' : 'Buy bread and milk at the grocer in the village square'),
          target: (c) => (c.has('sut') ? { npc: 'anne' } : { npc: 'bakkal' }),
          minutes: 25,
        },
        {
          id: 'letter', title: 'Mektup',
          obj: (c) => (c.flag('letter-delivered') ? 'Muhtarın haberini dedene anlat' : c.has('mektup') ? 'Mektubu muhtara götür (köy meydanı)' : 'Dedenle konuş'),
          en: (c) => (c.flag('letter-delivered') ? "Tell grandpa the muhtar's news" : c.has('mektup') ? 'Take the letter to the muhtar (village square)' : 'Talk to grandpa'),
          target: (c) => (c.flag('letter-delivered') || !c.has('mektup') ? { npc: 'dede' } : { npc: 'muhtar' }),
          minutes: 25,
        },
        { id: 'free-evening', title: 'Serbest zaman', obj: 'Dolaş, oyna, herkesle konuş', en: 'Explore, play and chat with everyone', target: null, final: true },
      ],
    },
  ],

  outro: {
    num: 'Şimdilik bu kadar', title: 'Devam edecek…', button: 'Dolaşmaya devam',
    text: (c) => `Harika iki gün! ${c.words} kelime öğrendin. Yeni bölümler yakında.`,
    en: 'Two great days! New chapters are coming soon.',
  },
};
