import { Activity } from './Activity.js';
import { el } from '../ui/dom.js';
import { gloss } from '../i18n/Gloss.js';

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  if (a.join(' ') === list.join(' ') && a.length > 1) [a[0], a[1]] = [a[1], a[0]];
  return a;
}

/** Build the sentence: tap the word tiles in the right order. */
export class OrderActivity extends Activity {
  mount(container, spec) {
    return new Promise((resolve) => {
      const words = spec.answer.split(' ');
      const picked = [];
      const line = el('div', { class: 'answer-line', attrs: { 'aria-live': 'polite' } });
      const reset = el('button', { class: 'chipbtn', text: '↺ Baştan', attrs: { type: 'button' }, on: { click: () => clear() } });
      this.tiles = shuffle(words).map((w) => el('button', {
        class: 'tile', text: w, attrs: { type: 'button' },
        on: { click: (e) => add(e.currentTarget) },
      }));
      const clear = () => { picked.length = 0; line.replaceChildren(); line.className = 'answer-line'; this.tiles.forEach((t) => { t.disabled = false; }); };
      const removeSelected = (selected) => {
        const index = Number(selected.dataset.index);
        const at = picked.findIndex((p) => p.index === index);
        if (at < 0) return;
        picked.splice(at, 1);
        this.tiles[index].disabled = false;
        selected.remove();
        line.className = 'answer-line';
      };
      const add = (tile) => {
        tile.disabled = true;
        const index = this.tiles.indexOf(tile);
        picked.push({ text: tile.textContent, index });
        const selected = el('button', {
          class: 'tile selected-word', text: tile.textContent,
          attrs: { type: 'button', title: 'Kelimeyi geri al' },
          on: { click: () => removeSelected(selected) },
        });
        selected.dataset.index = String(index);
        line.append(selected);
        if (picked.length < words.length) return;
        if (picked.map((p) => p.text).join(' ') === spec.answer) {
          line.classList.add('ok');
          setTimeout(() => resolve({ option: { next: spec.next, do: spec.do } }), 600);
        } else {
          line.classList.add('bad');
          spec.onWrong?.();
          setTimeout(clear, 700);
        }
      };
      this.root = el('div', {}, [
        el('p', { class: 'act-prompt', text: spec.prompt ?? 'Cümleyi kur:' }),
        spec.answerEn && el('p', { class: 'en en-t', text: gloss(spec.answerEn) }),
        line,
        el('div', { class: 'tiles' }, this.tiles),
        el('div', { class: 'listen-row' }, [reset]),
      ]);
      container.append(this.root);
    });
  }

  key(n) { const t = this.tiles?.filter((b) => !b.disabled)[n - 1]; if (!t) return false; t.click(); return true; }
}
