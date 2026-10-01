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
          obj: 'Mutfaktan ekmeği al',
          en: 'Get the bread from the kitchen',
          target: { item: 'ekmek' },
          complete: { pick: 'ekmek' },
          minutes: 5,
        },
        {
          id: 'place-bread', title: 'Sofraya ekmek koy',
          obj: 'Ekmeği sofraya koy',
          en: 'Put the bread on the table',
          target: { hotspot: 'house.breadTable' },
          complete: { use: 'house.breadTable' },
          minutes: 2,
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
        { id: 'make-tea', title: 'Çay saati', obj: 'Akşam oldu: mutfakta çay hazırla', en: "It's evening: prepare tea in the kitchen", target: { hotspot: 'house.tea' }, complete: { use: 'house.tea' } },
        { id: 'set-table', title: 'Sofra', obj: 'Sofrayı hazırla', en: 'Set the table', target: { hotspot: 'house.table' }, complete: { use: 'house.table' } },
        { id: 'wash-dishes', title: 'Bulaşıklar', obj: 'Bulaşıkları yıka', en: 'Wash the dishes', target: { hotspot: 'house.dishes' }, complete: { use: 'house.dishes' } },
        { id: 'sweep-house', title: 'Temizlik', obj: 'Odayı süpür', en: 'Sweep the room', target: { hotspot: 'house.sweep' }, complete: { use: 'house.sweep' } },
        { id: 'water-plant', title: 'Çiçek', obj: 'Salondaki çiçeği sula', en: 'Water the plant in the living room', target: { hotspot: 'house.plant' }, complete: { use: 'house.plant' }, after: ['chapter'] },
      ],
    },

    {
      id: 'd2-night', day: 2, time: '20:30', location: 'house', spawn: 'door',
      cast: {
        anne: ['house', 'kitchen', 'cook'],
        baba: ['house', 'sedirL', 'sitBench'],
        dede: ['house', 'sedirR', 'sitBench'],
        ogretmen: null, elif: null, can: null, zehra: null,
        ...VILLAGE_NPCS,
      },
      intro: {
        num: 'Pazartesi · Bölüm 10', title: 'Akşam sakinliği',
        text: 'Ödev bitti. Ev biraz sessiz. Yarın yine okul var ama bu akşam biraz aileyle vakit var.',
        en: 'Homework is done. The house is quiet. School is tomorrow, but there is still time with the family tonight.',
      },
      quests: [
        { id: 'read-night', title: 'Biraz oku', obj: 'Kitabından biraz oku', en: 'Read a little from your book', target: { hotspot: 'house.shelf' }, complete: { use: 'house.shelf' }, minutes: 20 },
        { id: 'talk-dede-night', title: 'Dedenle sohbet', obj: 'Dedenle biraz sohbet et', en: 'Chat with grandpa for a while', target: { npc: 'dede' }, after: ['chapter'], minutes: 15 },
      ],
    },

    {
      id: 'd3-morning', day: 3, time: '07:30', location: 'house', spawn: 'bedside',
      cast: {
        anne: ['house', 'kitchen', 'cook'],
        dede: ['yard', 'garden', 'garden'],
        baba: ['house', 'sedirL', 'sitBench'],
        ...VILLAGE_NPCS,
      },
      intro: {
        num: 'Salı · Bölüm 11', title: 'Yeni okul günü',
        text: 'Salı sabahı. Dün öğrendiklerini hatırlıyor musun? Bugün sınıfta yeni bir ders var.',
        en: 'Tuesday morning. Do you remember what you learned yesterday? There is a new lesson today.',
      },
      quests: [
        { id: 'wake-2', title: 'Günaydın', obj: 'Annene günaydın de', en: 'Say good morning to mom', target: { npc: 'anne' }, minutes: 10 },
        { id: 'school-2', title: 'Okul', obj: 'Bahçe kapısından okula git', en: 'Go to school through the garden gate', target: { hotspot: 'yard.gate' } },
      ],
    },

    {
      id: 'd3-school', day: 3, time: '08:40', location: 'schoolyard', spawn: 'gate', lessonId: 'l2',
      cast: {
        anne: null, baba: null, dede: null,
        ogretmen: ['classroom', 'teacher', 'teach'],
        elif: ['schoolyard', 'elif', 'stand'],
        can: ['schoolyard', 'can', 'stand'],
        zehra: ['classroom', 'seat2', 'sitBench'],
        ...VILLAGE_NPCS,
      },
      intro: {
        num: 'Salı · Bölüm 12', title: 'Sayılar',
        text: 'Elif, Can ve Zehra seni bahçede bekliyor. Bugün sınıfta yeni kelimeler öğreneceksiniz.',
        en: 'Elif, Can and Zehra are waiting in the schoolyard. Today you will learn new words in class.',
      },
      quests: [
        { id: 'meet-can', title: 'Can ile konuş', obj: 'Can ile konuş', en: 'Talk to Can', target: { npc: 'can' } },
        { id: 'lesson-2', title: 'İkinci ders', obj: 'Sınıfa gir ve derse katıl', en: 'Enter the classroom and join the lesson', target: { hotspot: 'school.door' }, complete: { flag: 'lesson-l2' }, minutes: 45 },
        { id: 'teacher-2', title: 'Bugünün ödevi', obj: 'Öğretmenle konuş', en: 'Talk to the teacher', target: { npc: 'ogretmen' }, minutes: 10 },
        { id: 'go-home-2', title: 'Eve dönüş', obj: 'Okuldan eve dön', en: 'Go home from school', target: { hotspot: 'school.exit' } },
      ],
    },

    {
      id: 'd3-home', day: 3, time: '17:00', location: 'house', spawn: 'door',
      cast: {
        anne: ['house', 'kitchen', 'cook'],
        baba: ['house', 'sedirL', 'sitBench'],
        dede: ['house', 'sedirR', 'sitBench'],
        ogretmen: null, elif: null, can: null, zehra: null,
        ...VILLAGE_NPCS,
      },
      intro: {
        num: 'Salı · Bölüm 13', title: 'Okuldan sonra',
        text: 'Eve geldin. Bugünkü ders daha zordu. Önce kısa bir tekrar, sonra aileyle sohbet.',
        en: 'You are home. Today’s lesson was harder. First a short review, then time with the family.',
      },
      quests: [
        { id: 'review-2', title: 'Dersi tekrar et', obj: 'Kitabından bugünkü konuyu tekrar et', en: 'Review today’s topic in your book', target: { hotspot: 'house.shelf' }, complete: { use: 'house.shelf' }, minutes: 20 },
        { id: 'talk-baba-tools', title: 'Babaya yardım', obj: 'Babanla konuş', en: 'Talk to dad', target: { npc: 'baba' }, minutes: 15 },
        { id: 'talk-dede-3', title: 'Bahçe planı', obj: 'Dedenle yarın için konuş', en: 'Talk to grandpa about tomorrow', target: { npc: 'dede' }, after: ['chapter'], minutes: 15 },
      ],
    },

    {
      id: 'd4-morning', day: 4, time: '07:30', location: 'house', spawn: 'bedside',
      cast: {
        anne: ['house', 'kitchen', 'cook'],
        baba: ['house', 'sedirL', 'sitBench'],
        dede: ['yard', 'garden', 'garden'],
        ...VILLAGE_NPCS,
      },
      intro: {
        num: 'Çarşamba · Bölüm 14', title: 'Çarşamba',
        text: 'Haftanın ortası geldi. Okuldan sonra arkadaşlarınla buluşmak için plan yapabilirsiniz.',
        en: 'It is Wednesday already. After school, you can make plans to meet your friends.',
      },
      quests: [
        { id: 'morning-3', title: 'Günaydın', obj: 'Annene günaydın de', en: 'Say good morning to mom', target: { npc: 'anne' }, minutes: 10 },
        { id: 'school-3', title: 'Okula git', obj: 'Bahçe kapısından okula git', en: 'Go to school', target: { hotspot: 'yard.gate' } },
      ],
    },

    {
      id: 'd4-school', day: 4, time: '08:40', location: 'schoolyard', spawn: 'gate', lessonId: 'l3',
      cast: {
        anne: null, baba: null, dede: null,
        ogretmen: ['classroom', 'teacher', 'teach'],
        elif: ['schoolyard', 'elif', 'stand'],
        can: ['schoolyard', 'can', 'stand'],
        zehra: ['schoolyard', 'zehra', 'stand'], // meet-zehra happens before class; she takes her seat when the lesson starts
        ...VILLAGE_NPCS,
      },
      intro: {
        num: 'Çarşamba · Bölüm 15', title: 'Sınıf eşyaları',
        text: 'Bugün derste sınıftaki eşyaları öğreneceksin: “Bu ne? Nerede?” Arkadaşların da derse katılıyor.',
        en: 'Today in class you will learn the things in the classroom: “What is this? Where is it?” Your friends are joining in too.',
      },
      quests: [
        { id: 'meet-zehra', title: 'Zehra ile konuş', obj: 'Zehra ile konuş', en: 'Talk to Zehra', target: { npc: 'zehra' } },
        { id: 'lesson-3', title: 'Üçüncü ders', obj: 'Sınıfa gir ve derse katıl', en: 'Enter the classroom and join the lesson', target: { hotspot: 'school.door' }, complete: { flag: 'lesson-l3' }, minutes: 45 },
        { id: 'teacher-3', title: 'Sınıf görevi', obj: 'Öğretmenle konuş', en: 'Talk to the teacher', target: { npc: 'ogretmen' }, minutes: 10 },
        { id: 'go-home-3', title: 'Eve dönüş', obj: 'Okuldan eve dön', en: 'Go home from school', target: { hotspot: 'school.exit' } },
      ],
    },

    {
      id: 'd4-home', day: 4, time: '16:30', location: 'house', spawn: 'door',
      cast: {
        anne: ['house', 'kitchen', 'cook'],
        baba: ['house', 'sedirL', 'sitBench'],
        dede: ['house', 'sedirR', 'sitBench'],
        ogretmen: null, elif: ['village', 'benchWest', 'sitBench'], can: ['village', 'benchEast', 'sitBench'], zehra: ['village', 'zehra', 'stand'],
        ...VILLAGE_NPCS,
      },
      intro: {
        num: 'Çarşamba · Bölüm 16', title: 'Arkadaşlarla buluşma',
        text: 'Ödev bugün kısa. Akşam arkadaşların köy meydanında buluşacak. Birlikte konuşup oyun oynayabilirsiniz.',
        en: 'Homework is short today. Your friends will meet at the village square this evening. You can talk and play together.',
      },
      quests: [
        { id: 'water-garden-2', title: 'Bahçeye yardım', obj: 'Bahçeyi sula', en: 'Water the garden', target: { hotspot: 'yard.garden' }, complete: { use: 'yard.garden' }, minutes: 15 },
        { id: 'friend-plan', title: 'Buluşma', obj: 'Köy meydanında Elif ile buluş', en: 'Meet Elif at the village square', target: { npc: 'elif' }, after: ['chapter'], minutes: 20 },
      ],
    },

    {
      id: 'd5-morning', day: 6, time: '07:30', location: 'house', spawn: 'bedside',
      cast: {
        anne: ['house', 'kitchen', 'cook'],
        baba: ['house', 'sedirL', 'sitBench'],
        dede: ['yard', 'garden', 'garden'],
        ...VILLAGE_NPCS,
      },
      intro: {
        num: 'Cuma · Bölüm 18', title: 'Hafta sonuna doğru',
        text: 'Cuma sabahı! Haftanın son okul günü; sonra hafta sonu.',
        en: 'Friday morning! The last school day of the week, then the weekend.',
      },
      quests: [
        { id: 'morning-4', title: 'Günaydın', obj: 'Annene günaydın de', en: 'Say good morning to mom', target: { npc: 'anne' }, minutes: 10 },
        { id: 'school-4', title: 'Okula git', obj: 'Okula git', en: 'Go to school', target: { hotspot: 'yard.gate' } },
      ],
    },

    {
      id: 'd5-school', day: 6, time: '08:40', location: 'schoolyard', spawn: 'gate', lessonId: 'l4',
      cast: {
        anne: null, baba: null, dede: null,
        ogretmen: ['classroom', 'teacher', 'teach'],
        elif: ['schoolyard', 'elif', 'stand'],
        can: ['schoolyard', 'can', 'stand'],
        zehra: ['classroom', 'seat2', 'sitBench'],
        ...VILLAGE_NPCS,
      },
      intro: {
        num: 'Cuma · Bölüm 19', title: 'Hafta sonu planı',
        text: 'Dersten sonra herkes hafta sonu ne yapacağını konuşuyor.',
        en: 'After class, everyone is talking about their weekend plans.',
      },
      quests: [
        { id: 'chat-weekend', title: 'Hafta sonu planı', obj: 'Elif ile hafta sonu planını konuş', en: 'Talk to Elif about the weekend plan', target: { npc: 'elif' } },
        { id: 'lesson-4', title: 'Ders', obj: 'Sınıfa gir ve derse katıl', en: 'Enter the classroom and join the lesson', target: { hotspot: 'school.door' }, complete: { flag: 'lesson-l4' }, minutes: 45 },
        { id: 'go-home-4', title: 'Eve dön', obj: 'Okuldan eve dön', en: 'Go home from school', target: { hotspot: 'school.exit' } },
      ],
    },

    {
      id: 'd5-home', day: 6, time: '17:00', location: 'house', spawn: 'door',
      cast: {
        anne: ['house', 'kitchen', 'cook'],
        baba: ['house', 'sedirL', 'sitBench'],
        dede: ['house', 'sedirR', 'sitBench'],
        ogretmen: null, elif: null, can: null, zehra: null,
        ...VILLAGE_NPCS,
      },
      intro: {
        num: 'Cuma · Bölüm 20', title: 'Okul haftası bitti',
        text: 'Bu hafta okul bitti! Bu akşam biraz dinlenip hafta sonuna hazırlanabilirsin.',
        en: 'School is over for this week! Tonight you can rest and get ready for the weekend.',
      },
      quests: [
        { id: 'read-5', title: 'Kısa tekrar', obj: 'Kitabından kısa bir tekrar yap', en: 'Do a short review in your book', target: { hotspot: 'house.shelf' }, complete: { use: 'house.shelf' }, minutes: 15 },
        { id: 'talk-mom-weekend', title: 'Hafta sonu', obj: 'Annenle hafta sonunu konuş', en: 'Talk to mom about the weekend', target: { npc: 'anne' }, after: ['chapter'], minutes: 15 },
      ],
    },

    {
      id: 'd6-morning', day: 7, time: '09:00', location: 'village', spawn: 'yardRoad',
      cast: {
        anne: ['house', 'kitchen', 'cook'],
        baba: ['house', 'sedirL', 'sitBench'],
        dede: ['house', 'sedirR', 'sitBench'],
        elif: ['village', 'benchWest', 'sitBench'],
        can: ['village', 'benchEast', 'sitBench'],
        zehra: ['village', 'zehra', 'stand'],
        ...VILLAGE_NPCS,
      },
      intro: {
        num: 'Cumartesi · Bölüm 21', title: 'Hafta sonu başladı',
        text: 'Okul yok! Arkadaşların köy meydanında. Muhtar da bugün köyde büyük bir hazırlık olduğunu söylüyor.',
        en: 'No school! Your friends are at the village square. The muhtar says there is a big preparation in the village today.',
      },
      quests: [
        { id: 'sat-elif', title: 'Elif ile buluş', obj: 'Elif ile konuş', en: 'Talk to Elif', target: { npc: 'elif' }, minutes: 10 },
        { id: 'sat-can', title: 'Can ile buluş', obj: 'Can ile konuş', en: 'Talk to Can', target: { npc: 'can' }, minutes: 10 },
        { id: 'sat-zehra', title: 'Zehra ile buluş', obj: 'Zehra ile konuş', en: 'Talk to Zehra', target: { npc: 'zehra' }, minutes: 10 },
        { id: 'sat-muhtar', title: 'Köy hazırlığı', obj: 'Muhtarla konuş', en: 'Talk to the muhtar', target: { npc: 'muhtar' }, after: ['chapter'], minutes: 20 },
      ],
    },

    {
      id: 'd7-morning', day: 8, time: '10:00', location: 'yard', spawn: 'houseDoor',
      cast: {
        anne: ['yard', 'laundry', 'laundry'],
        baba: ['yard', 'car', 'repair'],
        dede: ['yard', 'pergolaSeat', 'sitBench'],
        elif: ['village', 'benchWest', 'sitBench'],
        can: ['village', 'benchEast', 'sitBench'],
        zehra: ['village', 'zehra', 'stand'],
        ...VILLAGE_NPCS,
      },
      intro: {
        num: 'Pazar · Bölüm 22', title: 'Pazar günü',
        text: 'Hafta sonunun son günü. Ailenin yanında biraz yardım ediyor, sonra arkadaşlarınla yeniden buluşuyorsun.',
        en: 'The last day of the weekend. You help your family for a while, then meet your friends again.',
      },
      quests: [
        { id: 'sun-garden', title: 'Pazar bahçesi', obj: 'Bahçeyi sula', en: 'Water the garden', target: { hotspot: 'yard.garden' }, complete: { use: 'yard.garden' }, minutes: 15 },
        { id: 'sun-dede', title: 'Pazar sohbeti', obj: 'Dedenle oturup konuş', en: 'Sit and talk with grandpa', target: { npc: 'dede' }, minutes: 30 },
        { id: 'sun-friends', title: 'Son buluşma', obj: 'Köy meydanına gidip arkadaşlarınla konuş', en: 'Go to the village square and talk with your friends', target: { npc: 'elif' }, after: ['chapter'], minutes: 30 },
      ],
    },
  ],

  outro: {
    num: 'Şimdilik bu kadar', title: 'Devam edecek…', button: 'Dolaşmaya devam',
    text: (c) => `Harika bir hafta! ${c.words} kelime öğrendin. Yeni bölümler yakında.`,
    en: 'What a great week! New chapters are coming soon.',
  },
};
