/**
 * Android (Capacitor) adapters. Imported dynamically and only inside the app, so the web
 * version never loads the Capacitor packages (they are bundled into the app by Vite).
 */
export const isNativeApp = () => window.Capacitor?.isNativePlatform?.() === true;

export async function loadNativeAdapters() {
  const [{ App }, { NativeTTS }, { NativeSpeechRecognizer }, { AdMobAdProvider }] = await Promise.all([
    import('@capacitor/app'),
    import('../services/speech/NativeTTS.js'),
    import('../services/speech/NativeSpeechRecognizer.js'),
    import('../services/monetization/AdMobAdProvider.js'),
  ]);
  return { App, NativeTTS, NativeSpeechRecognizer, AdMobAdProvider };
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
