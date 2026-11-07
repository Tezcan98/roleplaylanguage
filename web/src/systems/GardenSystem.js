import { EV } from '../core/events.js';

export const CROPS = Object.freeze({
  bean: { name: 'Fasulye', color: '#86ba50', minutes: 2, price: 1, value: 3, yield: 2 },
  tomato: { name: 'Domates', color: '#ed6950', minutes: 4, price: 2, value: 5, yield: 2 },
  pepper: { name: 'Biber', color: '#efbf4b', minutes: 6, price: 3, value: 8, yield: 2 },
});

/** A persistent nine-bed garden. Real time continues offline; crops never wither. */
export class GardenSystem {
  constructor({ state, inventory, story, bus, vocab, toasts, world, time, now = Date.now }) {
    Object.assign(this, { state, inventory, story, bus, vocab, toasts, world, time, now });
    this.listeners = new Set();
    for (const ev of [EV.CHAPTER, EV.LOCATION, EV.FLAG]) bus.on(ev, () => this.refresh());
    bus.on(EV.QUEST, () => this.resumeLesson());
    this.refresh();
  }
  resumeLesson() {
    const completed = { 'farm-seeds': 'farm-seeds-given', 'farm-hoe': 'farm-hoed', 'farm-sow': 'farm-planted', 'farm-water': 'farm-watered' };
    const id = this.story.quest?.id;
    if (completed[id] && this.state.flags[completed[id]]) this.story.complete?.(id);
  }
  get data() {
    const f = this.state.flags;
    if (!f['farm-v2']) {
      // Upgrade the earlier lesson, including a save made halfway through sowing.
      f['farm-v2'] = { coins: 0, harvests: 0, basket: {}, seeds: { tomato: 0, pepper: 0 }, plots: Array.from({ length: 9 }, (_, i) => ({
        hoed: i < 3 && !!f['farm-hoed'],
        crop: i < (f['farm-sown'] ?? 0) ? 'bean' : null,
        plantedAt: i < (f['farm-sown'] ?? 0) ? this.now() : null,
        wateredAt: i < (f['farm-sown'] ?? 0) && f['farm-watered'] ? this.now() : null,
      })) };
    }
    // Earlier garden saves did not store sowing time. Start their water reminder now.
    for (const p of f['farm-v2'].plots) {
      if (p.crop && p.wateredAt == null && !Number.isFinite(p.plantedAt)) p.plantedAt = this.now();
    }
    return f['farm-v2'];
  }
  get unlocked() { return !!this.state.flags['farm-seeds-given']; }
  get learning() { return !this.state.flags['farm-watered']; }
  get step() {
    if (this.story.paused) return null;
    const q = this.story.quest?.id;
    if (String(q ?? '').startsWith('farm-')) return q;
    const f = this.state.flags;
    return f['farm-sidequest'] && !f['farm-watered'] ? (!f['farm-hoed'] ? 'farm-hoe' : !f['farm-planted'] ? 'farm-sow' : 'farm-water') : null;
  }
  sideObjective() {
    if (!this.state.flags['farm-sidequest'] || !this.step) return null;
    return this.step === 'farm-hoe' ? 'Toprağı çapala' : this.step === 'farm-sow' ? `Tohum ek (${this.state.flags['farm-sown'] ?? 0}/3)` : 'Can suyu ver';
  }
  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  refresh() {
    this.world.get('yard').setGardenState?.(this.state.flags, this.time.day ?? this.state.day, this.now());
    this.listeners.forEach(fn => fn());
  }
  #save(action) {
    this.bus.emit(EV.FLAG, { name: 'farm-v2' });
    this.bus.emit(EV.QUEST, { quest: this.story.quest });
    this.bus.emit(EV.GARDEN, { action });
  }
  seeds(crop) { return crop === 'bean' ? this.inventory.count('tohum') : this.data.seeds[crop] ?? 0; }
  status(index) {
    const p = this.data.plots[index];
    if (!p) return { stage: 'locked', progress: 0, remaining: 0 };
    if (!p.crop) return { stage: p.hoed ? 'hoed' : 'soil', progress: 0, remaining: 0 };
    if (p.wateredAt == null) return { stage: 'dry', progress: 0, remaining: 0 };
    const duration = CROPS[p.crop].minutes * 60000;
    const elapsed = Math.max(0, this.now() - p.wateredAt);
    const progress = Math.min(1, elapsed / duration);
    return { stage: progress >= 1 ? 'ready' : progress >= .5 ? 'leaf' : 'sprout', progress, remaining: Math.max(0, duration - elapsed) };
  }
  giveSeeds() {
    if (this.state.day < 2 || this.unlocked) return;
    this.state.flags['farm-seeds-given'] = true;
    if (this.story.quest?.id !== 'farm-seeds') this.state.flags['farm-sidequest'] = true;
    this.inventory.add('tohum', 3);
    this.vocab.learn('tohum', 'seed');
    this.bus.emit(EV.QUEST, { quest: this.story.quest });
    this.refresh();
  }
  #done(name, action) {
    this.state.flags[name] = true;
    this.bus.emit(EV.FREE_ACTION, { id: action });
    this.bus.emit(EV.FLAG, { name });
    this.bus.emit(EV.QUEST, { quest: this.story.quest });
  }
  /** Returns a short explanation for invalid input; mutations only happen after validation. */
  act(index, tool, crop = 'bean') {
    if (!this.unlocked || this.story.paused) return 'Önce dedenle konuş.';
    const p = this.data.plots[index], f = this.state.flags;
    if (!p || !Number.isInteger(index)) return 'Bir ekim gözü seç.';
    if (this.learning && index >= 3) return 'Önce öndeki üç gözde dedenin dersini tamamla.';
    const expected = { 'farm-hoe': 'hoe', 'farm-sow': 'sow', 'farm-water': 'water' }[this.step];
    if (this.learning && expected && tool !== expected) return 'Dedenin gösterdiği sırayla ilerle: çapala, ek, sula.';
    if (tool === 'hoe') {
      if (p.crop || p.hoed) return 'Bu toprağın çapası hazır.';
      p.hoed = true;
      this.vocab.learn('çapalamak', 'to hoe');
      if (this.learning && this.data.plots.slice(0, 3).every(p => p.hoed)) this.#done('farm-hoed', 'farm_hoe');
    } else if (tool === 'sow') {
      if (!CROPS[crop] || (this.learning && crop !== 'bean')) return 'İlk ders için fasulye tohumunu seç.';
      if (p.crop) return 'Burada zaten bir bitki büyüyor.';
      if (!p.hoed) return 'Önce bu toprağı çapala.';
      if (this.seeds(crop) < 1) return 'Tohumun bitti. Tohumluğa bir göz at.';
      p.crop = crop; p.wateredAt = null; p.plantedAt = this.now();
      if (crop === 'bean') this.inventory.remove('tohum', 1); else this.data.seeds[crop]--;
      this.vocab.learn('tohum ekmek', 'to sow, to plant');
      if (this.learning) {
        f['farm-sown'] = this.data.plots.slice(0, 3).filter(p => p.crop).length;
        if (f['farm-sown'] === 3) this.#done('farm-planted', 'farm_sow');
      }
    } else if (tool === 'water') {
      if (!p.crop) return 'Önce buraya bir tohum ek.';
      if (p.wateredAt != null) return 'Bu bitkinin suyu yeterli.';
      p.wateredAt = this.now();
      this.vocab.learn('sulamak', 'to water');
      if (this.learning && this.data.plots.slice(0, 3).every(p => p.wateredAt != null)) {
        f['farm-day'] = this.state.day;
        this.#done('farm-watered', 'farm_water');
      }
    } else if (tool === 'harvest') {
      if (this.learning) return 'Önce ekim dersini tamamla.';
      if (this.status(index).stage !== 'ready') return 'Ürün henüz olgunlaşmadı.';
      const kind = p.crop;
      this.data.basket[kind] = (this.data.basket[kind] ?? 0) + CROPS[kind].yield;
      this.data.harvests++;
      p.crop = null; p.wateredAt = null; p.plantedAt = null; p.hoed = false;
      this.vocab.learn('hasat', 'harvest');
      this.bus.emit(EV.FREE_ACTION, { id: 'farm_harvest' });
    } else return 'Bir araç seç.';
    this.#save(tool);
    return null;
  }
  buy(crop) {
    const c = CROPS[crop];
    if (!this.unlocked || this.story.paused || this.learning || !c || this.data.coins < c.price) return false;
    this.data.coins -= c.price;
    if (crop === 'bean') this.inventory.add('tohum', 1); else this.data.seeds[crop] = (this.data.seeds[crop] ?? 0) + 1;
    this.#save('buy'); return true;
  }
  get basketValue() { return Object.entries(this.data.basket).reduce((sum, [id, n]) => sum + (CROPS[id]?.value ?? 0) * n, 0); }
  sell() {
    if (!this.unlocked || this.story.paused || !this.basketValue) return 0;
    const value = this.basketValue;
    this.data.coins += value; this.data.basket = {};
    this.#save('sell'); return value;
  }
  /** Compatibility for existing lesson callers; the new view always addresses individual beds. */
  use() {
    const q = this.step;
    if (!this.unlocked || this.story.paused) return false;
    if (q === 'farm-hoe') {
      if (this.state.flags['farm-hoed']) return false;
      for (let i = 0; i < 3; i++) this.act(i, 'hoe');
      return !!this.state.flags['farm-hoed'];
    }
    if (q === 'farm-sow') {
      const index = this.data.plots.slice(0, 3).findIndex(p => !p.crop);
      return index >= 0 && this.act(index, 'sow') === null;
    }
    if (q === 'farm-water') {
      if (!this.state.flags['farm-planted'] || this.state.flags['farm-watered']) return false;
      for (let i = 0; i < 3; i++) this.act(i, 'water');
      return !!this.state.flags['farm-watered'];
    }
    return false;
  }
}
