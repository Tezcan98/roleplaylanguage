import { el } from './dom.js';

export class MainMenu {
  constructor(host, { onStart, onContinue, hasSave, settings }) {
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
    const quality = el('select', { attrs: { id: 'quality' } }, [
      el('option', { text: 'Yüksek (güçlü ekran kartı)', attrs: { value: 'high' } }),
      el('option', { text: 'Orta (bilgisayar)', attrs: { value: 'medium' } }),
      el('option', { text: 'Düşük (telefon)', attrs: { value: 'low' } }),
    ]);
    quality.value = settings.get('quality', 'medium');
    quality.addEventListener('change', () => { settings.set('quality', quality.value); location.reload(); });
    this.root = el('div', { class: 'overlay open' }, [el('div', { class: 'card' }, [
      el('h1', { class: 'big', text: 'Yılmaz Ailesi' }),
      el('p', { class: 'sub', text: 'Köyde yaşa, Türkçe öğren.' }),
      hasSave && el('button', { class: 'btn', text: 'Devam et', attrs: { type: 'button' }, on: { click: () => { this.hide(); onContinue(); } } }),
      el('button', { class: hasSave ? 'btn alt' : 'btn', text: hasSave ? 'Yeni oyun' : 'Hikayeye başla', attrs: { type: 'button' }, on: { click: () => { this.hide(); onStart(); } } }),
      el('button', { class: 'btn alt', text: 'Nasıl oynanır?', attrs: { type: 'button' }, on: { click: () => { help.style.display = help.style.display === 'block' ? 'none' : 'block'; } } }),
      help,
      el('label', { class: 'toggle' }, [voice, el('span', { text: 'Doğal Türkçe sesler (Piper)' })]),
      el('label', { class: 'toggle' }, [el('span', { text: 'Görüntü kalitesi:' }), quality]),
    ])]);
    host.append(this.root);
  }
  hide() { this.root.classList.remove('open'); }
}
