/**
 * Static check of the story content: every dialogue entry node a character can open
 * for any quest exists, every `next` points to a real node, quest targets name real
 * NPCs / items / hotspots. Run: npm run check
 */
import { STORY } from '../src/content/story.js';
import { DIALOGUES } from '../src/content/dialogues.js';
import { NPCS } from '../src/content/characters.js';
import { ITEMS } from '../src/content/items.js';
import { HOTSPOTS } from '../src/content/hotspots.js';

const errors = [];
const fail = (msg) => errors.push(msg);

// 1. dialogue graphs: every next/option.next exists
for (const [who, d] of Object.entries(DIALOGUES)) {
  for (const [id, node] of Object.entries(d.nodes)) {
    const nexts = [node.next, ...(node.options ?? []).map((o) => o.next)].filter((n) => n && n !== 'end');
    for (const n of nexts) if (!d.nodes[n]) fail(`${who}.${id} → missing node "${n}"`);
  }
}

// 1b. the day on the chapter card matches the in-game clock (day 1 = Sunday)
const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
for (const ch of STORY.chapters) {
  const shown = ch.intro?.num?.split(' · ')[0];
  if (shown && DAYS.includes(shown) && shown !== DAYS[(ch.day - 1) % 7]) fail(`${ch.id} → card says ${shown}, clock says ${DAYS[(ch.day - 1) % 7]}`);
}

// 2. for every chapter/quest, what each present character's start() returns exists
const fakeCtx = (chapter, quest, has, flags = false) => ({
  q: quest?.id ?? null, chapter: chapter.id, loc: 'house', day: chapter.day, isNight: false, words: 0, seated: false, hasDuty: !!quest,
  reached: (id) => { const i = chapter.quests.findIndex((x) => x.id === id); return i >= 0 && i <= chapter.quests.indexOf(quest); },
  has: () => has, count: () => (has ? 3 : 0), flag: () => flags,
  get targetHotspot() { const t = typeof quest?.target === 'function' ? quest.target(this) : quest?.target; return t?.hotspot ?? null; },
});
for (const ch of STORY.chapters) {
  for (const q of [...ch.quests, null]) {
    for (const has of [false, true]) {
      const ctx = fakeCtx(ch, q, has);
      for (const [who, d] of Object.entries(DIALOGUES)) {
        let start;
        try { start = d.start(ctx); } catch (e) { fail(`${who}.start threw for ${ch.id}/${q?.id}: ${e.message}`); continue; }
        if (start && !d.nodes[start]) fail(`${who}.start(${ch.id}/${q?.id}) → missing node "${start}"`);
      }
    }
    // 3. quest targets (a target hotspot must be usable in at least one inventory state)
    if (!q) continue;
    const usable = new Map();
    for (const has of [false, true]) {
      const t = typeof q.target === 'function' ? q.target(fakeCtx(ch, q, has)) : q.target;
      if (!t) continue;
      if (t.npc && !NPCS[t.npc]) fail(`${ch.id}/${q.id} → unknown npc ${t.npc}`);
      if (t.npc && ch.cast[t.npc] === null) fail(`${ch.id}/${q.id} → npc ${t.npc} is not in this chapter's cast`);
      if (t.item && !ITEMS.some((i) => i.id === t.item)) fail(`${ch.id}/${q.id} → unknown item ${t.item}`);
      if (t.kind && !ITEMS.some((i) => i.kind === t.kind)) fail(`${ch.id}/${q.id} → unknown item kind ${t.kind}`);
      if (t.hotspot && !HOTSPOTS[t.hotspot]) fail(`${ch.id}/${q.id} → hotspot without a rule: ${t.hotspot}`);
      const rule = t.hotspot && HOTSPOTS[t.hotspot];
      const c = fakeCtx(ch, q, has);
      if (rule) usable.set(t.hotspot, usable.get(t.hotspot) || (!rule.locked?.(c) && rule.available?.(c) !== false));
    }
    usable.forEach((ok, h) => { if (!ok) fail(`${ch.id}/${q.id} → target ${h} is locked / unavailable during this quest`); });

    // 4. a quest finished by talking: some reachable dialogue option must complete it
    if (!q.complete) {
      let completes = false;
      for (const [has, flags] of [[false, false], [true, false], [false, true], [true, true]]) {
        const c = fakeCtx(ch, q, has, flags);
        const t = typeof q.target === 'function' ? q.target(c) : q.target;
        const d = t?.npc && DIALOGUES[t.npc];
        if (!d) { completes = true; continue; } // finished elsewhere (hotspot effects, items…)
        const seen = new Set(), stack = [d.start(c)];
        while (stack.length) {
          const id = stack.pop();
          if (!id || id === 'end' || seen.has(id) || !d.nodes[id]) continue;
          seen.add(id);
          const n = d.nodes[id];
          for (const o of [n, ...(n.options ?? [])]) {
            if ((o.do ?? []).some((e) => e === 'quest' || e === `quest:${q.id}`)) completes = true;
            if (o.next) stack.push(o.next);
          }
        }
      }
      if (!completes) fail(`${ch.id}/${q.id} → talking to the target never completes the quest`);
    }
  }
}

if (errors.length) { console.error(`✗ ${errors.length} content problem(s):\n  ${[...new Set(errors)].join('\n  ')}`); process.exit(1); }
console.log(`✓ content OK: ${STORY.chapters.length} chapters, ${Object.keys(DIALOGUES).length} characters`);
