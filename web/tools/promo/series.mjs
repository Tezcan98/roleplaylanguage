import { start, fixed, showLabels } from './kids-scenes.mjs';

/**
 * The YouTube Shorts series: one feature of the game per episode, about 20 seconds, vertical,
 * in Turkish, English and Arabic (record.mjs --episode=<name> --lang=tr|en|ar). Each shot has one
 * big line on screen in the video's language; `vo` is one voice line per shot (a Gemini draft, or
 * ElevenLabs files with --vo=<dir>).
 */
const END = {
  tr: { name: 'Türk Ailem', line: 'Dil gelişim ve sosyalleşme oyunu', free: 'Ücretsiz' },
  en: { name: 'My Turkish Family', line: 'Play, speak, learn Turkish', free: 'Free' },
  ar: { name: 'عائلتي التركية', line: 'العب، تكلّم، تعلّم التركية', free: 'مجانًا' },
};
const endCard = (name) => ({
  name, seconds: 3.6,
  setup: async (kit) => { const page = await kit.open(); await page.evaluate(() => document.querySelector('.main-menu')?.classList.remove('open')); await kit.sleep(2000); return page; },
  act: async (kit, page) => {
    const e = END[kit.lang] ?? END.tr;
    await kit.card(page, `<img src="assets/icons/icon-512.png" alt=""><h1 dir="auto">${e.name}</h1><p dir="auto">${e.line}</p><div class="promo-badges"><span>▶ Google Play</span><span class="free">${e.free}</span></div>`);
  },
});
/** The park's corners (world/locations/VillageSquare.js PARK: x −46…−32, z 13…25). */
const SWING = [-42.3, 15.6], SLIDE = [-34.2, 14.6];

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
        name: 'pSlide', seconds: 4.2,
        setup: async (kit) => {
          const page = await start(kit);
          await page.evaluate(() => { const g = window.__game; g.cast.move('emre', 'village', 'zehra', 'stand'); g.cast.move('mert', 'village', 'benchWest', 'stand'); }); // the runners away: nobody in front of the camera
          await fixed(page, [SLIDE[0] + 1.6, 1.9, SLIDE[1] + 8.4], [SLIDE[0], 0.9, SLIDE[1] + 2.4]); // in front of the slide: down it, towards the camera
          await kit.sleep(1000);
          return page;
        },
        act: async (kit, page) => {
          await kit.big(page, { tr: 'Kaydıraktan kay', en: 'Go down the slide', ar: 'انزلق على الزحليقة' });
          await page.evaluate(() => window.__game.parkPlay.slide());
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
      tr: ['Köy meydanında çocuklar için bir park var.', 'Kaydıraktan kay,', 'salıncakta sallan,', 've yeni arkadaşlar edin.', 'Türk Ailem. Google Play’de ücretsiz.'],
      en: ['There’s a park in the village square.', 'Go down the slide,', 'swing on the swings,', 'and make new friends.', 'My Turkish Family. Free on Google Play.'],
      ar: ['في ساحة القرية حديقة للأطفال.', 'انزلق على الزحليقة،', 'وتأرجح على الأرجوحة،', 'وكوّن أصدقاء جددًا.', 'عائلتي التركية. مجانًا على غوغل بلاي.'],
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
