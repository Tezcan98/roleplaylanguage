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
  seyis: 'Seyis Hamdi', simitci: 'Simitçi Cemal', imam: 'Yusuf Hoca (imam)', kantinci: 'Kantinci', defne: 'Defne', ayse: 'Ayşe', emre: 'Emre', mert: 'Mert',
};

/** Horizontal bars: rows of [label, value, note?]; the longest bar is the biggest value. */
export function bars(rows, { color = '#4fc3f7', max = null } = {}) {
  if (!rows.length) return '<p><small>Henüz veri yok.</small></p>';
  const top = max ?? Math.max(1, ...rows.map((r) => r[1]));
  return `<div class="bars">${rows.map(([label, v, note]) => `<div class="brow"><span class="bl">${esc(label)}</span><span class="bt"><i style="width:${Math.max(1, Math.round((100 * v) / top))}%;background:${color}"></i></span><span class="bv">${n(v)}${note ? ` <small>${esc(note)}</small>` : ''}</span></div>`).join('')}</div>`;
}

/** Columns, oldest first: items of { label, v, tip? } — an inline SVG; `w` is a column's width. */
export function columns(items, { color = '#ffd54a', height = 120, w = 28 } = {}) {
  if (!items.length) return '';
  const gap = 4, top = Math.max(1, ...items.map((d) => d.v)), W = items.length * (w + gap);
  const bar = (d, i) => {
    const h = Math.round(((height - 36) * d.v) / top), x = i * (w + gap);
    return `<g><rect x="${x}" y="${height - 16 - h}" width="${w}" height="${Math.max(h, d.v ? 2 : 0)}" rx="3" fill="${color}"><title>${esc(d.tip ?? d.label)}: ${d.v}</title></rect>${d.v ? `<text x="${x + w / 2}" y="${height - 19 - h}" text-anchor="middle" font-size="11" fill="#e8eef5">${d.v}</text>` : ''}<text x="${x + w / 2}" y="${height - 3}" text-anchor="middle" font-size="10" fill="#9fb0c2">${esc(d.label)}</text></g>`;
  };
  return `<div class="cols"><svg viewBox="0 0 ${W} ${height}" width="${Math.max(W, 260)}" height="${height}" role="img">${items.map(bar).join('')}</svg></div>`;
}

const sum = (top, prefix) => Object.entries(top).filter(([k]) => k.startsWith(`${prefix}:`)).map(([k, v]) => [k.slice(prefix.length + 1), v]).sort((a, b) => b[1] - a[1]);

const REGIONS = new Intl.DisplayNames(['tr'], { type: 'region' });
/** "TR" → "Türkiye" (`?`: not known). */
export const countryName = (c) => { if (!c || c === '?') return 'Bilinmiyor'; try { return REGIONS.of(c) ?? c; } catch { return c; } };

const PERIODS = [['today', 'Bugün'], ['yesterday', 'Dün'], ['week', 'Son 7 gün'], ['total', 'Toplam']];
const LENGTHS = ['<1', '1–2', '2–3', '3–5', '5–10', '10–30', '30+']; // minutes, as PlayStats.js PLAY_BUCKETS
const span = (min) => (min >= 60 ? `${(min / 60).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} saat` : `${n(min)} dk`);

/**
 * The numbers page's body, calm and simple: a period (today / yesterday / last 7 days / total) with four numbers and how long
 * people played (a country can be picked), then the days, where people stop, whom they talk to. `s.play` is PlayStats.summary();
 * '' when there are no play numbers.
 */
