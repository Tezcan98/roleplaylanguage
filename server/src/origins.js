export const DEFAULT_ORIGINS = 'https://tezcan98.github.io,https://localhost,capacitor://localhost,http://localhost:*,http://127.0.0.1:*';

/** "a,b, c" → ['a', 'b', 'c'] */
export const parseOrigins = (text = DEFAULT_ORIGINS) => text.split(',').map((o) => o.trim()).filter(Boolean);

/**
 * Browser origin check. `*` allows all, a trailing `:*` allows any port. Clients without an
 * Origin header (not a browser) are let through; the per-IP limit still applies to them.
 */
export function originAllowed(origin, list) {
  if (!origin || list.includes('*')) return true;
  return list.some((o) => (o.endsWith(':*') ? origin === o.slice(0, -2) || origin.startsWith(o.slice(0, -1)) : origin === o));
}
