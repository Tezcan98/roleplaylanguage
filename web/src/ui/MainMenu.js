import { el } from './dom.js';

export class MainMenu {
  constructor(host, { onStart, onContinue, onHelp, onSquare, hasSave, settings }) {
    // multiplayer straight from the menu: pick a username, land in the village square
    const nameIn = el('input', { class: 'name-in', attrs: { type: 'text', maxlength: '16', placeholder: 'Kullanıcı adın · اسم المستخدم', autocomplete: 'nickname' } });
    nameIn.value = settings.get('username', '') ?? '';
    const nameErr = el('p', { class: 'note' });
    const goSquare = () => {
      const name = nameIn.value.trim();
      if (!/^[\p{L}\p{N}_ .-]{2,16}$/u.test(name)) { nameErr.textContent = 'Kullanıcı adı 2-16 harf/rakam olmalı · ٢-١٦ حرفاً'; nameIn.focus(); return; }
      settings.set('username', name);
      this.hide();
      onSquare(name);
    };
    nameIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') goSquare(); });
    const square = onSquare && el('div', { class: 'menu-square' }, [
      el('p', { class: 'chap', text: 'Köy meydanı · çok oyunculu · ساحة القرية' }),
      nameIn,
      el('button', { class: 'btn', text: 'Meydana gir · ادخل الساحة', attrs: { type: 'button' }, on: { click: goSquare } }),
      nameErr,
    ]);
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
    const gloss = el('select', { attrs: { id: 'glossLang' } }, [
      el('option', { text: 'العربية', attrs: { value: 'ar' } }),
      el('option', { text: 'English', attrs: { value: 'en' } }),
    ]);
    gloss.value = settings.get('glossLang', 'ar');
    gloss.addEventListener('change', () => { settings.set('glossLang', gloss.value); location.reload(); });
    this.root = el('div', { class: 'overlay open' }, [el('div', { class: 'card' }, [
      el('h1', { class: 'big', text: 'Yılmaz Ailesi' }),
      el('p', { class: 'sub', text: 'Köyde yaşa, Türkçe öğren.' }),
      hasSave && el('button', { class: 'btn', text: 'Devam et', attrs: { type: 'button' }, on: { click: () => { this.hide(); onContinue(); } } }),
      el('button', { class: hasSave ? 'btn alt' : 'btn', text: hasSave ? 'Yeni oyun' : 'Hikayeye başla', attrs: { type: 'button' }, on: { click: () => { this.hide(); onStart(); } } }),
      square,
      el('button', { class: 'btn alt', text: 'Nasıl oynanır? · كيف ألعب؟', attrs: { type: 'button' }, on: { click: () => { if (onHelp) onHelp(); else help.style.display = help.style.display === 'block' ? 'none' : 'block'; } } }),
      help,
      el('label', { class: 'toggle' }, [voice, el('span', { text: 'Doğal Türkçe sesler (Piper)' })]),
      el('label', { class: 'toggle' }, [el('span', { text: 'Görüntü kalitesi:' }), quality]),
      el('label', { class: 'toggle' }, [el('span', { text: 'Çeviri dili · لغة الترجمة:' }), gloss]),
    ])]);
    host.append(this.root);
  }
  hide() { this.root.classList.remove('open'); }
}
