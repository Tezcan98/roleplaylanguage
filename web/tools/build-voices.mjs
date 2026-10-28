/**
 * Builds the game's voice library (assets/speech): every fixed line of the game in its
 * speaker's voice, made ONCE by the village server (Gemini voices only: a line Gemini can't
 * make today waits for tomorrow — Piper's robot voice is never kept) and kept in the repository as small MP3s. The game plays these straight from the
 * website (services/speech/SpeechRepo.js), so no line ever costs a Gemini call again.
 * Already recorded lines are skipped, so the script can simply be run again (e.g. the next
 * day when Gemini's daily cap stopped it) until everything is there.
 *
 *   node tools/build-voices.mjs                       count the lines, record nothing
 *   node tools/build-voices.mjs --server=https://anadoluailesi.com.tr/api/tts
 *   options: --look=boy-modest|boy-strong|girl-covered|girl-open|all  (whose name the family says; default all)
 *            --limit=N   record at most N new lines this run
 *            --who=okuyucu,kardes   only these speakers' lines (e.g. the library's books first)
 *            --keep-piper   leave the old Piper lines as they are (by default they are made again with Gemini, as the cap allows; needs ffprobe)
 * Needs ffmpeg (WAV → MP3); without it the WAV is kept as is, under the same .mp3 name.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const opt = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const LOOKS = ['boy-modest', 'boy-strong', 'girl-covered', 'girl-open'];

// one look per process: the content is personalised in place (names, "oğlum" / "kızım")
if (!opt.only) {
  const looks = !opt.look || opt.look === 'all' ? LOOKS : [opt.look];
  let budget = Number(opt.limit ?? Infinity), total = 0, stopped = false;
  for (const look of looks) {
    const args = [fileURLToPath(import.meta.url), `--only=${look}`, ...(opt.server ? [`--server=${opt.server}`] : []), ...(opt.who ? [`--who=${opt.who}`] : []), ...(Number.isFinite(budget) ? [`--limit=${budget}`] : [])];
    const r = spawnSync(process.execPath, args, { stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8' });
    process.stdout.write(r.stdout.replace(/^RESULT .*\n?/m, ''));
    const m = /^RESULT (\d+) (\d+) (\w+)/m.exec(r.stdout);
    if (!m) { console.error(`${look}: failed`); process.exit(1); }
    total += Number(m[1]); budget -= Number(m[2]);
    if (m[3] === 'stopped') { stopped = true; break; }
  }
  console.log(stopped ? 'Stopped (daily cap / server busy): run again later to go on.' : `Done: ${total} lines in the library.`);
  process.exit(0);
}

const { setPlayerGender, setPlayerLook, setTeacher, personalizeContent } = await import('../src/i18n/Persona.js');
const look = opt.only;
setPlayerGender(look.startsWith('girl') ? 'girl' : 'boy');
setPlayerLook(look);
setTeacher('f:Zeynep');
const C = await import('../src/content/index.js');
const { speechKey, serverVoice, speechText, SHORT } = await import('../src/services/speech/SpeechRepo.js');
personalizeContent(C.STORY, C.DIALOGUES, C.FREE_ACTIONS, C.HOUSE_RULES, C.LESSONS, C.CLASSMATE_BOTS, C.TEXTBOOK, C.ITEMS);
if (look.startsWith('girl')) C.VOICES.ahmet = { id: 'tr-kiz', female: true, pitch: 1 };

/** Every fixed line: [speaker, text]. */
const lines = [];
const only = opt.who ? new Set(String(opt.who).split(',')) : null;
const add = (who, text) => { if (typeof text === 'string' && /\p{L}/u.test(text) && (!only || only.has(who))) lines.push([who, text]); };
for (const [who, d] of Object.entries(C.DIALOGUES)) for (const n of Object.values(d.nodes)) { add(who, n.say); (n.variants ?? []).forEach((v) => add(who, v.say)); }
for (const list of Object.values(C.TALKS ?? {})) for (const talk of list) for (const l of talk) add(l.who, l.tr);
for (const talk of C.KAHVE_TALKS ?? []) for (const l of talk) add(l.who, l.tr);
const cc = C.CHESS_COMMENTS ?? {};
[...Object.values(cc.move ?? {}), ...Object.values(cc.capture ?? {}), cc.check, cc.mate].forEach((c) => c && add('ismail', c.tr));
for (const l of Object.values(C.LESSONS)) {
  (l.teach ?? []).forEach((t) => add('ogretmen', t.say));
  (l.practice ?? []).forEach((p) => add('ogretmen', p.say));
  if (l.intro) add('ogretmen', l.intro.say);
}
add('ogretmen', 'Aferin çocuklar! Bugünkü ders bitti.');
add('anne', 'Ali, yatakta zıplama!');
add('kardes', 'Tamam anne!');
add('kardes', 'Çayınız, buyurun! Afiyet olsun.'); // the kahvehane's apprentice (systems/KahveCirak.js)
for (const b of C.BOOKS ?? []) for (const p of b.pages) add('okuyucu', p.tr); // the library's books, read aloud page by page

