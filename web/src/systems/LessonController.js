import * as THREE from 'three';
import { playerName } from '../i18n/Persona.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Runs a classroom lesson: access gate (credits / ad) → seat everyone → the teacher
 * presents the topic on the board (teach, with repeat-after-me) → practice exercises →
 * questions in turn with the classmates from a ClassroomSession (local bots or a server),
 * answered out loud → summary → flag `lesson-<id>`.
 */
export class LessonController {
  #pop = null;
  #activity = null;

  constructor({ lessons, bots, gate, sessionFactory, view, activities, cast, world, travel, player, camera, tts, labels, modes, effects, state, vocab }) {
    Object.assign(this, { lessons, bots, gate, sessionFactory, view, activities, cast, world, travel, player, camera, tts, labels, modes, effects, state, vocab });
    this.active = null;
  }

  done(id) { return !!this.state.flags[`lesson-${id}`]; }

  /** Classroom door: pay (once per lesson), then walk in and start. */
  async enter(id) {
    const lesson = this.lessons[id];
    if (this.done(id)) { this.travel.go('classroom', 'door'); return; }
    if (!(await this.gate.request(lesson))) return;
    this.travel.go('classroom', 'door', () => this.#start(lesson));
  }

  /**
   * Free practice any time (1 credit): one of the lessons again — the ones already done
   * first — with the presentation (skippable), the exercises and the class questions.
   * `onDone()` runs after the summary (the caller takes the player home).
   * @returns {Promise<boolean>} false when the player didn't pay
   */
  async practice({ onDone }) {
    const all = Object.values(this.lessons);
    const done = all.filter((l) => this.done(l.id));
    const pool = done.length ? done : all.slice(0, 1);
    const base = pool[(Math.random() * pool.length) | 0];
    const lesson = { ...base, id: `practice-${base.id}`, title: `Tekrar: ${base.title}`, titleEn: 'Free practice', isPractice: true };
    if (!(await this.gate.request(lesson))) return false;
    this.onPracticeDone = onDone;
    this.travel.go('classroom', 'door', () => { this.cast.move('ogretmen', 'classroom', 'teacher', 'teach'); this.#start(lesson); });
    return true;
  }

  async #start(lesson) {
    const room = this.world.get('classroom');
    this.bots.forEach((b) => this.cast.move(b.id, 'classroom', b.seat, 'sitBench'));
    this.player.place(room.anchors.get('seat4'));
    this.player.sit(true);
    this.camera.setFixed(new THREE.Vector3(3.4, 3.4, 6.6), new THREE.Vector3(2.9, 1.0, -2.2)); // board, teacher and classmates on the left; the lesson panel on the right
    this.#pop = this.modes.push('lesson');
    const run = this.run = {}; // identity of this lesson run (closing it stops the stages)
    this.view.openLesson(lesson);
    room.writeBoard(lesson.title, (lesson.goals ?? []).map(([tr]) => `• ${tr}`));

    if (lesson.teach?.length) await this.#teach(lesson, room, run);
    if (this.run !== run) return;
    if (lesson.practice?.length) await this.#practice(lesson, run);
    if (this.run !== run) return;
    if (lesson.intro) {
      this.view.teacherLine(lesson.intro.say, lesson.intro.en, 'Soru-cevap');
      this.tts.speak(lesson.intro.say, { speaker: 'ogretmen' });
      await wait(2200);
      if (this.run !== run) return;
    }
    this.#questions(lesson);
  }

  /** Presentation: the teacher explains each step on the board; repeat steps are said out loud. */
  async #teach(lesson, room, run) {
    let skip = false;
    for (let i = 0; i < lesson.teach.length && !skip && this.run === run; i++) {
      const step = lesson.teach[i];
      room.writeBoard(lesson.title, step.board ?? []);
      (step.words ?? []).forEach(([tr, en]) => this.vocab?.learn(tr, en));
      this.tts.speak(step.say, { speaker: 'ogretmen' });
      this.labels.bubble(this.cast.get('ogretmen'), step.say, null, 5);
      const r = await new Promise((resolve) => {
        this.view.teachStep(step, i, lesson.teach.length, { onNext: () => resolve('next'), onSkip: lesson.isPractice || this.done(lesson.id) ? () => resolve('skip') : null /* revision: skippable */, onReplay: () => this.tts.speak(step.say, { speaker: 'ogretmen' }) });
        if (!step.repeat) return;
        this.#activity?.destroy();
        this.step = { activity: 'speak', ...step };
        this.#activity = this.activities.create('speak');
        this.#activity.mount(this.view.slot, { expect: step.expect, show: step.board?.[0], prompt: 'Sıra sende — söyle:', hint: step.board?.[0] })
          .then(() => resolve('next'));
      });
      if (r === 'skip') skip = true;
    }
    this.#activity?.destroy();
    this.step = null;
  }

  /** Controlled practice for the student alone: choice / listen / order. */
  async #practice(lesson, run) {
    for (let i = 0; i < lesson.practice.length && this.run === run; i++) {
      const p = lesson.practice[i];
      this.view.practiceStep(p, i, lesson.practice.length);
      this.#activity?.destroy();
      this.step = p;
      this.#activity = this.activities.create(p.activity);
      await this.#activity.mount(this.view.slot, { ...p, speaker: p.speaker ?? 'ogretmen', onWrong: () => this.view.status_(`İpucu: ${p.hint ?? p.answer ?? ''}`, 'bad') });
      if (this.run !== run) return;
      this.view.status_('Doğru! 👍', 'ok');
      await wait(900);
    }
    this.#activity?.destroy();
    this.step = null;
  }

