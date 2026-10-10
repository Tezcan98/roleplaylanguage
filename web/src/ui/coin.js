import { el } from './dom.js';

/**
 * The credit coin, drawn (SVG) instead of the 🪙 emoji: that emoji is new (2020), older iPhones
 * showed a box or another picture for it. Sized like the text around it.
 */
const SVG = '<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#E0A82E"/><circle cx="12" cy="12" r="8.6" fill="#F6CB4C" stroke="#C88E1E" stroke-width="1.2"/><path d="M12 6.8l1.6 3.3 3.6.5-2.6 2.5.6 3.6L12 15l-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" fill="#E0A82E"/><path d="M6.5 8.5a7 7 0 0 1 4-3" stroke="#FFF3C4" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>';

export const coin = () => el('span', { class: 'coin', html: SVG });
export const COIN_HTML = `<span class="coin">${SVG}</span>`;
