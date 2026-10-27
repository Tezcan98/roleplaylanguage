/**
 * "Bize destek ol, puan ver": the game's Google Play page, where a player can rate it. No reward for
 * it — Google Play forbids rewarding ratings or reviews in any way. In the app the link goes to the Play
 * Store app (Android opens play.google.com links there); in a browser, a new tab.
 */
const STORE = 'https://play.google.com/store/apps/details?id=com.anadolu';

/** Where rating makes sense: the Android app, or a browser on Android (no App Store app yet). */
export const canRate = () => !!window.Capacitor?.isNativePlatform?.() || /Android/i.test(navigator.userAgent);

export function openStore(settings) {
  settings?.set('rateTapped', true); // (the note at the top asks twice more, then stops: ui/RatePrompt.js)
  if (window.Capacitor?.isNativePlatform?.()) location.href = STORE; else window.open(STORE, '_blank');
}
