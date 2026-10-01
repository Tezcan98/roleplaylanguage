import { el } from './dom.js';
import { gloss, glossDir, glossLang } from '../i18n/Gloss.js';

/**
 * First-launch introduction in the player's language (with a short Turkish line),
 * reachable again from the menu and the help panel.
 */
export const SLIDES = [
  { icon: '🏡', title: 'Welcome to the Yılmaz family home!', text: 'Learn Turkish while living with the family in the village: help your mom, listen to grandpa’s tales, and go to school.', tr: 'Yılmaz ailesinin evine hoş geldin!' },
  { icon: '🕹️', title: 'Walking and quests', text: 'Walk with the joystick or the WASD keys. Follow the golden arrow, and when the yellow button appears, press it (or E).', tr: 'Yürü, oku takip et, sarı düğmeye bas.' },
  { icon: '💬', title: 'Talking', text: 'The Turkish sentence is on top and the translation below it. Pick the answer, or press 🎤 and say it out loud. 🔊 reads the sentence to you.', tr: 'Cevabı seç ya da mikrofona bas ve söyle.' },
  { icon: '🧕', title: 'Grandma and free chat', text: 'Grandma (nine) on the sedir gives you a new piece of advice every day. With 💬 you can chat freely in Turkish with the people of the village.', tr: 'Nine her gün nasihat verir; 💬 ile serbest sohbet edebilirsin.' },
  { icon: '🏫', title: 'School practice', text: 'Outside school days, the garden gate takes you to school to practise for 1 credit. Your day at home waits until you come back. You start with 50 credits.', tr: 'Bahçe kapısından 1 krediyle okula gidip pratik yapabilirsin.' },
  { icon: '؟', title: 'The help button', text: 'The “?” button in the corner explains in your language what to do now, what is in your bag and how to play.', tr: 'Köşedeki ? düğmesi her şeyi senin dilinde anlatır.' },
  { icon: '🌐', title: 'The village square', text: 'In the square you meet real players. What you say appears as text above your head. Voice chat is only between two people, after both agree. You can play football together too!', tr: 'Meydanda konuşmalar yazıyla görünür; sesli sohbet karşılıklı onayla.' },
  { icon: '🐘', title: 'Elephant memory', text: 'In the school book, cards link a Turkish word to a word that sounds similar and a funny picture. That way you won’t forget it!', tr: 'Kelimeleri komik benzetmelerle hatırla.' },
];

export class IntroSlides {
  constructor(host, modes) {
    this.modes = modes;
    this.icon = el('div', { class: 'intro-icon' });
    this.title = el('h2', { class: 'ctitle gl' });
    this.text = el('p', { class: 'ctext gl' });
    this.tr = el('p', { class: 'cen', attrs: { lang: 'tr' } });
    this.dots = el('div', { class: 'intro-dots' });
    this.prev = el('button', { class: 'btn alt sm', text: '‹', attrs: { type: 'button' } });
    this.next = el('button', { class: 'btn sm', attrs: { type: 'button' } });
    this.skip = el('button', { class: 'linkbtn', attrs: { type: 'button' } });
    this.root = el('div', { class: 'overlay dim intro' }, [el('div', { class: 'card' }, [
      this.icon, this.title, this.text, this.tr, this.dots, el('div', { class: 'row' }, [this.prev, this.next]), this.skip,
    ])]);
    host.append(this.root);
  }

  /** @returns {Promise<void>} when closed */
  show() {
    return new Promise((resolve) => {
      const pop = this.modes.push('overlay');
      let i = 0;
      [this.title, this.text].forEach((n) => { n.dir = glossDir(); n.lang = glossLang(); });
      this.skip.textContent = `${gloss('Skip')} · Geç`;
      const render = () => {
        const s = SLIDES[i];
        this.icon.textContent = s.icon;
        this.title.textContent = gloss(s.title);
        this.text.textContent = gloss(s.text);
        this.tr.textContent = s.tr;
        this.dots.replaceChildren(...SLIDES.map((_, k) => el('span', { class: k === i ? 'on' : '' })));
        this.prev.disabled = i === 0;
        this.next.textContent = i === SLIDES.length - 1 ? `${gloss('Start')} · Başla` : `${gloss('Next')} · Sonraki`;
      };
      const done = () => { this.root.classList.remove('open'); pop(); resolve(); };
      this.prev.onclick = () => { if (i > 0) { i--; render(); } };
      this.next.onclick = () => { if (i < SLIDES.length - 1) { i++; render(); } else done(); };
      this.skip.onclick = done;
      render();
      this.root.classList.add('open');
    });
  }
}
