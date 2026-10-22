/**
 * 15-second vertical Shorts for parents (record.mjs --kids --lang=tr|en|ar): a child plays — and
 * learns to speak. Five shots: on the swing in the park · speaking to mom (the game listens) · the
 * notebook of new words · helping grandpa in the garden · the end card. Turkish is filmed in
 * "Sadece Türkçe" (no other language on screen); English and Arabic show the game's meanings in
 * that language. One big line per shot in the video's language; the voice-over lines (KIDS_VO) are
 * read by Gemini for a draft, or by ElevenLabs (--vo=<dir> with 1.mp3 … 5.mp3).
 */
const T = {
  kHook: { tr: 'Çocuğunuz oynarken konuşur, dili gelişir', en: 'Your child plays… and learns to speak Turkish', ar: 'طفلك يلعب… ويتعلّم التحدّث بالتركية' },
  kSpeak: { tr: 'Sesli konuşur, oyun onu dinler', en: 'Speaks out loud — the game listens', ar: 'يتكلّم بصوت عالٍ… واللعبة تسمعه' },
  kWords: { tr: 'Her gün yeni kelimeler', en: 'New words every day', ar: 'كلمات جديدة كل يوم' },
  kHelp: { tr: 'Ailesine yardım eder, sorumluluk öğrenir', en: 'Helps the family, learns responsibility', ar: 'يساعد عائلته ويتعلّم المسؤولية' },
};
const END = {
  tr: { name: 'Türk Ailem', line: 'Dil gelişim ve sosyalleşme oyunu', free: 'Ücretsiz' },
  en: { name: 'My Turkish Family', line: 'Play, speak, learn Turkish', free: 'Free' },
  ar: { name: 'عائلتي التركية', line: 'العب، تكلّم، تعلّم التركية', free: 'مجانًا' },
};
/** The voice-over, one line per shot (short: each has about three seconds). */
export const KIDS_VO = {
  tr: ['Çocuğunuz oynarken konuşsun, dili gelişsin.', 'Konuşur, oyun onu dinler.', 'Her gün yeni kelimeler.', 'Ailesine yardım eder.', 'Türk Ailem. Google Play’de ücretsiz.'],
  en: ['Your child learns Turkish while playing.', 'They speak, and the game listens.', 'New words every day.', 'They help the family.', 'My Turkish Family. Free on Google Play.'],
  ar: ['طفلك يتعلّم التركية وهو يلعب.', 'يتكلّم، واللعبة تستمع إليه.', 'كلمات جديدة كل يوم.', 'ويساعد عائلته بكل حب.', 'عائلتي التركية. مجانًا على غوغل بلاي.'],
};

/** A new game (it starts in the park), every card closed, the HD character in everyday clothes, no interface. */
async function start(kit) {
  const page = await kit.open();
  await page.evaluate(() => { const s = window.__game.settings; s.set('dataConsent', { v: 99, at: Date.now() }); s.set('villageIntroSeen', true); }); // (no consent card on camera)
  await page.evaluate(() => document.querySelector('.menu-main')?.click());
  await kit.sleep(2000);
  for (let i = 0; i < 6; i++) { await page.evaluate(() => document.querySelector('.overlay.story-card.open .btn, .overlay.open .card .btn')?.click()); await kit.sleep(400); }
  await page.evaluate(() => {
    const g = window.__game, w = g.wallet; w.add(500, 'promo');
    for (const it of [{ id: 'hd', slot: 'hd' }, { id: 'hd-casual', slot: 'body' }]) { w.buy({ ...it, price: 0 }); w.equip(it); }
    g.shop.onOutfit?.();
  });
  await kit.sleep(1500);
  await kit.hideHud(page);
  await page.addStyleTag({ content: '#labels,.hud,#quest,.ptt-wrap,.net-status{visibility:hidden!important}' });
  return page;
}
const showLabels = (page) => page.evaluate(() => document.getElementById('labels')?.style.setProperty('visibility', 'visible', 'important'));
const showToasts = (page) => page.evaluate(() => document.getElementById('toasts')?.style.setProperty('visibility', 'visible', 'important'));
const fixed = (page, [x, y, z], [lx, ly, lz]) => page.evaluate(([x, y, z, lx, ly, lz]) => { const g = window.__game, V = g.player.position.constructor; g.camera.setFixed(new V(x, y, z), new V(lx, ly, lz)); }, [x, y, z, lx, ly, lz]);

