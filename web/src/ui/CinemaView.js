import { el, ICONS } from './dom.js';
import { gloss, ui, glossDir, withGloss } from '../i18n/Gloss.js';

/**
 * The cinema's panel under the screen (systems/Cinema.js): the film's name and how far it is, then
 * for each line "Dinle…" while it is said, the two answers to pick from, and the line with its
 * meaning once picked (🔁 again, 🐢 slower, Sonraki ▶). At the end: how many were right, another
 * film or get up. The screen stays in view above it (no dimming).
 */
export class CinemaView {
  constructor(host) {
    this.title = el('b', { class: 'cin-title' });
    this.count = el('span', { class: 'cin-count' });
    this.prompt = el('p', { class: 'cin-prompt' });
    this.options = el('div', { class: 'cin-options' });
    this.shown = el('div', { class: 'cin-shown' });
    this.again = el('button', { class: 'btn alt sm', text: '🔁', attrs: { type: 'button', 'aria-label': 'Tekrar dinle' }, on: { click: () => this.onAgain?.(false) } });
    this.slow = el('button', { class: 'btn alt sm', text: '🐢', attrs: { type: 'button', 'aria-label': 'Yavaş dinle' }, on: { click: () => this.onAgain?.(true) } });
    this.next = el('button', { class: 'btn sm', text: withGloss('Sonraki ▶', 'Next ▶'), attrs: { type: 'button' }, on: { click: () => this.onNext?.() } });
    this.other = el('button', { class: 'btn sm', text: withGloss('Başka film ▶', 'Another film ▶'), attrs: { type: 'button' }, on: { click: () => this.onOther?.() } });
    this.controls = el('div', { class: 'cin-controls' }, [this.again, this.slow, this.next, this.other]);
    this.root = el('div', { class: 'cinema-panel', attrs: { role: 'dialog', 'aria-label': 'Sinema' } }, [
      el('div', { class: 'cin-head' }, [this.title, this.count,
        el('button', { class: 'iconbtn light', html: ICONS.close, attrs: { type: 'button', 'aria-label': 'Kalk (film biter)' }, on: { click: () => this.onClose?.() } })]),
      this.prompt, this.options, this.shown, this.controls,
    ]);
    this.root.hidden = true;
    host.append(this.root);
  }

  get isOpen() { return !this.root.hidden; }

  open() { this.root.hidden = false; }
  close() { this.root.hidden = true; }

  #state({ prompt = null, options = [], shown = [], again = false, next = false, other = false }) {
    this.prompt.replaceChildren(...(prompt ? [prompt] : []));
    this.prompt.hidden = !prompt;
    this.options.replaceChildren(...options);
    this.options.hidden = !options.length;
    this.shown.replaceChildren(...shown);
    this.shown.hidden = !shown.length;
    this.again.hidden = this.slow.hidden = !again;
    this.next.hidden = !next;
    this.other.hidden = !other;
  }

  showTitle(film) {
    this.title.replaceChildren(`🎬 ${film.title}`, el('small', { class: 'en-t', text: gloss(film.en) && ` · ${gloss(film.en)}` }),
      ...(film.channel ? [el('small', { class: 'cin-source', text: ` · ▶ YouTube: ${film.channel}` })] : [])); // whose cartoon it is
    this.count.textContent = '';
    this.#state({ prompt: el('span', {}, ['Film başlıyor…', el('small', { class: 'en-t', text: ` ${ui('', 'The film is starting…')}` })]) });
  }

  progress(i, n, right) { this.count.textContent = `${i + 1}/${n} · ⭐ ${right}`; }

  /** While a line is being said: listen (nothing to press but "again"). */
  listening(on) {
    if (!on) return;
    this.#state({ prompt: el('span', { class: 'cin-listen' }, ['👂 Dinle…', el('small', { class: 'en-t', text: ` ${ui('', 'Listen…')}` })]) });
  }

  /** Voices off (or none could say it): the line written on the panel instead of heard (the answers, if up, stay). */
  caption(tr) { this.prompt.replaceChildren(el('span', { class: 'cin-caption', attrs: { lang: 'tr' } }, [`“${tr}”`])); this.prompt.hidden = false; }

  /** `heard`: which Turkish sentence was it; otherwise what it meant (in the player's language). */
  ask(heard, texts) {
    const prompt = heard
      ? el('span', {}, ['Hangisini duydun?', el('small', { class: 'en-t', text: ` ${ui('', 'Which one did you hear?')}` })])
      : el('span', {}, ['Ne dedi?', el('small', { class: 'en-t', text: ` ${ui('', 'What did they say?')}` })]);
    const options = texts.map((t, k) => el('button', { class: `cin-opt${heard ? '' : ' en-t'}`, text: t, attrs: { type: 'button', ...(heard ? { lang: 'tr' } : { dir: glossDir() }) }, on: { click: () => this.onPick?.(k) } }));
    this.#state({ prompt, options, again: true });
  }

  /** Picked: right or not, the right one marked, then the line with its meaning. */
  answer(ok, rightIndex, line, { i, n, right }) {
    const buttons = [...this.options.children];
    buttons.forEach((b, k) => { b.disabled = true; b.classList.add(k === rightIndex ? 'right' : ok ? 'dim' : 'wrong'); });
    this.count.textContent = `${i + 1}/${n} · ⭐ ${right}`;
    const meaning = gloss(line.en);
    const shown = [
      el('b', { class: `cin-verdict ${ok ? 'ok' : 'no'}`, text: ok ? '✓ Doğru!' : '✗ Olmadı' }),
      el('p', { class: 'cin-tr', text: line.tr, attrs: { lang: 'tr' } }),
      ...(meaning ? [el('p', { class: 'cin-en en-t', text: meaning, attrs: { dir: glossDir() } })] : []),
    ];
    this.prompt.hidden = true;
    this.shown.replaceChildren(...shown); this.shown.hidden = false;
    this.again.hidden = this.slow.hidden = false;
    this.next.hidden = false; this.next.textContent = i + 1 >= n ? 'Bitir ✓' : withGloss('Sonraki ▶', 'Next ▶');
  }

  end(film, right, n, credit, good) {
    this.count.textContent = `⭐ ${right}/${n}`;
    const [line, en] = !good ? ['Bir daha izleyince daha iyi olacak!', ui('', "Watch it again and you'll do better!")]
      : right === n ? ['Harika, hepsini bildin! 🏆', ui('', 'Great, you got them all!')] : ['Aferin, filmi anladın! 👏', ui('', 'Well done, you understood the film!')];
    this.#state({
      prompt: el('span', {}, [`🎬 ${film.title} bitti. `, line, el('small', { class: 'en-t', text: ` ${en}` }), ...(credit ? [el('b', { class: 'cin-credit', text: ' +1 kredi' })] : [])]),
      other: true,
    });
  }
}
