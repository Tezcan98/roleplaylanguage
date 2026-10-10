/** Who's who: looks (for the procedural rig), portrait SVG, labels and voices. */

/**
 * Voices. Every character speaks with a natural voice of their own, made on the server by
 * Gemini's text-to-speech: the women and girls (`female`: woman / girl / grandmother) and the
 * men and boys (`man(name)`: one of Gemini's prebuilt voices). No more speeding Piper up or
 * down to tell people apart — that made them sound like cartoons. When Gemini can't make a
 * man's line (daily cap, no key), the server speaks it with Piper (`piper`); without the
 * server the device's own Turkish voice speaks — a woman's for the women, never a man's
 * (services/speech/CharacterVoices.js).
 */
export const M1 = 'tr_TR-fahrettin-medium', M2 = 'tr_TR-fettah-medium';
export const man = (name, piper = M1) => ({ id: `g-${name}`, piper, pitch: 1 });
export const WOMAN = { id: 'tr-kadin', female: true, pitch: 1 }, GIRL = { id: 'tr-kiz', female: true, pitch: 1 }, GRANDMA = { id: 'tr-nine', female: true, pitch: 1 };
export const VOICES = {
  default: man('Charon'),
  ahmet: man('Puck', M2),
  anne: WOMAN,
  okuyucu: WOMAN, // reads library books aloud (on request)
  baba: man('Orus', M2),
  dede: man('Algenib'),
  ogretmen: WOMAN,
  elif: GIRL,
  can: man('Achird', M2),
  zehra: GIRL,
  bakkal: man('Umbriel', M2),
};

const kidFace = (bg, skin, hair, extra = '') => `<svg width="52" height="52" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="${bg}"/>${extra}<circle cx="32" cy="36" r="14" fill="${skin}"/><path d="M18 33c1-9 7-13 14-13s13 4 14 13c-4-4-9-5-14-5s-10 1-14 5z" fill="${hair}"/><circle cx="27" cy="37" r="2" fill="#1B2440"/><circle cx="37" cy="37" r="2" fill="#1B2440"/><path d="M28 43q4 3 8 0" stroke="#B83A5A" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;
/** Portrait in a headscarf: face open, hair covered. */
const hijabFace = (bg, skin, scarf, { glasses = false, edge = 'rgba(0,0,0,.18)' } = {}) => `<svg width="52" height="52" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="${bg}"/><path d="M11 60C11 28 19 13 32 13s21 15 21 47z" fill="${scarf}"/><ellipse cx="32" cy="37" rx="11" ry="12.5" fill="${skin}"/><path d="M20.5 33q2-11 11.5-11t11.5 11" fill="none" stroke="${edge}" stroke-width="2"/><circle cx="27.5" cy="37" r="2" fill="#1B2440"/><circle cx="36.5" cy="37" r="2" fill="#1B2440"/>${glasses ? '<circle cx="27.5" cy="37" r="4.3" fill="none" stroke="#1B2440" stroke-width="1.6"/><circle cx="36.5" cy="37" r="4.3" fill="none" stroke="#1B2440" stroke-width="1.6"/><path d="M31.8 37h0.4" stroke="#1B2440" stroke-width="1.6"/>' : ''}<path d="M28.5 43q3.5 3 7 0" stroke="#B83A5A" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;
export const PLAYER_FACE_GIRL = hijabFace('#F7C6D6', '#F2C49B', '#9B59B6');
/** The teacher when the random pick is a man. */
export const TEACHER_MAN = {
  look: { shirt: 0xDCE6F0, vest: 0x34495E, pants: 0x2A2F3A, skin: 0xE9B98F, hair: 0x2B1D14, mustache: 0x2B1D14, glasses: true },
  face: '<svg width="52" height="52" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#B9E3C6"/><circle cx="32" cy="36" r="16" fill="#E9B98F"/><path d="M16 31q4-13 16-13t16 13q-5-5-16-5t-16 5z" fill="#2B1D14"/><circle cx="26" cy="36" r="4.5" fill="none" stroke="#1B2440" stroke-width="1.8"/><circle cx="38" cy="36" r="4.5" fill="none" stroke="#1B2440" stroke-width="1.8"/><path d="M30.5 36h3" stroke="#1B2440" stroke-width="1.8"/><circle cx="26" cy="36" r="1.4" fill="#1B2440"/><circle cx="38" cy="36" r="1.4" fill="#1B2440"/><path d="M24 43q8-5 16 0q-8 3-16 0z" fill="#2B1D14"/></svg>',
};
export const PLAYER_LOOK = { shirt: 0xFFC845, pants: 0x2F6FDB, skin: 0xF2C49B, hair: 0x5B3A29, scale: 0.78, props: ['jacket'] };
/** Sare in a long skirt; `homeUncovered`: the headscarf comes off at home and goes on outside. */
export const PLAYER_LOOK_GIRL = { shirt: 0xE86A92, skirt: 0x7A3552, pants: 0x3A3F66, skin: 0xF2C49B, hair: 0x6B4226, bun: true, headscarf: 0x9B59B6, homeUncovered: true, scale: 0.76, props: ['jacket'] };
/** The four characters on the setup screen: boy modest / strong, girl covered / open. */
export const PLAYER_LOOKS = {
  'boy-modest': PLAYER_LOOK,
  'boy-strong': { ...PLAYER_LOOK, shirt: 0xE4574A, skin: 0xB97A52, hair: 0x1A1210, build: 'strong', scale: 0.82 }, // Hakan, darker
  'girl-covered': PLAYER_LOOK_GIRL,
  'girl-open': { shirt: 0xF5B041, skirt: 0x2E86C1, pants: 0x1F3A6B, skin: 0xF2C49B, hair: 0x6B4226, bun: true, scale: 0.76, props: ['jacket'] },
};
export const lookKey = (gender, style) => `${gender === 'girl' ? 'girl' : 'boy'}-${gender === 'girl' ? (style === 'open' ? 'open' : 'covered') : (style === 'strong' ? 'strong' : 'modest')}`;

