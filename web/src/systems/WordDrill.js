import { el } from '../ui/dom.js';
import { gloss } from '../i18n/Gloss.js';

const QUESTIONS = 8;
const MIN_WORDS = 4;
const CREDITS_PER_DAY = 3; // a perfect drill earns 1 credit, at most this many per game day
const pick = (list, n) => list.map((x) => [Math.random(), x]).sort((a, b) => a[0] - b[0]).slice(0, n).map(([, x]) => x);

/**
 * "Kelime pratiği": a quick mixed quiz over the words the player has learned so far —
 * meaning → Turkish, Turkish → meaning, listen and pick, say it out loud.
 * Opened from the word notebook; endless practice that grows with the vocabulary.
 */
export class WordDrill {
  #activity = null;

  constructor(host, { modes, vocab, activities, tts, state, effects, toasts }) {
    Object.assign(this, { modes, vocab, activities, tts, state, effects, toasts });
    this.count = el('span');
    this.prompt = el('p', { class: 'ctitle drill-q' });
    this.sub = el('p', { class: 'cen en-t' });
    this.slot = el('div', { class: 'activity' });
    this.root = el('div', { class: 'overlay dim drill' }, [el('div', { class: 'card' }, [
      el('p', { class: 'chap' }, ['🧠 Kelime pratiği · ', this.count]), this.prompt, this.sub, this.slot,
      el('button', { class: 'linkbtn', text: 'Kapat', attrs: { type: 'button' }, on: { click: () => this.close() } }),
    ])]);
    host.append(this.root);
  }

  get available() { return this.vocab.size >= MIN_WORDS; }

  async open() {
    if (!this.available || this.pop) return;
    this.pop = this.modes.push('overlay');
    this.root.classList.add('open');
    const words = this.vocab.entries();
    const plan = pick(words, Math.min(QUESTIONS, words.length));
    let right = 0;
    for (let i = 0; i < plan.length && this.pop; i++) {
      this.count.textContent = `${i + 1}/${plan.length}`;
      if (await this.#ask(plan[i], words, i % 4)) right++;
    }
    if (!this.pop) return;
    this.#finish(right, plan.length);
  }

  /** @returns {Promise<boolean>} answered right on the first try */
  #ask([tr, en], words, kind) {
    const others = pick(words.filter(([w]) => w !== tr), 2);
    let firstTry = true;
    const onWrong = () => { firstTry = false; this.sub.textContent = `${tr} = ${gloss(en)}`; };
    this.#activity?.destroy();
    this.slot.replaceChildren();
    const shuffle = (opts) => pick(opts, opts.length);
    let type, spec;
    if (kind === 0) { // Turkish → meaning
      type = 'choice';
      this.prompt.textContent = `“${tr}” ne demek?`; this.sub.textContent = gloss('What does it mean?');
      spec = { optionsAreMeanings: true, options: shuffle([{ tr: en, en: '' }, ...others.map(([, e]) => ({ tr: e, en: '', wrong: true }))]) };
    } else if (kind === 1) { // meaning → Turkish
      type = 'choice';
      this.prompt.textContent = gloss(en); this.sub.textContent = 'Türkçesi hangisi?';
      spec = { options: shuffle([{ tr, en: '' }, ...others.map(([w]) => ({ tr: w, en: '', wrong: true }))]) };
    } else if (kind === 2) { // listen and pick
      type = 'listen';
      this.prompt.textContent = '🔊'; this.sub.textContent = gloss('Listen and choose the word.');
      spec = { say: tr, speaker: 'ogretmen', prompt: 'Hangi kelimeyi duydun?', options: shuffle([{ tr, en: '' }, ...others.map(([w]) => ({ tr: w, en: '', wrong: true }))]) };
    } else { // say it
      type = 'speak';
      this.prompt.textContent = gloss(en); this.sub.textContent = 'Türkçe söyle:';
      spec = { expect: [tr], show: tr, hint: tr };
    }
    const act = this.#activity = this.activities.create(type);
    return act.mount(this.slot, { ...spec, onWrong }).then((res) => {
      if (type === 'speak' && res && res.ok === false) firstTry = false;
      return firstTry;
    });
  }

  #finish(right, total) {
    this.#activity?.destroy();
    this.prompt.textContent = `${right}/${total} ✓`;
    const key = `drill-credits-d${this.state.day}`;
    const earned = this.state.flags[key] ?? 0;
    const perfect = right === total;
    if (perfect && earned < CREDITS_PER_DAY) {
      this.state.flags[key] = earned + 1;
      this.effects.run(['credits:1']);
      this.sub.textContent = gloss('Perfect! +1 credit');
    } else this.sub.textContent = perfect ? gloss('Perfect!') : gloss('Practise again to get them all right.');
    this.slot.replaceChildren(el('button', { class: 'btn', text: 'Tekrar', attrs: { type: 'button' }, on: { click: () => { this.close(); this.open(); } } }));
  }

  close() {
    this.#activity?.destroy();
    this.#activity = null;
    this.root.classList.remove('open');
    this.pop?.();
    this.pop = null;
  }
}
