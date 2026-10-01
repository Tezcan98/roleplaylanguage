import { el } from './dom.js';
import { gloss, glossDir, glossLang } from '../i18n/Gloss.js';

/**
 * The "? Help" button in the corner: explains in the player's language what to do right now
 * (quest), what is in the bag and how to play — for players who don't know any Turkish yet.
 */
export class HelpPanel {
  constructor(host, { modes, getState, onIntro, onWords }) {
    Object.assign(this, { modes, getState, onIntro, onWords });
    this.button = el('button', { class: 'help-btn', attrs: { type: 'button', 'aria-label': 'Yardım' }, on: { click: () => this.open() } });
    this.button.append('?', el('span', { text: gloss('Help') }));
    this.title = el('span');
    this.body = el('div', { class: 'help-body gl' });
    this.root = el('div', { class: 'overlay dim', on: { click: (e) => { if (e.target === this.root) this.close(); } } }, [
      el('div', { class: 'bookin help-panel' }, [
        el('h2', {}, [this.title, el('button', { class: 'iconbtn', text: '✕', attrs: { type: 'button', 'aria-label': 'Kapat' }, on: { click: () => this.close() } })]),
        this.body,
      ]),
    ]);
    host.append(this.button, this.root);
  }

  set visible(v) { this.button.hidden = !v; }

  open() {
    const s = this.getState();
    const section = (title, ...children) => el('section', {}, [el('h3', { text: title }), ...children]);
    const p = (text, cls) => el('p', { class: cls, text });
    const tr = (text) => el('p', { class: 'tr-line', attrs: { dir: 'ltr', lang: 'tr' }, text });
    this.title.textContent = `${gloss('Help')} · Yardım`;
    this.body.dir = glossDir();
    this.body.lang = glossLang();

    this.body.replaceChildren(
      section(`🎯 ${gloss('Your task now')}`,
        ...(s.quest ? [p(g(s.quest.en), 'big-ar'), tr(`${s.quest.title}: ${s.quest.text}`)] : [p(gloss('No task right now. Walk around and talk to everyone!'))]),
        p(gloss('Follow the golden arrow ⬇️ above the person or the door. When you get close, a yellow button appears at the bottom: press it (or the E key).'))),
      section(`🎒 ${gloss('Bag')}`,
        ...(s.bag.length ? s.bag.map(([trName, meaning]) => el('p', {}, [el('b', { text: meaning }), el('span', { class: 'tr-inline', attrs: { dir: 'ltr' }, text: ` · ${trName}` })])) : [p(gloss('The bag is empty.'))])),
      section(`🗣️ ${gloss('Talking')}`,
        p(gloss('The Turkish sentence is on top, the translation below it. Choose your answer by tapping it (or with the keys 1-4).')),
        p(gloss('🎤 When the microphone appears: press it and say the sentence in Turkish. 🔊 reads the sentence to you.')),
        p(gloss('🧩 “Build the sentence”: tap the words in the right order.')),
        p(gloss('💬 Free chat: with some people you can talk freely in Turkish; they answer and correct you gently.'))),
      section(`🕹️ ${gloss('Controls')}`,
        p(gloss('Walking: the joystick in the corner or the WASD / arrow keys.')),
        p(gloss('“Defter” = the notebook of words you learned · “Çanta” = the bag · “Kitap” = the school book.'))),
      section(`🏫 ${gloss('Practice')}`,
        p(gloss('Garden gate → school: practise with the teacher for 1 credit at any time of day. Grandma on the sedir gives a new piece of advice every day.'))),
      section(`🌐 ${gloss('The village square (with other players)')}`,
        p(gloss('In the square your words appear as text above your head: press “Bas, konuş” or the T key and speak.')),
        p(gloss('Voice chat is only between two people and needs both to agree. Be kind to everyone.'))),
      el('div', { class: 'row help-actions' }, [
        el('button', { class: 'btn alt sm', text: `📖 ${gloss('Words')} (${s.words})`, attrs: { type: 'button' }, on: { click: () => { this.close(); this.onWords(); } } }),
        el('button', { class: 'btn sm', text: `▶ ${gloss('Introduction')}`, attrs: { type: 'button' }, on: { click: () => { this.close(); this.onIntro(); } } }),
      ]),
    );
    if (!this.pop) this.pop = this.modes.push('overlay');
    this.root.classList.add('open');
  }

  close() { this.root.classList.remove('open'); this.pop?.(); this.pop = null; }
}
