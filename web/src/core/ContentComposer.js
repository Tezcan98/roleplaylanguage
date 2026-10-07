/**
 * Applies content add-ons to the base content (story, dialogues, hotspots…) at start-up,
 * so new teaching content can live in its own files instead of editing the big shared ones.
 *
 * Add-on shape (all optional):
 *   quests:    [{ chapter, after, quests: [...] }]   insert quests after a quest id
 *   cast:      { [chapterId]: { npc: [loc, anchor, behaviour] | null } }
 *   chapters:  [{ after: chapterId, chapter }]       whole new chapters inserted into the story
 *   castAll:   { npc: [loc, anchor, behaviour] }     for every chapter that doesn't set it
 *   dialogues: { npc: { start?(ctx) → node | undefined, nodes } }  start runs before the base one
 *   hotspots, kindNames, npcs, voices: merged into the matching tables
 */
export function composeContent(base, addons) {
  const chapter = (id) => {
    const ch = base.story.chapters.find((c) => c.id === id);
    if (!ch) throw new Error(`add-on: unknown chapter ${id}`);
    return ch;
  };
  for (const a of addons) {
    for (const ins of a.chapters ?? []) {
      const i = base.story.chapters.findIndex((c) => c.id === ins.after);
      if (i < 0) throw new Error(`add-on ${a.id}: no chapter ${ins.after}`);
      base.story.chapters.splice(i + 1, 0, ins.chapter);
    }
    for (const ins of a.quests ?? []) {
      const ch = chapter(ins.chapter);
      const i = ch.quests.findIndex((q) => q.id === ins.after);
      if (i < 0) throw new Error(`add-on ${a.id}: no quest ${ins.after} in ${ins.chapter}`);
      ch.quests.splice(i + 1, 0, ...ins.quests);
    }
    for (const [id, cast] of Object.entries(a.cast ?? {})) Object.assign(chapter(id).cast, cast);
    for (const ch of base.story.chapters) {
      for (const [npc, spot] of Object.entries(a.castAll ?? {})) if (!(npc in ch.cast)) ch.cast[npc] = spot;
    }
    for (const [who, d] of Object.entries(a.dialogues ?? {})) {
      const b = base.dialogues[who];
      if (!b) { base.dialogues[who] = d; continue; }
      if (d.start) { const baseStart = b.start; b.start = (ctx) => d.start(ctx) ?? baseStart(ctx); }
      Object.assign(b.nodes, d.nodes);
    }
    for (const key of ['hotspots', 'kindNames', 'npcs', 'voices']) Object.assign(base[key], a[key] ?? {});
  }
  // chapters added by a later add-on get the earlier add-ons' everyday cast too
  for (const a of addons) {
    for (const ch of base.story.chapters) {
      for (const [npc, spot] of Object.entries(a.castAll ?? {})) if (!(npc in ch.cast)) ch.cast[npc] = spot;
    }
  }
  return base;
}
