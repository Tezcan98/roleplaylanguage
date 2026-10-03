/**
 * Every line said in the game, as one HTML page to read and review: the story cards, each
 * character's dialogues (with the player's answers; wrong ones marked), the talks overheard in
 * the square and the kahvehane, İsmail Dede's chess comments, the classroom lessons and the
 * thoughts of the free actions. Run: node tools/export-script.mjs <out.html>
 */
import { writeFileSync } from 'node:fs';
import { STORY, DIALOGUES, NPCS, TALKS, KAHVE_TALKS, CHESS_COMMENTS, LESSONS, FREE_ACTIONS } from '../src/content/index.js';

const out = process.argv[2] ?? 'script.html';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ctx = { q: null, chapter: 'd1-morning', isNight: false, has: () => false, count: () => 0, flag: () => false, reached: () => false, words: 0, day: 1 };
const val = (v) => { if (typeof v !== 'function') return v; try { return v(ctx); } catch { return '(duruma göre değişir)'; } };
const nameOf = (who) => NPCS[who]?.name ?? { ogretmen: 'Öğretmen', ahmet: 'Ahmet' }[who] ?? who;

const line = (who, tr, en, cls = '') => `<div class="line ${cls}"><span class="who">${esc(who)}</span><p class="tr">${esc(val(tr))}</p>${val(en) ? `<p class="en">${esc(val(en))}</p>` : ''}</div>`;
const answer = (o) => `<li class="${o.wrong ? 'wrong' : ''}"><span class="tr">${esc(val(o.tr))}</span>${o.wrong ? '<span class="tag">yanlış</span>' : ''}${val(o.en) ? `<span class="en">${esc(val(o.en))}</span>` : ''}</li>`;
const task = (label, body) => `<div class="task"><span class="tlabel">${label}</span>${body}</div>`;

/** One dialogue node: what the character says, then what the player does. */
function node(who, id, n) {
  let h = `<div class="node" id="${esc(who)}-${esc(id)}"><span class="nid">${esc(id)}</span>`;
  if (n.say) h += line(nameOf(who), n.say, n.en);
  if (n.prompt) h += `<p class="prompt">${esc(val(n.prompt))}</p>`;
  if (n.ask === 'order') h += task('Cümleyi kur', `<p class="tr">${esc(n.answer)}</p>${n.answerEn ? `<p class="en">${esc(n.answerEn)}</p>` : ''}`);
  if (n.ask === 'speak') h += task('Sesli söyle', `<p class="tr">${esc(val(n.show) ?? n.expect?.[0])}</p>${n.showEn ? `<p class="en">${esc(n.showEn)}</p>` : ''}${n.expect?.length > 1 ? `<p class="also">Kabul edilenler: ${n.expect.map(esc).join(' · ')}</p>` : ''}`);
  if (n.options?.length) h += `<ul class="answers">${n.options.map(answer).join('')}</ul>`;
  return `${h}</div>`;
}

const sections = [];
const toc = [];
const section = (id, title, sub, body) => { toc.push([id, title]); sections.push(`<section id="${id}"><h2>${esc(title)}</h2>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}${body}</section>`); };

// 1. the story cards
section('hikaye', 'Hikâye kartları', 'Her bölümün başında çıkan kart ve Ahmet’in aklından geçenler.', STORY.chapters.map((ch) => {
  const cards = [ch.intro, ...ch.quests.map((q) => q.intro)].filter(Boolean);
  return `<div class="chapter"><h3>${esc(ch.id)} <small>${ch.day}. gün · ${esc(ch.time)}</small></h3>${cards.map((c) => `<div class="card"><span class="num">${esc(c.num)}</span><b>${esc(c.title)}</b><p class="tr">${esc(c.text)}</p><p class="en">${esc(c.en)}</p></div>`).join('')}${ch.think ? line('Ahmet (düşünür)', ch.think, '', 'think') : ''}<ul class="quests">${ch.quests.map((q) => `<li><b>${esc(q.title)}</b> · ${esc(val(q.obj))} <span class="en">${esc(val(q.en))}</span></li>`).join('')}</ul></div>`;
}).join(''));

// 2. dialogues, character by character (add-on chats grouped by their prefix)
for (const [who, d] of Object.entries(DIALOGUES)) {
  const groups = new Map();
  for (const [id, n] of Object.entries(d.nodes)) {
    const g = id.includes('.') ? id.split('.')[0] : '';
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(node(who, id, n));
  }
  const body = [...groups].map(([g, nodes]) => `${g ? `<h3>${esc(g)}</h3>` : ''}${nodes.join('')}`).join('');
  section(`d-${who}`, nameOf(who), NPCS[who]?.role ?? '', body);
}

