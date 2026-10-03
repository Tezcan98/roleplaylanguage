import { el, ICONS } from './dom.js';
import { gloss } from '../i18n/Gloss.js';

/** Lesson overlay: the teacher's presentation, practice, then questions with a live feed and scoreboard. */
export class ClassroomView {
  constructor(host, { onReplay }) {
    this.count = el('span', { class: 'chap' });
    this.head = el('div', { class: 'cls-head' });
    this.words = el('div', { class: 'words' });
    this.nav = el('div', { class: 'row cls-nav' });
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
        this.head, this.q, this.en, this.words, this.slot, this.status, this.nav,
      ]),
      el('div', { class: 'cls-side' }, [
        el('div', { class: 'cls-score' }, [el('h4', { text: 'Puanlar' }), this.scores]),
        el('div', { class: 'cls-feed' }, [el('h4', { text: 'Sınıf' }), this.feed]),
      ]),
    ])]);
    host.append(this.root);
  }

  /** Lesson header: level, title and what the student will be able to do. */
  openLesson(lesson) {
    this.head.replaceChildren(
      el('span', { class: 'lvl', text: lesson.level ?? 'A1' }),
      el('b', { text: lesson.title }),
      el('small', { class: 'en-t', text: ` · ${gloss(lesson.titleEn)}` }),
    );
    this.head.hidden = false;
    this.live.textContent = '● DERS';
    this.feed.replaceChildren();
    this.scores.replaceChildren();
    this.root.classList.add('open');
    document.body.classList.add('in-lesson');
  }

  open(students, liveCount) {
    this.students = new Map(students.map((s) => [s.id, s.name]));
    this.live.textContent = `● CANLI · ${liveCount} öğrenci`;
    this.head.hidden = true;
    this.root.classList.add('open');
  }
  close() { this.root.classList.remove('open'); this.slot.replaceChildren(); this.nav.replaceChildren(); document.body.classList.remove('in-lesson'); }

  #clear() { this.slot.replaceChildren(); this.nav.replaceChildren(); this.words.replaceChildren(); this.status_(''); }

  /** The teacher just talking (no task). */
  teacherLine(say, en, label) {
    this.#clear();
    this.count.textContent = label;
    this.q.textContent = `👩‍🏫 ${say}`;
    this.en.textContent = gloss(en);
  }

  /** One presentation step: what the teacher says + new words; Next (or the repeat activity). */
  teachStep(step, i, n, { onNext, onSkip, onReplay }) {
    this.teacherLine(step.say, step.en, `Anlatım ${i + 1}/${n}`);
    this.words.replaceChildren(...(step.words ?? []).map(([tr, en]) => el('span', { class: 'word' }, [`${tr} `, el('span', { class: 'en-t', text: `= ${gloss(en)}` })])));
    this.nav.replaceChildren(...[ // (a missing button is left out, not written as "null")
      el('button', { class: 'chipbtn', html: `${ICONS.speaker} Tekrar dinle`, attrs: { type: 'button' }, on: { click: onReplay } }),
      !step.repeat && el('button', { class: 'chipbtn primary cls-next', text: 'Anladım, devam ▶', attrs: { type: 'button' }, on: { click: onNext } }),
      onSkip && el('button', { class: 'linkbtn', text: 'Anlatımı geç', attrs: { type: 'button' }, on: { click: onSkip } }),
    ].filter(Boolean));
  }

  practiceStep(p, i, n) {
    this.#clear();
    this.count.textContent = `Alıştırma ${i + 1}/${n}`;
    this.q.textContent = p.activity === 'listen' ? '🔊 Dinle ve seç.' : p.say;
    this.en.textContent = p.activity === 'listen' ? '' : gloss(p.en);
  }

  question({ index, total, q, en, who }) {
    this.#clear();
    this.count.textContent = `Soru ${index + 1}/${total}`;
    this.q.textContent = q;
    this.en.textContent = who ? `${who}, ${gloss(en)}` : gloss(en);
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
