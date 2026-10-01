/** Who's who: looks (for the procedural rig), portrait SVG, labels and voices. */

/**
 * Piper voices (CC0: fahrettin, fettah). `pitch` shifts them per character.
 * dfki is CC BY-NC-SA, so it is not used in a paid product.
 */
export const VOICES = {
  default: { id: 'tr_TR-fahrettin-medium', pitch: 1 },
  ahmet: { id: 'tr_TR-fettah-medium', pitch: 1.3 },
  anne: { id: 'tr_TR-fettah-medium', pitch: 1.2 },
  baba: { id: 'tr_TR-fahrettin-medium', pitch: 1.0 },
  dede: { id: 'tr_TR-fahrettin-medium', pitch: 0.86 },
  ogretmen: { id: 'tr_TR-fettah-medium', pitch: 1.15 },
  elif: { id: 'tr_TR-fettah-medium', pitch: 1.4 },
  can: { id: 'tr_TR-fahrettin-medium', pitch: 1.35 },
  zehra: { id: 'tr_TR-fettah-medium', pitch: 1.45 },
};

const kidFace = (bg, skin, hair, extra = '') => `<svg width="52" height="52" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="${bg}"/>${extra}<circle cx="32" cy="36" r="14" fill="${skin}"/><path d="M18 33c1-9 7-13 14-13s13 4 14 13c-4-4-9-5-14-5s-10 1-14 5z" fill="${hair}"/><circle cx="27" cy="37" r="2" fill="#1B2440"/><circle cx="37" cy="37" r="2" fill="#1B2440"/><path d="M28 43q4 3 8 0" stroke="#B83A5A" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;
export const PLAYER_LOOK = { shirt: 0xFFC845, pants: 0x2F6FDB, skin: 0xF2C49B, hair: 0x5B3A29, scale: 0.78, props: ['jacket'] };
/** Meryem: the same child as a girl (skirt over trousers, hair in a bun). */
export const PLAYER_LOOK_GIRL = { shirt: 0xE86A92, skirt: 0x7A3552, pants: 0x3A3F66, skin: 0xF2C49B, hair: 0x6B4226, bun: true, scale: 0.76, props: ['jacket'] };

export const NPCS = {
  muhtar: {
    name: 'Hasan Muhtar', short: 'Muhtar', role: 'muhtar · village headman',
    look: { shirt: 0x6B7A45, pants: 0x4B4F58, skin: 0xE9B98F, hair: 0x5A4638, mustache: 0x4A352A },
    face: '<svg width="52" height="52" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#E8D6A8"/><circle cx="32" cy="36" r="16" fill="#E9B98F"/><path d="M16 31q3-13 16-13t16 13q-5-5-16-5t-16 5z" fill="#5A4638"/><circle cx="26" cy="36" r="2" fill="#1B2440"/><circle cx="38" cy="36" r="2" fill="#1B2440"/><path d="M24 43q8-6 16 0q-8 3-16 0z" fill="#4A352A"/></svg>',
  },
  bakkal: {
    name: 'Mehmet Bakkal', short: 'Bakkal', role: 'bakkal · grocer',
    look: { shirt: 0xD08A42, pants: 0x3E536B, skin: 0xF0C09A, hair: 0x2E2926, mustache: 0x382A22, apron: true, scale: 0.98 },
    face: '<svg width="52" height="52" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#F0D2A6"/><circle cx="32" cy="36" r="16" fill="#F0C09A"/><path d="M16 30q4-13 16-13t16 13q-5-4-16-4t-16 4z" fill="#2E2926"/><circle cx="26" cy="36" r="2" fill="#1B2440"/><circle cx="38" cy="36" r="2" fill="#1B2440"/><path d="M24 43q8-5 16 0q-8 3-16 0z" fill="#382A22"/></svg>',
  },
  anne: {
    name: 'Ayşe Anne', short: 'Anne', role: 'anne · mom',
    look: { shirt: 0xC8456A, skirt: 0x7A3552, pants: 0x7A3552, skin: 0xF2C49B, hair: 0x7A4A2E, bun: true, apron: true, scale: 0.95 },
    face: '<svg width="52" height="52" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#F7A8B8"/><path d="M13 44c0-17 8-26 19-26s19 9 19 26v8H13z" fill="#7A4A2E"/><circle cx="32" cy="36" r="15" fill="#F2C49B"/><path d="M17 33c2-9 8-13 15-13s13 4 15 13c-5-4-10-6-15-6s-10 2-15 6z" fill="#7A4A2E"/><circle cx="26" cy="37" r="2" fill="#1B2440"/><circle cx="38" cy="37" r="2" fill="#1B2440"/><path d="M28 43q4 3 8 0" stroke="#B83A5A" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>',
  },
  dede: {
    name: 'Hüseyin Dede', short: 'Dede', role: 'dede · grandpa',
    look: { shirt: 0xE8E0CF, vest: 0x6B4F3A, pants: 0x555B66, skin: 0xE9B98F, sides: 0xC9CED6, mustache: 0xEEF1F5, cap: 0x3B3F46, glasses: true, props: ['hoe'] },
    face: '<svg width="52" height="52" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#B9E3C6"/><circle cx="32" cy="36" r="16" fill="#E9B98F"/><path d="M16 38q1-10 5-13v12zM48 38q-1-10-5-13v12z" fill="#C9CED6"/><path d="M15 26q17-10 34 0v-3q-17-9-34 0z" fill="#3B3F46"/><circle cx="26" cy="35" r="4.5" fill="none" stroke="#1B2440" stroke-width="1.8"/><circle cx="38" cy="35" r="4.5" fill="none" stroke="#1B2440" stroke-width="1.8"/><path d="M30.5 35h3" stroke="#1B2440" stroke-width="1.8"/><circle cx="26" cy="35" r="1.4" fill="#1B2440"/><circle cx="38" cy="35" r="1.4" fill="#1B2440"/><path d="M24 43q8-5 16 0q-8 3-16 0z" fill="#EEF1F5"/></svg>',
  },
  baba: {
    name: 'Mehmet Baba', short: 'Baba', role: 'baba · dad',
    look: { shirt: 0x2F6FDB, pants: 0x2A2F3A, skin: 0xE9B98F, hair: 0x1F1A17, mustache: 0x1F1A17 },
    face: '<svg width="52" height="52" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#8EC5FF"/><circle cx="32" cy="36" r="16" fill="#E9B98F"/><path d="M17 32c0-10 7-14 15-14s15 4 15 14c-3-3-9-5-15-5s-12 2-15 5z" fill="#1F1A17"/><circle cx="26" cy="36" r="2" fill="#1B2440"/><circle cx="38" cy="36" r="2" fill="#1B2440"/><path d="M24 43q8-5 16 0q-8 3-16 0z" fill="#1F1A17"/></svg>',
  },
  ogretmen: {
    name: 'Zeynep Öğretmen', short: 'Öğretmen', role: 'öğretmen · teacher',
    look: { shirt: 0x4E7D5B, skirt: 0x2A2F3A, pants: 0x2A2F3A, skin: 0xF2C49B, hair: 0x2B1D14, bun: true, glasses: true },
    face: kidFace('#B9E3C6', '#F2C49B', '#2B1D14', '<path d="M14 46c0-16 8-25 18-25s18 9 18 25v6H14z" fill="#2B1D14"/>').replace('r="2" fill="#1B2440"/><circle cx="37"', 'r="2" fill="#1B2440"/><circle cx="27" cy="37" r="4.5" fill="none" stroke="#1B2440" stroke-width="1.6"/><circle cx="37" cy="37" r="4.5" fill="none" stroke="#1B2440" stroke-width="1.6"/><circle cx="37"'),
  },
  elif: {
    name: 'Elif', short: 'Elif', role: 'sınıf arkadaşı · classmate',
    look: { shirt: 0xFFFFFF, skirt: 0xC0392B, pants: 0xC0392B, skin: 0xF2C49B, hair: 0x3B2418, bun: true, scale: 0.76 },
    face: kidFace('#F7A8B8', '#F2C49B', '#3B2418', '<path d="M17 46c0-15 7-24 15-24s15 9 15 24v4H17z" fill="#3B2418"/>'),
  },
  can: {
    name: 'Can', short: 'Can', role: 'sınıf arkadaşı · classmate',
    look: { shirt: 0x1F3A6B, pants: 0x555B66, skin: 0xE9B98F, hair: 0x111111, scale: 0.8 },
    face: kidFace('#8EC5FF', '#E9B98F', '#111111'),
  },
  zehra: {
    name: 'Zehra', short: 'Zehra', role: 'sınıf arkadaşı · classmate',
    look: { shirt: 0xF4D03F, skirt: 0x2F6FDB, pants: 0x2F6FDB, skin: 0xF2C49B, hair: 0x7A4A2E, bun: true, scale: 0.75 },
    face: kidFace('#F4E6C8', '#F2C49B', '#7A4A2E'),
  },
};
