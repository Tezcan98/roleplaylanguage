import { ChoiceActivity } from './ChoiceActivity.js';
import { el, ICONS } from '../ui/dom.js';

/**
 * Listening check: the line is played aloud but hidden; the player picks what was said
 * (or what it means). Answer handling is inherited from ChoiceActivity.
 */
export class ListenActivity extends ChoiceActivity {
  mount(container, spec) {
    const { tts } = this.services;
    const play = (rate) => tts.speak(spec.say, rate ? { rate } : undefined);
    this.bar = el('div', { class: 'listen-row' }, [
      el('button', { class: 'chipbtn primary', html: `${ICONS.speaker} Dinle`, attrs: { type: 'button' }, on: { click: () => play() } }),
      el('button', { class: 'chipbtn', text: '🐢 Yavaş', attrs: { type: 'button' }, on: { click: () => play(0.6) } }),
    ]);
    this.prompt = el('p', { class: 'act-prompt', text: spec.prompt ?? 'Ne dedi? Dinle ve seç.' });
    container.append(this.prompt, this.bar);
    setTimeout(() => play(), 250);
    return super.mount(container, spec);
  }

  destroy() { this.bar?.remove(); this.prompt?.remove(); super.destroy(); }
}
