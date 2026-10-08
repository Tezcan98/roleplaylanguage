/**
 * The promo's scenes, in order. Each: setup(kit) → a page ready to film (not recorded),
 * act(kit, page) → what happens on camera during `seconds`.
 */
/** The HD character (and an outfit / the golden light) bought and put on, as in the shop. */
const dress = (page, { outfit = null, aura = false } = {}) => page.evaluate(([outfit, aura]) => {
  const g = window.__game, w = g.wallet; w.add(500, 'promo');
  const items = [{ id: 'hd', slot: 'hd' }, outfit && { id: `hd-${outfit}`, slot: 'body' }, aura && { id: 'aura', slot: 'aura' }].filter(Boolean);
  for (const it of items) { w.buy({ ...it, price: 0 }); w.equip(it); }
  g.shop.onOutfit?.();
}, [outfit, aura]);

const story = async (kit, params = '', look = {}) => {
  const page = await kit.open(params);
  await page.evaluate(() => document.querySelector('.menu-main')?.click());
  await kit.sleep(2500); await kit.closeCards(page); await kit.sleep(400);
  await dress(page, look); await kit.sleep(800);
  await kit.hideHud(page);
  return page;
};

/** Into the village square from the menu ("Meydana gir"), with a name and (optionally) a bought outfit. */
const square = async (kit, name, { params = '', outfit = null, aura = false, extra = false } = {}) => {
  const page = await kit.open(params, { extra });
  await page.evaluate((q) => { const u = new URLSearchParams(q); for (const k of ['gender', 'look']) if (u.get(k)) window.__game.settings.set(k, u.get(k)); }, params); // what the others see comes from the settings
  await dress(page, { outfit, aura });
  await page.evaluate((n) => window.__game.settings.set('username', n), name);
  await page.click('.main-menu.open button:has-text("Meydana gir")');
  await kit.sleep(1500);
  const input = await page.$('.overlay.open input');
  if (input) { await input.fill(name); await page.click('.overlay.open button:has-text("Meydana gir")'); }
  await page.waitForFunction(() => window.__game.village.net.connected, null, { timeout: 15000 });
  await kit.sleep(1500); await kit.closeCards(page); await kit.hideHud(page);
  return page;
};

const friends = [];

