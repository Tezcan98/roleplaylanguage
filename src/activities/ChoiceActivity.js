import { Activity } from './Activity.js';
import { el } from '../ui/dom.js';

/**
 * Pick an answer. Wrong options get struck through and `spec.onWrong` is called
 * (the dialogue shows the hint); the promise resolves only on a right answer.
 */
export class ChoiceActivity extends Activity {
  mount(container, spec) {
    return new Promise((resolve) => {
      this.buttons = spec.options.map((opt, i) => el('button', {
        class: 'choice', attrs: { type: 'button' },
        on: {
          click: (e) => {
            const b = e.currentTarget;
            if (b.classList.contains('no')) return;
            if (opt.wrong) { b.classList.add('no'); spec.onWrong?.(opt); return; }
            resolve({ option: opt });
          },
        },
      }, [
        el('span', { class: 'k', text: `${i + 1}.` }),
        el('span', { class: 't' }, [el('span', { text: opt.tr }), opt.en && el('span', { class: 'e en-t', text: opt.en })]),
      ]));
      this.root = el('div', { class: 'choices' }, this.buttons);
      container.append(this.root);
    });
  }

  key(n) { const b = this.buttons?.[n - 1]; if (!b) return false; b.click(); return true; }
}
