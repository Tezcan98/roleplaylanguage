import { man, M2 } from '../characters.js';
/**
 * Yusuf Hoca, the young imam of the mosque on the village square (world/locations/VillageSquare.js
 * #mosque): he walks round the courtyard (avlu), stops by the şadırvan and at the mosque's door,
 * and what he says depends on the time of day — morning, noon, afternoon, evening, night, and
 * Friday (cuma). He teaches the names of the five prayer times, how wudu goes, and polite words;
 * asked for "a beautiful word" he shares something to think about (tefekkür) from an ayah, a hadith
 * or a Risale-i Nur saying (word for word), a different one each time.
 */
const ROUTE = [
  { x: 56, z: 4, wait: 0 }, { x: 58, z: 14, wait: 0 },
  { x: 66, z: 15.5, wait: 4, rot: Math.PI / 2 }, // looks at the mosque
  { x: 72.5, z: 10, wait: 0 }, { x: 73, z: 0, wait: 5, rot: Math.PI / 2 }, // at the portico, by the door
  { x: 72.5, z: -8, wait: 0 }, { x: 70, z: -16.5, wait: 0 },
  { x: 62, z: -17.8, wait: 3, rot: 0 }, // by the şadırvan
  { x: 55.6, z: -14, wait: 0 }, { x: 55.6, z: -5, wait: 2, rot: Math.PI / 2 },
]; // (the courtyard: x 52–92, z −21…21; benches along the walls and round the şadırvan at 62, −11)

/** The time of day as his lines go: 'sabah' 5–11, 'ogle' 11–15, 'ikindi' 15–18, 'aksam' 18–21, 'gece'. */
const part = (h) => (h >= 5 && h < 11 ? 'sabah' : h < 15 && h >= 11 ? 'ogle' : h < 18 && h >= 15 ? 'ikindi' : h < 21 && h >= 18 ? 'aksam' : 'gece');

const ASK = [
  { tr: 'Namaz vakitleri neler?', en: 'What are the prayer times?', next: 'vakit' },
  { tr: 'Abdest nasıl alınır?', en: 'How do you do wudu?', next: 'abdest' },
  { tr: 'Bana güzel bir söz söyler misin?', en: 'Will you tell me a beautiful word?', next: 'tefekkur' },
  { tr: 'Görüşürüz Hocam!', en: 'See you, Hoca!' },
];
const AGAIN = [{ tr: 'Teşekkürler Hocam!', en: 'Thank you, Hoca!', next: 'thanks' }, ...ASK.slice(0, 3)];

