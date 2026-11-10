import { start, fixed, showLabels, showToasts } from './kids-scenes.mjs';

/**
 * The YouTube Shorts series: one feature of the game per episode, about 20 seconds, vertical,
 * in Turkish, English and Arabic (record.mjs --episode=<name> --lang=tr|en|ar). Each shot has one
 * big line on screen in the video's language; `vo` is one voice line per shot (a Gemini draft, or
 * ElevenLabs files with --vo=<dir>).
 */
const END = {
  tr: { name: 'Türk Ailem', line: 'Dil gelişim ve sosyalleşme oyunu', free: 'Ücretsiz', now: 'Şimdi Google Play’de', search: 'Türk Ailem' },
  en: { name: 'My Turkish Family', line: 'Play, speak, learn Turkish', free: 'Free', now: 'On Google Play now', search: 'Turkish Family' },
  ar: { name: 'عائلتي التركية', line: 'العب، تكلّم، تعلّم التركية', free: 'مجانًا', now: 'متوفّرة الآن على Google Play', search: 'ابحث عن: Turkish Family' },
  ur: { name: 'میرا ترک خاندان', line: 'کھیلو، بولو، ترکی سیکھو', free: 'مفت', now: 'اب Google Play پر دستیاب', search: 'تلاش کریں: Turkish Family' },
  hi: { name: 'मेरा तुर्की परिवार', line: 'खेलो, बोलो, तुर्की सीखो', free: 'मुफ़्त', now: 'अब Google Play पर', search: 'खोजें: Turkish Family' },
};
const endCard = (name) => ({
  name, seconds: 3.6,
  setup: async (kit) => { const page = await kit.open(); await page.evaluate(() => document.querySelector('.main-menu')?.classList.remove('open')); await kit.sleep(2000); return page; },
  act: async (kit, page) => {
    const e = END[kit.lang] ?? END.tr;
    await kit.card(page, `<img src="assets/icons/icon-512.png" alt=""><h1 dir="auto">${e.name}</h1><p dir="auto">${e.line}</p><div class="promo-badges"><span>▶ Google Play</span><span class="free">${e.free}</span></div>`);
  },
});

/** A plain card on the blurred menu background (the Play Store logo, the follow call). */
const card = (name, seconds, html) => ({
  name, seconds,
  setup: async (kit) => { const page = await kit.open(); await page.evaluate(() => document.querySelector('.main-menu')?.classList.remove('open')); await kit.sleep(2000); return page; },
  act: async (kit, page) => { await kit.card(page, html(END[kit.lang] ?? END.tr, kit.lang)); },
});
const FOLLOW = {
  tr: ['Takip et', 'Yeni videoları kaçırma'],
  en: ['Follow us', 'Don’t miss the next videos'],
  ar: ['تابعنا', 'لا تفوّت الفيديوهات القادمة'],
  ur: ['ہمیں فالو کریں', 'اگلی ویڈیوز مت چھوڑیں'],
  hi: ['फ़ॉलो करें', 'अगले वीडियो न छोड़ें'],
};
/** The park's corners (world/locations/VillageSquare.js PARK: x −46…−32, z 13…25). */
const SWING = [-42.3, 15.6];

/** The Turkish flag (red, a white crescent and a five-pointed star), drawn as an SVG for the opening card. */
const FLAG = (() => {
  const star = Array.from({ length: 5 }, (_, i) => { const a = Math.PI + i * 0.8 * Math.PI, r = 25; return `${(168 + r * Math.cos(a)).toFixed(1)},${(100 + r * Math.sin(a)).toFixed(1)}`; }).join(' ');
  return `<svg viewBox="0 0 300 200" width="420" height="280" style="border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.45)"><rect width="300" height="200" fill="#E30A17"/><circle cx="105" cy="100" r="50" fill="#fff"/><circle cx="120" cy="100" r="40" fill="#E30A17"/><polygon points="${star}" fill="#fff"/></svg>`;
})();

const bubble = (page, who, tr, ar) => page.evaluate(([who, tr, ar]) => { const g = window.__game; g.labels.bubble(g.cast.get(who), tr, null, 2.5, ar); }, [who, tr, ar]);
const garden = async (kit, questId, cam, look, at, face = null, has = []) => {
  const page = await start(kit);
  await page.evaluate(([q, at, face, has]) => {
    const g = window.__game;
    g.story.state.quest = g.story.questIndex(q); g.items.refresh(); has.forEach((k) => g.inventory.add(k));
    g.cast.move('dede', 'yard', 'garden', 'garden'); g.travel.place('yard', 'houseDoor', { force: true });
    g.player.position.set(at[0], 0, at[1]);
    if (face) g.player.group.rotation.y = Math.atan2(face[0] - at[0], face[1] - at[1]);
  }, [questId, at, face, has]);
  await kit.sleep(1200);
  await fixed(page, cam, look);
  await kit.sleep(900);
  return page;
};


/**
 * The yard garden (systems/GardenSystem.js, content/gardenLayout.js): nine beds at x 7.15…10.85, z 2.35…5.65,
 * the hoe at (12.35, 0.6), the watering can at (13, 2.5), the sale crate at (13, 4.15). `beds[i]`: { crop, grown }
 * (grown 0…1: how far it has grown since watering; null: sown, not watered yet) or { hoed: true }.
 */
const GROW_MIN = { bean: 2, tomato: 4, pepper: 6 };
const farm = async (kit, { at, face, cam, look, beds = [], basket = {}, dede = false }) => {
  const page = await start(kit);
  await page.evaluate(([at, face, beds, basket, dede, MIN]) => {
    const g = window.__game, G = g.garden, f = g.story.state.flags;
    if (dede) g.cast.move('dede', 'yard', 'garden', 'garden');
    g.travel.place('yard', 'houseDoor', { force: true });
    Object.assign(f, { 'farm-seeds-given': true, 'farm-hoed': true, 'farm-planted': true, 'farm-watered': true, 'farm-sown': 3 });
    for (const [k, n] of [['tohum', 6], ['domates-tohumu', 4], ['biber-tohumu', 4]]) g.inventory.add(k, n);
    const now = Date.now();
    G.data.plots.forEach((p, i) => {
      const b = beds[i] ?? {};
      Object.assign(p, { hoed: !!(b.hoed || b.crop), crop: b.crop ?? null, plantedAt: b.crop ? now : null,
        wateredAt: b.crop && b.grown != null ? now - b.grown * MIN[b.crop] * 60000 : null });
    });
    G.data.basket = basket;
    G.refresh();
    g.player.position.set(at[0], 0, at[1]);
    if (face) g.player.group.rotation.y = Math.atan2(face[0] - at[0], face[1] - at[1]);
  }, [at, face, beds, basket, dede, GROW_MIN]);
  await kit.sleep(1200);
  await fixed(page, cam, look);
  await kit.sleep(900);
  return page;
};
/** One garden step with the tool in hand: the player works the beds one after another. */
const work = (page, kit, tool, beds, crop = 'bean') => (async () => {
  await page.evaluate(([tool, crop]) => window.__game.gardenWalk.take(tool, crop), [tool, crop]);
  await kit.sleep(450);
  for (const i of beds) { await page.evaluate(([i, tool]) => window.__game.gardenWalk.apply(i, tool), [i, tool]); await kit.sleep(1000); }
})();
const ALL = (crop, grown) => Array.from({ length: 9 }, () => ({ crop, grown }));


/**
 * The children in HD for a "friends" shot: the HD body has no swing or chase poses, so the game keeps those
 * blocky (entities/Npc.js) — here they stand instead and turn HD like the player. `ids`: these; otherwise
 * everyone within `radius` of the player.
 */
const hdFriends = (page, ids = null, radius = 10) => page.evaluate(([ids, r]) => {
  const g = window.__game, p = g.player.position;
  for (const n of g.cast.present()) {
    if (ids ? !ids.includes(n.id) : Math.hypot(n.position.x - p.x, n.position.z - p.z) > r) continue;
    if (n.behavior?.blockyPoses) { n.setBehavior('stand'); n.position.y = 0; }
    n.refreshHd();
  }
}, [ids, radius]);


/**
 * A 3-on-3 on the square's pitch (VillageSquare.js SQUARE_PITCH: x 6…46, z 20…44, the goals at z 29…35):
 * the player and five others drawn the way the game draws other online players (RemotePlayers), in HD —
 * red football shirts (the player's team) against navy tracksuits. `team` { id: [x, z] } where everyone starts; the ball at `ball`.
 */
const TEAM = { me: ['Ahmet', 'jersey', 'boy-modest'], b1: ['Yusuf', 'jersey', 'boy-modest'], b2: ['Ali', 'jersey', 'boy-strong'], r1: ['Omar', 'sport', 'boy-strong'], r2: ['Bilal', 'sport', 'boy-modest'], rk: ['Hamza', 'sport', 'boy-strong'] };
const pitch = async (kit, { team, ball, cam, look }) => {
  const page = await start(kit);
  await page.evaluate(([team, ball, TEAM]) => {
    const g = window.__game, loc = g.world.get('village');
    // all six drawn the same way, as online players, so they all run with the same animation (the player hidden: "me" is one of them)
    g.player.position.set(team.me[0] - 6, 0, team.me[1] + 9); g.player.group.visible = false;
    for (const [id, [x, z]] of Object.entries(team)) {
      const [name, outfit, key] = TEAM[id], [gender, style] = key.split('-');
      g.village.remotes.add(loc, { id, name, look: { outfit, gender, style }, x, z, rot: id.startsWith('r') ? -Math.PI / 2 : Math.PI / 2 });
    }
    const b = g.village.places.village.balls[0]; b.setState({ x: ball[0], z: ball[1] });
    g.village.places.village.balls.slice(1).forEach((o) => o.setState({ x: 8, z: 22 })); // (the second ball out of the way)
  }, [team, ball, TEAM]);
  await kit.sleep(1800);
  await fixed(page, cam, look, true);
  await kit.sleep(600);
  return page;
};
/**
 * Everyone runs to their next spot over `ms` (small steps; RemotePlayers smooths them and picks walk or run
 * from the speed: over ~3.2 m/s they run). `to`: the ball is kicked there — a real roll with the ball's own
 * friction (vel × 0.35^t), fast enough to arrive in `ms`, then stopped at the receiver's feet.
 */
