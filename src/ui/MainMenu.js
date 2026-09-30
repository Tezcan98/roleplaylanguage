import { el } from './dom.js';

export class MainMenu {
  constructor(host, { onStart, settings }) {
    const help = el('ul', { class: 'help', style: { display: 'none' } }, [
      'Joystick veya WASD ile yürü.',
      'Parlayan oku takip et: görevin orada.',
      'Konuş, görev al, eşya topla, teslim et.',
      'Doğru cevabı seç (1-4 tuşları da çalışır).',
      'Mikrofon görünce bas ve Türkçe söyle.',
      'Hoparlöre basınca karakter konuşur.',
    ].map((t) => el('li', { text: t })));
    const voice = el('input', { attrs: { type: 'checkbox', id: 'neuralVoices' } });
    voice.checked = settings.get('neuralVoices', true);
    voice.addEventListener('change', () => settings.set('neuralVoices', voice.checked));
    this.root = el('div', { class: 'overlay open' }, [el('div', { class: 'card' }, [
      el('h1', { class: 'big', text: 'Yılmaz Ailesi' }),
      el('p', { class: 'sub', text: 'Köyde yaşa, Türkçe öğren.' }),
      el('button', { class: 'btn', text: 'Hikayeye başla', attrs: { type: 'button' }, on: { click: () => { this.hide(); onStart(); } } }),
      el('button', { class: 'btn alt', text: 'Nasıl oynanır?', attrs: { type: 'button' }, on: { click: () => { help.style.display = help.style.display === 'block' ? 'none' : 'block'; } } }),
      help,
      el('label', { class: 'toggle' }, [voice, el('span', { text: 'Doğal Türkçe sesler (ilk kullanımda ~120 MB indirir)' })]),
    ])]);
    host.append(this.root);
  }
  hide() { this.root.classList.remove('open'); }
}