export default {
  id: 'imam',
  npcs: {
    imam: {
      name: 'Yusuf Hoca', short: 'Yusuf Hoca', role: 'imam · the prayer leader',
      look: { shirt: 0xF4F1EA, vest: 0x1F2A44, robe: 0x1F2A44, pants: 0x1F2A44, skin: 0xE6B48C, hair: 0x2B1D14, beard: 0x2B1D14, sarik: 0xFFFFFF }, // a navy cübbe, a white sarık, a short beard
      face: '<svg width="52" height="52" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#CFE3D4"/><path d="M14 64q0-14 18-14t18 14z" fill="#1F2A44"/><circle cx="32" cy="37" r="14" fill="#E6B48C"/><path d="M19 43q1 9 13 9t13-9q-3 3-13 3t-13-3z" fill="#2B1D14"/><path d="M26 42.5q6-2.5 12 0" stroke="#2B1D14" stroke-width="2.4" fill="none" stroke-linecap="round"/><ellipse cx="32" cy="27" rx="15" ry="6.5" fill="#FFFFFF" stroke="#D9D3C6" stroke-width="1"/><path d="M18 26q14-5 28 0M18.5 29.5q13.5-5 27 0" stroke="#D9D3C6" stroke-width="1.2" fill="none"/><ellipse cx="32" cy="21" rx="10" ry="5" fill="#FFFFFF" stroke="#D9D3C6" stroke-width="1"/><circle cx="27" cy="36" r="1.9" fill="#1B2440"/><circle cx="37" cy="36" r="1.9" fill="#1B2440"/></svg>',
      route: ROUTE,
    },
  },
  voices: { imam: man('Sadachbia', M2) },
  castAll: { imam: ['village', 'imam', 'roam'] },
  dialogues: {
    imam: {
      start: (ctx) => (ctx.dayName === 'Cuma' && ctx.hour >= 10 && ctx.hour < 15 ? 'cuma' : part(ctx.hour)),
      nodes: {
        sabah: { say: 'Hayırlı sabahlar evlat! Ben Yusuf Hoca, bu caminin imamıyım. Sabah namazından sonra avlu ne kadar huzurlu, değil mi?', en: 'Good morning, child! I am Yusuf Hoca, the imam of this mosque. After the morning prayer the courtyard is so peaceful, isn\'t it?',
          words: [['imam', 'prayer leader'], ['avlu', 'courtyard'], ['huzurlu', 'peaceful']],
          variants: [
            { say: 'Günaydın! Erken kalkan yol alır, derler. Kahvaltını yaptın mı?', en: 'Good morning! The early riser gets ahead, they say. Have you had your breakfast?' },
            { say: 'Hayırlı sabahlar! Bak, kuşlar minarenin etrafında uçuşuyor. Ne güzel bir gün!', en: 'Good morning! Look, the birds are flying round the minaret. What a lovely day!' },
          ],
          options: ASK },
        ogle: { say: 'Selamünaleyküm evlat! Öğle ezanına az kaldı. Abdest almak istersen şadırvan orada.', en: 'Peace be upon you, child! It is nearly time for the noon call to prayer. If you want to do wudu, the fountain is over there.',
          words: [['ezan', 'the call to prayer'], ['şadırvan', 'the fountain for wudu'], ['öğle', 'noon']],
          variants: [
            { say: 'Hoş geldin! Güneş tepede, hava sıcak. Biraz gölgede otur, dinlen.', en: 'Welcome! The sun is high and it is hot. Sit in the shade for a while and rest.' },
            { say: 'Selamünaleyküm! Öğle namazından sonra çocuklara Kuran dersi var. Sen de gelir misin?', en: 'Peace be upon you! After the noon prayer there is a Quran lesson for children. Will you come too?' },
          ],
          options: ASK },
        ikindi: { say: 'Selamünaleyküm! İkindi vakti avlu ne kadar sakin. Okuldan mı geliyorsun?', en: 'Peace be upon you! In the afternoon the courtyard is so quiet. Are you coming from school?',
          words: [['ikindi', 'afternoon (prayer time)'], ['sakin', 'quiet, calm']],
          variants: [
            { say: 'Hoş geldin evlat! Derslerin nasıl gidiyor? Her gün biraz okumak çok önemli.', en: 'Welcome, child! How are your lessons going? Reading a little every day is very important.' },
            { say: 'İkindi namazından çıktım. Biraz yürüyüp güvercinlere yem vereceğim.', en: 'I have just come out of the afternoon prayer. I will walk a little and feed the pigeons.' },
          ],
          options: ASK },
        aksam: { say: 'Hayırlı akşamlar evlat! Güneş batıyor, akşam ezanı birazdan okunacak.', en: 'Good evening, child! The sun is setting, the evening call to prayer will be read soon.',
          words: [['akşam', 'evening'], ['güneş batıyor', 'the sun is setting']],
          variants: [
            { say: 'Hayırlı akşamlar! Aileni bekletme, akşam yemeğine geç kalma.', en: 'Good evening! Don\'t keep your family waiting, don\'t be late for dinner.' },
            { say: 'Akşam serinliği geldi. Bu saatte avluda oturmak çok güzel.', en: 'The cool of the evening has come. Sitting in the courtyard at this hour is lovely.' },
          ],
          options: ASK },
        gece: { say: 'Hayırlı geceler evlat! Yatsı namazı da kılındı. Erken uyu ki sabah dinç kalkasın.', en: 'Good night, child! The night prayer is done too. Sleep early so you wake up fresh in the morning.',
          words: [['yatsı', 'the night prayer'], ['dinç', 'fresh, full of energy']],
          variants: [
            { say: 'Bak, gökyüzünde yıldızlar çıkmış. Gece avlu ne kadar güzel, değil mi?', en: 'Look, the stars are out in the sky. The courtyard is so beautiful at night, isn\'t it?' },
            { say: 'Bu saatte dışarıda ne yapıyorsun? Hadi, evine git, annen merak etmesin.', en: 'What are you doing outside at this hour? Come on, go home, don\'t make your mother worry.' },
          ],
          options: ASK },
        cuma: { say: 'Hayırlı cumalar evlat! Bugün cuma, öğlen cami çok kalabalık olacak.', en: 'Have a blessed Friday, child! Today is Friday, the mosque will be very crowded at noon.',
          words: [['cuma', 'Friday'], ['Hayırlı cumalar', 'Have a blessed Friday'], ['kalabalık', 'crowded']],
          variants: [
            { say: 'Hayırlı cumalar! Cuma günü herkes en güzel kıyafetlerini giyer, camiye gelir.', en: 'Have a blessed Friday! On Friday everyone puts on their best clothes and comes to the mosque.' },
          ],
          options: ASK },
        vakit: { say: 'Günde beş vakit namaz var: sabah, öğle, ikindi, akşam ve yatsı. Her vakitten önce minareden ezan okunur.', en: 'There are five prayers a day: morning, noon, afternoon, evening and night. Before each one the call to prayer is read from the minaret.',
          words: [['vakit', 'time (of prayer)'], ['minare', 'minaret'], ['beş vakit', 'the five prayer times']],
          options: AGAIN },
        abdest: { say: 'Önce "Bismillah" deriz. Ellerimizi, ağzımızı, burnumuzu, yüzümüzü ve kollarımızı yıkarız. Sonra başımızı ve kulaklarımızı meshederiz, en son ayaklarımızı yıkarız.', en: 'First we say "Bismillah". We wash our hands, mouth, nose, face and arms. Then we wipe our head and ears with wet hands, and last we wash our feet.',
          words: [['abdest', 'wudu (washing before prayer)'], ['yıkamak', 'to wash'], ['yüz', 'face'], ['kol', 'arm'], ['ayak', 'foot']],
          options: AGAIN },
        tefekkur: { say: 'Kur’an’da şöyle buyrulur: “Göklerin ve yerin yaratılışında, gece ile gündüzün birbiri ardınca gelişinde akıl sahipleri için deliller vardır.” Bu akşam gökyüzüne bir bak ve düşün evlat.', en: 'The Quran says: “In the creation of the heavens and the earth, and in the alternation of night and day, there are signs for those with understanding.” (Al ‘Imran 3:190) Look at the sky this evening and think, child.',
          words: [['gökyüzü', 'the sky'], ['yaratılış', 'creation'], ['düşünmek', 'to think']],
          variants: [
            { say: 'Bediüzzaman Hazretleri der ki: “Bir harf kâtipsiz olmaz.” Peki bu koca kâinat kitabı kâtipsiz olabilir mi? Bir düşün evlat.', en: 'Bediüzzaman says: “A letter is not without a scribe.” So can this great book of the universe be without a Scribe? Think about it, child.',
              words: [['harf', 'letter (of the alphabet)'], ['kâtip', 'scribe, writer'], ['kâinat', 'the universe']] },
            { say: 'Rahman suresinde Allah tekrar tekrar sorar: “Rabbinizin hangi nimetlerini yalanlayabilirsiniz?” Bugün içtiğin suyu, yediğin elmayı bir düşün.', en: 'In Surah ar-Rahman Allah asks again and again: “Which of your Lord’s blessings would you deny?” (55:13) Think of the water you drank and the apple you ate today.',
              words: [['nimet', 'blessing'], ['elma', 'apple'], ['su', 'water']] },
            { say: 'Kur’an der ki: “Allah’ın rahmetinin eserlerine bak; yeryüzünü ölümünden sonra nasıl diriltiyor!” Kışın kuruyan ağaçlar baharda yeniden yeşerir. Bu ne büyük bir kudret!', en: 'The Quran says: “Look at the marks of Allah’s mercy — how He brings the earth to life after its death!” (Ar-Rum 30:50) Trees that dry up in winter turn green again in spring. What great power!',
              words: [['bahar', 'spring'], ['ağaç', 'tree'], ['diriltmek', 'to bring to life'], ['yeşermek', 'to turn green']] },
            { say: 'Bediüzzaman Hazretleri der ki: “Güzel gören güzel düşünür. Güzel düşünen, hayatından lezzet alır.” Sen de her şeye güzel bakmaya çalış evlat.', en: 'Bediüzzaman says: “Whoever sees the good thinks well. Whoever thinks well enjoys his life.” Try to look at everything kindly too, child.',
              words: [['güzel', 'beautiful, good'], ['düşünmek', 'to think'], ['lezzet almak', 'to take pleasure in']] },
            { say: 'Kur’an’da Allah bal arısından bahseder: “Onların karınlarından renk renk bir içecek çıkar; onda insanlar için şifa vardır.” Minicik bir arı, bize bal yapıyor. Ne büyük bir ikram!', en: 'In the Quran Allah speaks of the honeybee: “From their bellies comes a drink of many colours, in which there is healing for people.” (An-Nahl 16:69) A tiny bee makes honey for us. What a great gift!',
              words: [['arı', 'bee'], ['bal', 'honey'], ['şifa', 'healing'], ['ikram', 'gift, kindness']] },
            { say: 'Peygamberimiz buyurmuş: “İki nimet vardır ki insanların çoğu onların kıymetini bilmez: sağlık ve boş vakit.” Sen gençsin, sağlıklısın. Vaktini güzel şeylerle doldur evlat.', en: 'Our Prophet said: “There are two blessings whose worth most people do not know: health and free time.” (Bukhari) You are young and healthy. Fill your time with good things, child.',
              words: [['sağlık', 'health'], ['boş vakit', 'free time'], ['kıymet', 'worth, value']] },
            { say: 'Peygamberimiz buyurmuş: “Dünyada bir garip ya da bir yolcu gibi ol.” Yolcu yolda oyalanmaz, gideceği yeri düşünür. Biz de öyle olalım.', en: 'Our Prophet said: “Be in this world like a stranger or a traveller.” (Bukhari) A traveller doesn’t dawdle on the road; he thinks of where he is going. Let us be like that too.',
              words: [['yolcu', 'traveller'], ['garip', 'stranger'], ['oyalanmak', 'to dawdle']] },
            { say: 'Bediüzzaman Hazretleri der ki: “Biz muhabbet fedaileriyiz; husumete vaktimiz yoktur.” Yani biz sevgiye adanmışız, düşmanlığa vaktimiz yok. Kimseye küsme evlat.', en: 'Bediüzzaman says: “We are devotees of love; we have no time for enmity.” So we are devoted to love and have no time for hostility. Don’t sulk at anyone, child.',
              words: [['muhabbet', 'love, affection'], ['husumet', 'enmity'], ['küsmek', 'to sulk, to stop speaking to']] },
          ],
          options: [
            { tr: 'Bir tane daha söyler misin Hocam?', en: 'Will you tell me one more, Hoca?', next: 'tefekkur' },
            { tr: 'Teşekkürler Hocam!', en: 'Thank you, Hoca!', next: 'thanks' },
          ] },
        thanks: { say: 'Rica ederim evlat. Ne zaman bir sorun olursa gel, sor. Allah\'a emanet ol!', en: 'You\'re welcome, child. Come and ask whenever you have a question. Take care (lit. be entrusted to God)!',
          words: [['rica ederim', 'you\'re welcome'], ['Allah\'a emanet ol', 'take care (lit. be entrusted to God)']],
          options: [{ tr: 'Görüşürüz Hocam!', en: 'See you, Hoca!' }] },
      },
    },
  },
};