export function numbersBody(s) {
  const p = s.play;
  if (!p) return '<p>Henüz oyun verisi yok.</p>';
  const known = Object.entries(p.periods.total.people).filter(([c]) => c !== 'all').sort((a, b) => b[1] - a[1]).map(([c]) => c);
  const picker = `<label class="pick">Ülke <select class="ulke"><option value="all">Hepsi</option>${known.map((c) => `<option value="${esc(c)}">${esc(countryName(c))}</option>`).join('')}</select></label>`;
  const per = ([id]) => {
    const d = p.periods[id], avg = d.played ? Math.round(d.minutes / d.played) : 0;
    const charts = ['all', ...known].map((c) => `<div class="hist" data-c="${esc(c)}"><p class="sub">${n(d.people[c] ?? 0)} kişi oynadı</p>${columns((d.hist[c] ?? LENGTHS.map(() => 0)).map((v, i) => ({ label: LENGTHS[i], v })), { color: '#4fc3f7', height: 150, w: 44 })}</div>`).join('');
    return `<section class="per" data-p="${id}"><div class="big"><div><b>${n(d.devices)}</b>oyuncu</div><div><b>${n(d.new)}</b>yeni oyuncu</div><div><b>${span(d.minutes)}</b>oynanan süre</div><div><b>${n(avg)} dk</b>kişi başı ortalama</div></div>
<h2>Ne kadar oynadılar?</h2><p class="sub">Alt: oynama süresi (dakika) · yan: kaç kişi</p>${picker}${charts}</section>`;
  };
  const days = [...p.days].reverse().slice(-14).map((d) => ({ label: d.day.slice(8), tip: d.day, v: d.active }));
  const reach = p.reach.map((r) => [`${r.i + 1}. ${r.id || 'bölüm'}`, r.devices]);
  const people = sum(p.top, 'talk').slice(0, 8).map(([k, v]) => [PEOPLE[k] ?? k, v]);
  const visited = sum(p.top, 'loc').map(([k, v]) => [PLACES[k] ?? k, v]);
  const quests = (p.quests ?? []).slice(0, 40).map((q) => [q.id, q.devices]);
  const countries = (s.countries ?? []).slice(0, 10).map(([c, v]) => [countryName(c), v]);
  const playing = p.playing ?? { n: 0, countries: [] };
  const now = `<h2>Şu an oyunda <small>son birkaç dakikada oynayan</small></h2><div class="big"><div><b>${n(playing.n)}</b>kişi</div></div>${playing.n ? `<div class="gap">${bars(playing.countries.map(([c, v]) => [countryName(c), v]), { color: '#45a852' })}</div>` : ''}`;
  return `${now}<nav class="periods">${PERIODS.map(([id, label]) => `<button type="button" data-p="${id}">${label}</button>`).join('')}</nav>
${PERIODS.map(per).join('')}
<h2>Günlük oyuncu <small>son 14 gün</small></h2>${columns(days, { w: 30 })}
<h2>Nerede bırakıyorlar? <small>o bölüme kadar gelen oyuncu</small></h2>${bars(reach, { color: '#ba68c8' })}
<div class="two"><div><h2>En çok konuşulanlar</h2>${bars(people, { color: '#ffb74d' })}</div><div><h2>Gidilen yerler</h2>${bars(visited, { color: '#81c784' })}</div></div>
<details><summary>Görevleri yapan oyuncu sayısı</summary>${bars(quests, { color: '#4db6ac' })}</details>
<details><summary>Hangi ülkeden <small>son 14 günde uygulamadan bağlanan cihaz</small></summary>${bars(countries, { color: '#7986cb' })}</details>`;
}

export const chartsCss = `h2{font-size:17px;margin:30px 0 8px;font-weight:600}.sub{color:#9fb0c2;margin:0 0 8px;font-size:13px}
.periods{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0}.periods button,.pick select{font:inherit;padding:8px 16px;border-radius:999px;border:0;background:#1d2b3c;color:#e8eef5;cursor:pointer}.periods button.on{background:#ffd54a;color:#14202e;font-weight:600}.pick{display:block;margin:0 0 10px;color:#9fb0c2}.pick select{padding:6px 12px;margin-left:6px}
.per{display:none}.per.on{display:block}.hist{display:none}.hist.on{display:block}
.bars{max-width:760px;display:flex;flex-direction:column;gap:6px}.brow{display:grid;grid-template-columns:minmax(110px,220px) 1fr minmax(40px,auto);gap:8px;align-items:center;font-size:14px}
.bl{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bt{background:#1d2b3c;border-radius:6px;height:12px;overflow:hidden}.bt i{display:block;height:100%;border-radius:6px}.bv{text-align:right}
.cols{overflow-x:auto;background:#1d2b3c;border-radius:12px;padding:12px;max-width:760px}.two{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:0 28px;max-width:1000px}
.gap{margin-top:10px}details{margin-top:26px;max-width:760px}summary{cursor:pointer;color:#9fb0c2}details .bars{margin-top:10px}`;
