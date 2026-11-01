/** Where the player seems to come from, from the device alone (language and time zone; nothing is sent anywhere). */
const INDIA_ZONES = /^Asia\/(Kolkata|Calcutta)$/;

export function fromIndia() {
  try {
    if (/^hi\b/i.test(navigator.language ?? '') || (navigator.languages ?? []).some((l) => /^hi\b/i.test(l))) return true;
    return INDIA_ZONES.test(Intl.DateTimeFormat().resolvedOptions().timeZone ?? '');
  } catch { return false; }
}

const INDONESIA_ZONES = /^Asia\/(Jakarta|Pontianak|Makassar|Jayapura)$/;
const PAKISTAN_ZONES = /^Asia\/Karachi$/;
/** Meaning languages a device's own language can pick by itself (Turkish is not one: the Turkish-only mode is chosen by hand). */
const DEVICE_LANGS = ['ar', 'ur', 'hi', 'es', 'fr', 'id'];

/**
 * The meaning language when none is chosen yet: the device's own language when the game has it (Malay reads
 * Indonesian); a phone set to English picks by time zone first (Hindi in India, Urdu in Pakistan, Indonesian in
 * Indonesia), then English; else Arabic (the first language the game had).
 */
export function defaultGlossLang() {
  try {
    const codes = [navigator.language, ...(navigator.languages ?? [])].map((l) => String(l ?? '').toLowerCase().split('-')[0]);
    for (const code of codes) {
      if (code === 'ms' || code === 'in') return 'id';
      if (DEVICE_LANGS.includes(code)) return code;
    }
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
    if (fromIndia()) return 'hi';
    if (PAKISTAN_ZONES.test(zone)) return 'ur';
    if (INDONESIA_ZONES.test(zone)) return 'id';
    if (codes.includes('en')) return 'en';
  } catch { /* no navigator: the default below */ }
  return 'ar';
}
