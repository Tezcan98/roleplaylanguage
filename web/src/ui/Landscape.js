import { el } from './dom.js';
import { gloss } from '../i18n/Gloss.js';

const fsElement = () => document.fullscreenElement ?? document.webkitFullscreenElement ?? null;
const fsEnabled = () => !!(document.fullscreenEnabled ?? document.webkitFullscreenEnabled);

/**
 * Full screen, like the button on a video player: ⛶ goes full screen (and turns a phone
 * sideways where the browser allows it, Android); pressed again it comes back. Nobody is
 * forced to turn the phone — the game also plays upright. Returns the button for the HUD
 * (hidden where the browser can't go full screen, e.g. iPhone Safari).
 */
export function setupLandscape() {
  const btn = el('button', { class: 'pill hud-fs', attrs: { type: 'button', 'aria-label': 'Tam ekran', title: `Tam ekran · ${gloss('Full screen')}` } });
  const paint = () => { const on = !!fsElement(); btn.textContent = on ? '🗗' : '⛶'; btn.setAttribute('aria-pressed', String(on)); };
  btn.hidden = !fsEnabled();
  btn.addEventListener('click', async () => {
    try {
      if (fsElement()) {
        screen.orientation?.unlock?.();
        await (document.exitFullscreen ?? document.webkitExitFullscreen)?.call(document);
        return;
      }
      const root = document.documentElement;
      await (root.requestFullscreen ? root.requestFullscreen({ navigationUI: 'hide' }) : root.webkitRequestFullscreen?.());
      if (matchMedia('(pointer: coarse)').matches) await screen.orientation?.lock?.('landscape').catch(() => {});
    } catch { /* the browser said no: stay as we are */ }
  });
  document.addEventListener('fullscreenchange', paint);
  document.addEventListener('webkitfullscreenchange', paint);
  paint();
  return btn;
}