const play = async (page, kit, { moves = {}, to = null, ms = 1000, kicker = null, stop = true }) => {
  const steps = Math.max(1, Math.round(ms / 100));
  const start0 = await page.evaluate(([moves, kicker, to, ms]) => {
    const g = window.__game, b = g.village.places.village.balls[0];
    if (kicker) g.village.remotes.get(kicker)?.kick?.(0.8);
    if (to) {
      const dx = to[0] - b.position.x, dz = to[1] - b.position.z, d = Math.hypot(dx, dz), T = ms / 1000;
      const v0 = d * Math.log(1 / 0.35) / (1 - Math.pow(0.35, T));
      b.setState({ x: b.position.x, z: b.position.z, vx: dx / d * v0, vz: dz / d * v0 });
    }
    const start = {}; for (const id of Object.keys(moves)) { const c = g.village.remotes.get(id); start[id] = [c.group.position.x, c.group.position.z]; }
    return start;
  }, [moves, kicker, to, ms]);
  for (let i = 1; i <= steps; i++) {
    const k = i / steps;
    await page.evaluate(([moves, start, k]) => {
      const states = [];
      for (const [id, [x, z]] of Object.entries(moves)) {
        const [sx, sz] = start[id];
        states.push({ id, x: sx + (x - sx) * k, z: sz + (z - sz) * k, rot: Math.atan2(x - sx, z - sz), moving: k < 1 });
      }
      if (states.length) window.__game.village.remotes.setStates(states);
    }, [moves, start0, k]);
    await kit.sleep(100);
  }
  if (to && stop) await page.evaluate(() => { const b = window.__game.village.places.village.balls[0]; b.setState({ x: b.position.x, z: b.position.z }); });
};

/**
 * The giant chess on the square (VillageSquare.js CHESS: 8 × 1.1 m squares around (−15, 15), white at the
 * south edge): two players face each other at it, two friends watch from İsmail Dede's bench on the east
 * side. The board follows a short game (the scholar's mate) through ChessGame's own server state, so the
 * pieces slide as in the game. `MATE[i]`: { from, to, fen } after move i.
 */
