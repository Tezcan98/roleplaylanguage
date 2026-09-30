/** Tiny element builder: el('div', { class: 'x', text: 'hi', on: { click } }, children). */
export function el(tag, opts = {}, children = []) {
  const e = document.createElement(tag);
  const { class: cls, text, html, on, attrs, style } = opts;
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  if (html != null) e.innerHTML = html;
  if (attrs) Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
  if (style) Object.assign(e.style, style);
  if (on) Object.entries(on).forEach(([k, fn]) => e.addEventListener(k, fn));
  children.filter(Boolean).forEach((c) => e.append(c));
  return e;
}

export const ICONS = {
  close: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  speaker: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/></svg>',
};
