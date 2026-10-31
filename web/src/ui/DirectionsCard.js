import { el } from './dom.js';
import { gloss, withGloss } from '../i18n/Gloss.js';

/**
 * "Nereye gideceğim?": what a tap on the task says — the task, where the person or thing is, and which way
 * to go (left / right as the screen shows it, how far). `where()` gives systems/QuestMarker.js `describe()`.
 */
export class DirectionsCard {
  constructor(host, modes, { where }) { Object.assign(this, { host, modes, where }); }

  open(quest) {
    const d = this.where();
    const pop = this.modes.push('overlay');
    const close = () => { root.remove(); pop(); };
    const lines = [];
    if (!d) lines.push('Bu görev için bir yer yok: kendin keşfet, ya da konuşabileceğin biriyle konuş.');
    else if (d.here && d.near) lines.push(`${d.name || 'Hedef'} hemen yanında. Ona yaklaşınca düğme çıkar.`);
    else if (d.here) lines.push(`${d.name ? `${d.name}, ` : ''}${d.place} içinde, ekrana göre ${d.dir}. Yaklaşık ${d.metres} metre uzakta.`);
    else lines.push(`${d.name ? `${d.name}, ` : 'Hedef '}${d.place} içinde. Şu an ${d.from} içindesin: çıkışa git, ekrana göre ${d.dir}, yaklaşık ${d.metres} metre.`);
    const root = el('div', { class: 'overlay open dim' }, [el('div', { class: 'card directions' }, [
      el('h2', { class: 'ctitle', text: withGloss('🧭 Nereye gideceğim?', '🧭 Where do I go?') }),
      quest && el('p', { class: 'ctext', html: `<b>${quest.title}</b><br>${quest.text}` }),
      ...lines.map((t) => el('p', { class: 'ctext', text: t })),
      d && el('p', { class: 'ctext', text: 'Oku takip et. Ekranı parmağınla çevirerek de bakabilirsin.' }),
      el('p', { class: 'cen en-t', text: gloss('Follow the arrow. It shows the way.') }),
      el('button', { class: 'btn', text: withGloss('Tamam', 'OK'), attrs: { type: 'button' }, on: { click: close } }),
    ].filter(Boolean))]);
    root.addEventListener('click', (e) => { if (e.target === root) close(); });
    this.host.append(root);
  }
}
