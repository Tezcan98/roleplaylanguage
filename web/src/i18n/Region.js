/** Where the player seems to come from, from the device alone (language and time zone; nothing is sent anywhere). */
const INDIA_ZONES = /^Asia\/(Kolkata|Calcutta)$/;

export function fromIndia() {
  try {
    if (/^hi\b/i.test(navigator.language ?? '') || (navigator.languages ?? []).some((l) => /^hi\b/i.test(l))) return true;
    return INDIA_ZONES.test(Intl.DateTimeFormat().resolvedOptions().timeZone ?? '');
  } catch { return false; }
}

/** The meaning language when none is chosen yet: Hindi for a player from India, else Arabic (the first language the game had). */
export const defaultGlossLang = () => (fromIndia() ? 'hi' : 'ar');