const OUT = fileURLToPath(new URL('../assets/speech/', import.meta.url));
mkdirSync(OUT, { recursive: true });
const indexFile = `${OUT}index.json`;
const index = new Set(existsSync(indexFile) ? JSON.parse(readFileSync(indexFile, 'utf8')) : []);
const voiceOf = (who) => C.VOICES[who] ?? C.VOICES.default;

/** Recorded while Gemini's cap was reached, a man's line was Piper's (22 050 Hz; Gemini's are 24 000): robot-like, and kept for good. Those are made again with Gemini, the old one staying until the new one is there. */
const isPiper = (key) => { const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=sample_rate', '-of', 'csv=p=0', `${OUT}${key}.mp3`], { encoding: 'utf8' }); return r.status === 0 && r.stdout.trim() === '22050'; };
const redo = !opt['keep-piper'] && spawnSync('ffprobe', ['-version']).status === 0;
const todo = new Map(); // key → { voice, text }
let piperLeft = 0;
for (const [who, text] of lines) {
  const voice = voiceOf(who), key = await speechKey(voice, text);
  if (todo.has(key)) continue;
  if (!index.has(key)) todo.set(key, { voice, text: speechText(text) });
  else if (redo && voice.piper && isPiper(key)) { todo.set(key, { voice, text: speechText(text) }); piperLeft++; }
}
if (piperLeft) console.log(`  ${piperLeft} of them are Piper lines to be made again with Gemini`);
console.log(`${look}: ${lines.length} lines, ${todo.size} not recorded yet`);

let made = 0, state = 'done';
const limit = Number(opt.limit ?? Infinity);
const ffmpeg = spawnSync('ffmpeg', ['-version']).status === 0;
if (opt.server) {
  for (const [key, { voice, text }] of todo) {
    if (made >= limit) { state = 'stopped'; break; }
    const v = serverVoice(voice), f = voice.piper ? '&f=none' : ''; // (a man's line: Gemini or nothing — never Piper kept in the library)
    const res = await fetch(`${opt.server}?v=${encodeURIComponent(v)}${f}&t=${encodeURIComponent(text)}`).catch(() => null);
    if (!res?.ok) {
      console.error(`  ${v} "${text.slice(0, 40)}": ${res ? `HTTP ${res.status}` : 'unreachable'}`);
      if (!res || res.status === 429 || res.status === 503) { state = 'stopped'; break; } // cap reached / no women's voice now
      continue;
    }
    const wav = Buffer.from(await res.arrayBuffer());
    const mp3 = ffmpeg ? spawnSync('ffmpeg', ['-loglevel', 'error', '-i', 'pipe:0', '-ac', '1', '-b:a', '40k', '-f', 'mp3', 'pipe:1'], { input: wav, maxBuffer: 64 << 20 }).stdout : wav;
    writeFileSync(`${OUT}${key}.mp3`, mp3);
    index.add(key);
    made++;
    if (made % 20 === 0) { writeFileSync(indexFile, JSON.stringify([...index].sort())); console.log(`  ${made} recorded…`); }
    await new Promise((r) => setTimeout(r, 750)); // the server allows ~90 lines a minute
  }
  writeFileSync(indexFile, JSON.stringify([...index].sort()));
}
console.log(`RESULT ${index.size} ${made} ${state}`);
