import { gloss } from '../i18n/Gloss.js';
/**
 * Android (Capacitor) adapters. Imported dynamically and only inside the app, so the web
 * version never loads the Capacitor packages (they are bundled into the app by Vite).
 */
export const isNativeApp = () => window.Capacitor?.isNativePlatform?.() === true;

export async function loadNativeAdapters() {
  const [{ App }, { NativeTTS }, { NativeSpeechRecognizer }, { AdMobAdProvider }, { LocalNotifications }, { NativePurchases, PURCHASE_TYPE }, { registerPlugin }] = await Promise.all([
    import('@capacitor/app'),
    import('../services/speech/NativeTTS.js'),
    import('../services/speech/NativeSpeechRecognizer.js'),
    import('../services/monetization/AdMobAdProvider.js'),
    import('@capacitor/local-notifications'),
    import('@capgo/native-purchases'),
    import('@capacitor/core'),
  ]);
  const PlayGames = registerPlugin('PlayGames'); // mobile/android: PlayGamesPlugin.java
  return { App, NativeTTS, NativeSpeechRecognizer, AdMobAdProvider, LocalNotifications, NativePurchases, PURCHASE_TYPE, PlayGames };
}

/**
 * Live updates (OTA): the game's web part — code, texts, quests, voices, music — updated from
 * anadoluailesi.com.tr without the Play Store. Checked once, when the app opens, before the game
 * is built ("Güncellemeler kontrol ediliyor…"): when ota.json (tools/ota-stamp.mjs) has a newer
 * build that fits this app (its `native` versionCode), only the files not here yet are downloaded
 * (with the percentage on screen) and the app starts again at once on the new build. Never while
 * playing: nothing is left waiting for "the next start" (the plugin used to switch to it when the
 * app came back from the background — the game reloaded in the middle of play). No answer within a
 * few seconds, no internet, a failed download: the game simply starts as it is.
 * A build that doesn't start is rolled back by the plugin: `notifyAppReady()` says this one did.
 * Native changes (plugins, permissions) still need the Play Store.
 */
const OTA = 'https://anadoluailesi.com.tr/oyun/ota.json';
const CHECK_MS = 5000;        // how long the check may take before the game just starts
const DOWNLOAD_MS = 120000;   // a download that takes longer than this: the game starts as it is

/** The small full-screen card while the update is checked / downloaded. */
function updateScreen() {
  const root = document.createElement('div');
  root.style.cssText = 'position:fixed;inset:0;z-index:100000;display:grid;place-items:center;align-content:center;gap:16px;background:#14202e;color:#fff;font:600 17px Nunito,system-ui,sans-serif;text-align:center';
  root.innerHTML = '<img src="assets/icons/icon-192.png" alt="" style="width:88px;height:88px;border-radius:22px;box-shadow:0 8px 30px rgba(0,0,0,.4)"><div class="t">Güncellemeler kontrol ediliyor…</div><div style="width:200px;height:6px;border-radius:999px;background:rgba(255,255,255,.15);overflow:hidden"><div class="bar" style="width:15%;height:100%;background:#FFC845;border-radius:999px;transition:width .3s"></div></div>';
  document.body.append(root);
  const t = root.querySelector('.t'), bar = root.querySelector('.bar');
  return { text: (s) => { t.textContent = s; }, percent: (p) => { bar.style.width = `${Math.max(5, Math.min(100, p))}%`; }, close: () => root.remove() };
}

const within = (promise, ms) => Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(null), ms))]);