  /** The class round: questions in turn, answered out loud. */
  async #questions(lesson) {
    const me = { id: 'ahmet', name: playerName() };
    const session = this.active = this.sessionFactory(lesson, this.bots);
    session.on('roster', ({ students }) => this.view.open(students, students.length));
    session.on('question', (q) => this.#ask(session, q));
    session.on('answer', (a) => {
      this.view.answer(a, me.id);
      if (a.studentId !== me.id) {
        this.labels.bubble(this.cast.get(a.studentId), a.text, a.correct ? 'ok' : 'bad');
        this.tts.speak(a.text, { speaker: a.studentId });
        // a classmate just took their turn: move on to the next question
        if (this.current?.turnStudentId === a.studentId) setTimeout(() => { if (this.active === session) session.next(); }, 2500);
      }
    });
    session.on('scores', ({ scores }) => this.view.scoresUpdate(scores, me.id));
    session.on('end', ({ scores }) => {
      this.view.scoresUpdate(scores, me.id);
      this.view.summary(scores, me.id, () => this.#finish(lesson));
      this.tts.speak('Aferin çocuklar! Bugünkü ders bitti.', { speaker: 'ogretmen' });
    });
    await session.join(me);
  }

  async #ask(session, q) {
    // "Elif, kaç yaşındasın?" — questions written in lower case get the student's name in front
    const who = q.turnStudentId === 'ahmet' ? playerName() : this.cast.get(q.turnStudentId)?.name ?? '';
    const said = /^[a-zçğıöşü]/.test(q.q) && who ? `${who}, ${q.q}` : q.q;
    q = { ...q, q: said, who: said !== q.q ? who : '' };
    this.view.question(q);
    this.current = q;
    this.tts.speak(said, { speaker: 'ogretmen' });
    this.labels.bubble(this.cast.get('ogretmen'), said, null, 4);
    this.#activity?.destroy();

    if (q.turnStudentId !== 'ahmet') {
      const student = this.cast.get(q.turnStudentId);
      const name = student?.name ?? q.turnStudentId;
      this.view.status_(`${name} konuşuyor…`, 'ok');
      return;
    }

    const act = this.#activity = this.activities.create('speak');
    const res = await act.mount(this.view.slot, {
      expect: q.expect, keywords: q.keywords, hide: true,
      hint: `İpucu: ${q.hint}`, prompt: 'Sıra sende — söyle:'
    });
    if (this.active !== session || this.current !== q) return;
    session.submit(q.index, { text: res.transcript, correct: res.ok });
    this.view.status_(res.ok ? 'Doğru! Sıradaki öğrenci geliyor…' : 'Tekrar deneyebilirsin; sıra ilerliyor…', res.ok ? 'ok' : 'bad');
    setTimeout(() => { if (this.active === session) session.next(); }, 2500);
  }

  #finish(lesson) {
    this.run = null;
    this.active?.leave();
    this.active = null;
    this.#activity?.destroy();
    this.view.close();
    this.player.sit(false);
    this.player.place(this.world.get('classroom').anchors.get('seat4'));
    this.player.position.z += 0.9;
    this.camera.clearFixed();
    this.#pop?.();
    if (lesson.isPractice) { this.onPracticeDone?.(); return; }
    this.effects.run([`flag:lesson-${lesson.id}`, ...(lesson.after ?? [])]);
  }

  replay() { if (this.current) this.tts.speak(this.current.q, { speaker: 'ogretmen' }); }
}
