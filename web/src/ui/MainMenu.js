import { el } from './dom.js';

/** Rooms on the village server (one machine; each room is its own square). */
const SERVERS = [
  ['istanbul', 'İstanbul'],
  ['ankara', 'Ankara'],
  ['izmir', 'İzmir'],
  ['manisa', 'Manisa'],
];

function healthUrl(wsUrl) {
  if (!wsUrl) return '';
  try {
    const u = new URL(wsUrl);
    u.protocol = u.protocol === 'wss:' ? 'https:' : 'http:';
    u.pathname = '/health';
    u.search = '';
    u.hash = '';
    return u.toString();
  } catch {
    return '';
  }
}

export class MainMenu {
  constructor(host, { onStart, onContinue, onHelp, onSquare, hasSave, settings, villageServer = '' }) {
    const nameIn = el('input', { class: 'name-in', attrs: { type: 'text', maxlength: '16', placeholder: 'Kullanıcı adın · اسم المستخدم', autocomplete: 'nickname' } });
    nameIn.value = settings.get('username', '') ?? '';
    const nameErr = el('p', { class: 'note' });

    const serverTitle = el('p', { class: 'chap', text: 'Sunucu seç · اختر الخادم' });
    const serverStatus = el('p', { class: 'note', text: 'Oyuncu sayıları yükleniyor…' });
    const serverSelect = el('select', { class: 'server-select', attrs: { 'aria-label': 'Sunucu seç' } });
    const savedServer = settings.get('serverRegion', 'istanbul');
    let serverCounts = Object.fromEntries(SERVERS.map(([id]) => [id, 0]));

    const renderServers = () => {
      const sorted = [...SERVERS].sort((a, b) => (serverCounts[b[0]] ?? 0) - (serverCounts[a[0]] ?? 0) || a[1].localeCompare(b[1], 'tr'));
      serverSelect.replaceChildren(...sorted.map(([id, label]) => {
        const count = serverCounts[id] ?? 0;
        return el('option', {
          text: `${label} — ${count} kişi`,
          attrs: { value: id },
        });
      }));
      serverSelect.value = serverCounts[savedServer] !== undefined ? savedServer : sorted[0][0];
      serverStatus.textContent = `Toplam ${Object.values(serverCounts).reduce((a, b) => a + b, 0)} oyuncu çevrimiçi · liste kişi sayısına göre sıralandı`;
    };

    const refreshServers = async () => {
      const url = healthUrl(villageServer);
      if (!url) {
        serverStatus.textContent = 'Sunucu durumu alınamadı.';
        renderServers();
        return;
      }
      try {
        const r = await fetch(url, { cache: 'no-store' });
        if (!r.ok) throw new Error('health');
        const data = await r.json();
        serverCounts = Object.fromEntries(SERVERS.map(([id]) => [id, Number(data.rooms?.[id] ?? 0)]));
        renderServers();
      } catch {
        serverStatus.textContent = 'Sunucu durumu alınamadı; seçim yine kullanılabilir.';
        renderServers();
      }
    };
    renderServers();
    refreshServers();
    this.serverTimer = setInterval(() => {
      if (this.root?.classList.contains('open')) refreshServers();
    }, 5000);

    const goSquare = () => {
      const name = nameIn.value.trim();
      if (!/^[\p{L}\p{N}_ .-]{2,16}$/u.test(name)) {
        nameErr.textContent = 'Kullanıcı adı 2-16 harf/rakam olmalı · ٢-١٦ حرفاً';
        nameIn.focus();
        return;
      }
      settings.set('username', name);
      settings.set('serverRegion', serverSelect.value);
      this.hide();
      onSquare(name, serverSelect.value);
    };
    nameIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') goSquare(); });

    const square = onSquare && el('div', { class: 'menu-square' }, [
      el('p', { class: 'chap', text: 'Köy meydanı · çok oyunculu · ساحة القرية' }),
      serverTitle,
      serverSelect,
      serverStatus,
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

  hide() { this.root.classList.remove('open'); clearInterval(this.serverTimer); }
}
