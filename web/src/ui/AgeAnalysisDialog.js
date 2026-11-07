import { el } from './dom.js';
import { ui } from '../i18n/Gloss.js';
import { AGE_BANDS, AGE_VERSION, ageChoice } from '../services/AgeAnalysis.js';

export class AgeAnalysisDialog {
  constructor(host, { settings, modes, onChange = () => {} }) { Object.assign(this, { host, settings, modes, onChange }); }
  open() {
    if (this.root) return;
    const pop = this.modes.push('overlay');
    const selected = ageChoice(this.settings);
    const select = el('select', { attrs: { 'aria-label': 'Yaş aralığın' } }, [
      el('option', { text: ui('Yaş aralığını seç', 'Choose your age range'), attrs: { value: '' } }),
      el('option', { text: ui('18 yaşından küçüğüm', 'I am under 18'), attrs: { value: 'minor' } }),
      ...AGE_BANDS.map((band) => el('option', { text: band, attrs: { value: band } })),
    ]);
    select.value = selected?.band ?? '';
    const tick = el('input', { attrs: { type: 'checkbox' } });
    const save = el('button', { class: 'btn', text: ui('İzin ver ve paylaş', 'Allow and share'), attrs: { type: 'button', disabled: '' } });
    const minor = el('p', { class: 'note', text: ui('18 yaş altından yaş analizi verisi toplamıyoruz. Paylaşmadan devam edebilirsin.', 'We do not collect age analysis data from under-18s. Continue without sharing.') });
    minor.hidden = true;
    const paint = () => { save.disabled = !AGE_BANDS.includes(select.value) || !tick.checked; minor.hidden = select.value !== 'minor'; };
    select.onchange = paint; tick.onchange = paint;
    const close = () => { this.root.remove(); this.root = null; pop(); };
    const decline = () => { this.settings.set('ageAnalysis', { v: AGE_VERSION, declined: true }); this.onChange(); close(); };
    save.onclick = () => {
      if (save.disabled) return;
      this.settings.set('ageAnalysis', { v: AGE_VERSION, band: select.value, at: Date.now() });
      this.onChange(); close();
    };
    this.root = el('div', { class: 'overlay open dim age-analysis', attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'İsteğe bağlı yaş analizi' } }, [
      el('div', { class: 'card consent' }, [
        el('div', { class: 'consent-text' }, [
          el('h2', { class: 'ctitle', text: ui('Oyunu geliştirmemize yardım et', 'Help us improve the game') }),
          el('p', { class: 'ctext', text: ui('İstersen yaş aralığını paylaş. Doğum tarihini istemiyoruz; bu seçim oyununu etkilemez.', 'Optionally share your age range. We do not ask for your birth date; your choice does not affect gameplay.') }),
          el('p', { class: 'note', text: ui('nsSoft, yaş aralığını bu cihazın oyun süresi, tamamlanan görevleri ve geri dönüş günleriyle birlikte kendi sunucusunda en çok 30 gün tutar. Ölçüm izninden sonra başlar. Veriler Google’a gönderilmez ve reklam hedeflemesi için kullanılmaz. Ayarlar → Yaş analizi bölümünden iznini geri alıp yaş analizini silebilirsin.', 'nsSoft stores your age range with this device’s play time, completed tasks and return days on its own server for up to 30 days. Measurement starts after consent. It is not sent to Google or used for ad targeting. Withdraw and delete it in Settings → Age analysis.') }),
          el('a', { text: ui('Aydınlatma ve hakların', 'Privacy notice and your rights'), attrs: { href: 'https://anadoluailesi.com.tr/gizlilik/#yas-analizi', target: '_blank', rel: 'noopener' } }),
          select, minor,
        ]),
        el('div', { class: 'consent-act' }, [
          el('label', { class: 'consent-tick' }, [tick, el('span', { text: ui('18 yaşındayım veya daha büyüğüm. Yaş aralığımın açıklanan oyun analizi için işlenmesine izin veriyorum.', 'I am 18 or older. I consent to my age range being processed for the described game analysis.') })]),
          save,
          el('button', { class: 'btn alt', text: selected ? ui('İzni geri al ve yaş analizini sil', 'Withdraw and delete age analysis') : ui('Paylaşmadan devam et', 'Continue without sharing'), attrs: { type: 'button' }, on: { click: decline } }),
          selected && el('button', { class: 'btn alt', text: ui('Değiştirmeden kapat', 'Close without changes'), attrs: { type: 'button' }, on: { click: close } }),
        ]),
      ]),
    ]);
    this.host.append(this.root);
    select.focus();
  }
}
