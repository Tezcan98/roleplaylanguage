import { start, fixed, showLabels } from './kids-scenes.mjs';

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
};
/** The park's corners (world/locations/VillageSquare.js PARK: x −46…−32, z 13…25). */
const SWING = [-42.3, 15.6];

export const EPISODES = {
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
          await kit.sleep(1300);
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

EPISODES.tanitim = {
  scenes: [
    {
      name: 'tOrder', seconds: 5.6,
      setup: async (kit) => {
        const page = await start(kit);
        await page.evaluate(() => window.__game.travel.go('village', 'yardRoad'));
        await kit.sleep(3000);
        await page.evaluate(() => { const g = window.__game, n = g.cast.get('manav'); g.player.position.set(n.position.x - 1.3, 0, n.position.z + 3.4); g.camera.snap(g.player.position, false); });
        await kit.sleep(1200);
        return page;
      },
      act: async (kit, page) => {
        await kit.big(page, { tr: 'Cümleleri kurarak Türkçe öğrenir', en: 'Learns Turkish by building sentences', ar: 'يتعلّم التركية ببناء الجمل' });
        await page.evaluate(() => window.__game.dialogue.open('manav', 'mv1')); // "Buyur evlat, ne istersin?" → the sentence in tiles
        await kit.sleep(2000);
        for (const t of ['Bir kilo elma', 've iki kilo', 'patates lütfen.']) { await page.evaluate((t) => [...document.querySelectorAll('#dlg .tile')].find((b) => b.textContent === t && !b.disabled)?.click(), t); await kit.sleep(800); }
      },
    },
    {
      name: 'tSchool', seconds: 4.4,
      setup: async (kit) => {
        const page = await start({ ...kit, open: (p = '', o) => kit.open(`${p}&fastclass`, o) });
        page.evaluate(() => window.__game.lessons.enter('l1'));
        await kit.sleep(800);
        await page.click('.overlay.open button:has-text("Krediyle gir")').catch(() => {});
        await kit.sleep(3500); await kit.closeCards(page);
        return page;
      },
      act: async (kit, page) => {
        await kit.big(page, { tr: 'Okulda öğretmeni ve arkadaşlarıyla konuşur', en: 'Talks with the teacher and classmates at school', ar: 'يتحدّث مع المعلّمة وزملائه في المدرسة' });
        for (let i = 0; i < 3; i++) { await kit.sleep(1000); await page.evaluate(() => [...document.querySelectorAll('.overlay.open button')].find((b) => b.textContent.includes('devam'))?.click()); }
      },
    },
    {
      name: 'tSquare', seconds: 5.2,
      setup: async (kit) => {
        for (const f of FRIENDS) crowd.pages[f.name] = await join(kit, f.name, { ...f, extra: true });
        crowd.me = await join(kit, 'Ben', { params: '&look=modest', outfit: 'casual' });
        const all = [...FRIENDS.map((f) => f.name), 'Ben'], r = 1.7, cx = 0.6, cz = 6.4;
        for (const [i, n] of all.entries()) { const a = Math.PI * (0.92 - (0.84 * i) / (all.length - 1)); await stand(n, cx + Math.cos(a) * r, cz - Math.sin(a) * r, cx, cz); }
        await crowd.me.evaluate(([x, y, z, lx, ly, lz]) => { const g = window.__game, V = g.player.position.constructor; g.camera.setFixed(new V(x, y, z), new V(lx, ly, lz)); }, [0.6, 2.1, 11.6, 0.6, 1.5, 6.4]);
        await crowd.me.addStyleTag({ content: '#act,#act-left,#act-more{visibility:hidden!important}' });
        await kit.sleep(2500);
        return crowd.me;
      },
      act: async (kit, page) => {
        await kit.big(page, { tr: 'Meydanda arkadaşlarla oynar, Türkçe konuşur', en: 'Plays with friends in the square, speaking Turkish', ar: 'يلعب مع أصدقائه في الساحة ويتحدّث بالتركية' });
        await kit.sleep(500);
        for (const [n, t, w] of [['Mariam', 'Merhaba! Hadi oynayalım!', 1400], ['Yusuf', 'Evet, hadi!', 1100], ['Ben', 'Olur! Ben de geliyorum!', 0]]) { await say(n, t); await kit.sleep(w); }
      },
      cleanup: async () => { for (const p of [crowd.me, ...Object.values(crowd.pages)]) await p.context().close(); },
    },
    // (on the store now, not "soon": the name to search for on Google Play is on the card)
    card('tLogo', 3.6, (e) => `<img src="assets/icons/icon-512.png" alt=""><h1 dir="auto">${e.name}</h1><p dir="auto">${e.now}</p><div class="promo-badges"><span dir="auto">▶ ${e.search}</span><span class="free">${e.free}</span></div>`),
    card('tFollow', 3.2, (e, lang) => `<img src="assets/icons/icon-512.png" alt=""><h1 dir="auto">${(FOLLOW[lang] ?? FOLLOW.tr)[0]}</h1><p dir="auto">${(FOLLOW[lang] ?? FOLLOW.tr)[1]}</p><div class="promo-badges"><span class="free">🔔 ${e.name}</span></div>`),
  ],
  vo: {
    tr: ['Çocuğunuz cümleler kurarak öğrenir,', 'okulda konuşur,', 'Meydanda arkadaşlarıyla oynar, Türkçe konuşur.', 'Türk Ailem, şimdi Google Play’de ücretsiz.', 'Takip et, yeni videoları kaçırma.'],
    en: ['Your child builds sentences,', 'talks at school,', 'They play with friends in the square, speaking Turkish.', 'Turkish Family, free on Google Play now.', 'Follow us, and don’t miss the next videos.'],
    ar: ['طفلك يبني الجمل،', 'ويتحدّث في المدرسة،', 'ويلعب مع أصدقائه في الساحة ويتحدّث بالتركية.', 'عائلتي التركية، متوفّرة الآن مجانًا على غوغل بلاي.', 'تابعنا ولا تفوّت الفيديوهات القادمة.'],
  },
};