export const KIDS_SCENES = [
  {
    name: 'kHook', seconds: 3.4,
    setup: async (kit) => {
      const page = await start(kit);
      await page.evaluate(() => window.__game.parkPlay.swing()); // on the free swing, between Defne and Ayşe
      await fixed(page, [-42.3, 1.7, 20.6], [-42.3, 1.15, 15.6]);
      await kit.sleep(1500);
      return page;
    },
    act: async (kit, page) => { await kit.sleep(150); await kit.big(page, T.kHook); },
  },
  {
    name: 'kSpeak', seconds: 3.2,
    setup: async (kit) => {
      const page = await start(kit);
      await page.evaluate(() => { const g = window.__game; g.travel.place('house', 'start', { force: true }); });
      await kit.sleep(800);
      await page.evaluate(() => { const g = window.__game, a = g.cast.get('anne'); g.player.position.set(a.position.x - 1.1, 0, a.position.z + 1.3); g.camera.snap(g.player.position, true); });
      await kit.sleep(1200);
      return page;
    },
    act: async (kit, page) => {
      await kit.big(page, T.kSpeak);
      await page.evaluate(() => window.__game.dialogue.open('anne', 'br1')); // "Kahvaltı nasıldı? Beğendin mi?" → "Çok güzeldi, eline sağlık anne!"
      await kit.sleep(1100);
      await page.click('#dlg .mic').catch(() => {});
    },
  },
  {
    name: 'kWords', seconds: 3.2,
    setup: async (kit) => {
      const page = await start(kit);
      await page.evaluate(() => { const v = window.__game.vocab; for (const [tr, en] of [['anne', 'mom'], ['baba', 'dad'], ['okul', 'school'], ['kitap', 'book'], ['elma', 'apple'], ['su', 'water'], ['kaydırak', 'slide'], ['teşekkür ederim', 'thank you']]) v.learn(tr, en); });
      await fixed(page, [-31.5, 3.2, 22.5], [-35, 0.9, 16.5]);
      await kit.sleep(400);
      return page;
    },
    act: async (kit, page) => {
      await kit.big(page, T.kWords);
      await showToasts(page);
      await page.evaluate(() => { const g = window.__game; g.parkPlay.slide(); g.vocab.learn('salıncak', 'swing'); g.toasts.show('Yeni kelime: salıncak', 'swing'); });
      await kit.sleep(1300);
      await page.evaluate(() => window.__game.help.onWords()); // the notebook: the words with their meanings
    },
  },
  {
    name: 'kHelp', seconds: 3.2,
    setup: async (kit) => {
      const page = await start(kit);
      await page.evaluate(() => { const g = window.__game; g.cast.move('dede', 'yard', 'garden', 'garden'); g.travel.place('yard', 'houseDoor', { force: true }); });
      await kit.sleep(1200);
      await page.evaluate(() => { const g = window.__game; g.player.position.set(8.4, 0, 1.6); g.player.group.rotation.y = Math.PI; });
      await fixed(page, [9.6, 3.0, 6.6], [9.0, 0.9, -1.2]);
      await kit.sleep(1200);
      return page;
    },
    act: async (kit, page) => {
      await kit.big(page, T.kHelp);
      await kit.sleep(1200);
      await showToasts(page); await showLabels(page);
      await page.evaluate(() => { const g = window.__game; g.labels.bubble(g.cast.get('dede'), 'Aferin evladım!', null, 2.5, 'Well done, my child!'); g.toasts.show('Görev tamamlandı! ✓', 'Quest complete'); });
    },
  },
  {
    name: 'kEnd', seconds: 3.6,
    setup: async (kit) => { const page = await kit.open(); await page.evaluate(() => document.querySelector('.main-menu')?.classList.remove('open')); await kit.sleep(2000); return page; },
    act: async (kit, page) => {
      const e = END[kit.lang] ?? END.tr;
      await kit.card(page, `<img src="assets/icons/icon-512.png" alt=""><h1 dir="auto">${e.name}</h1><p dir="auto">${e.line}</p><div class="promo-badges"><span>▶ Google Play</span><span class="free">${e.free}</span></div>`);
    },
  },
];
export const KIDS_CUT = KIDS_SCENES.map((s) => s.name);