/** Before the game is built: a newer build is downloaded and started now; otherwise the game goes on. */
export async function updateGate(App) {
  let screen = null, listener = null;
  try {
    const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
    await CapacitorUpdater.notifyAppReady(); // this build started fine: keep it
    screen = updateScreen();
    const { CapacitorHttp } = await import('@capacitor/core'); // (a native request: the site's files carry no CORS header for the app)
    const [mine, latest, info] = await within(Promise.all([
      fetch('version.json', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      CapacitorHttp.get({ url: `${OTA}?t=${Date.now()}`, responseType: 'json', connectTimeout: CHECK_MS, readTimeout: CHECK_MS })
        .then((r) => (r.status === 200 ? (typeof r.data === 'string' ? JSON.parse(r.data) : r.data) : null)).catch(() => null),
      App.getInfo(),
    ]), CHECK_MS) ?? [];
    const { bundles = [] } = await CapacitorUpdater.list();
    const { bundle: current } = await CapacitorUpdater.current();
    const clean = (keep) => { for (const b of bundles) if (b.id !== keep && b.id !== current?.id && b.id !== 'builtin') CapacitorUpdater.delete({ id: b.id }).catch(() => {}); };
    if (!latest?.version || !latest.manifest || latest.version === mine?.version
      || (mine?.built && latest.built <= mine.built) // never back to an older build
      || Number(info?.build) < Number(latest.native ?? 0)) { // that build needs a newer app from the Play Store
      CapacitorUpdater.next({ id: current?.id ?? 'builtin' }).catch(() => {}); // nothing waiting for "the next start" (older builds left one)
      clean(null);
      return;
    }
    screen.text('Yeni sürüm indiriliyor…'); screen.percent(20);
    listener = await CapacitorUpdater.addListener('download', (e) => { if (Number.isFinite(e?.percent)) { screen.percent(20 + e.percent * 0.8); screen.text(`Yeni sürüm indiriliyor… %${Math.round(e.percent)}`); } });
    let bundle = bundles.find((b) => b.version === latest.version && b.status !== 'error');
    bundle ??= await within(CapacitorUpdater.download({ url: OTA, version: latest.version, manifest: latest.manifest }), DOWNLOAD_MS);
    if (!bundle) return; // too slow: next time
    screen.text('Güncelleme yükleniyor…'); screen.percent(100);
    clean(bundle.id);
    console.info(`[ota] ${latest.version}: starting it now`);
    await CapacitorUpdater.set({ id: bundle.id }); // the app starts again on the new build, still on this screen
    await new Promise(() => {}); // (the page is replaced)
  } catch (e) {
    console.warn('[ota]', e);
  } finally {
    listener?.remove?.();
    screen?.close();
  }
}

const DAILY_ID = 7001;
/**
 * "Bugünkü ödülünü al!" — a local notification the next day at 10:00 (and one more the day
 * after, in case the first was missed). Rescheduled every time the daily reward is taken.
 */
export async function scheduleDailyReminder(LocalNotifications, { ask = false } = {}) {
  try {
    const perm = await LocalNotifications.checkPermissions();
    // asked once, right after the first daily reward (not over the character setup); afterwards only rescheduled
    if (perm.display !== 'granted' && (!ask || (await LocalNotifications.requestPermissions()).display !== 'granted')) return;
    await LocalNotifications.cancel({ notifications: [{ id: DAILY_ID }, { id: DAILY_ID + 1 }] }).catch(() => {});
    const at = (days) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(10, 0, 0, 0); return d; };
    await LocalNotifications.schedule({
      notifications: [1, 2].map((days, i) => ({
        id: DAILY_ID + i, title: `${gloss('My Turkish Family') || 'Türk Ailem'} 🎁`, body: 'Bugünkü ödülünü al! Her gün gelirsen ödül büyür.',
        schedule: { at: at(days) }, // not exact to the minute: no special alarm permission needed
      })),
    });
  } catch (e) { console.warn('[notifications]', e); }
}

/**
 * Android back button: closes the top dialogue or overlay the same way its own close
 * button would (so the game's mode stack stays right); with nothing open the app goes to
 * the background. Leaving the app stops speech and ends a voice chat.
 */
export function wireAppLifecycle(App, { dialogue, tts, village }) {
  App.addListener('backButton', () => {
    if (dialogue.talking) { dialogue.close(); return; }
    const overlay = [...document.querySelectorAll('.overlay.open')].at(-1);
    if (overlay) {
      const close = [...overlay.querySelectorAll('button')].find((b) => !b.disabled && /vazgeç|kapat|iptal|✕|×/i.test(b.textContent ?? ''));
      close?.click();
      return;
    }
    App.minimizeApp();
  });
  App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) return;
    tts.cancel();
    if (village.voice.inCall) village.endVoiceCall();
  });
}