export const NPCS = {
  bakkal: {
    name: 'Mehmet Bakkal', short: 'Bakkal', role: 'bakkal · grocer',
    look: { shirt: 0xD08A42, pants: 0x3E536B, skin: 0xF0C09A, hair: 0x2E2926, mustache: 0x382A22, apron: true, scale: 0.98 },
    face: '<svg width="52" height="52" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#F0D2A6"/><circle cx="32" cy="36" r="16" fill="#F0C09A"/><path d="M16 30q4-13 16-13t16 13q-5-4-16-4t-16 4z" fill="#2E2926"/><circle cx="26" cy="36" r="2" fill="#1B2440"/><circle cx="38" cy="36" r="2" fill="#1B2440"/><path d="M24 43q8-5 16 0q-8 3-16 0z" fill="#382A22"/></svg>',
  },
  anne: {
    name: 'Ayşe Anne', short: 'Anne', role: 'anne · mom',
    look: { shirt: 0xC8456A, skirt: 0x7A3552, pants: 0x7A3552, skin: 0xF2C49B, hair: 0x7A4A2E, bun: true, headscarf: 0xE9C46A, homeUncovered: true, apron: true, scale: 0.95 },
    face: hijabFace('#F7A8B8', '#F2C49B', '#E9C46A'),
  },
  dede: {
    name: 'Hüseyin Dede', short: 'Dede', role: 'dede · grandpa',
    look: { shirt: 0xE8E0CF, vest: 0x6B4F3A, pants: 0x555B66, skin: 0xE9B98F, sides: 0xC9CED6, mustache: 0xEEF1F5, cap: 0x3B3F46, glasses: true, props: ['hoe'] },
    face: '<svg width="52" height="52" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#B9E3C6"/><circle cx="32" cy="36" r="16" fill="#E9B98F"/><path d="M16 38q1-10 5-13v12zM48 38q-1-10-5-13v12z" fill="#C9CED6"/><path d="M15 26q17-10 34 0v-3q-17-9-34 0z" fill="#3B3F46"/><circle cx="26" cy="35" r="4.5" fill="none" stroke="#1B2440" stroke-width="1.8"/><circle cx="38" cy="35" r="4.5" fill="none" stroke="#1B2440" stroke-width="1.8"/><path d="M30.5 35h3" stroke="#1B2440" stroke-width="1.8"/><circle cx="26" cy="35" r="1.4" fill="#1B2440"/><circle cx="38" cy="35" r="1.4" fill="#1B2440"/><path d="M24 43q8-5 16 0q-8 3-16 0z" fill="#EEF1F5"/></svg>',
    // round the vegetable garden in the yard (plants in rows at x 6.9…11.1, z −4.8…−1.8; the paths between
    // them at x 7.6 / 9 / 10.4 and z −2.55 / −4.05): a different job at each stop (Behaviors.garden)
    gardenRoute: [
      { x: 9, z: 0.2, rot: Math.PI, pose: 'hoe', wait: 7 },
      { x: 7.6, z: -0.6 },
      { x: 7.6, z: -2.55, rot: Math.PI / 2, pose: 'pick', wait: 5 },
      { x: 10.4, z: -2.55 },
      { x: 10.4, z: -4.05, rot: -Math.PI / 2, pose: 'plant', wait: 6 },
      { x: 12.6, z: -4.05 },
      { x: 12.6, z: -2.4, rot: -Math.PI / 2, pose: 'water', wait: 6 },
      { x: 12.2, z: 0.4 },
      { x: 10.2, z: 0.6, rot: Math.PI * 0.8, pose: 'rest', wait: 4 },
    ],
  },
  baba: {
    name: 'Mehmet Baba', short: 'Baba', role: 'baba · dad',
    look: { shirt: 0x2F6FDB, pants: 0x2A2F3A, skin: 0xE9B98F, hair: 0x1F1A17, mustache: 0x1F1A17 },
    // round his old car in the yard (car body x -13.1…-8.9, z 6.05…7.95, bonnet towards +x);
    // stops without `pose` are corners he walks round
    carRoute: [
      { x: -8.2, z: 7.0, rot: -Math.PI / 2, pose: 'hood', wait: 6 },
      { x: -8.3, z: 8.8, wait: 0 },
      { x: -9.65, z: 8.75, rot: Math.PI, pose: 'wheel', wait: 5 },
      { x: -10.8, z: 9.4, rot: 0, pose: 'under', wait: 8 },
      { x: -13.9, z: 9.0, wait: 0 },
      { x: -13.8, z: 7.0, rot: Math.PI / 2, pose: 'hood', wait: 4 },
      { x: -13.9, z: 5.3, wait: 0 },
      { x: -11, z: 5.3, rot: 0, pose: 'wipe', wait: 4 },
      { x: -8.3, z: 5.4, wait: 0 },
    ],
    face: '<svg width="52" height="52" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#8EC5FF"/><circle cx="32" cy="36" r="16" fill="#E9B98F"/><path d="M17 32c0-10 7-14 15-14s15 4 15 14c-3-3-9-5-15-5s-12 2-15 5z" fill="#1F1A17"/><circle cx="26" cy="36" r="2" fill="#1B2440"/><circle cx="38" cy="36" r="2" fill="#1B2440"/><path d="M24 43q8-5 16 0q-8 3-16 0z" fill="#1F1A17"/></svg>',
  },
  ogretmen: {
    name: 'Zeynep Öğretmen', short: 'Öğretmen', role: 'öğretmen · teacher',
    look: { shirt: 0x4E7D5B, skirt: 0x2A2F3A, pants: 0x2A2F3A, skin: 0xF2C49B, headscarf: 0x34495E, glasses: true },
    face: hijabFace('#B9E3C6', '#F2C49B', '#34495E', { glasses: true }),
  },
  elif: {
    name: 'Elif', short: 'Elif', role: 'sınıf arkadaşı · classmate',
    look: { shirt: 0xFFFFFF, skirt: 0xC0392B, pants: 0xC0392B, skin: 0xF2C49B, headscarf: 0xF5B7B1, scale: 0.76 },
    face: hijabFace('#F7A8B8', '#F2C49B', '#F5B7B1'),
  },
  can: {
    name: 'Can', short: 'Can', role: 'sınıf arkadaşı · classmate',
    look: { shirt: 0x1F3A6B, pants: 0x555B66, skin: 0xE9B98F, hair: 0x111111, scale: 0.8 },
    face: kidFace('#8EC5FF', '#E9B98F', '#111111'),
  },
  zehra: {
    name: 'Zehra', short: 'Zehra', role: 'sınıf arkadaşı · classmate',
    look: { shirt: 0xF4D03F, skirt: 0x2F6FDB, pants: 0x2F6FDB, skin: 0xF2C49B, headscarf: 0x85C1E9, scale: 0.75 },
    face: hijabFace('#F4E6C8', '#F2C49B', '#85C1E9'),
  },
};