// 3. overheard talks
const talk = (t) => `<div class="talk">${t.map((l) => line(nameOf(l.who), l.tr, l.en)).join('')}</div>`;
section('sohbetler', 'Meydanda duyulan sohbetler', 'Oturma yerlerinin yanında oturunca duyulur.', Object.entries(TALKS).map(([place, list]) => `<h3>${esc(place)}</h3>${list.map(talk).join('')}`).join(''));
section('kahvehane', 'Kahvehane sohbetleri', 'Hüsnü, Kemal ve Rıfat amcaların masası.', KAHVE_TALKS.map(talk).join(''));
const chess = [
  ...Object.entries(CHESS_COMMENTS.move).map(([, c]) => c), ...Object.entries(CHESS_COMMENTS.capture).map(([, c]) => c), CHESS_COMMENTS.check, CHESS_COMMENTS.mate,
].map((c) => line('İsmail Dede', c.tr, c.en)).join('');
section('satranc', 'Satranç yorumları', 'Dev tahtadaki hamlelere İsmail Dede’nin tepkileri.', chess);

// 4. lessons
section('dersler', 'Okul dersleri', 'Öğretmenin anlattıkları, alıştırmalar ve sınıfta sorulan sorular.', Object.values(LESSONS).map((l) => `<h3>${esc(l.title)} <small>${esc(l.level)}</small></h3>
  ${l.teach.map((t) => line('Öğretmen', t.say, t.en)).join('')}
  ${l.practice.map((p) => `<div class="node">${line('Öğretmen', p.say, p.en)}${p.prompt ? `<p class="prompt">${esc(p.prompt)}</p>` : ''}${p.activity === 'order' ? task('Cümleyi kur', `<p class="tr">${esc(p.answer)}</p><p class="en">${esc(p.answerEn ?? '')}</p>`) : ''}${p.options ? `<ul class="answers">${p.options.map(answer).join('')}</ul>` : ''}</div>`).join('')}
  ${l.intro ? line('Öğretmen', l.intro.say, l.intro.en) : ''}
  ${l.questions.map((q) => `<div class="node">${line('Öğretmen', `… ${q.q}`, q.en)}${task('Öğrenci cevabı', `<p class="tr">${esc(q.expect.join(' · '))}</p>`)}<p class="also">Sınıf arkadaşları: ${q.botAnswers.map(esc).join(' · ')} — yanlışlar: ${q.botWrong.map(esc).join(' · ')}</p></div>`).join('')}`).join(''));

// 5. free actions
section('serbest', 'Serbest hareketler', 'Görevler dışında yapılabilenler: balonda düşünce, sonra öğrenilen cümle.', Object.values(FREE_ACTIONS).map((a) => `<div class="node"><span class="nid">${esc(a.label)}</span>${line('Ahmet (düşünür)', a.think, '', 'think')}${line('Ahmet', a.say, '')}</div>`).join(''));

