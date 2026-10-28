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

/** The tabs' contents — who played (`players`), how far they got and the tasks (`progress`), what they did (`places`); '' for each when there are no play numbers. */
export function playBlock(p, countries = []) {
  if (!p) return { players: '', progress: '', places: '' };
  const t = p.total, days = [...p.days].reverse().slice(-21); // 3 weeks, oldest first
  const reach = p.reach.map((r) => [`${r.i + 1}. ${r.id || 'bölüm'}`, r.devices]);
  const quests = (p.quests ?? []).slice(0, 40).map((q) => [q.id, q.devices, `${n(q.times)} kez`]);
  const visited = sum(p.top, 'loc').map(([k, v]) => [PLACES[k] ?? k, v]);
  const people = sum(p.top, 'talk').slice(0, 20).map(([k, v]) => [PEOPLE[k] ?? k, v]);
  const acts = sum(p.top, 'act').slice(0, 15);
  const spots = sum(p.top, 'spot').slice(0, 12);
  const pct = (a, b) => (b ? ` <small>%${Math.round((100 * a) / b)}</small>` : '');
  const players = `<small>Anonim sayılar: ne yapıldı tutulur, kimin ne söylediği tutulmaz.</small>
<div class="big"><div><b>${n(t.devices)}</b>cihaz</div><div><b>${n(t.returned)}${pct(t.returned, t.devices)}</b>başka bir gün geri geldi</div><div><b>${n(t.spoke)}${pct(t.spoke, t.devices)}</b>biriyle konuştu</div><div><b>${n(t.hours)}</b>toplam saat</div><div><b>${n(t.app)}</b>Android · ${n(t.web)} web</div></div>
<h2>Günlük aktif cihaz <small>son 3 hafta</small></h2>${columns(days.map((d) => ({ day: d.day, v: d.active })))}
<h2>Yeni cihaz <small>ilk açılış</small></h2>${columns(days.map((d) => ({ day: d.day, v: d.new })), { color: '#81c784' })}
<h2>Ülkeler <small>toplam: son 14 günde reklam olayı gönderen cihazlar (her biri bir kez) · yanda bugün kaçı</small></h2>${bars(countries, { color: '#7986cb' })}`;
  const progress = `<h2>Hangi bölüme kadar gidildi <small>o bölüme ulaşan cihaz sayısı: nerede bırakıyorlar</small></h2>${bars(reach, { color: '#ba68c8' })}
<h2>Görevler <small>kaç cihaz yaptı · kaç kez (en çok yapılandan)</small></h2>${bars(quests, { color: '#4db6ac' })}`;
  const places = `<div class="two"><div><h2>Gidilen mekânlar <small>kez</small></h2>${bars(visited)}</div><div><h2>Konuşulan karakterler <small>kez</small></h2>${bars(people, { color: '#ffb74d' })}</div></div>
<div class="two"><div><h2>Yapılan etkinlikler</h2>${bars(acts, { color: '#f06292' })}</div><div><h2>Kullanılan yerler ve nesneler</h2>${bars(spots, { color: '#90a4ae' })}</div></div>`;
  return { players, progress, places };
}

/**
 * The money tab: what was typed (AdMob's earnings, Google Ads' spend), the sums, what is left, and what a new device cost.
 * `m`: Money.js summary; `installs`: PlayStats.installs() (new devices a day). The form posts to the page's own address, with its key.
 */
