import { el } from './dom.js';
import { gloss } from '../i18n/Gloss.js';

const fsElement = () => document.fullscreenElement ?? document.webkitFullscreenElement ?? null;
const fsEnabled = () => !!(document.fullscreenEnabled ?? document.webkitFullscreenEnabled);
/** iPhone / iPad in the browser: no full-screen API for pages — only "Add to Home Screen" opens the game full screen. */
const iosBrowser = () => /iPhone|iPad|iPod/.test(navigator.userAgent) && !matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches && !navigator.standalone;
const ICON = {
  enter: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/></svg>',
  exit: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5"/></svg>',
};

/** Is there anything a full-screen button can do here (the API, or the iPhone guide)? */
export const fullscreenPossible = () => (fsEnabled() || iosBrowser()) && !fsElement();
export const fullscreenIcon = () => ICON.enter;

let guide = null;
/** iPhone: how to put the game on the home screen (it then opens without the browser bars). */
function showIosGuide() {
  if (!guide) {
    const step = (tr, en) => el('li', {}, [el('b', { text: tr }), el('small', { class: 'en-t', text: ` · ${en}` })]);
    guide = el('div', { class: 'overlay dim ios-guide' }, [el('div', { class: 'card' }, [
      el('h2', { class: 'ctitle', text: 'iPhone’da tam ekran' }),
      el('p', { class: 'cen en-t', text: gloss('On iPhone, a web page cannot go full screen. Put the game on your home screen: it then opens full screen, like an app.') }),
      el('ol', { class: 'ios-steps' }, [
        step('Safari’de alttaki Paylaş ⬆️ düğmesine bas.', gloss('In Safari, tap the Share ⬆️ button at the bottom.')),
        step('“Ana Ekrana Ekle”yi seç, sonra “Ekle”ye bas.', gloss('Choose “Add to Home Screen”, then tap “Add”.')),
        step('Oyunu ana ekrandaki Anadolu Ailesi simgesinden aç.', gloss('Open the game from the Anadolu Ailesi icon on your home screen.')),
      ]),
      el('button', { class: 'btn', text: 'Tamam', attrs: { type: 'button' }, on: { click: () => guide.classList.remove('open') } }),
    ])]);
    document.body.append(guide);
  }
  guide.classList.add('open');
}

// The player chose full screen: if the browser drops out of it by itself (a microphone permission
// prompt, the keyboard, another app), the next tap anywhere brings it back. Only ⛶ turns it off.
let wanted = false;
try { wanted = sessionStorage.getItem('fullscreen') === '1'; } catch { /* private mode */ }
const want = (on) => { wanted = on; try { sessionStorage.setItem('fullscreen', on ? '1' : '0'); } catch { /* ignore */ } };
const restore = () => { if (wanted && fsEnabled() && !fsElement()) enter(); };
['pointerup', 'touchend', 'click', 'keydown'].forEach((e) => addEventListener(e, restore, true)); // a tap is what lets a page go full screen again

// …and a button that says so, while the game is out of full screen against the player's wish
let back = null;
const paintBack = () => {
  if (!back) {
    back = el('button', { class: 'fs-back', html: ICON.enter, attrs: { type: 'button' } });
    back.append(' Tam ekrana dön', el('small', { class: 'en-t', text: ` · ${gloss('Back to full screen')}` }));
    back.addEventListener('click', () => enter());
    document.body.append(back);
  }
  back.hidden = !(wanted && fsEnabled() && !fsElement());
};
document.addEventListener('fullscreenchange', paintBack);
document.addEventListener('webkitfullscreenchange', paintBack);

// Android / Chrome: install the game as an app — it then always opens full screen, and permission
// prompts no longer throw it out of full screen
let installPrompt = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; dispatchEvent(new Event('game-installable')); });
addEventListener('appinstalled', () => { installPrompt = null; dispatchEvent(new Event('game-installable')); });
export const canInstall = () => !!installPrompt;
export async function installApp() {
  if (!installPrompt) return false;
  installPrompt.prompt();
  const { outcome } = await installPrompt.userChoice.catch(() => ({ outcome: 'dismissed' }));
  installPrompt = null;
  return outcome === 'accepted';
}

async function enter() {
  try {
    const root = document.documentElement;
    await (root.requestFullscreen ? root.requestFullscreen({ navigationUI: 'hide' }) : root.webkitRequestFullscreen?.());
    if (matchMedia('(pointer: coarse)').matches) await screen.orientation?.lock?.('landscape').catch(() => {});
  } catch { /* the browser said no: stay as we are */ }
}

/** Full screen now (a phone also turns sideways where the browser allows it); on iPhone, the home-screen guide. */
export async function goFullscreen() {
  if (!fsEnabled()) { if (iosBrowser()) showIosGuide(); return; }
  want(true);
  await enter();
}

/**
 * Full screen, like the button on a video player: pressed it goes full screen (and turns a phone
 * sideways where the browser allows it, Android); pressed again it comes back. On iPhone it
 * explains "Add to Home Screen". Nobody is forced to turn the phone — the game also plays upright.
 */
export function setupLandscape() {
  const btn = el('button', { class: 'pill hud-fs', attrs: { type: 'button', 'aria-label': 'Tam ekran', title: `Tam ekran · ${gloss('Full screen')}` } });
  const paint = () => { const on = !!fsElement(); btn.innerHTML = on ? ICON.exit : ICON.enter; btn.setAttribute('aria-pressed', String(on)); };
  btn.hidden = !(fsEnabled() || iosBrowser());
  btn.addEventListener('click', async () => {
    if (!fsElement()) { goFullscreen(); return; }
    want(false); // the player turned it off
    paintBack();
    try {
      screen.orientation?.unlock?.();
      await (document.exitFullscreen ?? document.webkitExitFullscreen)?.call(document);
    } catch { /* stay */ }
  });
  document.addEventListener('fullscreenchange', paint);
  document.addEventListener('webkitfullscreenchange', paint);
  paint();
  return btn;
}
