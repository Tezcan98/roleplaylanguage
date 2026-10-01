import { el } from './dom.js';
import { gloss } from '../i18n/Gloss.js';

/**
 * The game is played sideways on phones: a "turn your phone" screen covers portrait
 * (CSS decides when, see #rotate), and the first tap asks for full screen with the
 * orientation locked to landscape where the browser allows it (Android).
 */
export function setupLandscape(host) {
  host.append(el('div', { attrs: { id: 'rotate' } }, [
    el('div', { class: 'rot-ico', text: '📱' }),
    el('p', { class: 'rot-tr', text: 'Telefonunu yan çevir' }),
    el('p', { class: 'rot-gl en-t', text: gloss('Turn your phone sideways to play') }),
  ]));
  if (!matchMedia('(pointer: coarse)').matches) return;
  const lock = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' });
      await screen.orientation?.lock?.('landscape');
    } catch { /* iOS / desktop: the rotate screen is enough */ }
  };
  addEventListener('pointerdown', lock, { once: true });
}
