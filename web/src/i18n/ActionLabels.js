import { gloss, turkishOnly } from './Gloss.js';

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
  'Dama al': 'Take a draughts board', 'Skoru sıfırla': 'Reset the score', 'İneği sağ': 'Milk the cow', 'Koyunlara saman ver': 'Give hay to the sheep',
};
const TALK = / ile konuş$/;

/** { main, sub }: the button's text in the player's language, and the Turkish small under it ('' when it is not needed). */
export function actionText(label) {
  if (turkishOnly()) return { main: label, sub: '' };
  let en = EN[label], vars;
  if (!en && TALK.test(label)) { en = 'Talk to {name}'; vars = { name: label.replace(TALK, '') }; }
  const main = en ? gloss(en, vars) : '';
  return main && main !== label ? { main, sub: label } : { main: label, sub: '' };
}
