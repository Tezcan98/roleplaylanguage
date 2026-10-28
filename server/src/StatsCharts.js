/**
 * The charts and the "how the game is played" block of the live numbers page (AdStats.js): plain
 * HTML and inline SVG, no scripts and nothing loaded from elsewhere. `play` is PlayStats.summary().
 */
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const n = (v) => Number(v ?? 0).toLocaleString('tr-TR');

/** What the game's ids stand for, in Turkish (anything not here is shown as it is). */
const PLACES = { yard: 'Bahçe', house: 'Ev', schoolyard: 'Okul bahçesi', classroom: 'Sınıf', village: 'Köy meydanı' };
const PEOPLE = {
  anne: 'Anne', baba: 'Baba', dede: 'Dede', nine: 'Nine', kardes: 'Kardeş Ali', zehra: 'Zehra', elif: 'Elif', can: 'Can', ogretmen: 'Öğretmen', bakkal: 'Recep Bakkal', manav: 'Rıza Manav',
  cayci: 'Çaycı', kahveci: 'Kahveci', rifat: 'Rıfat Amca', husnu: 'Hüsnü Amca', kemal: 'Kemal Amca', huseyin: 'Hüseyin Dede', kadir: 'Kadir Amca', aslanbey: 'Aslan Bey', ismail: 'İsmail Dede',
  seyis: 'Seyis Hamdi', simitci: 'Simitçi Cemal', imam: 'İmam', kantinci: 'Kantinci', defne: 'Defne', ayse: 'Ayşe', emre: 'Emre', mert: 'Mert',
};

/** Horizontal bars: rows of [label, value, note?]; the longest bar is the biggest value. */
export function bars(rows, { color = '#4fc3f7', max = null } = {}) {
  if (!rows.length) return '<p><small>Henüz veri yok.</small></p>';
  const top = max ?? Math.max(1, ...rows.map((r) => r[1]));
  return `<div class="bars">${rows.map(([label, v, note]) => `<div class="brow"><span class="bl">${esc(label)}</span><span class="bt"><i style="width:${Math.max(1, Math.round((100 * v) / top))}%;background:${color}"></i></span><span class="bv">${n(v)}${note ? ` <small>${esc(note)}</small>` : ''}</span></div>`).join('')}</div>`;
}

/** Columns over the days (oldest first), one number each: an inline SVG. */
export function columns(days, { color = '#ffd54a', height = 110 } = {}) {
  if (!days.length) return '';
  const w = 28, gap = 4, top = Math.max(1, ...days.map((d) => d.v)), W = days.length * (w + gap);
  const bar = (d, i) => {
    const h = Math.round(((height - 22) * d.v) / top), x = i * (w + gap);
    return `<g><rect x="${x}" y="${height - 14 - h}" width="${w}" height="${h}" rx="3" fill="${color}"><title>${esc(d.day)}: ${d.v}</title></rect>${d.v ? `<text x="${x + w / 2}" y="${height - 17 - h}" text-anchor="middle" font-size="10" fill="#e8eef5">${d.v}</text>` : ''}<text x="${x + w / 2}" y="${height - 2}" text-anchor="middle" font-size="9" fill="#9fb0c2">${esc(d.day.slice(8))}</text></g>`;
  };
  return `<div class="cols"><svg viewBox="0 0 ${W} ${height}" width="${Math.max(W, 280)}" height="${height}" role="img" aria-label="günlük">${days.map(bar).join('')}</svg></div>`;
}

const sum = (top, prefix) => Object.entries(top).filter(([k]) => k.startsWith(`${prefix}:`)).map(([k, v]) => [k.slice(prefix.length + 1), v]).sort((a, b) => b[1] - a[1]);

/** The block: who played, how far they got, what they did. */
export function playBlock(p, countries = []) {
  if (!p) return '';
  const t = p.total, days = [...p.days].reverse().slice(-21); // 3 weeks, oldest first
  const reach = p.reach.map((r) => [`${r.i + 1}. ${r.id || 'bölüm'}`, r.devices]);
  const quests = (p.quests ?? []).slice(0, 40).map((q) => [q.id, q.devices, `${n(q.times)} kez`]);
  const places = sum(p.top, 'loc').map(([k, v]) => [PLACES[k] ?? k, v]);
  const people = sum(p.top, 'talk').slice(0, 20).map(([k, v]) => [PEOPLE[k] ?? k, v]);
  const acts = sum(p.top, 'act').slice(0, 15);
  const spots = sum(p.top, 'spot').slice(0, 12);
  const pct = (a, b) => (b ? ` <small>%${Math.round((100 * a) / b)}</small>` : '');
  return `<h1 class="sec">Oyun nasıl oynanıyor <small>anonim sayılar: ne yapıldı, kimin ne söylediği tutulmaz</small></h1>
<div class="big"><div><b>${n(t.devices)}</b>cihaz</div><div><b>${n(t.returned)}${pct(t.returned, t.devices)}</b>başka bir gün geri geldi</div><div><b>${n(t.spoke)}${pct(t.spoke, t.devices)}</b>biriyle konuştu</div><div><b>${n(t.hours)}</b>toplam saat</div><div><b>${n(t.app)}</b>Android · ${n(t.web)} web</div></div>
<h2>Günlük aktif cihaz <small>son 3 hafta</small></h2>${columns(days.map((d) => ({ day: d.day, v: d.active })))}
<h2>Yeni cihaz <small>ilk açılış</small></h2>${columns(days.map((d) => ({ day: d.day, v: d.new })), { color: '#81c784' })}
<h2>Hangi bölüme kadar gidildi <small>o bölüme ulaşan cihaz sayısı: nerede bırakıyorlar</small></h2>${bars(reach, { color: '#ba68c8' })}
<h2>Görevler <small>kaç cihaz yaptı · kaç kez (en çok yapılandan)</small></h2>${bars(quests, { color: '#4db6ac' })}
<div class="two"><div><h2>Gidilen mekânlar <small>kez</small></h2>${bars(places)}</div><div><h2>Konuşulan karakterler <small>kez</small></h2>${bars(people, { color: '#ffb74d' })}</div></div>
<div class="two"><div><h2>Yapılan etkinlikler</h2>${bars(acts, { color: '#f06292' })}</div><div><h2>Kullanılan yerler ve nesneler</h2>${bars(spots, { color: '#90a4ae' })}</div></div>
<h2>Ülkeler <small>reklam olaylarından gelen cihazlar</small></h2>${bars(countries, { color: '#7986cb' })}`;
}

export const chartsCss = `h1.sec{font-size:20px;margin:34px 0 4px;padding-top:14px;border-top:1px solid #2b3c50}
.bars{max-width:900px;display:flex;flex-direction:column;gap:4px}.brow{display:grid;grid-template-columns:minmax(110px,230px) 1fr minmax(60px,auto);gap:8px;align-items:center;font-size:14px}
.bl{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bt{background:#1d2b3c;border-radius:6px;height:14px;overflow:hidden}.bt i{display:block;height:100%;border-radius:6px}.bv{text-align:right}
.cols{overflow-x:auto;background:#1d2b3c;border-radius:10px;padding:8px 10px;max-width:900px}.two{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:0 24px;max-width:1200px}`;
