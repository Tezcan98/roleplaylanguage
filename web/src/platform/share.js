/**
 * "Paylaş, kazan": the game's Google Play page shared with friends. In the app: Android's share
 * sheet (@capacitor/share, apps from 1.0.29 on; it answers whether something was shared). In a
 * browser: the browser's own sheet where there is one. Otherwise (an older app, a desktop browser):
 * a WhatsApp message — counted as shared when the game goes to the background for it.
 * Resolves true when it was (or very likely was) shared.
 */
const TEXT = 'Türkçeyi bir Türk ailesiyle köyde yaşayarak öğren: Türk Ailem 🇹🇷';
const LINK = 'https://play.google.com/store/apps/details?id=com.anadolu';

export async function shareGame() {
  const cap = window.Capacitor, native = !!cap?.isNativePlatform?.();
  if (native && cap.isPluginAvailable?.('Share')) {
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title: 'Türk Ailem', text: TEXT, url: LINK, dialogTitle: 'Arkadaşlarınla paylaş' });
      return true; // (closing the sheet without sharing rejects)
    } catch { return false; }
  }
  if (!native && navigator.share) {
    try { await navigator.share({ title: 'Türk Ailem', text: TEXT, url: LINK }); return true; } catch { return false; }
  }
  const away = new Promise((done) => {
    const on = () => { if (document.hidden) { off(); done(true); } };
    const off = () => { removeEventListener('visibilitychange', on); clearTimeout(t); };
    const t = setTimeout(() => { off(); done(false); }, 8000);
    addEventListener('visibilitychange', on);
  });
  const wa = `https://wa.me/?text=${encodeURIComponent(`${TEXT} ${LINK}`)}`;
  if (native) location.href = wa; else window.open(wa, '_blank'); // (the app hands it to WhatsApp / the browser)
  return away;
}
