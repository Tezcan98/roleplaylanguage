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


/**
 * The crowd on the square: learners from different countries, each its own HD body (and the
 * filmed player, Hakan). They join once and stay for all the multiplayer scenes.
 */
const CROWD = [
  { name: 'Leyla', params: '&gender=girl&look=covered', outfit: 'dress', aura: true },
  { name: 'Sofia', params: '&gender=girl&look=open', outfit: 'casual' },
  { name: 'Omar', params: '&look=modest', outfit: 'suit' },
  { name: 'Amélie', params: '&gender=girl&look=open', outfit: 'dress' },
  { name: 'Yusuf', params: '&look=modest', outfit: 'casual' },
  { name: 'Mariam', params: '&gender=girl&look=covered', outfit: 'casual' },
  { name: 'Diego', params: '&look=strong', outfit: 'suit' },
  { name: 'Zainab', params: '&gender=girl&look=covered', outfit: 'dress' },
  { name: 'Lucas', params: '&look=modest', outfit: 'suit', aura: true },
  { name: 'Hana', params: '&gender=girl&look=open', outfit: 'casual' },
  { name: 'Bilal', params: '&look=strong', outfit: 'casual' },
];
const crowd = { pages: {}, me: null };
const who = (name) => (name === 'Hakan' ? crowd.me : crowd.pages[name]);
const say = (name, text) => who(name).evaluate((t) => window.__game.village.say(t), text);
/** Stand where told, facing a point. */
const stand = (name, x, z, fx, fz) => who(name).evaluate(([x, z, fx, fz]) => window.__game.player.place({ x, z, rot: Math.atan2(fx - x, fz - z) }), [x, z, fx, fz]);
/** The filmed player's camera, fixed: from (x, y, z) looking at (lx, ly, lz). */
const camera = (x, y, z, lx, ly, lz) => crowd.me.evaluate(([x, y, z, lx, ly, lz]) => { const g = window.__game, V = g.player.position.constructor; g.camera.setFixed(new V(x, y, z), new V(lx, ly, lz)); }, [x, y, z, lx, ly, lz]);
/** A ring of people round (cx, cz), open towards the camera (south), all facing the middle. */
const ring = async (names, cx, cz, r) => {
  for (const [i, n] of names.entries()) {
    const a = Math.PI * (0.92 - (0.84 * i) / Math.max(1, names.length - 1)); // from the west round the north (-z) to the east
    await stand(n, cx + Math.cos(a) * r, cz - Math.sin(a) * r, cx, cz);
  }
};
/** Lines said one after the other: [name, text, pause after]. */
const lines = async (kit, list) => { for (const [n, t, w] of list) { await say(n, t); await kit.sleep(w); } };
const ALL = [...CROWD.map((c) => c.name), 'Hakan'];

