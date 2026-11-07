import * as THREE from 'three';
import { seatAt } from '../world/seats.js';
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

  /** Classroom door: walk in and start (lessons are free). */
  async enter(id) {
    const lesson = this.lessons[id];
    if (this.done(id)) { this.travel.go('classroom', 'door'); return; }
    this.travel.go('classroom', 'door', () => this.#start(lesson));
  }

  /**
   * Free practice any time (no credits): one of the lessons again — the ones already done
   * first — with the presentation (skippable), the exercises and the class questions.
   * `onDone()` runs after the summary (the caller takes the player home).
   * @returns {Promise<boolean>} true (it always starts)
   */
  async practice({ onDone }) {
    const all = Object.values(this.lessons);
    const done = all.filter((l) => this.done(l.id));
    const pool = done.length ? done : all.slice(0, 1);
    const base = pool[(Math.random() * pool.length) | 0];
    const lesson = { ...base, id: `practice-${base.id}`, title: `Tekrar: ${base.title}`, titleEn: 'Free practice', isPractice: true };
    this.onPracticeDone = onDone;
    this.travel.go('classroom', 'door', () => { this.cast.move('ogretmen', 'classroom', 'teacher', 'teach'); this.#start(lesson); });
    return true;
  }

  async #start(lesson) {
    const room = this.world.get('classroom');
    this.bots.forEach((b) => this.cast.move(b.id, 'classroom', b.seat, 'sitBench'));
    this.player.place(room.anchors.get('seat4'));
    this.player.sit(true, seatAt(room, room.anchors.get('seat4')));
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
      await this.tts.speak(lesson.intro.say, { speaker: 'ogretmen' });
      await wait(800);
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
      this.labels.bubble(this.cast.get('ogretmen'), step.say, null, 5, step.en);
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
    session.on('answer', (a) => this.#answer(session, a, me.id));
    session.on('scores', ({ scores }) => this.view.scoresUpdate(scores, me.id));
    session.on('end', ({ scores }) => {
      this.view.scoresUpdate(scores, me.id);
      this.view.summary(scores, me.id, () => this.#finish(lesson));
      this.tts.speak('Aferin çocuklar! Bugünkü ders bitti.', { speaker: 'ogretmen' });
    });
    await session.join(me);
  }

  async #answer(session, a, playerId) {
    const q = this.current;
    if (a.studentId === playerId || !q || this.answering === q) return;
    this.answering = q;
    const live = () => this.active === session && this.current === q;
    await this.#waitForQuestion();
    if (!live()) return;
    await wait(650);
    if (!live()) return;
    this.view.answer(a, playerId);
    this.labels.bubble(this.cast.get(a.studentId), a.text, a.correct ? 'ok' : 'bad');
    await this.tts.speak(a.text, { speaker: a.studentId });
    if (!live()) return;
    if (!a.correct) {
      await wait(850);
      if (!live()) return;
      await this.#correct(a.studentId);
    }
    await wait(1300);
    if (live() && q.turnStudentId === a.studentId) session.next();
  }

  async #waitForQuestion() {
    let speech;
    do { speech = this.questionSpeech; await speech; } while (speech !== this.questionSpeech);
  }

  async #ask(session, q) {
    // "Elif, kaç yaşındasın?" — questions written in lower case get the student's name in front
    const who = q.turnStudentId === 'ahmet' ? playerName() : this.cast.get(q.turnStudentId)?.name ?? '';
    const said = /^[a-zçğıöşü]/.test(q.q) && who ? `${who}, ${q.q}` : q.q.charAt(0).toLocaleUpperCase('tr') + q.q.slice(1); // (the player has no name: just the question)
    q = { ...q, q: said, who: said !== q.q ? who : '' };
    this.view.question(q);
    this.current = q;
    // the player's own name would make the line new for every player (her voice is made once per sentence): she says the question only
    this.spoken = q.turnStudentId === 'ahmet' && q.who ? said.slice(q.who.length + 2).replace(/^./, (c) => c.toLocaleUpperCase('tr-TR')) : said;
    this.questionSpeech = this.tts.speak(this.spoken, { speaker: 'ogretmen' });
    this.labels.bubble(this.cast.get('ogretmen'), said, null, 4, q.en);
    this.#activity?.destroy();
    await this.#waitForQuestion();
    if (this.active !== session || this.current !== q) return;
    await wait(650);
    if (this.active !== session || this.current !== q) return;

    if (q.turnStudentId !== 'ahmet') {
      const student = this.cast.get(q.turnStudentId);
      const name = student?.name ?? q.turnStudentId;
      this.view.status_(`${name} düşünüyor…`, 'ok');
      session.ready?.(q.index);
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
    this.view.answer({ studentId: 'ahmet', text: res.transcript, correct: res.ok }, 'ahmet');
    if (!res.ok) {
      await wait(850);
      if (this.active !== session || this.current !== q) return;
      await this.#correct('ahmet');
    }
    await wait(1300);
    if (this.active === session && this.current === q) session.next();
  }

  /**
   * A wrong answer: the teacher says what it should have been ("Hayır, Elif. Doğrusu: …").
   * For the player she says only "Hayır, doğrusu şöyle:" out loud (the right sentence may hold the
   * player's own name: a new voice line for every player) — the whole of it is in her bubble.
   */
  async #correct(studentId) {
    const q = this.current;
    if (!q) return;
    const mine = studentId === 'ahmet', name = mine ? playerName() : this.cast.get(studentId)?.name ?? '';
    const right = mine ? String(q.hint ?? q.botAnswers?.[0] ?? '').replace('{name}', '…') : String(q.botAnswers?.[0] ?? q.hint ?? '').replace('{name}', name); // (mine: "Benim adım …" — their own name)
    if (!right) return;
    const said = mine ? 'Hayır, doğrusu şöyle:' : `Hayır, ${name}. Doğrusu: ${right}`;
    const speech = this.tts.speak(said, { speaker: 'ogretmen' });
    this.labels.bubble(this.cast.get('ogretmen'), mine ? `${said} ${right}` : said, null, 4.5, `Not quite. The right answer: “${right}”`);
    await speech;
  }

  #finish(lesson) {
    this.run = null;
    this.tts.cancel();
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

  replay() {
    if (this.current && this.answering !== this.current) this.questionSpeech = this.tts.speak(this.spoken ?? this.current.q, { speaker: 'ogretmen' });
  }
}
