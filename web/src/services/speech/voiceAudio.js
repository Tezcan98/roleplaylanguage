/**
 * One audio element for every spoken line (voice library, server, Piper). Phones — iPhones above
 * all — let a sound start outside a tap only on an element that has already played inside one:
 * a new Audio() per line stayed silent whenever a line began on its own (the teacher's first line,
 * right after the walk into the classroom). So this element plays a moment of silence on the
 * first tap, and every line after that uses it.
 */
const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';
let el = null, unlocked = false, ticker = null;

export function voiceAudio() {
  if (!el) { el = new Audio(); el.preload = 'auto'; }
  return el;
}

function unlock() {
  if (unlocked) return;
  const a = voiceAudio();
  if (a.src && !a.paused) { unlocked = true; return; } // already speaking: it is unlocked
  a.src = SILENT;
  a.play().then(() => { unlocked = true; if (a.src === SILENT) a.pause(); }).catch(() => {});
}
if (typeof addEventListener === 'function') {
  addEventListener('pointerdown', unlock, { passive: true });
  addEventListener('keydown', unlock);
}

/**
 * Play `url` on the shared element; resolves when it ends. `onPlaying` once it really sounds.
 * `volume`: a function (0–1) followed while the line plays — a villager's talk fades as you walk away.
 */
export function playVoice(url, rate = 1, { onError, onPlaying, volume } = {}) {
  const a = voiceAudio();
  a.pause();
  a.onended = null; a.onerror = null; a.onplaying = null;
  clearInterval(ticker); ticker = null;
  a.volume = 1;
  if (typeof volume === 'function') {
    const set = () => { a.volume = Math.max(0, Math.min(1, Number(volume()) || 0)); };
    set(); ticker = setInterval(set, 100);
  }
  return new Promise((resolve, reject) => {
    a.onended = () => { clearInterval(ticker); ticker = null; resolve(); };
    a.onerror = () => { onError?.(); reject(new Error('voice audio failed')); };
    a.onplaying = () => onPlaying?.();
    a.src = url;
    a.preservesPitch = false;
    a.playbackRate = rate;
    a.play().catch((e) => { if (e?.name !== 'AbortError') reject(e); });
  });
}

/** Stop whatever line is being said. */
export function stopVoice() { clearInterval(ticker); ticker = null; if (el) { el.pause(); el.onended = null; el.onerror = null; el.onplaying = null; } }
