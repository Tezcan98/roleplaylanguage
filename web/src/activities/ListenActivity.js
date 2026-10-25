import { ChoiceActivity } from './ChoiceActivity.js';
import { el, ICONS } from '../ui/dom.js';
import { ui, uiPrompt } from '../i18n/Gloss.js';

/**
 * Listening check: the line is played aloud but hidden; the player picks what was said
 * (or what it means). Answer handling is inherited from ChoiceActivity.
 */
export class ListenActivity extends ChoiceActivity {
  mount(container, spec) {
    const { tts } = this.services;
    const play = (rate = 1) => tts.speak(spec.say, { speaker: spec.speaker, rate });
    this.bar = el('div', { class: 'listen-row' }, [
      el('button', { class: 'chipbtn primary', html: `${ICONS.speaker} ${ui('Dinle', 'Listen')}`, attrs: { type: 'button' }, on: { click: () => play() } }),
      el('button', { class: 'chipbtn', text: `🐢 ${ui('Yavaş', 'Slow')}`, attrs: { type: 'button' }, on: { click: () => play(0.7) } }),
    ]);
    this.prompt = el('p', { class: 'act-prompt', text: spec.prompt ? uiPrompt(spec.prompt) : ui('Ne dedi? Dinle ve seç.', 'What did they say? Listen and choose.') });
    container.append(this.prompt, this.bar);
    setTimeout(() => play(), 250);
    return super.mount(container, spec);
  }

  destroy() { this.bar?.remove(); this.prompt?.remove(); super.destroy(); }
}
