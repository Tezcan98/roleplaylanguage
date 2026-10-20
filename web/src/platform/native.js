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
 * sehem2.com.tr without the Play Store. The app reads ota.json there (tools/ota-stamp.mjs); when
 * that build is newer than the one running and fits this app (its `native` versionCode), only the
 * files not here yet are downloaded and the new build starts the next time the app is opened
 * (or comes back from the background). A build that doesn't start is rolled back by the plugin:
 * `notifyAppReady()` says this one did. Native changes (plugins, permissions) still need the Play Store.
 */
const OTA = 'https://sehem2.com.tr/oyun/ota.json';
export async function liveUpdate(App) {
  try {
    const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
    await CapacitorUpdater.notifyAppReady(); // this build started fine: keep it
    const { CapacitorHttp } = await import('@capacitor/core'); // (a native request: the site's files carry no CORS header for the app)
    const mine = await fetch('version.json', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const latest = await CapacitorHttp.get({ url: `${OTA}?t=${Date.now()}`, responseType: 'json' }).then((r) => (r.status === 200 ? (typeof r.data === 'string' ? JSON.parse(r.data) : r.data) : null)).catch(() => null);
    const info = await App.getInfo();
    if (!latest?.version || !latest.manifest || latest.version === mine?.version) return;
    if (mine?.built && latest.built <= mine.built) return; // never back to an older build
    if (Number(info.build) < Number(latest.native ?? 0)) return; // that build needs a newer app from the Play Store
    const { bundles = [] } = await CapacitorUpdater.list();
    let bundle = bundles.find((b) => b.version === latest.version && b.status !== 'error');
    bundle ??= await CapacitorUpdater.download({ url: OTA, version: latest.version, manifest: latest.manifest });
    await CapacitorUpdater.next({ id: bundle.id });
    const { bundle: current } = await CapacitorUpdater.current();
    for (const b of bundles) if (b.id !== bundle.id && b.id !== current?.id && b.id !== 'builtin') CapacitorUpdater.delete({ id: b.id }).catch(() => {}); // old downloads
    console.info(`[ota] ${latest.version} ready for the next start`);
  } catch (e) { console.warn('[ota]', e); }
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
