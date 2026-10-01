import { el, ICONS } from './dom.js';
import { gloss } from '../i18n/Gloss.js';

/** Lesson overlay: question, answer activity, live feed and scoreboard. */
export class ClassroomView {
  constructor(host, { onReplay }) {
    this.count = el('span', { class: 'chap' });
    this.q = el('p', { class: 'cls-q' });
    this.en = el('p', { class: 'en en-t' });
    this.slot = el('div', { class: 'activity' });
    this.status = el('p', { class: 'fb' });
    this.feed = el('div');
    this.scores = el('ul');
    this.live = el('span', { class: 'live', text: '● CANLI' });
    this.root = el('div', { class: 'classroom' }, [el('div', { class: 'cls' }, [
      el('div', { class: 'cls-main' }, [
        el('div', { class: 'listen-row', style: { alignItems: 'center', justifyContent: 'space-between' } }, [
          this.count, this.live,
          el('button', { class: 'chipbtn', html: `${ICONS.speaker} Tekrar`, attrs: { type: 'button' }, on: { click: onReplay } }),
        ]),
        this.q, this.en, this.slot, this.status,
      ]),
      el('div', { class: 'cls-side' }, [
        el('div', { class: 'cls-score' }, [el('h4', { text: 'Puanlar' }), this.scores]),
        el('div', { class: 'cls-feed' }, [el('h4', { text: 'Sınıf' }), this.feed]),
      ]),
    ])]);
    host.append(this.root);
  }

  open(students, liveCount) {
    this.students = new Map(students.map((s) => [s.id, s.name]));
    this.live.textContent = `● CANLI · ${liveCount} öğrenci`;
    this.feed.replaceChildren();
    this.root.classList.add('open');
  }
  close() { this.root.classList.remove('open'); this.slot.replaceChildren(); }

  question({ index, total, q, en }) {
    this.count.textContent = `Soru ${index + 1}/${total}`;
    this.q.textContent = q;
    this.en.textContent = gloss(en);
    this.status.textContent = '';
    this.status.className = 'fb';
    this.slot.replaceChildren();
  }

  status_(text, mood) { this.status.textContent = text; this.status.className = `fb ${mood ?? ''}`; }

  answer({ studentId, text, correct }, me) {
    const who = studentId === me ? 'Sen' : this.students.get(studentId);
    this.feed.prepend(el('div', { text: `${correct ? '✓' : '✗'} ${who}: ${text}` }));
  }

  scoresUpdate(scores, me) {
    const rows = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    this.scores.replaceChildren(...rows.map(([id, pts], i) => el('li', { class: id === me ? 'me' : '' }, [
      el('span', { text: `${i + 1}. ${id === me ? 'Sen' : this.students.get(id)}` }), el('span', { text: String(pts) }),
    ])));
  }

  summary(scores, me, onDone) {
    const rows = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const place = rows.findIndex(([id]) => id === me) + 1;
    this.count.textContent = 'Ders bitti!';
    this.q.textContent = place === 1 ? 'Birinci oldun! 🏆' : `${place}. oldun. Aferin!`;
    this.en.textContent = place === 1 ? gloss('You came first!') : gloss('You came {place}. Well done!', { place });
    this.status_('');
    this.slot.replaceChildren(el('button', { class: 'btn', text: 'Dersi bitir', attrs: { type: 'button' }, on: { click: onDone } }));
  }
}