export function moneyBlock(m, installs) {
  if (!m) return '<p><small>Para kaydı kapalı.</small></p>';
  const fresh = Object.fromEntries((installs?.days ?? []).map((d) => [d.day, d.app + d.web]));
  const tl = (v) => (v == null ? '' : `₺${Number(v).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  const net = m.revenue - m.spend;
  const newTotal = Object.entries(fresh).filter(([d]) => m.days.some((x) => x.day === d && x.spend != null)).reduce((a, [, v]) => a + v, 0); // new devices on the days a spend was typed
  const per = newTotal && m.spend ? m.spend / newTotal : null;
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
  const rows = m.days.slice(0, 31).map((d) => {
    const nw = fresh[d.day], dn = (d.revenue ?? 0) - (d.spend ?? 0);
    return `<tr><td>${esc(d.day)}</td><td>${tl(d.revenue)}</td><td>${tl(d.spend)}</td><td class="${dn < 0 ? 'neg' : 'pos'}">${tl(dn)}</td><td>${nw ?? ''}</td><td>${d.spend != null && nw ? tl(d.spend / nw) : ''}</td></tr>`;
  }).join('');
  const last = [...m.days].reverse().slice(-14);
  const chart = `<h2>Günlük gelir <small>₺, son 14 gün</small></h2>${columns(last.map((d) => ({ day: d.day, v: Math.round(d.revenue ?? 0) })), { color: '#81c784' })}<h2>Günlük harcama <small>₺, son 14 gün</small></h2>${columns(last.map((d) => ({ day: d.day, v: Math.round(d.spend ?? 0) })), { color: '#e57373' })}`;
  return `<small>Rakamları sen yazarsın (AdMob'daki günlük kazanç, Google Ads'deki günlük harcama, ₺). Aynı güne tekrar yazarsan üstüne yazılır; kutuyu boş bırakmak o rakamı siler.</small>
<div class="big"><div><b>${tl(m.revenue)}</b>AdMob geliri</div><div><b>${tl(m.spend)}</b>Google Ads harcaması</div><div><b class="${net < 0 ? 'neg' : 'pos'}">${tl(net)}</b>net</div><div><b>${per ? tl(per) : '—'}</b>yeni cihaz başına maliyet</div></div>
<form id="paraform" class="money"><label>Gün <input name="day" type="date" value="${today}" required></label><label>AdMob geliri ₺ <input name="revenue" inputmode="decimal" placeholder="4,58"></label><label>Google Ads harcaması ₺ <input name="spend" inputmode="decimal" placeholder="20"></label><button type="submit">Kaydet</button><span id="paramsg"></span></form>
${chart}
<h2>Günler</h2><table><tr><th>Gün</th><th>gelir</th><th>harcama</th><th>net</th><th>yeni cihaz</th><th>cihaz başına</th></tr>${rows || '<tr><td colspan="6">Henüz kayıt yok</td></tr>'}</table>
<script>(function(){var f=document.getElementById('paraform'),m=document.getElementById('paramsg');if(!f)return;f.addEventListener('submit',function(e){e.preventDefault();var d={day:f.day.value},k=new URLSearchParams(location.search).get('key')||'';d.revenue=f.revenue.value;d.spend=f.spend.value;m.textContent='…';fetch('/api/istatistik?key='+encodeURIComponent(k),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}).then(function(r){m.textContent=r.ok?'Kaydedildi':'Geçersiz rakam';if(r.ok)setTimeout(function(){location.reload()},400)}).catch(function(){m.textContent='Kaydedilemedi'})})})()</script>`;
}

export const chartsCss = `.money{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin:14px 0;background:#1d2b3c;border-radius:12px;padding:12px;max-width:900px}.money label{display:flex;flex-direction:column;font-size:13px;color:#9fb0c2;gap:4px}.money input{background:#14202e;color:#e8eef5;border:1px solid #2b3c50;border-radius:8px;padding:8px;font-size:15px;width:150px}.money button{background:#ffd54a;color:#14202e;border:0;border-radius:8px;padding:9px 18px;font-weight:700;font-size:15px;cursor:pointer}#paramsg{color:#9fb0c2;font-size:13px}.pos{color:#81c784!important}.neg{color:#e57373!important}
.tabs{display:flex;gap:6px;flex-wrap:wrap;margin:14px 0 4px;position:sticky;top:0;background:#14202e;padding:8px 0;z-index:2}.tabs a{padding:8px 14px;border-radius:999px;background:#1d2b3c;color:#e8eef5;text-decoration:none;font-weight:600;font-size:14px}.tabs a.on{background:#ffd54a;color:#14202e}.tab{display:none}.tab.on{display:block}
.bars{max-width:900px;display:flex;flex-direction:column;gap:4px}.brow{display:grid;grid-template-columns:minmax(110px,230px) 1fr minmax(60px,auto);gap:8px;align-items:center;font-size:14px}
.bl{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bt{background:#1d2b3c;border-radius:6px;height:14px;overflow:hidden}.bt i{display:block;height:100%;border-radius:6px}.bv{text-align:right}
.cols{overflow-x:auto;background:#1d2b3c;border-radius:10px;padding:8px 10px;max-width:900px}.two{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:0 24px;max-width:1200px}`;
