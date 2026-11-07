import { bedArt } from './GardenArt.js';

export const GARDEN_RELEASE = 'garden-release-2026-11';

/** Acknowledge once per device; game saves and future OTA builds do not reset it. */
export class GardenReleaseIntro {
  constructor({ cards, settings }) { Object.assign(this, { cards, settings }); this.showing = false; }
  showIfNeeded() {
    if (this.showing || this.settings.get(GARDEN_RELEASE, false)) return false;
    this.showing = true;
    this.cards.show({
      num: 'YENİ ÖZELLİK · 🌱',
      title: 'Kendi bahçeni yetiştir!',
      illustration: bedArt({ hoed: true, crop: 'tomato', wateredAt: 1 }, { stage: 'ready' }, 0),
      text: 'Bahçende 9 ayrı ekim gözü seni bekliyor! Çapala, fasulye, domates ve biber ek; sula, büyüt ve hasat et. Ürünlerini satıp yeni tohumlar al. İkinci gün deden sana ekmeyi öğretecek. Hikâyede ilerlediysen de dedene gidip bahçe dersini alabilirsin. Bildirimlere izin verirsen su bekleyen tohumlarını ve hasat zamanını haber veririz.',
      en: 'Your garden has nine planting beds! Hoe, plant beans, tomatoes and peppers, water them and harvest. Sell your crops to buy new seeds. Grandpa teaches you on day two. Already further in the story? Talk to him for the garden lesson. Allow notifications for watering and harvest reminders.',
      button: 'Tamam',
    }, () => { this.settings.set(GARDEN_RELEASE, true); this.showing = false; });
    return true;
  }
}