const MULTI = [
  {
    name: 'mpFountain', seconds: 9, still: 7.5, shot: '06-square',
    setup: async (kit) => {
      for (const c of CROWD) crowd.pages[c.name] = await square(kit, c.name, { ...c, extra: true });
      crowd.me = await square(kit, 'Hakan', { params: '&look=strong', outfit: 'casual' });
      await ring(ALL.slice(0, 7), 3.2, 6.6, 2.6); // two circles chatting
      await ring(ALL.slice(7), -3.6, 7.4, 1.7);
      await camera(0.2, 5.2, 14.2, 0, 0.9, 6.4);
      await kit.sleep(2500);
      return crowd.me;
    },
    act: async (kit, page) => {
      await kit.caption(page, 'Dünyadan arkadaşlarla buluş', 'Meet Turkish learners from all over the world', { bottom: true }); // the speech bubbles are at the top
      await kit.sleep(700);
      await lines(kit, [
        ['Leyla', 'Merhaba! Ben Leyla, Mısırlıyım.', 1300], ['Sofia', 'Merhaba Leyla! Ben Sofia, İspanya’danım.', 1300],
        ['Omar', 'Selam! Ben Omar. Türkçe öğreniyorum.', 1300], ['Amélie', 'Ben de! Türkçe çok güzel.', 1200],
        ['Hakan', 'Hoş geldiniz! Nasılsınız?', 1000], ['Yusuf', 'İyiyiz, teşekkürler!', 900],
        ['Diego', '¡Hola! Yani… Merhaba! Ben Diego.', 900], ['Hana', 'Merhaba Diego, hoş geldin!', 0],
      ]);
    },
    cleanup: async () => {}, // the crowd stays for the next scenes
  },
  {
    name: 'mpTea', seconds: 7,
    setup: async (kit) => {
      await kit.caption(crowd.me, null);
      for (const [i, n] of ALL.entries()) { const col = i % 4, row = Math.floor(i / 4); await stand(n, 11.6 + col * 1.5 + (row % 2) * 0.5, 4.2 + row * 1.5, 13.8, 6.0); }
      await camera(14.4, 3.8, 13.6, 13.9, 1.0, 5.8);
      await kit.sleep(2200);
      return crowd.me;
    },
    act: async (kit, page) => {
      await kit.caption(page, 'Birlikte Türkçe konuşun', 'Chat in Turkish together, at the tea garden', { bottom: true });
      await kit.sleep(600);
      await lines(kit, [
        ['Hakan', 'Çay içelim mi?', 1300], ['Sofia', 'Evet! Şekersiz bir çay lütfen.', 1400],
        ['Omar', 'Ben şekerli içerim.', 1300], ['Leyla', 'Bu çay bahçesi çok güzel!', 1100], ['Bilal', 'Bir çay daha lütfen!', 0],
      ]);
    },
    cleanup: async () => {},
  },
  {
    name: 'mpWalk', seconds: 6,
    setup: async (kit) => {
      await kit.caption(crowd.me, null);
      for (const [i, n] of ALL.entries()) await stand(n, -3.6 + (i % 4) * 1.3, 14.6 + Math.floor(i / 4) * 1.5, -3.6 + (i % 4) * 1.3, 0);
      await crowd.me.evaluate(() => window.__game.camera.clearFixed());
      await crowd.me.evaluate(() => { const g = window.__game; g.camera.snap(g.player.position, false); });
      await kit.zoom(crowd.me, -3);
      await kit.sleep(1800);
      return crowd.me;
    },
    act: async (kit, page) => {
      await kit.caption(page, 'Köyü birlikte gez', 'Explore the village together');
      const walkers = ALL.map(who);
      await Promise.all(walkers.map((p) => p.keyboard.down('w')));
      await kit.sleep(900);
      await say('Amélie', 'Hadi kütüphaneye gidelim!');
      await kit.sleep(1500);
      await say('Yusuf', 'Tamam, gidelim!');
      await kit.sleep(2000);
      await Promise.all(walkers.map((p) => p.keyboard.up('w')));
    },
    cleanup: async () => {},
  },
  {
    name: 'mpChess', seconds: 9, still: 7.5, shot: '07-chess',
    setup: async (kit) => {
      await kit.caption(crowd.me, null);
      // Omar (white) and Sofia (black) at the giant board, the others watching from the side
      await stand('Omar', -15, 20.4, -15, 15); await stand('Sofia', -15, 9.6, -15, 15);
      const watchers = ALL.filter((n) => n !== 'Omar' && n !== 'Sofia');
      for (const [i, n] of watchers.entries()) { const a = -0.9 + (1.8 * i) / (watchers.length - 1); await stand(n, -15 + Math.cos(a) * 6.2, 15 + Math.sin(a) * 6.2, -15, 15); } // a half circle on the east side
      await who('Omar').evaluate(() => window.__game.village.chess.ask('w'));
      await kit.sleep(500);
      await who('Sofia').evaluate(() => window.__game.village.chess.ask('b'));
      await kit.sleep(1500);
      await camera(-6.5, 6.5, 24.5, -13.5, 0.6, 15);
      await kit.sleep(1500);
      return crowd.me;
    },
    act: async (kit, page) => {
      await kit.caption(page, 'Dev satranç, futbol, kütüphane', 'Giant chess, football, books and more', { bottom: true });
      const move = (n, from, to) => who(n).evaluate(([from, to]) => window.__game.village.net.send({ type: 'chess-move', from, to, promotion: 'q' }), [from, to]);
      await say('Omar', 'Hadi başlayalım!'); await kit.sleep(600);
      await move('Omar', 'e2', 'e4'); await kit.sleep(1500);
      await move('Sofia', 'e7', 'e5'); await say('Sofia', 'Sıra sende, Omar!'); await kit.sleep(1500);
      await move('Omar', 'g1', 'f3'); await kit.sleep(1200);
      await say('Leyla', 'Güzel hamle!'); await kit.sleep(400);
      await move('Sofia', 'b8', 'c6');
    },
    cleanup: async () => { for (const p of [crowd.me, ...Object.values(crowd.pages)]) await p.context().close(); },
  },
];

export const SCENES = [
  ...MULTI,
  {
    name: 'title', seconds: 4,
    setup: async (kit) => { const page = await kit.open(); await page.evaluate(() => document.querySelector('.main-menu')?.classList.remove('open')); await kit.sleep(2500); return page; },
    act: async (kit, page) => {
      await kit.card(page, '<img src="assets/icons/icon-512.png" alt=""><h1>Anadolu Ailesi</h1><p>Türkçeyi köyde yaşayarak öğren</p><small>Learn Turkish by living it, in an Anatolian village</small>');
    },
  },
  {
    name: 'grocer', seconds: 6, still: 4.4, shot: '01-grocer',
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
    name: 'rooms', seconds: 2.5, still: 2, shot: '02-rooms', stillOnly: true,
    setup: async (kit) => {
      const page = await story(kit);
      await page.evaluate(() => { const g = window.__game; g.player.position.set(-3, 0, 1); g.camera.snap(g.player.position, true); });
      await kit.zoom(page, 4); await kit.sleep(1500);
      return page;
    },
    act: async (kit, page) => { await kit.caption(page, 'Kocaman bir ev, bütün bir köy', 'A family home with its rooms, a whole village around it'); },
  },
  {
    name: 'village', seconds: 6, still: 3.0, stillOnly: true, shot: '03-village',
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
    name: 'speak', seconds: 6, still: 2.4, shot: '04-speak',
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
    name: 'school', seconds: 6, still: 4.5, shot: '05-school',
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
    name: 'shop', seconds: 5, still: 3.0, shot: '08-shop',
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

/** The video: multiplayer scenes with single-player play in between. */
export const CUT = ['title', 'mpFountain', 'grocer', 'mpTea', 'speak', 'mpWalk', 'school', 'mpChess', 'shop', 'end'];
