import { el } from './dom.js';

export class MainMenu {
  constructor(host, { onStart }) {
    const help = el('ul', { class: 'help', style: { display: 'none' } }, [
      'Joystick veya WASD ile yürü.',
      'Parlayan oku takip et: görevin orada.',
      'Konuş, görev al, eşya topla, teslim et.',
      'Doğru cevabı seç (1-4 tuşları da çalışır).',
    ].map((t) => el('li', { text: t })));
    this.root = el('div', { class: 'overlay open' }, [el('div', { class: 'card' }, [
      el('h1', { class: 'big', text: 'Yılmaz Ailesi' }),
      el('p', { class: 'sub', text: 'Köyde yaşa, Türkçe öğren.' }),
      el('button', { class: 'btn', text: 'Hikayeye başla', attrs: { type: 'button' }, on: { click: () => { this.hide(); onStart(); } } }),
      el('button', { class: 'btn alt', text: 'Nasıl oynanır?', attrs: { type: 'button' }, on: { click: () => { help.style.display = help.style.display === 'block' ? 'none' : 'block'; } } }),
      help,
    ])]);
    host.append(this.root);
  }
  hide() { this.root.classList.remove('open'); }
}
