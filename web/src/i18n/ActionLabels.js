import { gloss, glossLang, turkishOnly } from './Gloss.js';

/**
 * What an action button says in the player's own language (the Turkish stays small under it): someone who
 * knows no Turkish yet must know what the button does. English here, translated through the gloss
 * dictionaries (assets/i18n/<code>.json); a button not listed shows its Turkish alone.
 */
const EN = {
  'Eve dön': 'Go home', 'Eve gir': 'Go into the house', 'Dışarı çık': 'Go outside', 'Sokağa çık': 'Go out to the street', 'Bahçeye çık': 'Go out to the yard',
  'Köy meydanına git': 'Go to the village square', 'Okul bahçesine git ⚽': 'Go to the schoolyard ⚽', 'Ana menüye dön': 'Back to the main menu',
  'Yat, uyu': 'Lie down and sleep', 'Otur, kitap oku': 'Sit and read a book', 'Kitap oku': 'Read a book', 'Televizyon izle': 'Watch TV', 'Pencereden bak': 'Look out of the window',
  'Sofrayı hazırla': 'Set the table', 'Sofraya otur': 'Sit at the table', 'Masaya koy': 'Put it on the table', 'Ekmeği sofraya koy': 'Put the bread on the table',
  'Ödev yap': 'Do homework', 'Odayı süpür': 'Sweep the room', 'Bulaşıkları yıka': 'Wash the dishes', 'Elini yıka': 'Wash your hands', 'Abdest al': 'Make ablution (wudu)',
  'Su iç': 'Drink water', 'Çeşmeden su iç': 'Drink water from the fountain', 'Çay iç': 'Drink tea', 'Çay hazırla': 'Make tea', 'Çöpe at': 'Throw it in the bin',
  'Bahçeyi sula': 'Water the garden', 'Çiçeği sula': 'Water the flower', 'Topa vur': 'Kick the ball', 'Halaya katıl': 'Join the halay dance',
  'Salıncakta sallan': 'Swing on the swing', 'Kaydıraktan kay': 'Go down the slide', 'Tahterevalliye bin': 'Ride the seesaw', 'Bisiklete bin': 'Ride the bicycle', 'Bisikletten in': 'Get off the bicycle',
  'Banka otur': 'Sit on the bench', 'Bankta otur': 'Sit on the bench', 'Banka otur, maçı izle': 'Sit on the bench and watch the match', 'Kahvehanede otur': 'Sit in the coffeehouse', 'Çay bahçesinde otur': 'Sit in the tea garden',
  'Sinemada otur': 'Sit in the cinema', 'Camiye bak': 'Look at the mosque', 'Raflara bak': 'Look at the shelves', 'Bakkalın tezgahına bak': 'Look at the grocer’s counter', 'Alışveriş yap': 'Go shopping', 'Meyve sebze al': 'Buy fruit and vegetables',
  'Dama al': 'Take a draughts board', 'İsmail Dede’ye sor': 'Ask İsmail Dede', 'Taşı yerine bırak': 'Put the piece back', 'Skoru sıfırla': 'Reset the score', 'İneği sağ': 'Milk the cow', 'Koyunlara saman ver': 'Give hay to the sheep',
};
const TALK = / ile konuş$/;

/**
 * The people's names on the buttons ("Baba ile konuş" → "Talk to dad"), in each language: the family words translated,
 * the names in the language's own letters (Arabic, Urdu, Hindi), never Latin letters inside them. [en, ar, ur, hi, es, fr].
 */
