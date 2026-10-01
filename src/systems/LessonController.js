import * as THREE from 'three';

/**
 * Runs a classroom lesson: access gate (credits / ad) → seat everyone → questions from a
 * ClassroomSession (local bots or a server) answered out loud → summary → flag `lesson-<id>`.
 */
export class LessonController {
  #pop = null;
  #activity = null;

  constructor({ lessons, bots, gate, sessionFactory, view, activities, cast, world, travel, player, camera, tts, labels, modes, effects, state }) {
    Object.assign(this, { lessons, bots, gate, sessionFactory, view, activities, cast, world, travel, player, camera, tts, labels, modes, effects, state });
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

  async #start(lesson) {
    const room = this.world.get('classroom');
    this.bots.forEach((b) => this.cast.move(b.id, 'classroom', b.seat, 'sitBench'));
    this.player.place(room.anchors.get('seat4'));
    this.player.sit(true);
    this.camera.setFixed(new THREE.Vector3(0, 3.2, 5.6), new THREE.Vector3(0, 1.2, -2.5));
    this.#pop = this.modes.push('lesson');

    const me = { id: 'ahmet', name: 'Ahmet' };
    const session = this.active = this.sessionFactory(lesson, this.bots);
    session.on('roster', ({ students }) => this.view.open(students, students.length));
    session.on('question', (q) => this.#ask(session, q));
    session.on('answer', (a) => {
      this.view.answer(a, me.id);
      if (a.studentId !== me.id) this.labels.bubble(this.cast.get(a.studentId), a.text, a.correct ? 'ok' : 'bad');
    });
    session.on('scores', ({ scores }) => this.view.scoresUpdate(scores, me.id));
    session.on('end', ({ scores }) => {
      this.view.scoresUpdate(scores, me.id);
      this.view.summary(scores, me.id, () => this.#finish(lesson));
      this.tts.speak('Aferin çocuklar! Ders bitti.', { speaker: 'ogretmen' });
    });
    await session.join(me);
  }

  async #ask(session, q) {
    this.view.question(q);
    this.current = q;
    this.tts.speak(q.q, { speaker: 'ogretmen' });
    this.labels.bubble(this.cast.get('ogretmen'), q.q, null, 4);
    this.#activity?.destroy();
    const act = this.#activity = this.activities.create('speak');
    const res = await act.mount(this.view.slot, { expect: q.expect, keywords: q.keywords, hide: true, hint: `İpucu: ${q.hint}`, prompt: 'Cevabını söyle:' });
    if (this.active !== session || this.current !== q) return;
    session.submit(q.index, { text: res.transcript, correct: res.ok });
    this.view.status_(res.ok ? 'Doğru! Sıradaki soru geliyor…' : 'Sıradaki soru geliyor…', res.ok ? 'ok' : 'bad');
    setTimeout(() => { if (this.active === session) session.next(); }, 2500);
  }

  #finish(lesson) {
    this.active?.leave();
    this.active = null;
    this.#activity?.destroy();
    this.view.close();
    this.player.sit(false);
    this.player.place(this.world.get('classroom').anchors.get('seat4'));
    this.player.position.z += 0.9;
    this.camera.clearFixed();
    this.#pop?.();
    this.effects.run([`flag:lesson-${lesson.id}`, ...(lesson.after ?? [])]);
  }

  replay() { if (this.current) this.tts.speak(this.current.q, { speaker: 'ogretmen' }); }
}
