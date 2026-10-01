import { el } from '../../ui/dom.js';

/**
 * Pay-to-enter for lessons: spend credits, or watch a rewarded ad to earn one.
 * `request(lesson)` resolves true when the player may enter.
 */
export class ClassAccessGate {
  constructor({ host, modes, wallet, ads }) { Object.assign(this, { host, modes, wallet, ads }); }

  request(lesson) {
    const cost = lesson.cost ?? 1;
    return new Promise((resolve) => {
      const pop = this.modes.push('overlay');
      const balance = el('p', { class: 'ctext' });
      const pay = el('button', { class: 'btn', attrs: { type: 'button' } });
      const ad = el('button', { class: 'btn alt', text: '▶ Reklam izle (+1 kredi)', attrs: { type: 'button' } });
      const cancel = el('button', { class: 'btn alt', text: 'Vazgeç', attrs: { type: 'button' } });
      const root = el('div', { class: 'overlay open dim' }, [el('div', { class: 'card' }, [
        el('p', { class: 'chap', text: 'Ders' }),
        el('h2', { class: 'ctitle', text: lesson.title }),
        el('p', { class: 'cen en-t', text: `Lesson: ${lesson.titleEn}` }),
        balance, pay, ad, cancel,
      ])]);
      const refresh = () => {
        balance.textContent = `Bu ders ${cost} kredi. Kredin: ${this.wallet.balance}`;
        pay.textContent = `Krediyle gir (−${cost})`;
        pay.disabled = this.wallet.balance < cost;
      };
      const done = (ok) => { root.remove(); pop(); resolve(ok); };
      pay.onclick = () => { if (this.wallet.trySpend(cost)) done(true); };
      ad.onclick = async () => { ad.disabled = true; if (await this.ads.showRewarded()) this.wallet.add(1, 'ad'); ad.disabled = false; refresh(); };
      cancel.onclick = () => done(false);
      refresh();
      this.host.append(root);
    });
  }
}