export const SCENES = [
  {
    name: 'title', seconds: 4,
    setup: async (kit) => { const page = await kit.open(); await page.evaluate(() => document.querySelector('.main-menu')?.classList.remove('open')); await kit.sleep(2500); return page; },
    act: async (kit, page) => {
      await kit.card(page, '<img src="assets/icons/icon-512.png" alt=""><h1>Anadolu Ailesi</h1><p>Türkçeyi köyde yaşayarak öğren</p><small>Learn Turkish by living it, in an Anatolian village</small>');
    },
  },
  {
    name: 'grocer', seconds: 6, still: 4.4,
    setup: async (kit) => {
      const page = await story(kit);
      await page.evaluate(() => window.__game.travel.go('village', 'yardRoad'));
      await kit.sleep(4500); await kit.closeCards(page); await kit.hideHud(page);
      await page.evaluate(() => { const g = window.__game, n = g.cast.get('bakkal'); g.player.position.set(n.position.x - 0.4, 0, n.position.z + 1.8); g.camera.snap(g.player.position, false); });
      await kit.sleep(1500);
      return page;
    },
    act: async (kit, page) => {
      await kit.caption(page, 'Bakkalda Türkçe alışveriş', 'Shop at the grocer’s, in Turkish');
      await kit.sleep(500);
      await page.evaluate(() => window.__game.dialogue.open('bakkal', 'shop'));
      await kit.sleep(3000);
      await page.click('#dlg .choice >> nth=0').catch(() => page.keyboard.press('1'));
    },
  },
  {
    name: 'rooms', seconds: 2.5, still: 2, stillOnly: true,
    setup: async (kit) => {
      const page = await story(kit);
      await page.evaluate(() => { const g = window.__game; g.player.position.set(-3, 0, 1); g.camera.snap(g.player.position, true); });
      await kit.zoom(page, 4); await kit.sleep(1500);
      return page;
    },
    act: async (kit, page) => { await kit.caption(page, 'Kocaman bir ev, bütün bir köy', 'A family home with its rooms, a whole village around it'); },
  },
  {
    name: 'village', seconds: 6, still: 3.0,
    setup: async (kit) => {
      const page = await story(kit);
      await page.evaluate(() => window.__game.travel.go('village', 'yardRoad'));
      await kit.sleep(3500); await kit.closeCards(page); await kit.hideHud(page);
      await page.evaluate(() => { const g = window.__game; g.player.position.set(0, 0, 13.5); g.camera.snap(g.player.position, false); });
      await kit.zoom(page, -3); await kit.sleep(1200);
      return page;
    },
    act: async (kit, page) => {
      await kit.caption(page, 'Köyü keşfet', 'Explore the village: the square, the tea garden, the market');
      await kit.walk(page, 'w', 2800); // towards the fountain
      await kit.walk(page, 'a', 1700);
      await kit.walk(page, 'w', 1000);
    },
  },
  {
    name: 'speak', seconds: 6, still: 2.4,
    setup: async (kit) => {
      const page = await story(kit);
      await page.evaluate(() => window.__game.travel.go('village', 'yardRoad'));
      await kit.sleep(4500); await kit.closeCards(page); await kit.hideHud(page);
      await page.evaluate(() => { const g = window.__game, n = g.cast.get('cayci'); g.player.position.set(n.position.x - 1.5, 0, n.position.z + 1.2); g.camera.snap(g.player.position, false); });
      await kit.sleep(1500);
      return page;
    },
    act: async (kit, page) => {
      await kit.caption(page, 'Konuş, seni anlasın', 'Speak Turkish out loud, the game listens');
      await page.evaluate(() => window.__game.dialogue.open('cayci', 'zc1'));
      await kit.sleep(2800);
      await page.click('#dlg .mic').catch(() => {});
    },
  },
  {
    name: 'school', seconds: 6, still: 4.5,
    setup: async (kit) => {
      const page = await story(kit, '&fastclass');
      page.evaluate(() => window.__game.lessons.enter('l1'));
      await kit.sleep(800);
      await page.click('.overlay.open button:has-text("Krediyle gir")');
      await kit.sleep(3500); await kit.closeCards(page); await kit.hideHud(page);
      return page;
    },
    act: async (kit, page) => {
      await kit.caption(page, 'Okulda dersler', 'Lessons step by step, from A1');
    },
  },
  {
    name: 'square', seconds: 8, still: 6.5,
    setup: async (kit) => {
      friends.push(await square(kit, 'Leyla', { params: '&gender=girl&look=covered', outfit: 'dress', aura: true, extra: true }));
      friends.push(await square(kit, 'Omar', { outfit: 'suit', extra: true }));
      friends.push(await square(kit, 'Seher', { params: '&gender=girl&look=open', outfit: 'casual', extra: true }));
      const page = await square(kit, 'Hakan', { params: '&look=strong', outfit: 'casual' }); // the four characters, each with its own HD body
      // everyone together near the fountain, facing the camera
      const spots = [[-1.6, 5.4], [1.6, 5.6], [2.4, 7.0], [-0.4, 7.4]];
      for (const [i, p] of [...friends, page].entries()) await p.evaluate(([x, z]) => { const g = window.__game; g.player.position.set(x, 0, z); }, spots[i]);
      // a close camera on the four of them (the game's own camera stays further back)
      await page.evaluate((spots) => { const g = window.__game, V = g.player.position.constructor, cx = spots.reduce((a, s) => a + s[0], 0) / spots.length, cz = spots.reduce((a, s) => a + s[1], 0) / spots.length; g.camera.setFixed(new V(cx + 0.6, 3.4, cz + 6.2), new V(cx, 1.0, cz)); }, spots);
      await kit.sleep(2500);
      return page;
    },
    act: async (kit, page) => {
      await kit.caption(page, 'Dünyadan arkadaşlarla buluş', 'Meet Turkish learners from all over the world');
      await kit.sleep(900);
      await friends[0].evaluate(() => window.__game.village.say('Merhaba! Ben Leyla. Mısırlıyım.'));
      await kit.sleep(2200);
      await friends[1].evaluate(() => window.__game.village.say('Selam Leyla! Ben Omar, Pakistanlıyım.'));
      await kit.sleep(2000);
      await page.evaluate(() => window.__game.village.say('Hoş geldiniz! Çay içelim mi?'));
    },
    cleanup: async (kit, page) => { for (const p of [page, ...friends]) await p.context().close(); },
  },
  {
    name: 'chess', seconds: 7, still: 6.0,
    setup: async (kit) => {
      const page = await square(kit, 'Ahmet');
      await page.evaluate(() => { const g = window.__game; g.player.position.set(-15, 0, 20.6); g.camera.snap(g.player.position, false); }); // white's side of the giant board
      await kit.sleep(1000);
      await page.evaluate(() => (window.__game.village.chess).playDede('w'));
      await kit.sleep(3000);
      return page;
    },
    act: async (kit, page) => {
      await kit.caption(page, 'Dev satranç, futbol, kütüphane', 'Giant chess with İsmail Dede, football, books and more');
      for (const [from, to] of [['e2', 'e4'], ['g1', 'f3'], ['f1', 'c4']]) {
        await page.evaluate(([from, to]) => window.__game.village.net.send({ type: 'chess-move', from, to, promotion: 'q' }), [from, to]);
        await kit.sleep(2100);
      }
    },
  },
  {
    name: 'shop', seconds: 5, still: 3.0,
    setup: async (kit) => {
      const page = await story(kit, '&gender=girl&look=covered');
      await page.evaluate(() => window.__game.wallet.add(150, 'promo'));
      await page.evaluate(() => window.__game.shop.open());
      await kit.sleep(1500);
      await page.evaluate(() => [...document.querySelectorAll('.shop-body > *')].slice(0, 2).forEach((e) => { e.style.display = 'none'; })); // outfits only: no prices in store pictures
      await kit.sleep(500);
      return page;
    },
    act: async (kit, page) => {
      await kit.caption(page, 'Karakterini giydir', 'Dress up your character, everyone in the square sees it', { side: true });
    },
  },
  {
    name: 'end', seconds: 4,
    setup: async (kit) => { const page = await kit.open(); await page.evaluate(() => document.querySelector('.main-menu')?.classList.remove('open')); await kit.sleep(2500); return page; },
    act: async (kit, page) => {
      await kit.card(page, '<img src="assets/icons/icon-512.png" alt=""><h1>Anadolu Ailesi</h1><p>Türkçe Öğren</p><small>Learn Turkish by living it</small>');
    },
  },
];
