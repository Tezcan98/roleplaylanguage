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