const MATE = [
  { from: 'e2', to: 'e4', fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1' },
  { from: 'e7', to: 'e5', fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2' },
  { from: 'f1', to: 'c4', fen: 'rnbqkbnr/pppp1ppp/8/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR b KQkq - 1 2' },
  { from: 'b8', to: 'c6', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 2 3' },
  { from: 'd1', to: 'h5', fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3' },
  { from: 'g8', to: 'f6', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4' },
  { from: 'h5', to: 'f7', fen: 'r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4' },
];
const board = (page, i, over = false) => page.evaluate(([m, over]) => {
  window.__game.chess.applyServer({
    v: 1, phase: over ? 'over' : 'playing', fen: m ? m.fen : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', last: m ? { from: m.from, to: m.to } : null,
    seats: { w: { id: 'p1', name: 'Ahmet' }, b: { id: 'p2', name: 'Omar' } }, queue: [], scores: [], clocks: null, timed: false, draw: { offer: null, declined: null },
    result: over ? { winner: 'w', reason: 'checkmate' } : null,
  });
}, [i < 0 ? null : MATE[i], over]);
const chessScene = async (kit, { upTo = -1, cam, look }) => {
  const page = await start(kit);
  await page.evaluate(() => {
    const g = window.__game, loc = g.world.get('village');
    g.cast.dismiss?.('ismail'); // (the bench is the friends' today)
    g.player.position.set(-15, 0, 20.5); g.player.group.rotation.y = Math.PI; // white, at the south edge, facing the board
    const add = (id, name, outfit, key, x, z, rot, sit = false) => { const [gender, style] = key.split('-'); g.village.remotes.add(loc, { id, name, look: { outfit, gender, style }, x, z, rot, sit }); };
    add('p2', 'Omar', 'sweater', 'boy-strong', -15, 9.5, 0);
    add('w1', 'Yusuf', 'jersey', 'boy-modest', -8.6, 16.7, -Math.PI / 2, true);
    add('w2', 'Mariam', 'casual', 'girl-covered', -8.6, 18.3, -Math.PI / 2, true);
  });
  await board(page, upTo);
  await kit.sleep(1800);
  await fixed(page, cam, look, true);
  await kit.sleep(600);
  return page;
};
const speak = (page, who, tr, ar) => page.evaluate(([who, tr, ar]) => { const g = window.__game, c = who === 'me' ? g.player : g.village.remotes.get(who); g.labels.bubble(c, tr, null, 2.6, ar); }, [who, tr, ar]);

export const EPISODES = {
  // 0 · a hook for Arabic speakers: the flag, "do you have to watch silly series to learn Turkish?", then the garden tasks from far away
  garden: {
    scenes: [
      {
        name: 'gFlag', seconds: 4.6,
        setup: async (kit) => { const page = await kit.open(); await page.evaluate(() => document.querySelector('.main-menu')?.classList.remove('open')); await kit.sleep(2000); return page; },
        act: async (kit, page) => {
          const q = { tr: 'Türkçe öğrenmek için saçma dizileri izlemek zorunda mısın?', en: 'Do you have to watch silly TV series to learn Turkish?', ar: 'هل يجب أن تشاهد مسلسلات سخيفة لتتعلّم التركية؟' };
          await kit.card(page, `${FLAG}<h1 dir="auto" style="margin-top:24px;font-size:46px;line-height:1.5">${q[kit.lang] ?? q.tr}</h1>${kit.lang === 'tr' ? '' : `<p dir="auto" style="font-size:28px;opacity:.85">${q.tr}</p>`}`);
        },
      },
      {
        name: 'gWide', seconds: 3.2,
        setup: async (kit) => garden(kit, 'bucket', [3.5, 10, 7], [3.5, 0, -6.5], [4.2, -8.6], [6.3, -10.5]),
        act: async (kit, page) => { await kit.big(page, { tr: 'Oynayarak Türkçe öğren', en: 'Learn Turkish while you play', ar: 'تعلّم التركية وأنت تلعب' }); },
      },
      {
        name: 'gBucket', seconds: 3.4,
        setup: async (kit) => garden(kit, 'bucket', [9.0, 6.5, -1.6], [6.3, 0.4, -10.0], [7.3, -9.1], [6.3, -10.5]),
        act: async (kit, page) => {
          await kit.big(page, { tr: 'Kovayı bul', en: 'Find the bucket', ar: 'ابحث عن الدلو' });
          await kit.sleep(500); await showToasts(page); await showLabels(page);
          await page.evaluate(() => { const g = window.__game; g.items.pick(g.items.get('kova')); });
        },
      },
      {
        name: 'gDede', seconds: 3.4,
        setup: async (kit) => garden(kit, 'bucket', [5.8, 6.5, 9.0], [8.6, 0.5, 0.4], [7.7, 1.0], [9, 0.2], ['kova']),
        act: async (kit, page) => {
          await kit.big(page, { tr: 'Dedene götür', en: 'Take it to grandpa', ar: 'خذه إلى جدّك' });
          await kit.sleep(500); await showToasts(page); await showLabels(page);
          await bubble(page, 'dede', 'Aferin evladım!', 'أحسنت يا بنيّ!');
          await kit.sleep(500);
          await page.evaluate(() => window.__game.story.complete('bucket'));
        },
      },
      {
        name: 'gWrench', seconds: 3.4,
        setup: async (kit) => garden(kit, 'wrench', [-4.6, 6.5, 3.6], [-7.6, 0.5, -3.8], [-6.3, -2.6], [-7.6, -3.7]),
        act: async (kit, page) => {
          await kit.big(page, { tr: 'Anahtarı bul', en: 'Find the wrench', ar: 'ابحث عن المفتاح' });
          await kit.sleep(500); await showToasts(page); await showLabels(page);
          await page.evaluate(() => { const g = window.__game; g.items.pick(g.items.get('anahtar')); });
        },
      },
      {
        name: 'gBaba', seconds: 3.4,
        setup: async (kit) => garden(kit, 'wrench', [-4.2, 6.5, 14.8], [-8.2, 0.7, 7.0], [-7.2, 5.6], [-8.2, 7.0], ['anahtar']),
        act: async (kit, page) => {
          await kit.big(page, { tr: 'Babana götür', en: 'Take it to dad', ar: 'خذه إلى أبيك' });
          await kit.sleep(500); await showToasts(page); await showLabels(page);
          await bubble(page, 'baba', 'Eline sağlık!', 'سلمت يداك!');
          await kit.sleep(500);
          await page.evaluate(() => window.__game.story.complete('wrench'));
        },
      },
      {
        name: 'gTomato', seconds: 4.2,
        setup: async (kit) => garden(kit, 'tomatoes', [9.0, 8.0, 4.6], [9, 0.2, -2.2], [9.0, -1.9], [9.0, -4]),
        act: async (kit, page) => {
          await kit.big(page, { tr: 'Bahçeden domates topla', en: 'Pick tomatoes in the garden', ar: 'اقطف الطماطم من الحديقة' });
          await kit.sleep(400); await showToasts(page); await showLabels(page);
          for (const id of ['domates0', 'domates1', 'domates2']) { await page.evaluate((id) => { const g = window.__game; g.items.pick(g.items.get(id)); }, id); await kit.sleep(900); }
        },
      },
      endCard('gEnd'),
    ],
    vo: {
      tr: ['Türkçe öğrenmek için saçma dizileri izlemek zorunda mısın?', 'Oynayarak öğren.', 'Kovayı bul,', 'dedene götür.', 'Anahtarı bul,', 'babana götür.', 'Bahçeden domates topla.', 'Türk Ailem, Google Play’de ücretsiz.'],
      en: ['Do you have to watch silly series to learn Turkish?', 'Learn while you play.', 'Find the bucket,', 'take it to grandpa.', 'Find the wrench,', 'take it to dad.', 'Pick tomatoes in the garden.', 'My Turkish Family, free on Google Play.'],
      ar: ['هل يجب أن تشاهد مسلسلات سخيفة لتتعلّم التركية؟', 'تعلّم وأنت تلعب.', 'ابحث عن الدلو،', 'وخذه إلى جدّك.', 'ابحث عن المفتاح،', 'وخذه إلى أبيك.', 'اقطف الطماطم من الحديقة.', 'عائلتي التركية، مجانًا على Google Play.'],
    },
  },
  // 0b · the new garden: hoe, sow, water, watch it grow, harvest and sell (Turkish words under the captions)
  ekim: {
    scenes: [
      {
        name: 'kHook', seconds: 3.8,
        setup: async (kit) => farm(kit, { dede: true, at: [8.3, 1.5], face: [9, 0.2], cam: [8.7, 2.9, 6.6], look: [8.7, 1.7, 0.9],
          beds: [{ crop: 'tomato', grown: 1 }, { crop: 'pepper', grown: 1 }, { crop: 'bean', grown: 1 }, { crop: 'bean', grown: 0.6 }, { crop: 'tomato', grown: 0.7 }, { crop: 'pepper', grown: 0.5 }, { crop: 'tomato', grown: 0.3 }, { crop: 'bean', grown: 0.2 }, { crop: 'pepper', grown: 0.25 }] }),
        act: async (kit, page) => {
          await kit.caption(page, 'Dede sana ekmeyi öğretiyor', 'جدّك يعلّمك الزراعة… بالتركية!');
          await kit.sleep(400); await showLabels(page);
          await bubble(page, 'dede', 'Gel evladım, beraber ekelim!', 'تعال يا بنيّ، لنزرع معًا!');
        },
      },
      {
        name: 'kHoe', seconds: 4.0,
        setup: async (kit) => farm(kit, { at: [8.08, 1.75], face: [8.08, 3.5], cam: [8.1, 3.3, 5.3], look: [8.1, 0.55, 1.9] }),
        act: async (kit, page) => { await kit.caption(page, 'Toprağı çapala', 'احرث التربة'); await work(page, kit, 'hoe', [0, 1]); },
      },
      {
        name: 'kSow', seconds: 3.8,
        setup: async (kit) => farm(kit, { at: [8.08, 1.75], face: [8.08, 3.5], cam: [8.1, 3.3, 5.3], look: [8.1, 0.55, 1.9], beds: [{ hoed: true }, { hoed: true }] }),
        act: async (kit, page) => { await kit.caption(page, 'Tohum ek', 'ازرع البذور'); await work(page, kit, 'sow', [0, 1]); },
      },
      {
        name: 'kWater', seconds: 3.8,
        setup: async (kit) => farm(kit, { at: [8.08, 1.75], face: [8.08, 3.5], cam: [8.1, 3.3, 5.3], look: [8.1, 0.55, 1.9], beds: [{ crop: 'bean', grown: null }, { crop: 'bean', grown: null }] }),
        act: async (kit, page) => { await kit.caption(page, 'Sula', 'اسقِ النباتات'); await work(page, kit, 'water', [0, 1]); },
      },
      {
        name: 'kGrow', seconds: 4.4,
        setup: async (kit) => farm(kit, { at: [12.2, 6.6], face: [9, 4], cam: [9.0, 5.2, 10.2], look: [9.0, 0.3, 3.9],
          beds: [...Array(3).fill({ crop: 'bean', grown: 0 }), ...Array(3).fill({ crop: 'tomato', grown: 0 }), ...Array(3).fill({ crop: 'pepper', grown: 0 })] }),
        act: async (kit, page) => {
          await kit.caption(page, 'Filiz, yaprak, ürün', 'شاهدها تكبر!');
          for (let k = 1; k <= 16; k++) {
            await page.evaluate(([prog, MIN]) => {
              const G = window.__game.garden, now = Date.now();
              G.data.plots.forEach((p) => { if (p.crop) p.wateredAt = now - prog * MIN[p.crop] * 60000; });
              G.refresh();
            }, [Math.min(1, k / 14), GROW_MIN]);
            await kit.sleep(240);
          }
        },
      },
      {
        name: 'kHarvest', seconds: 4.0,
        setup: async (kit) => farm(kit, { at: [8.08, 3.35], face: [8.08, 4.6], cam: [8.1, 2.8, 8.6], look: [8.1, 0.6, 3.8],
          beds: [{ crop: 'bean', grown: 1 }, { crop: 'bean', grown: 1 }, { crop: 'bean', grown: 1 }, { crop: 'tomato', grown: 1 }, { crop: 'tomato', grown: 1 }, { crop: 'tomato', grown: 1 }, { crop: 'pepper', grown: 1 }, { crop: 'pepper', grown: 1 }, { crop: 'pepper', grown: 1 }] }),
        act: async (kit, page) => {
          await kit.caption(page, 'Hasat et', 'احصد محصولك');
          await kit.sleep(500);
          for (const i of [3, 4]) { await page.evaluate((i) => window.__game.gardenWalk.apply(i, 'harvest'), i); await kit.sleep(1000); }
          await showLabels(page);
          await page.evaluate(() => { const g = window.__game; g.labels.bubble(g.player, 'Domatesler hazır!', null, 2.5, 'الطماطم جاهزة!'); });
        },
      },
      {
        name: 'kSell', seconds: 3.8,
        setup: async (kit) => farm(kit, { at: [12.3, 4.7], face: [13, 4.15], cam: [10.6, 2.7, 8.4], look: [12.6, 0.6, 4.2], basket: { tomato: 4, pepper: 2 },
          beds: [{ crop: 'bean', grown: 0.4 }, { crop: 'bean', grown: 0.4 }, { crop: 'bean', grown: 0.4 }, { hoed: true }, { hoed: true }, { crop: 'tomato', grown: 0.8 }, { crop: 'pepper', grown: 1 }, { crop: 'pepper', grown: 0.6 }, { crop: 'pepper', grown: 0.3 }] }),
        act: async (kit, page) => {
          await kit.caption(page, 'Sat, yeni tohum al', 'بِع، واشترِ بذورًا جديدة');
          await kit.sleep(700); await showToasts(page);
          await page.evaluate(() => { const g = window.__game, v = g.garden.sell(); g.toasts.show(`Hasadını sattın! +${v} bahçe parası.`, 'بعت محصولك!'); });
        },
      },
      endCard('kEnd'),
    ],
    vo: {
      tr: ['Dede sana Türkçe ekmeyi öğretiyor!', 'Toprağı çapala,', 'tohum ek,', 've sula.', 'Bak, nasıl büyüyor!', 'Sonra hasat et,', 'sat ve yeni tohum al.', 'Türk Ailem, Google Play’de ücretsiz.'],
      en: ['Grandpa teaches you to farm, in Turkish!', 'Hoe the soil,', 'sow the seeds,', 'and water them.', 'Watch them grow!', 'Then harvest,', 'sell, and buy new seeds.', 'My Turkish Family, free on Google Play.'],
      ar: ['جدّك يعلّمك الزراعة… بالتركية!', 'احرث التربة،', 'ازرع البذور،', 'واسقِها بالماء.', 'شاهدها تكبر!', 'ثم احصد محصولك،', 'بِعه، واشترِ بذورًا جديدة.', 'عائلتي التركية، مجانًا على غوغل بلاي.'],
    },
  },
  // 0c · a 3-on-3 on the square, then dama in the kahvehane with Rıfat Amca
  mac: {
    scenes: [
      {
        name: 'mWide', seconds: 4.0,
        setup: async (kit) => pitch(kit, { ball: [30, 33], cam: [31, 4.2, 41.5], look: [34, 0.6, 31],
          team: { me: [33, 31], b1: [29.4, 33.6], b2: [31, 27.5], r1: [36, 33], r2: [37, 28.5], rk: [44.6, 32] } }),
        act: async (kit, page) => {
          await kit.caption(page, 'Halı saha: 3’e 3', 'مباراة كرة قدم: ٣ ضد ٣!');
          await play(page, kit, { kicker: 'b1', to: [31.4, 27.9], ms: 900, moves: { b1: [30.6, 33.4], me: [36.2, 33.2], r1: [33.4, 30.6], r2: [34, 28.4] } });
          await play(page, kit, { to: [33.6, 27.7], ms: 700, stop: false, moves: { b2: [33.1, 27.7], me: [37.8, 32.6], r1: [32.6, 29.2], b1: [33.5, 35.4] } });
          await play(page, kit, { kicker: 'b2', to: [37.4, 32.3], ms: 900, moves: { b2: [34.6, 27.2], r2: [36.4, 30.2], rk: [44.4, 32.6], b1: [36, 35.8] } });
        },
      },
      {
        name: 'mGoal', seconds: 4.4,
        setup: async (kit) => pitch(kit, { ball: [38.8, 31.5], cam: [35.2, 2.3, 30.4], look: [45.5, 0.6, 32.2],
          team: { me: [38, 31.5], b1: [35.4, 34.2], b2: [35, 28.6], r1: [41.2, 34.8], r2: [42.2, 28.4], rk: [44.6, 32] } }),
        act: async (kit, page) => {
          await kit.caption(page, 'Şut… GOL!', 'سدّد… هدف!');
          await play(page, kit, { to: [41, 31.6], ms: 700, stop: false, moves: { me: [40.4, 31.6], r1: [41.3, 33.2], r2: [41.8, 30], b1: [37.6, 34.4] } });
          await play(page, kit, { kicker: 'me', to: [46.9, 33.7], ms: 500, stop: false, moves: { rk: [44.6, 30.4], me: [41.2, 31.6] } });
          await showLabels(page);
          await page.evaluate(() => { const g = window.__game, r = g.village.remotes; g.labels.bubble(r.get('me'), 'Gooool!', null, 2.5, 'هدف!'); g.labels.bubble(r.get('b2'), 'Harikasın!', null, 2.5, 'أنت رائع!'); g.world.get('village').writeScore?.(1, 0); });
          await play(page, kit, { moves: { b1: [41, 33], b2: [40.6, 30.4], me: [42.4, 31.8] }, ms: 1500 });
        },
      },
      {
        name: 'mDama', seconds: 4.6,
        setup: async (kit) => {
          const page = await start(kit);
          await page.evaluate(() => { const g = window.__game, a = g.world.get('village').anchors.get('kahve1'); g.player.position.set(a.x + 0.8, 0, a.z + 0.8); });
          await kit.sleep(400);
          await page.evaluate(() => window.__game.dama.playRifat());
          await kit.sleep(2200);
          return page;
        },
        act: async (kit, page) => {
          await kit.caption(page, 'Sonra kahvede dama', 'ثم إلى المقهى… لعبة الداما!');
          await kit.sleep(900);
          await page.click('.dama.open .dama-board .cell.can').catch(() => {}); await kit.sleep(300);
          await page.click('.dama.open .dama-board .cell.to').catch(() => {});
          await kit.sleep(1500);
          await showLabels(page);
          await page.evaluate(() => { const g = window.__game; g.labels.bubble(g.cast.get('rifat'), 'Aferin, iyi hamle!', null, 2.5, 'أحسنت، نقلة جيدة!'); });
        },
      },
      endCard('mEnd'),
    ],
    vo: {
      tr: ['Köy meydanında halı saha: üçe üç!', 'Şut… ve gol!', 'Maçtan sonra kahvede dama.', 'Türk Ailem, Google Play’de ücretsiz.'],
      en: ['A three-on-three on the village pitch!', 'Shoot… goal!', 'Then dama at the café.', 'My Turkish Family, free on Google Play.'],
      ar: ['مباراة ثلاثة ضد ثلاثة في ساحة القرية!', 'سدّد… هدف!', 'ثم لعبة الداما في المقهى.', 'عائلتي التركية، مجانًا على غوغل بلاي.'],
    },
  },
  // 0d · giant chess on the square: two players face to face, two friends watch from the bench, then mate
  satranc: {
    scenes: [
      {
        name: 'cWide', seconds: 4.2,
        setup: async (kit) => chessScene(kit, { cam: [-23.5, 6.8, 26], look: [-12.5, 0, 14] }),
        act: async (kit, page) => {
          await kit.caption(page, 'Köy meydanında dev satranç', 'شطرنج عملاق في ساحة القرية!');
          await kit.sleep(500); await board(page, 0);
          await kit.sleep(1300); await board(page, 1);
        },
      },
      {
        name: 'cMoves', seconds: 4.6,
        setup: async (kit) => chessScene(kit, { upTo: 1, cam: [-15.9, 3.3, 24.6], look: [-15, 0.4, 13.5] }),
        act: async (kit, page) => {
          await kit.caption(page, 'Fil, at, vezir: taşların Türkçesi', 'تعلّم أسماء القطع بالتركية');
          await showLabels(page);
          await board(page, 2); await speak(page, 'me', 'Fil c4’e!', 'الفيل إلى c4!');
          await kit.sleep(1300); await board(page, 3); await speak(page, 'p2', 'At c6’ya.', 'الحصان إلى c6.');
          await kit.sleep(1300); await board(page, 4); await speak(page, 'me', 'Vezir h5’e!', 'الوزير إلى h5!');
        },
      },
      {
        name: 'cMate', seconds: 4.4,
        setup: async (kit) => chessScene(kit, { upTo: 5, cam: [-5.6, 2.4, 21.2], look: [-12.6, 0.8, 15.2] }),
        act: async (kit, page) => {
          await kit.caption(page, 'Şah mat!', 'كش مات!');
          await showLabels(page);
          await kit.sleep(400); await board(page, 6, true); await speak(page, 'me', 'Şah mat!', 'كش مات!');
          await kit.sleep(1100); await speak(page, 'w1', 'Bravo!', 'برافو!');
          await kit.sleep(700); await speak(page, 'w2', 'Harika oyun!', 'لعبة رائعة!');
        },
      },
      endCard('cEnd'),
    ],
    vo: {
      tr: ['Köy meydanında dev satranç!', 'Fil, at, vezir: taşların Türkçesini oynayarak öğren.', 'Şah mat!', 'Türk Ailem, Google Play’de ücretsiz.'],
      en: ['Giant chess on the village square!', 'Bishop, knight, queen: learn the Turkish names as you play.', 'Checkmate!', 'My Turkish Family, free on Google Play.'],
      ar: ['شطرنج عملاق في ساحة القرية!', 'الفيل، الحصان، الوزير… تعلّم أسماءها بالتركية وأنت تلعب.', 'كش مات!', 'عائلتي التركية، مجانًا على غوغل بلاي.'],
    },
  },
  // 0e · the 3-on-3 again, the goal first (the first second decides whether a Short is watched)
  mac2: {
    scenes: [
      {
        name: 'n2Goal', seconds: 3.2,
        setup: async (kit) => pitch(kit, { ball: [39.2, 31.5], cam: [35.3, 2.4, 30.5], look: [45.5, 0.6, 32.2],
          team: { me: [38.6, 31.5], b1: [36.4, 34], b2: [36, 29], r1: [41.4, 34.2], r2: [42.2, 28.8], rk: [44.6, 32] } }),
        act: async (kit, page) => {
          await kit.caption(page, 'GOOOL!', 'هدف!!!');
          await play(page, kit, { to: [40.4, 31.6], ms: 400, stop: false, moves: { me: [39.9, 31.6], r1: [41.2, 33.2], r2: [41.8, 30.2] } });
          await play(page, kit, { kicker: 'me', to: [46.9, 33.7], ms: 500, stop: false, moves: { rk: [44.6, 30.4] } });
          await showLabels(page);
          await page.evaluate(() => { const g = window.__game, r = g.village.remotes; g.labels.bubble(r.get('me'), 'Gooool!', null, 2.2, 'هدف!'); g.labels.bubble(r.get('b2'), 'Harikasın!', null, 2.2, 'أنت رائع!'); g.world.get('village').writeScore?.(1, 0); });
          await play(page, kit, { moves: { b1: [40.6, 33.2], b2: [40.2, 30.4], me: [41.6, 31.8] }, ms: 1300 });
        },
      },
      {
        name: 'n2Pass', seconds: 3.6,
        setup: async (kit) => pitch(kit, { ball: [30, 33], cam: [31, 4.0, 40.5], look: [34, 0.6, 31],
          team: { me: [33, 31], b1: [29.4, 33.6], b2: [31, 27.5], r1: [36, 33], r2: [37, 28.5], rk: [44.6, 32] } }),
        act: async (kit, page) => {
          await kit.caption(page, 'Dünyadan oyuncularla 3’e 3', 'مباراة ٣ ضد ٣… مع لاعبين من كل العالم');
          await play(page, kit, { kicker: 'b1', to: [31.4, 27.9], ms: 800, moves: { b1: [30.6, 33.4], me: [36.2, 33.2], r1: [33.4, 30.6], r2: [34, 28.4] } });
          await play(page, kit, { to: [33.6, 27.7], ms: 600, stop: false, moves: { b2: [33.1, 27.7], me: [37.8, 32.6], r1: [32.6, 29.2], b1: [33.5, 35.4] } });
          await play(page, kit, { kicker: 'b2', to: [37.4, 32.3], ms: 800, moves: { b2: [34.6, 27.2], r2: [36.4, 30.2], b1: [36, 35.8] } });
        },
      },
      {
        name: 'n2Dama', seconds: 3.8,
        setup: async (kit) => {
          const page = await start(kit);
          await page.evaluate(() => { const g = window.__game, a = g.world.get('village').anchors.get('kahve1'); g.player.position.set(a.x + 0.8, 0, a.z + 0.8); });
          await kit.sleep(400);
          await page.evaluate(() => window.__game.dama.playRifat());
          await kit.sleep(2200);
          return page;
        },
        act: async (kit, page) => {
          await kit.caption(page, 'Sonra çay ve dama', 'ثم شاي وداما في المقهى ☕');
          await kit.sleep(500);
          await page.click('.dama.open .dama-board .cell.can').catch(() => {}); await kit.sleep(300);
          await page.click('.dama.open .dama-board .cell.to').catch(() => {});
          await kit.sleep(1200);
          await showLabels(page);
          await page.evaluate(() => { const g = window.__game; g.labels.bubble(g.cast.get('rifat'), 'Aferin, iyi hamle!', null, 2.2, 'أحسنت، نقلة جيدة!'); });
        },
      },
      endCard('n2End'),
    ],
    vo: {
      tr: ['Gooool!', 'Dünyadan oyuncularla üçe üç!', 'Sonra çay ve dama.', 'Türk Ailem, Google Play’de ücretsiz.'],
      en: ['Goooal!', 'Three-on-three with players from all over the world!', 'Then tea and dama.', 'My Turkish Family, free on Google Play.'],
      ar: ['هدف!!!', 'مباراة ثلاثة ضد ثلاثة… مع لاعبين من كل العالم!', 'ثم شاي وداما في المقهى.', 'عائلتي التركية، مجانًا على غوغل بلاي.'],
    },
  },
  // 0f · the giant chess again, the mate first
  satranc2: {
    scenes: [
      {
        name: 't2Mate', seconds: 3.4,
        setup: async (kit) => chessScene(kit, { upTo: 5, cam: [-6.2, 2.2, 20.6], look: [-12.8, 0.9, 15.4] }),
        act: async (kit, page) => {
          await kit.caption(page, 'Şah mat!', 'كش مات!');
          await showLabels(page);
          await kit.sleep(200); await board(page, 6); // (not 'over': the result card would cover the board) await speak(page, 'me', 'Şah mat!', 'كش مات!');
          await kit.sleep(800); await speak(page, 'w1', 'Bravo!', 'برافو!');
          await kit.sleep(600); await speak(page, 'w2', 'Harika oyun!', 'لعبة رائعة!');
        },
      },
      {
        name: 't2Moves', seconds: 3.8,
        setup: async (kit) => chessScene(kit, { upTo: 1, cam: [-15.9, 3.1, 24.2], look: [-15, 0.4, 13.5] }),
        act: async (kit, page) => {
          await kit.caption(page, 'Fil, at, vezir: taşların Türkçesi', 'تعلّم أسماء القطع بالتركية');
          await showLabels(page);
          await board(page, 2); await speak(page, 'me', 'Fil c4’e!', 'الفيل إلى c4!');
          await kit.sleep(1100); await board(page, 3); await speak(page, 'p2', 'At c6’ya.', 'الحصان إلى c6.');
          await kit.sleep(1100); await board(page, 4); await speak(page, 'me', 'Vezir h5’e!', 'الوزير إلى h5!');
        },
      },
      {
        name: 't2Wide', seconds: 3.0,
        setup: async (kit) => chessScene(kit, { upTo: 6, cam: [-23.5, 6.8, 26], look: [-12.5, 0, 14] }),
        act: async (kit, page) => { await kit.caption(page, 'Köy meydanında dev satranç', 'شطرنج عملاق في ساحة القرية!'); },
      },
      endCard('t2End'),
    ],
    vo: {
      tr: ['Şah mat!', 'Fil, at, vezir: Türkçesini oynayarak öğren!', 'Köy meydanında dev satranç!', 'Türk Ailem, Google Play’de ücretsiz.'],
      en: ['Checkmate!', 'Bishop, knight, queen: learn them in Turkish as you play!', 'Giant chess on the village square!', 'My Turkish Family, free on Google Play.'],
      ar: ['كش مات!', 'الفيل، الحصان، الوزير… تعلّمها بالتركية!', 'شطرنج عملاق في ساحة القرية!', 'عائلتي التركية، مجانًا على غوغل بلاي.'],
    },
  },
  // 1 · the park: the slide, the swings, the children to make friends with
  park: {
    scenes: [
      {
        name: 'pWide', seconds: 4.4,
        setup: async (kit) => {
          const page = await start(kit);
          await page.evaluate(() => { window.__game.player.position.set(-38, 0, 23); });
          await fixed(page, [-29, 9, 31], [-39, 0.5, 18.5]);
          await kit.sleep(1200);
          return page;
        },
        act: async (kit, page) => {
          await kit.big(page, { tr: 'Köy meydanında çocuklar için bir park var', en: 'There’s a park in the village square', ar: 'في ساحة القرية حديقة للأطفال' });
          await fixed(page, [-31, 6, 28.5], [-39, 0.6, 18.5]); // the camera glides in
        },
      },
      {
        name: 'pSwing', seconds: 4.2,
        setup: async (kit) => {
          const page = await start(kit);
          await page.evaluate(() => window.__game.parkPlay.swing());
          await fixed(page, [SWING[0] + 1.2, 1.9, SWING[1] + 5.6], [SWING[0], 1.15, SWING[1]]);
          await kit.sleep(1500);
          return page;
        },
        act: async (kit, page) => { await kit.big(page, { tr: 'Salıncakta sallan', en: 'Swing on the swings', ar: 'تأرجح على الأرجوحة' }); },
      },
      {
        name: 'pFriends', seconds: 4.4,
        setup: async (kit) => {
          const page = await start(kit);
          await page.evaluate(() => { const g = window.__game, e = g.cast.get('emre'); g.player.position.set(e.position.x + 1.1, 0, e.position.z + 1.2); g.camera.snap(g.player.position, false); });
          await kit.sleep(800);
          await hdFriends(page);
          await kit.sleep(1500);
          return page;
        },
        act: async (kit, page) => {
          await kit.big(page, { tr: 'Çocuklarla tanış, arkadaş edin', en: 'Meet the children, make friends', ar: 'تعرّف على الأطفال وكوّن صداقات' });
          await page.evaluate(() => window.__game.dialogue.open('emre')); // "Hey! Ben Emre. Kovalamaca oynuyoruz. Sen de oynar mısın?"
        },
      },
      endCard('pEnd'),
    ],
    vo: {
      tr: ['Köy meydanında çocuklar için bir park var.', 'Salıncakta sallan,', 've yeni arkadaşlar edin.', 'Türk Ailem. Google Play’de ücretsiz.'],
      en: ['There’s a park in the village square.', 'Swing on the swings,', 'and make new friends.', 'My Turkish Family. Free on Google Play.'],
      ar: ['في ساحة القرية حديقة للأطفال.', 'وتأرجح على الأرجوحة،', 'وكوّن أصدقاء جددًا.', 'عائلتي التركية. مجانًا على غوغل بلاي.'],
    },
  },

  // 2 · speaking: the game listens, the story goes on, a wrong answer gets a hint, talking to friends in the square
  speak: {
    scenes: [
      {
        name: 'sMom', seconds: 4.4,
        setup: async (kit) => {
          const page = await start(kit);
          await page.evaluate(() => window.__game.travel.place('house', 'start', { force: true }));
          await kit.sleep(800);
          await page.evaluate(() => { const g = window.__game, a = g.cast.get('anne'); g.player.position.set(a.position.x - 1.1, 0, a.position.z + 1.3); g.camera.snap(g.player.position, true); });
          await kit.sleep(1200);
          return page;
        },
        act: async (kit, page) => {
          await kit.big(page, { tr: 'Mikrofona söyler, oyun onu anlar', en: 'Say it out loud — the game understands', ar: 'قلها بصوت عالٍ… واللعبة تفهمك' });
          await page.evaluate(() => window.__game.dialogue.open('anne', 'br1')); // "Kahvaltı nasıldı?" → "Çok güzeldi, eline sağlık anne!"
          await kit.sleep(1300);
          await page.click('#dlg .mic').catch(() => {});
        },
      },
      {
        name: 'sDede', seconds: 4.2,
        setup: async (kit) => {
          const page = await start(kit);
          await page.evaluate(() => { const g = window.__game; g.cast.move('dede', 'yard', 'garden', 'garden'); g.travel.place('yard', 'houseDoor', { force: true }); });
          await kit.sleep(1000);
          await page.evaluate(() => { const g = window.__game, d = g.cast.get('dede'); g.player.position.set(d.position.x + 1.2, 0, d.position.z + 1.3); g.camera.snap(g.player.position, false); });
          await kit.sleep(1200);
          return page;
        },
        act: async (kit, page) => {
          await kit.big(page, { tr: 'Doğru söyleyince hikâye ilerler', en: 'Say it right and the story goes on', ar: 'قلها صحيحة… وتستمر القصة' });
          await page.evaluate(() => window.__game.dialogue.open('dede', 'br3')); // "Getirdin mi? Ver bakalım." → "Buyurun dede."
          await kit.sleep(1200);
          await page.click('#dlg .mic').catch(() => {});
        },
      },
      {
        name: 'sHint', seconds: 4.2,
        setup: async (kit) => {
          const page = await start(kit);
          await page.evaluate(() => window.__game.travel.place('house', 'start', { force: true }));
          await kit.sleep(800);
          await page.evaluate(() => { const g = window.__game, a = g.cast.get('anne'); g.player.position.set(a.position.x - 1.1, 0, a.position.z + 1.3); g.camera.snap(g.player.position, true); });
          await kit.sleep(1200);
          return page;
        },
        act: async (kit, page) => {
          await kit.big(page, { tr: 'Yanılırsa ipucu gelir', en: 'Get it wrong? A hint helps', ar: 'أخطأت؟ يأتيك تلميح' });
          await page.evaluate(() => window.__game.dialogue.open('anne', 'quiz')); // "Söyle bakalım: Montun nerede?"
          await kit.sleep(1300);
          await page.evaluate(() => [...document.querySelectorAll('#dlg .choice')].find((b) => b.textContent.includes('yanına.'))?.click()); // the wrong one: the hint (-da / -de)
          await kit.sleep(2300);
          await page.evaluate(() => [...document.querySelectorAll('#dlg .choice')].find((b) => b.textContent.includes('yanında.'))?.click());
        },
      },
      {
        name: 'sFriends', seconds: 4.4,
        setup: async (kit) => {
          const page = await start(kit);
          // in front of the swings, facing Defne on hers
          await page.evaluate(([x, z]) => { const g = window.__game; g.player.position.set(x - 1.3, 0, z + 1.6); g.player.group.rotation.y = Math.PI * 0.85; }, SWING);
          await fixed(page, [SWING[0] + 0.7, 1.7, SWING[1] + 7.2], [SWING[0] - 0.9, 2.1, SWING[1] + 0.6]); // the heads below the middle: the bubbles in the middle, clear of the caption
          await hdFriends(page, ['defne']);
          await showLabels(page);
          await kit.sleep(1200);
          return page;
        },
        act: async (kit, page) => {
          await kit.big(page, { tr: 'Arkadaşlarıyla konuşur', en: 'Talks with friends', ar: 'يتحدّث مع أصدقائه' });
          await kit.sleep(500);
          await page.evaluate(() => { const g = window.__game; g.labels.bubble(g.player, 'Merhaba! Birlikte oynayalım mı?', null, 4, 'Hi! Shall we play together?'); });
          await kit.sleep(1600);
          await page.evaluate(() => { const g = window.__game; g.labels.bubble(g.cast.get('defne'), 'Olur! Hadi gel!', null, 3, 'Sure! Come on!'); });
        },
      },
      endCard('sEnd'),
    ],
    vo: {
      tr: ['Sesli konuşur, oyun onu anlar.', 'Doğru söyleyince hikâye ilerler.', 'Yanılırsa ipucu gelir.', 'Arkadaşlarıyla konuşur.', 'Türk Ailem. Google Play’de ücretsiz.'],
      en: ['They speak out loud, and the game understands.', 'Say it right, and the story goes on.', 'Get it wrong, and a hint helps.', 'And they talk with their friends.', 'My Turkish Family. Free on Google Play.'],
      ar: ['يتكلّم بصوت عالٍ، واللعبة تفهمه.', 'إذا قالها صحيحة تستمر القصة.', 'وإذا أخطأ يأتيه تلميح.', 'ويتحدّث مع أصدقائه.', 'عائلتي التركية. مجانًا على غوغل بلاي.'],
    },
  },
};

/** Real players on the village square (each its own browser, joined through "Meydana gir"): covered, everyday clothes. */
const FRIENDS = [
  { name: 'Leyla', params: '&gender=girl&look=covered', outfit: 'dress' },
  { name: 'Omar', params: '&look=modest', outfit: 'casual' },
  { name: 'Mariam', params: '&gender=girl&look=covered', outfit: 'casual' },
  { name: 'Yusuf', params: '&look=modest', outfit: 'casual' },
  { name: 'Zainab', params: '&gender=girl&look=covered', outfit: 'dress' },
];
const crowd = { pages: {}, me: null };
const join = async (kit, name, { params = '', outfit = null, extra = false } = {}) => {
  const page = await kit.open(params, { extra });
  await page.evaluate(([q, outfit, name]) => {
    const g = window.__game, u = new URLSearchParams(q);
    for (const k of ['gender', 'look']) if (u.get(k)) g.settings.set(k, u.get(k));
    g.settings.set('dataConsent', { v: 99, at: Date.now() }); g.settings.set('villageIntroSeen', true);
    const w = g.wallet; w.add(500, 'promo');
    for (const it of [{ id: 'hd', slot: 'hd' }, { id: `hd-${outfit}`, slot: 'body' }]) { w.buy({ ...it, price: 0 }); w.equip(it); }
    g.shop.onOutfit?.(); g.settings.set('username', name);
  }, [params, outfit, name]);
  await page.evaluate(() => document.querySelector('.menu-main')?.click()); // the new game starts on the square: the village connects by itself
  await kit.sleep(2000);
  for (let i = 0; i < 6; i++) { await page.evaluate(() => document.querySelector('.overlay.story-card.open .btn, .overlay.open .card .btn')?.click()); await kit.sleep(400); }
  await page.waitForFunction(() => window.__game.village.net.connected, null, { timeout: 60000 });
  await kit.sleep(1500); await kit.closeCards(page); await kit.hideHud(page);
  return page;
};
const who = (n) => (n === 'Ben' ? crowd.me : crowd.pages[n]);
const stand = (n, x, z, fx, fz) => who(n).evaluate(([x, z, fx, fz]) => window.__game.player.place({ x, z, rot: Math.atan2(fx - x, fz - z) }), [x, z, fx, fz]);
const say = (n, t) => who(n).evaluate((t) => window.__game.village.say(t), t);

/** Over the child's shoulder at `npc` (the child stands `d` m in front of them): both in the band between the caption and the dialogue panel. */
const overShoulder = (page, npc) => page.evaluate((id) => {
  const g = window.__game, n = g.cast.get(id).position, p = g.player.position, V = n.constructor;
  const d = new V(p.x - n.x, 0, p.z - n.z).normalize(), side = new V(d.z, 0, -d.x);
  g.camera.setFixed(new V(n.x + d.x * 4.3 + side.x * 1.1, 1.75, n.z + d.z * 4.3 + side.z * 1.1), new V(n.x + d.x * 0.4, 0.55, n.z + d.z * 0.4));
}, npc);

EPISODES.tanitim = {
  scenes: [
    {
      name: 'tTask', seconds: 4.2, // a task every day: helping grandpa in the garden, "Görev tamamlandı ✓"
      setup: async (kit) => {
        const page = await start(kit);
        await page.evaluate(() => { const g = window.__game; g.cast.move('dede', 'yard', 'garden', 'garden'); g.travel.place('yard', 'houseDoor', { force: true }); });
        await kit.sleep(1200);
        await page.evaluate(() => { const g = window.__game; g.player.position.set(8.4, 0, 1.6); g.player.group.rotation.y = Math.PI; });
        await kit.sleep(1200);
        return page;
      },
      act: async (kit, page) => {
        // the child next to grandpa, facing the camera; both in the middle of the frame (grandpa may have taken a step in the garden)
        await page.evaluate(() => { const g = window.__game, d = g.cast.get('dede').position, p = g.player.position, V = p.constructor; p.set(d.x + 0.9, 0, d.z + 0.15); g.player.group.rotation.y = 0; const m = new V(d.x + 0.3, 0, d.z); g.camera.setFixed(new V(m.x + 0.3, 1.6, m.z + 4.7), new V(m.x, 0.85, m.z)); }); // (wide enough for grandpa's steps along the row)
        await kit.big(page, { tr: 'Her gün yeni görevler: ailesine yardım eder', en: 'New tasks every day: helping the family', ar: 'كل يوم مهامّ جديدة: يساعد عائلته', ur: 'ہر دن نئے کام: گھر والوں کی مدد کرتا ہے', hi: 'हर दिन नए काम: परिवार की मदद करता है' });
        await kit.sleep(1500);
        await showToasts(page);
        await page.evaluate(() => window.__game.toasts.show('Görev tamamlandı! ✓', 'Quest complete'));
      },
    },
    {
      name: 'tSpeak', seconds: 4.2, // says the answer out loud (the mic), the game understands
      setup: async (kit) => {
        const page = await start(kit);
        await page.evaluate(() => { const g = window.__game; g.travel.place('house', 'start', { force: true }); });
        await kit.sleep(800);
        await page.evaluate(() => { const g = window.__game, a = g.cast.get('anne'); g.player.position.set(a.position.x - 0.8, 0, a.position.z + 1.4); g.camera.snap(g.player.position, true); });
        await kit.sleep(1200);
        return page;
      },
      act: async (kit, page) => {
        await kit.big(page, { tr: 'Sesli konuşur, oyun onu anlar', en: 'Speaks out loud, and the game understands', ar: 'يتكلّم بصوته، واللعبة تفهمه', ur: 'بول کر بات کرتا ہے، اور گیم سمجھتا ہے', hi: 'बोलकर बात करता है, और खेल समझ जाता है' });
        await page.evaluate(() => window.__game.dialogue.open('anne', 'br1')); // "Kahvaltı nasıldı? Beğendin mi?" → "Çok güzeldi, eline sağlık anne!"
        await overShoulder(page, 'anne');
        await kit.sleep(1300);
        await page.click('#dlg .mic').catch(() => {});
      },
    },
    {
      name: 'tOrder', seconds: 5.6,
      setup: async (kit) => {
        const page = await start(kit);
        await page.evaluate(() => window.__game.travel.go('village', 'yardRoad'));
        await kit.sleep(3000);
        // close in front of the stall: the greengrocer (facing south, +z) and the child; the camera over the child's shoulder,
        // both in the band between the caption at the top and the dialogue panel at the bottom
        await page.evaluate(() => { const g = window.__game, n = g.cast.get('manav'); g.player.position.set(n.position.x - 0.5, 0, n.position.z + 1.7); g.player.group.rotation.y = Math.PI; g.camera.snap(g.player.position, false); });
        await kit.sleep(1200);
        return page;
      },
      act: async (kit, page) => {
        await kit.big(page, { tr: 'Cümleleri kurarak Türkçe öğrenir', en: 'Learns Turkish by building sentences', ar: 'يتعلّم التركية ببناء الجمل', ur: 'جملے بنا کر ترکی سیکھتا ہے', hi: 'वाक्य बनाकर तुर्की सीखता है' });
        await page.evaluate(() => window.__game.dialogue.open('manav', 'mv1')); // "Buyur evlat, ne istersin?" → the sentence in tiles
        await overShoulder(page, 'manav');
        await kit.sleep(2000);
        for (const t of ['Bir kilo elma', 've iki kilo', 'patates lütfen.']) { await page.evaluate((t) => [...document.querySelectorAll('#dlg .tile')].find((b) => b.textContent === t && !b.disabled)?.click(), t); await kit.sleep(800); }
      },
    },
    {
      name: 'tSquare', seconds: 5.2,
      setup: async (kit) => {
        for (const f of FRIENDS) crowd.pages[f.name] = await join(kit, f.name, { ...f, extra: true });
        crowd.me = await join(kit, 'Ben', { params: '&look=modest', outfit: 'casual' });
        const all = [...FRIENDS.map((f) => f.name), 'Ben'], r = 1.7, cx = 0.6, cz = 6.4;
        for (const [i, n] of all.entries()) { const a = Math.PI * (0.92 - (0.84 * i) / (all.length - 1)); await stand(n, cx + Math.cos(a) * r, cz - Math.sin(a) * r, cx, cz); }
        await crowd.me.evaluate(([x, y, z, lx, ly, lz]) => { const g = window.__game, V = g.player.position.constructor; g.camera.setFixed(new V(x, y, z), new V(lx, ly, lz)); }, [0.6, 1.45, 9.6, 0.6, 1.05, 5.6]); // low and close: the children fill the frame
        await crowd.me.addStyleTag({ content: '#act,#act-left,#act-more{visibility:hidden!important}' });
        await kit.sleep(2500);
        for (let i = 0; i < 5; i++) { await crowd.me.evaluate(() => document.querySelector('.overlay.story-card.open .btn')?.click()); await kit.sleep(500); } // (the first-game cards come late now)
        await kit.closeCards(crowd.me);
        return crowd.me;
      },
      act: async (kit, page) => {
        await kit.big(page, { tr: 'Meydanda bas, konuş: arkadaşlarıyla Türkçe konuşur', en: 'In the square, push to talk: Turkish with friends', ar: 'في الساحة: اضغط وتكلّم بالتركية مع أصدقائه', ur: 'چوک میں: بٹن دبائیں، دوستوں سے ترکی بولیں', hi: 'चौक में बटन दबाकर दोस्तों से तुर्की में बात करता है' });
        await kit.sleep(500);
        for (const [n, t, w] of [['Mariam', 'Merhaba! Hadi oynayalım!', 1400], ['Yusuf', 'Evet, hadi!', 1100], ['Ben', 'Olur! Ben de geliyorum!', 0]]) { await say(n, t); await kit.sleep(w); }
      },
      cleanup: async () => { for (const p of [crowd.me, ...Object.values(crowd.pages)]) await p.context().close(); },
    },
    // (on the store now, not "soon": the name to search for on Google Play is on the card)
    card('tLogo', 5.4, (e) => `<img src="assets/icons/icon-512.png" alt=""><h1 dir="auto">${e.name}</h1><p dir="auto">${e.now}</p><div class="promo-badges"><span dir="auto">▶ ${e.search}</span><span class="free">${e.free}</span></div>`),
    card('tFollow', 3.8, (e, lang) => `<img src="assets/icons/icon-512.png" alt=""><h1 dir="auto">${(FOLLOW[lang] ?? FOLLOW.tr)[0]}</h1><p dir="auto">${(FOLLOW[lang] ?? FOLLOW.tr)[1]}</p><div class="promo-badges"><span class="free">🔔 ${e.name}</span></div>`),
  ],
  vo: {
    tr: ['Her gün yeni görevler, ailesine yardım eder,', 'sesli konuşur, oyun onu anlar,', 'cümleler kurar,', 'meydanda bas, konuş: arkadaşlarıyla Türkçe konuşur.', 'Türk Ailem, şimdi Google Play’de ücretsiz.', 'Takip et, yeni videoları kaçırma.'],
    en: ['New tasks every day, helping the family,', 'speaking out loud, and the game understands,', 'building sentences,', 'and in the square, push to talk: Turkish with friends.', 'Turkish Family, free on Google Play now.', 'Follow us, and don’t miss the next videos.'],
    ar: ['كل يوم مهامّ جديدة، يساعد عائلته،', 'يتكلّم بصوته، واللعبة تفهمه،', 'يبني الجمل،', 'وفي الساحة: اضغط وتكلّم بالتركية مع أصدقائه.', 'عائلتي التركية، متوفّرة الآن مجانًا على غوغل بلاي.', 'تابعنا ولا تفوّت الفيديوهات القادمة.'],
    ur: ['ہر دن نئے کام، گھر والوں کی مدد کرتا ہے،', 'بول کر بات کرتا ہے، اور گیم اسے سمجھتا ہے،', 'جملے بناتا ہے،', 'اور چوک میں بٹن دبا کر دوستوں سے ترکی بولتا ہے۔', 'میرا ترک خاندان، اب گوگل پلے پر مفت دستیاب ہے۔', 'ہمیں فالو کریں اور اگلی ویڈیوز مت چھوڑیں۔'],
    hi: ['हर दिन नए काम, परिवार की मदद करता है,', 'बोलकर बात करता है, और खेल समझ जाता है,', 'वाक्य बनाता है,', 'और चौक में बटन दबाकर दोस्तों से तुर्की में बात करता है।', 'मेरा तुर्की परिवार, अब Google Play पर मुफ़्त।', 'फ़ॉलो करें, अगले वीडियो न छोड़ें।'],
  },
};

/**
 * The player's own garden seen from far away (a review of the garden look: crops, bursts, ripe sparkle).
 * Not a promo: no end card. record.mjs <dir> --episode=tarla --lang=tr
 */
const tarlaStart = async (kit) => {
  const page = await start(kit);
  await page.evaluate(() => {
    const g = window.__game, f = g.garden.state.flags;
    Object.assign(f, { 'farm-seeds-given': true, 'farm-hoed': true, 'farm-planted': true, 'farm-watered': true });
    g.cast.move('dede', 'yard', 'garden', 'garden'); g.travel.place('yard', 'houseDoor', { force: true });
    g.player.position.set(9.2, 0, 7.4); g.player.group.rotation.y = Math.PI;
  });
  await kit.sleep(1200);
  return page;
};
const TARLA_CAM = [[9.3, 8.2, 15.6], [9.4, 0.2, 3.6]];
const tPlots = (page, spec) => page.evaluate((spec) => {
  const g = window.__game, d = g.garden.data, now = Date.now();
  d.plots.forEach((p, i) => { const s = spec[i] ?? null; Object.assign(p, { hoed: !!s, crop: s?.crop ?? null, plantedAt: s?.crop ? now : null, wateredAt: s?.crop && s.min != null ? now - s.min * 60000 : null }); });
  g.garden.refresh();
}, spec);
const tWork = (page, i, tool, crop) => page.evaluate(([i, tool, crop]) => {
  const g = window.__game, p = g.garden.data.plots[i], grown = p.crop;
  g.player.position.set(9.2, 0, 7.4);
  if (tool === 'sow') g.inventory.add({ bean: 'tohum', tomato: 'domates-tohumu', pepper: 'biber-tohumu', carrot: 'havuc-tohumu', corn: 'misir-tohumu' }[crop], 1);
  g.garden.act(i, tool, crop);
  const col = { bean: 0xA8C653, tomato: 0xE35F40, pepper: 0xE8B83D, carrot: 0xF08A2E, corn: 0xF2C94C }[grown ?? crop];
  g.world.get('yard').markGardenPlot(i, tool, col);
}, [i, tool, crop]);

EPISODES.tarla = {
  scenes: [
    {
      name: 'rWide', seconds: 6,
      setup: async (kit) => { const page = await tarlaStart(kit); await tPlots(page, ['bean', 'tomato', 'pepper', 'carrot', 'corn', 'bean', 'tomato', 'carrot', 'corn'].map((crop, i) => ({ crop, min: [20, 20, 20, 20, 20, 1.2, 2.5, 1.5, 4][i] }))); await fixed(page, ...TARLA_CAM, true); await kit.sleep(900); return page; },
      act: async (kit, page) => { await kit.big(page, { tr: 'Tarla: 5 ürün', en: 'The garden: 5 crops', ar: 'الحقل: ٥ محاصيل' }); await kit.sleep(4500); },
    },
    {
      name: 'rWork', seconds: 9,
      setup: async (kit) => { const page = await tarlaStart(kit); await tPlots(page, []); await fixed(page, ...TARLA_CAM, true); await kit.sleep(900); return page; },
      act: async (kit, page) => {
        await kit.big(page, { tr: 'Çapala, ek, sula', en: 'Hoe, sow, water', ar: 'احفر، ازرع، اسقِ' });
        const crops = ['bean', 'tomato', 'pepper', 'carrot', 'corn'];
        for (let i = 0; i < 5; i++) {
          await tWork(page, i, 'hoe'); await kit.sleep(380);
          await tWork(page, i, 'sow', crops[i]); await kit.sleep(380);
          await tWork(page, i, 'water'); await kit.sleep(500);
        }
        await kit.sleep(600);
      },
    },
    {
      name: 'rHarvest', seconds: 6,
      setup: async (kit) => { const page = await tarlaStart(kit); await tPlots(page, ['tomato', 'carrot', 'corn', 'pepper', 'bean', 'tomato'].map((crop) => ({ crop, min: 30 }))); await fixed(page, ...TARLA_CAM, true); await kit.sleep(900); return page; },
      act: async (kit, page) => {
        await kit.big(page, { tr: 'Olgunlaşınca hasat et', en: 'Harvest when ripe', ar: 'احصد عند النضج' });
        await kit.sleep(900);
        for (let i = 0; i < 6; i++) { await tWork(page, i, 'harvest'); await kit.sleep(650); }
      },
    },
  ],
  vo: { tr: ['Tarla.', 'Çapala, ek, sula.', 'Olgunlaşınca hasat et.'], en: ['The garden.', 'Hoe, sow, water.', 'Harvest when ripe.'], ar: ['الحقل.', 'احفر، ازرع، اسقِ.', 'احصد عند النضج.'] },
};

/** The garden again, cut differently (review video 2): scarecrow shot, harvest from above, planting from a low corner, then growth sped up. */
const tFly = (page, cam, look) => fixed(page, cam, look, true);
EPISODES.hasat = {
  scenes: [
    {
      name: 'hKorkuluk', seconds: 4,
      setup: async (kit) => { const page = await tarlaStart(kit); await tPlots(page, ['pepper', 'carrot', 'corn', 'tomato', 'bean', 'corn', 'carrot', 'tomato', 'pepper'].map((crop) => ({ crop, min: 40 }))); await tFly(page, [17.5, 1.7, 10.2], [10.4, 0.7, 4.3]); await kit.sleep(900); return page; },
      act: async (kit, page) => { await kit.big(page, { tr: 'Korkuluk nöbette', en: 'The scarecrow is on guard', ar: 'الفزّاعة تحرس' }); await kit.sleep(3000); },
    },
    {
      name: 'hAbove', seconds: 8,
      setup: async (kit) => { const page = await tarlaStart(kit); await tPlots(page, ['pepper', 'carrot', 'corn', 'tomato', 'bean', 'corn', 'carrot', 'tomato', 'pepper'].map((crop) => ({ crop, min: 40 }))); await tFly(page, [9.4, 13.5, 9.6], [9.4, 0, 4.1]); await kit.sleep(900); return page; },
      act: async (kit, page) => {
        await kit.big(page, { tr: 'Hasat zamanı!', en: 'Harvest time!', ar: 'وقت الحصاد!' });
        await kit.sleep(700);
        for (const i of [0, 1, 2, 5, 4, 3, 6, 7, 8]) { await tWork(page, i, 'harvest'); await kit.sleep(560); }
      },
    },
    {
      name: 'hCorner', seconds: 7,
      setup: async (kit) => { const page = await tarlaStart(kit); await tPlots(page, []); await tFly(page, [3.2, 2.4, 9.8], [9.2, 0.3, 4]); await kit.sleep(900); return page; },
      act: async (kit, page) => {
        await kit.big(page, { tr: 'Yeniden ek: havuç ve mısır', en: 'Plant again: carrots and corn', ar: 'ازرع من جديد' });
        const crops = ['carrot', 'corn', 'carrot', 'corn', 'carrot', 'corn', 'carrot', 'corn', 'carrot'];
        for (let i = 0; i < 9; i++) { await tWork(page, i, 'hoe'); await kit.sleep(120); await tWork(page, i, 'sow', crops[i]); await kit.sleep(120); await tWork(page, i, 'water'); await kit.sleep(180); }
      },
    },
    {
      name: 'hGrow', seconds: 6,
      setup: async (kit) => { const page = await tarlaStart(kit); await tPlots(page, ['carrot', 'corn', 'carrot', 'corn', 'carrot', 'corn', 'carrot', 'corn', 'carrot'].map((crop) => ({ crop, min: 0 }))); await fixed(page, ...TARLA_CAM, true); await kit.sleep(900); return page; },
      act: async (kit, page) => {
        await kit.big(page, { tr: 'Büyüsün, olgunlaşsın', en: 'Watch them grow', ar: 'شاهدها تكبر' });
        // sped up: the beds' growth clock runs 60 times faster (carrots take 3 minutes, corn 8)
        for (let s = 0; s < 40; s++) {
          await page.evaluate((s) => { const g = window.__game, now = Date.now(); g.garden.data.plots.forEach((p) => { p.wateredAt = now - s * 0.1 * 60000 * (p.crop === 'corn' ? 2.7 : 1) * 1.6; }); g.garden.refresh(); }, s);
          await kit.sleep(100);
        }
        await kit.sleep(1800);
      },
    },
  ],
  vo: { tr: ['Korkuluk nöbette.', 'Hasat zamanı!', 'Yeniden ek.', 'Büyüsün, olgunlaşsın.'], en: ['The scarecrow is on guard.', 'Harvest time!', 'Plant again.', 'Watch them grow.'], ar: ['الفزّاعة تحرس.', 'وقت الحصاد!', 'ازرع من جديد.', 'شاهدها تكبر.'] },
};

/** The garden, faster (review video 3): camera glides in, planting runs straight into the growth, harvest, then the Play Store card. */
EPISODES.tarla2 = {
  scenes: [
    {
      name: 'fWide', seconds: 4,
      setup: async (kit) => { const page = await tarlaStart(kit); await tPlots(page, ['bean', 'tomato', 'pepper', 'carrot', 'corn', 'bean', 'tomato', 'carrot', 'corn'].map((crop, i) => ({ crop, min: [20, 20, 20, 20, 20, 1.2, 2.5, 1.5, 4][i] }))); await fixed(page, [9.3, 10.5, 19.5], [9.4, 0.2, 3.6], true); await kit.sleep(900); return page; },
      act: async (kit, page) => { await kit.big(page, { tr: 'Tarlanda 5 ürün!', en: 'Five crops in your garden!', ar: 'خمسة محاصيل في حقلك!' }); await kit.sleep(500); await fixed(page, [9.3, 6.8, 12.6], [9.4, 0.4, 3.6]); await kit.sleep(3000); },
    },
    {
      name: 'fWork', seconds: 7,
      setup: async (kit) => { const page = await tarlaStart(kit); await tPlots(page, []); await fixed(page, [3.4, 3.2, 10.6], [9.2, 0.3, 4], true); await kit.sleep(900); return page; },
      act: async (kit, page) => {
        await kit.big(page, { tr: 'Çapala, ek, sula!', en: 'Hoe, sow, water!', ar: 'احفر، ازرع، اسقِ!' });
        const crops = ['bean', 'tomato', 'pepper', 'carrot', 'corn', 'carrot', 'corn', 'tomato', 'bean'];
        for (let i = 0; i < 9; i++) { await tWork(page, i, 'hoe'); await kit.sleep(90); await tWork(page, i, 'sow', crops[i]); await kit.sleep(90); await tWork(page, i, 'water'); await kit.sleep(150); }
        await fixed(page, [9.3, 8.6, 14.8], [9.4, 0.3, 3.8]);
        // straight into the growth: the beds' clock runs fast, sprouts to ripe in two seconds
        for (let s = 0; s <= 40; s++) {
          await page.evaluate((s) => { const g = window.__game, now = Date.now(); g.garden.data.plots.forEach((p) => { const need = { bean: 2, tomato: 4, pepper: 6, carrot: 3, corn: 8 }[p.crop] * 60000; p.wateredAt = now - need * Math.min(1.02, s / 36); }); g.garden.refresh(); }, s);
          await kit.sleep(55);
        }
      },
    },
    {
      name: 'fHarvest', seconds: 4.6,
      setup: async (kit) => { const page = await tarlaStart(kit); await tPlots(page, ['tomato', 'carrot', 'corn', 'pepper', 'bean', 'tomato', 'carrot', 'corn', 'bean'].map((crop) => ({ crop, min: 40 }))); await fixed(page, [9.4, 13.5, 11.2], [9.4, 0, 4.1], true); await kit.sleep(900); return page; },
      act: async (kit, page) => {
        await kit.big(page, { tr: 'Hasat zamanı!', en: 'Harvest time!', ar: 'وقت الحصاد!' });
        await fixed(page, [9.4, 9.2, 9.0], [9.4, 0, 4.1]);
        for (const i of [0, 1, 2, 5, 4, 3, 6, 7, 8]) { await tWork(page, i, 'harvest'); await kit.sleep(300); }
      },
    },
    card('fLogo', 4.2, (e) => `<img src="assets/icons/icon-512.png" alt=""><h1 dir="auto">${e.name}</h1><p dir="auto">${e.now}</p><div class="promo-badges"><span dir="auto">▶ ${e.search}</span><span class="free">${e.free}</span></div>`),
  ],
  vo: {
    tr: ['Kendi tarlanda beş ürün yetişiyor!', 'Çapala, ek, sula, hemen büyüsün!', 'Olgunlaşınca hasat et!', 'Türk Ailem, şimdi Google Play’de, ücretsiz!'],
    en: ['Five crops grow in your own garden!', 'Hoe, sow, water, and watch them grow!', 'Harvest when ripe!', 'My Turkish Family, free on Google Play!'],
    ar: ['[excited] في حقلك الخاص تنمو خمسة محاصيل!', '[excited] احفر، ازرع، اسقِ… وشاهدها تكبر بسرعة!', '[shouting] وعندما تنضج… احصد!', '[cheerful] عائلتي التركية، مجانًا على غوغل بلاي!'],
  },
};
