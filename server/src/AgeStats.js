// Adult, self-reported, first-party opt-in analysis. No age in append-only event logs.
const BANDS = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
const KEEP_MS = 30 * 86400000;
const nextDay = (day) => new Date(Date.parse(`${day}T12:00:00Z`) + 86400000).toISOString().slice(0, 10);
export const ageDay = (t) => new Date(t).toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });

export function pruneAge(dev, now = Date.now()) {
  if (!dev.age) return;
  if (!Number.isFinite(dev.age.updated) || now - dev.age.updated >= KEEP_MS) { delete dev.age; return true; }
  const cutoff = ageDay(now - 29 * 86400000);
  let changed = false;
  for (const d of Object.keys(dev.age.days)) if (d < cutoff) { delete dev.age.days[d]; changed = true; }
  return changed;
}

export function recordAge(dev, msg, now = Date.now()) {
  pruneAge(dev, now);
  if (msg === undefined) return; // an older client is not a withdrawal
  if (msg === null) { delete dev.age; return; }
  if (msg.v !== 1 || !BANDS.includes(msg.band) || !Number.isSafeInteger(msg.at) || msg.at <= 0 || msg.at > now + 300000) return;
  if (!dev.age || dev.age.band !== msg.band || dev.age.at !== msg.at) dev.age = { band: msg.band, v: 1, at: msg.at, updated: now, days: {} };
  const a = dev.age; a.updated = now;
  const d = ageDay(now), b = (a.days[d] ??= { sec: 0, quest: 0, exercise: 0, quests: {} });
  if (Number.isInteger(msg.sec) && msg.sec > 0 && msg.sec <= 3600) b.sec += msg.sec;
  // Only the counters needed for this analysis. Never copy chats, identities or pre-consent totals.
  for (const [key, value] of Object.entries(msg.counts ?? {}).slice(0, 40)) {
    if (!Number.isInteger(value) || value <= 0 || value >= 10000) continue;
    if (key === 'quest') b.quest += value;
    if (key === 'textbook:solved') b.exercise += value;
    if (/^q:[a-z0-9:._-]{1,36}$/.test(key) && (key in b.quests || Object.keys(b.quests).length < 100)) b.quests[key] = (b.quests[key] ?? 0) + value;
  }
}

export function ageSummary(devices, now = Date.now()) {
  const rows = BANDS.map((band) => ({ band, devices: 0, seconds: 0, questPlayers: 0, exercisePlayers: 0, returned: 0, next: 0, eligible: 0, quests: {} }));
  const today = ageDay(now);
  for (const dev of devices) {
    pruneAge(dev, now);
    if (!dev.age) continue;
    const r = rows.find((r) => r.band === dev.age.band);
    if (!r) continue;
    const days = Object.entries(dev.age.days).sort(([a], [b]) => a.localeCompare(b));
    if (!days.length) continue;
    r.devices++;
    let quests = 0, exercises = 0;
    const done = new Set();
    for (const [, b] of days) { r.seconds += b.sec; quests += b.quest; exercises += b.exercise; for (const k of Object.keys(b.quests)) done.add(k.slice(2)); }
    if (quests) r.questPlayers++; if (exercises) r.exercisePlayers++;
    for (const q of done) r.quests[q] = (r.quests[q] ?? 0) + 1;
    // A full next calendar day is required; do not call a partially observed day a failure.
    const first = days[0][0], following = nextDay(first);
    if (following < today) { r.eligible++; if (dev.age.days[following]) r.next++; }
    if (days.length > 1) r.returned++;
  }
  return {
    total: rows.reduce((n, r) => n + r.devices, 0), window: 30,
    rows: rows.map((r) => r.devices < 10 ? { band: r.band, devices: r.devices, suppressed: true } : { ...r, quests: Object.fromEntries(Object.entries(r.quests).filter(([, n]) => n >= 10)) }),
  };
}

export function ageBody(a) {
  if (!a) return '';
  const pct = (n, d) => d ? `%${Math.round(n * 100 / d)}` : '—';
  return `<h2>Yaşa göre oyun kullanımı <small>son 30 gün · isteğe bağlı, 18+</small></h2>
<p class="sub">${a.total} cihaz yaş aralığını paylaştı. Yalnızca izin sonrası kullanım ölçülür; geçmiş ilerleme eklenmez. Bunlar kendiliğinden katılan oyunculardır, bütün reklam kitlesini temsil etmez. 10 cihazın altında davranış sonuçları gizlenir. İndirme maliyeti ve reklam yaşıyla eşleştirme yoktur.</p>
<table class="back"><tr><th>Yaş</th><th>Cihaz</th><th>Ort. süre</th><th>Görev yapan</th><th>Alıştırma çözen</th><th>Ertesi gün dönen</th></tr>${a.rows.map((r) => `<tr><td>${r.band}</td><td>${r.devices}</td>${r.suppressed ? '<td colspan="4">Yeterli veri yok (en az 10 cihaz)</td>' : `<td>${Math.round(r.seconds / r.devices / 60)} dk</td><td>${pct(r.questPlayers, r.devices)}</td><td>${pct(r.exercisePlayers, r.devices)}</td><td>${r.eligible >= 10 ? `${pct(r.next, r.eligible)} (${r.next}/${r.eligible})` : 'Yeterli olgunlaşmış veri yok'}</td>`}</tr>`).join('')}</table>
<p class="sub">Süre: ölçüm penceresinde cihaz başına toplam. Ertesi gün: pencere içinde ilk ölçüldüğü günden sonraki takvim gününde dönme; o gün tamamlandıktan sonra hesaba katılır. 10 cihaz gizlilik eşiğidir, karar için yeterli örneklem anlamına gelmez.</p>
${a.rows.filter((r) => !r.suppressed).map((r) => `<details><summary>${r.band} · Görevleri yapan cihazlar</summary><table class="back">${Object.entries(r.quests).map(([q, n]) => `<tr><td>${q}</td><td>${n} / ${r.devices}</td></tr>`).join('') || '<tr><td>Henüz yeterli görev verisi yok.</td></tr>'}</table></details>`).join('')}`;
}