const PEOPLE = {
  Anne: ['mom', 'أمي', 'امی', 'माँ', 'mamá', 'maman'], Baba: ['dad', 'أبي', 'ابو', 'पापा', 'papá', 'papa'],
  Dede: ['grandpa', 'جدي', 'دادا جان', 'दादाजी', 'el abuelo', 'papi'], Nine: ['grandma', 'جدتي', 'دادی جان', 'दादी', 'la abuela', 'mamie'],
  Ali: ['Ali', 'علي', 'علی', 'अली', 'Ali', 'Ali'], Öğretmen: ['the teacher', 'المعلمة', 'استانی جی', 'टीचर', 'la maestra', 'la maîtresse'],
  Bakkal: ['the grocer', 'البقال', 'دکاندار', 'किराने वाले', 'el tendero', "l'épicier"], Manav: ['the greengrocer', 'بائع الخضار', 'سبزی والے', 'सब्ज़ी वाले', 'el frutero', 'le marchand de légumes'],
  Çaycı: ['the tea maker', 'بائع الشاي', 'چائے والے', 'चाय वाले', 'el del té', 'le marchand de thé'],
  Elif: ['Elif', 'إليف', 'ایلف', 'एलिफ़', 'Elif', 'Elif'], Can: ['Can', 'جان', 'جان', 'जान', 'Can', 'Can'], Zehra: ['Zehra', 'زهراء', 'زہرا', 'ज़ेहरा', 'Zehra', 'Zehra'],
  Hüseyin: ['Uncle Hüseyin', 'العم حسين', 'حسین چچا', 'हुसेयिन चचा', 'el tío Hüseyin', 'oncle Hüseyin'], Kadir: ['Uncle Kadir', 'العم قادر', 'قادر چچا', 'कादिर चचा', 'el tío Kadir', 'oncle Kadir'],
  Hüsnü: ['Uncle Hüsnü', 'العم حسني', 'حسنی چچا', 'हुस्नू चचा', 'el tío Hüsnü', 'oncle Hüsnü'], Kemal: ['Uncle Kemal', 'العم كمال', 'کمال چچا', 'केमाल चचा', 'el tío Kemal', 'oncle Kemal'],
  Rıfat: ['Uncle Rıfat', 'العم رفعت', 'رفعت چچا', 'रिफ़ात चचा', 'el tío Rıfat', 'oncle Rıfat'], Cemil: ['master Cemil', 'الأسطى جميل', 'استاد جمیل', 'उस्ताद जमील', 'el maestro Cemil', 'maître Cemil'],
  'Aslan Bey': ['Aslan Bey', 'أصلان بك', 'اصلان بے', 'अस्लान बे', 'Aslan Bey', 'Aslan Bey'], 'İsmail Dede': ['Grandpa İsmail', 'الجد إسماعيل', 'اسماعیل دادا', 'इस्माइल दादा', 'el abuelo İsmail', 'papi İsmail'],
  'Hasan Amca': ['Uncle Hasan', 'العم حسن', 'حسن چچا', 'हसन चचा', 'el tío Hasan', 'oncle Hasan'], 'Hamdi Amca': ['Uncle Hamdi', 'العم حمدي', 'حمدی چچا', 'हम्दी चचा', 'el tío Hamdi', 'oncle Hamdi'],
  'Cemal Abi': ['Cemal', 'الأخ جمال', 'جمال بھائی', 'जेमाल भैया', 'Cemal', 'Cemal'], 'Yusuf Hoca': ['Yusuf Hoca', 'الشيخ يوسف', 'یوسف حافظ صاحب', 'यूसुफ़ हॉजा', 'el imam Yusuf', "l'imam Yusuf"],
  Defne: ['Defne', 'دفنه', 'دفنے', 'देफ़्ने', 'Defne', 'Defne'], Ayşe: ['Ayşe', 'عائشة', 'عائشہ', 'आयशे', 'Ayşe', 'Ayşe'], Emre: ['Emre', 'أمره', 'امرے', 'एमरे', 'Emre', 'Emre'], Mert: ['Mert', 'مرت', 'مرت', 'मेर्त', 'Mert', 'Mert'],
};
const COLUMN = { en: 0, ar: 1, ur: 2, hi: 3, es: 4, fr: 5 };
/** A person's name as the meaning language writes it ('' when it has none: then the Turkish name stays). */
export function personName(tr) {
  const row = PEOPLE[tr], k = COLUMN[glossLang()];
  return row && k != null ? row[k] : '';
}

/** The chess board's buttons (systems/ChessGame.js find): the piece's name stays Turkish only in the small line. */
const PIECE_EN = { şah: 'king', vezir: 'queen', kale: 'rook', fil: 'bishop', at: 'knight', piyon: 'pawn' };
const CHESS = [
  [/^(şah|vezir|kale|fil|at|piyon) taşını al$/, (m) => ['Take the {piece}', { piece: gloss(PIECE_EN[m[1]]) }]],
  [/^(şah|vezir|kale|fil|at|piyon): ([a-h][1-8]) karesine oyna$/, (m) => ['Move the {piece} to {sq}', { piece: gloss(PIECE_EN[m[1]]), sq: m[2] }]],
];
/** { main, sub }: the button's text in the player's language, and the Turkish small under it ('' when it is not needed). */
export function actionText(label) {
  if (turkishOnly()) return { main: label, sub: '' };
  let en = EN[label], vars;
  if (!en) for (const [re, f] of CHESS) { const m = re.exec(label); if (m) [en, vars] = f(m); }
  if (!en && TALK.test(label)) { const who = label.replace(TALK, ''); en = 'Talk to {name}'; vars = { name: personName(who) || who }; }
  const main = en ? gloss(en, vars) : '';
  return main && main !== label ? { main, sub: label } : { main: label, sub: '' };
}
