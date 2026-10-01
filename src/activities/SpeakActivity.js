import { Activity } from './Activity.js';
import { el, ICONS } from '../ui/dom.js';

const MIC = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';

const FEEDBACK = {
  'silent': 'Sesini duyamadım. Mikrofona yakın konuş.',
  'not-turkish': 'Bu Türkçe gibi duyulmadı. Türkçe söyle!',
  'mismatch': 'Tam anlaşılmadı, tekrar dene.',
};

/**
 * Say it out loud. Uses the SpeechEvaluator service (speech-to-text + Turkish detection +
 * answer matching). The speech exam is gated by the shared credit/rewarded-ad system.
 *
 * spec: { expect: string[], keywords?: string[], show?: string, hint?, prompt?, next?, do? }
 */
export class SpeakActivity extends Activity {
  mount(container, spec) {
    const { speech, tts } = this.services;
    const target = spec.show ?? spec.expect?.[0] ?? '';
    return new Promise(async (resolve) => {
      const devSkip = new URLSearchParams(location.search).has('dev') || new URLSearchParams(location.search).has('debug');
      if (this.services.gate && !devSkip) {
        const allowed = await this.services.gate.request({ title: 'Sesli sınav', titleEn: 'Speech exam', cost: 1 });
        if (!allowed) { resolve({ option: {} , ok: false }); return; }
      }
      let lastHeard = '';
      const done = (ok) => resolve({ option: { next: spec.next, do: spec.do }, ok, transcript: lastHeard || target });
      const heard = el('div', { class: 'transcript' });
      const fb = el('div', { class: 'fb' });

      this.mic = el('button', {
        class: 'mic', html: MIC, attrs: { type: 'button', 'aria-label': 'Konuş' },
        on: {
          click: async () => {
            if (this.mic.classList.contains('rec')) return;
            if (!speech.supported) { done(true); return; }
            this.mic.classList.add('rec');
            fb.className = 'fb'; fb.textContent = 'Dinliyorum…'; heard.textContent = '';
            try {
              const r = await speech.evaluate(spec);
              if (!this.root) return;
              heard.textContent = r.transcript ? `“${r.transcript}”` : '';
              lastHeard = r.transcript || lastHeard;
              if (r.pass) { fb.className = 'fb ok'; fb.textContent = 'Harika! ✓'; setTimeout(() => done(true), 700); return; }
              fb.className = 'fb bad'; fb.textContent = FEEDBACK[r.reason];
            } catch (e) {
              fb.className = 'fb bad';
              fb.textContent = /not-allowed|denied/i.test(e.message) ? 'Mikrofon izni gerekli.' : 'Mikrofon çalışmadı, tekrar dene.';
            } finally { this.mic?.classList.remove('rec'); }
          },
        },
      });

      const noMic = !speech.supported;
      this.root = el('div', {}, [
        el('p', { class: 'act-prompt', text: spec.prompt ?? (noMic ? 'Sesli oku, sonra butona bas:' : 'Mikrofona bas ve söyle:') }),
        spec.hide ? el('p', { class: 'speak-target masked', text: spec.hint ?? '…' })
          : el('p', { class: 'speak-target', text: target }),
        spec.showEn && el('p', { class: 'en en-t', text: spec.showEn }),
        el('div', { class: 'speak-row' }, [
          this.mic,
          devSkip && el('button', { class: 'chipbtn', text: 'Geç (DEV)', attrs: { type: 'button' }, on: { click: () => done(true) } }),
          noMic ? el('span', { class: 'fb', text: 'Tarayıcın ses tanımayı desteklemiyor. Okuyunca mikrofona bas.' }) : null,
          !spec.hide && el('button', { class: 'chipbtn', html: `${ICONS.speaker} Örnek`, attrs: { type: 'button' }, on: { click: () => tts.speak(target, { speaker: 'ahmet' }) } }),
        ]),
        heard, fb,
      ]);
      container.append(this.root);
    });
  }

  key(n) { if (n !== 1 || !this.mic) return false; this.mic.click(); return true; }
  destroy() { this.services.speech.cancel(); this.mic = null; super.destroy(); }
}
