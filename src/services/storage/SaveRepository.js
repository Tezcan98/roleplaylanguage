/** Persistence port. LocalSaveRepository stores one slot in localStorage; a cloud one can replace it. */
export class LocalSaveRepository {
  constructor(key = 'yilmaz-ailesi-save') { this.key = key; }
  load() { try { const s = localStorage.getItem(this.key); return s ? JSON.parse(s) : null; } catch { return null; } }
  save(data) { try { localStorage.setItem(this.key, JSON.stringify(data)); } catch { /* storage unavailable */ } }
  clear() { try { localStorage.removeItem(this.key); } catch { /* storage unavailable */ } }
}
