import { man, M2 } from '../characters.js';
import { RIDE_PRICE } from '../../systems/Animals.js';
/**
 * Hamdi the groom (seyis) by the horses on the village square (world/locations/VillageSquare.js
 * #stable): he looks after them and teaches the words of riding — saddle, reins, mane, horseshoe —
 * and what horses eat.
 */
export default {
  id: 'seyis',
  npcs: {
    seyis: {
      name: 'Seyis Hamdi', short: 'Hamdi Amca', role: 'seyis · groom',
      look: { shirt: 0x8A6E4B, vest: 0x3A3F2A, pants: 0x4A3F33, skin: 0xD9A77E, hair: 0x3A2E26, mustache: 0x3A2E26 },
      face: '<svg width="52" height="52" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#E8D9B0"/><circle cx="32" cy="36" r="16" fill="#D9A77E"/><path d="M16 31q4-13 16-13t16 13q-5-5-16-5t-16 5z" fill="#3A2E26"/><circle cx="26" cy="36" r="2" fill="#1B2440"/><circle cx="38" cy="36" r="2" fill="#1B2440"/><path d="M23 43q9-6 18 0q-9 3-18 0z" fill="#3A2E26"/></svg>',
    },
  },
  voices: { seyis: man('Algieba', M2) },
  castAll: { seyis: ['village', 'seyis', 'stand'] },
  dialogues: {
    seyis: {
      start: () => 's1',
      nodes: {
        s1: { say: 'Selam evlat! Ben seyisim, bu atlara ben bakıyorum. Ata binmek ister misin?', en: 'Hello, kid! I am the groom, I look after these horses. Would you like to ride a horse?',
          words: [['seyis', 'groom (looks after horses)'], ['bakmak', 'to look after']],
          options: [
            { tr: 'Evet, binmek istiyorum!', en: 'Yes, I want to ride!', next: 'sRide' },
            { tr: 'Atlar ne yer?', en: 'What do horses eat?', next: 'sEat' },
            { tr: 'Bu ne? (eyer)', en: 'What is this? (saddle)', next: 'sWords' },
          ] },
        sRide: { say: `Bir atın yanına git, "Ata bin" de. Bir binişi ${RIDE_PRICE} kredi. Dizginleri sıkı tut!`, en: 'Go next to a horse and choose "Ride". A ride costs credits. Hold the reins tight!',
          words: [['dizgin', 'reins'], ['sıkı tutmak', 'to hold tight']],
          options: [{ tr: 'Tamam, teşekkürler Hamdi Amca!', en: 'Okay, thank you Uncle Hamdi!' }] },
        sEat: { say: 'Atlar saman, arpa ve havuç yer. Bol bol da su içer. Bak, yalak orada.', en: 'Horses eat hay, barley and carrots. And they drink lots of water. Look, the trough is there.',
          words: [['saman', 'hay'], ['arpa', 'barley'], ['havuç', 'carrot'], ['yalak', 'trough']],
          options: [{ tr: 'Havuç verebilir miyim?', en: 'Can I give a carrot?', next: 'sCarrot' }, { tr: 'Anladım, teşekkürler.', en: 'I see, thanks.' }] },
        sCarrot: { say: 'Tabii! Avucunu düz tut, parmaklarını ısırmasın. Aferin, çok sevdi!', en: 'Of course! Keep your palm flat so it doesn’t bite your fingers. Well done, it loved it!',
          words: [['avuç', 'palm (of the hand)'], ['ısırmak', 'to bite']],
          options: [{ tr: 'Çok tatlı!', en: 'So sweet!' }] },
        sWords: { say: 'Bu eyer, üstüne oturursun. Bu dizgin, atı yönetirsin. Boynundaki tüyler yele, ayağındaki demir de nal.', en: 'This is the saddle, you sit on it. These are the reins, you steer the horse. The hair on its neck is the mane, the iron on its foot is the horseshoe.',
          words: [['eyer', 'saddle'], ['dizgin', 'reins'], ['yele', 'mane'], ['nal', 'horseshoe']],
          options: [{ tr: 'Eyer, dizgin, yele, nal. Öğrendim!', en: 'Saddle, reins, mane, horseshoe. I learnt them!' }] },
      },
    },
  },
};