const lines = (sections.join('').match(/class="line |<li class="(wrong)?">/g) ?? []).length; // lines said + answers to choose
const html = `<title>Anadolu Ailesi Senaryosu</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya:wght@500;700&family=Alegreya+Sans:wght@400;500;700&family=Courier+Prime:wght@400;700&display=swap">
<style>
/* A screenplay: a sticky index of characters on the left, the lines in typewriter Turkish with the meaning underneath; İznik blue as the one accent. */
:root{--bg:#F5F7F8;--paper:#FFFFFF;--ink:#1A2230;--muted:#5D6878;--line:#DCE3EA;--accent:#1F5FA8;--soft:#E7EFF8;--bad:#B03A2E;
--display:'Alegreya',Georgia,serif;--body:'Alegreya Sans',system-ui,sans-serif;--type:'Courier Prime','Courier New',monospace}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#11161D;--paper:#171E27;--ink:#E4E9EF;--muted:#98A3B3;--line:#2A3441;--accent:#7FB0EA;--soft:#1D2A3A;--bad:#E58A80;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#11161D;--paper:#171E27;--ink:#E4E9EF;--muted:#98A3B3;--line:#2A3441;--accent:#7FB0EA;--soft:#1D2A3A;--bad:#E58A80;color-scheme:dark}
body{background:var(--bg);color:var(--ink);font:16px/1.5 var(--body);margin:0}
.wrap{display:grid;grid-template-columns:230px minmax(0,1fr);gap:32px;max-width:1120px;margin:0 auto;padding-block:28px;padding-inline:16px}
header{grid-column:1/-1;display:flex;flex-wrap:wrap;align-items:end;gap:12px 24px;border-bottom:2px solid var(--ink);padding-bottom:16px}
h1{font:700 2.3rem/1.1 var(--display);margin:0;text-wrap:balance}
header p{margin:0;color:var(--muted)}
.find{margin-left:auto;font:inherit;padding:8px 12px;border:1px solid var(--line);border-radius:6px;background:var(--paper);color:var(--ink);min-width:0;width:240px;max-width:100%}
.find:focus-visible,a:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
nav{position:sticky;top:env(safe-area-inset-top,0px);align-self:start;max-height:100vh;overflow:auto;padding-top:8px}
nav a{display:block;padding:3px 8px;color:var(--ink);text-decoration:none;border-radius:4px;font-size:.93rem}
nav a:hover{background:var(--soft);color:var(--accent)}
main{min-width:0}
section{padding-top:12px;margin-bottom:40px}
h2{font:700 1.6rem/1.2 var(--display);margin:0;color:var(--accent)}
h3{font:700 1.1rem/1.3 var(--display);margin:24px 0 8px}h3 small{font:400 .85rem var(--body);color:var(--muted)}
.sub{color:var(--muted);margin:2px 0 12px}
.node,.talk,.chapter{background:var(--paper);border:1px solid var(--line);border-radius:6px;padding:12px 16px;margin:8px 0;display:grid;gap:8px}
.talk{gap:6px}
.nid{font:500 .72rem var(--body);letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.line .who{font:700 .78rem var(--body);letter-spacing:.08em;text-transform:uppercase;color:var(--accent)}
.line.think .who{color:var(--muted)}
.tr{font:1rem/1.45 var(--type);margin:0}
.en{color:var(--muted);font-size:.9rem;margin:0;display:block}
.line p{margin:0}
.prompt{margin:0;font-style:italic;color:var(--muted)}
.answers{list-style:none;margin:0;padding:0 0 0 14px;border-left:3px solid var(--soft);display:grid;gap:6px}
.answers li::before{content:'Ahmet → ';font:700 .75rem var(--body);letter-spacing:.06em;color:var(--muted)}
.answers li.wrong .tr{color:var(--bad);text-decoration:line-through;text-decoration-thickness:1px}
.tag{font:700 .68rem var(--body);text-transform:uppercase;letter-spacing:.06em;color:var(--bad);margin-left:8px}
.task{background:var(--soft);border-radius:4px;padding:8px 12px}
.tlabel{font:700 .72rem var(--body);letter-spacing:.08em;text-transform:uppercase;color:var(--accent);display:block;margin-bottom:2px}
.also{font-size:.85rem;color:var(--muted);margin:0}
.card{border-left:3px solid var(--accent);padding-left:12px}.card .num{display:block;font-size:.8rem;color:var(--muted)}
.quests{margin:0;padding-left:18px;font-size:.92rem}
.hidden{display:none}
@media (max-width:760px){.wrap{grid-template-columns:minmax(0,1fr)}nav{position:static;max-height:none;display:flex;flex-wrap:wrap;gap:4px}.find{margin-left:0;width:100%}}
</style>
<div class="wrap">
<header><div><h1>Anadolu Ailesi Senaryosu</h1><p>Oyundaki bütün konuşmalar, içerik dosyalarından üretildi · ${lines} replik</p></div>
<input class="find" id="find" type="search" placeholder="Replik ara (Türkçe ya da İngilizce)" aria-label="Replik ara"></header>
<nav aria-label="Bölümler">${toc.map(([id, t]) => `<a href="#${id}">${esc(t)}</a>`).join('')}</nav>
<main>${sections.join('')}</main>
</div>
<script>
const find=document.getElementById('find');
find.addEventListener('input',()=>{const q=find.value.trim().toLocaleLowerCase('tr');
document.querySelectorAll('.node,.talk,.chapter').forEach(b=>b.classList.toggle('hidden',!!q&&!b.textContent.toLocaleLowerCase('tr').includes(q)));});
</script>
`;
writeFileSync(out, html);
console.log(`${out}: ${lines} lines, ${toc.length} sections`);
