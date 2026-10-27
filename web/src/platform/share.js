/**
 * "Davet et, kazan": the game shared with friends as an invitation — its Google Play page and, for iPhones, anadoluailesi.com.tr/ios. In the app: Android's share
 * sheet (@capacitor/share, apps from 1.0.29 on; it answers whether something was shared). In a
 * browser: the browser's own sheet where there is one. Otherwise (an older app, a desktop browser):
 * a WhatsApp message — counted as shared when the game goes to the background for it.
 * Resolves true when it was (or very likely was) shared.
 */
const TEXT = 'Seni Türk Ailem’e davet ediyorum! Türk bir aileyle yaşayarak Türkçe öğren 🇹🇷';
const LINK = 'https://play.google.com/store/apps/details?id=com.anadolu';
/** iPhone: no App Store app yet — our site's page that opens the game and shows how to put it on the home screen (site/ios/). */
const IOS = 'https://anadoluailesi.com.tr/ios';
/** The whole message, both links in it (some apps put a separate `url` before the text, some drop it). */
const MESSAGE = `${TEXT}\n\n📱 Android: ${LINK}\n🍎 iPhone: ${IOS}`;

export async function shareGame() {
  const cap = window.Capacitor, native = !!cap?.isNativePlatform?.();
  if (native && cap.isPluginAvailable?.('Share')) {
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title: 'Türk Ailem', text: MESSAGE, dialogTitle: 'Arkadaşını davet et' });
      return true; // (closing the sheet without sharing rejects)
    } catch { return false; }
  }
  if (!native && navigator.share) {
    try { await navigator.share({ title: 'Türk Ailem', text: MESSAGE }); return true; } catch { return false; }
  }
  const away = new Promise((done) => {
    const on = () => { if (document.hidden) { off(); done(true); } };
    const off = () => { removeEventListener('visibilitychange', on); clearTimeout(t); };
    const t = setTimeout(() => { off(); done(false); }, 8000);
    addEventListener('visibilitychange', on);
  });
  const wa = `https://wa.me/?text=${encodeURIComponent(MESSAGE)}`;
  if (native) location.href = wa; else window.open(wa, '_blank'); // (the app hands it to WhatsApp / the browser)
  return away;
}
