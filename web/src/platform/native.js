/**
 * Android (Capacitor) adapters. Imported dynamically and only inside the app, so the web
 * version never loads the Capacitor packages (they are bundled into the app by Vite).
 */
export const isNativeApp = () => window.Capacitor?.isNativePlatform?.() === true;

export async function loadNativeAdapters() {
  const [{ App }, { NativeTTS }, { NativeSpeechRecognizer }, { AdMobAdProvider }, { LocalNotifications }, { NativePurchases, PURCHASE_TYPE }] = await Promise.all([
    import('@capacitor/app'),
    import('../services/speech/NativeTTS.js'),
    import('../services/speech/NativeSpeechRecognizer.js'),
    import('../services/monetization/AdMobAdProvider.js'),
    import('@capacitor/local-notifications'),
    import('@capgo/native-purchases'),
  ]);
  return { App, NativeTTS, NativeSpeechRecognizer, AdMobAdProvider, LocalNotifications, NativePurchases, PURCHASE_TYPE };
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
        id: DAILY_ID + i, title: 'Anadolu Ailesi 🎁', body: 'Bugünkü ödülünü al! Her gün gelirsen ödül büyür.',
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
