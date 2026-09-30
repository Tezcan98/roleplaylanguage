/** Who's who: looks (for the procedural rig), portrait SVG and labels. */
export const PLAYER_LOOK = { shirt: 0xFFC845, pants: 0x2F6FDB, skin: 0xF2C49B, hair: 0x5B3A29, scale: 0.78, props: ['jacket'] };

export const NPCS = {
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
};
