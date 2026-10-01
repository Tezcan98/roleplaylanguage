/**
 * Multiplayer classroom port. A session delivers the teacher's questions and the other
 * students' answers; the client submits its own results.
 *
 * Events (subscribe with `on(type, fn)`):
 *   roster   { students: [{ id, name }] }
 *   question { index, total, q, en, hint, expect, keywords }
 *   answer   { studentId, text, correct }
 *   scores   { scores: { [studentId]: number } }
 *   end      { scores }
 */
export class ClassroomSession {
  #handlers = new Map();
  on(type, fn) { if (!this.#handlers.has(type)) this.#handlers.set(type, new Set()); this.#handlers.get(type).add(fn); }
  emit(type, payload) { this.#handlers.get(type)?.forEach((fn) => fn(payload)); }
  async join(player) { throw new Error('join() not implemented'); }
  submit(index, result) {}
  next() {}
  leave() { this.#handlers.clear(); }
}

/**
 * Offline classroom: the teacher script comes from content, classmates are bots that
 * answer after a random delay, sometimes wrong. Same events as a real server.
 */
export class LocalClassroomSession extends ClassroomSession {
  #timers = [];

  constructor({ lesson, bots, speed = 1 }) {
    super();
    Object.assign(this, { lesson, bots, speed });
    this.scores = {};
    this.index = -1;
  }

  async join(player) {
    this.player = player;
    const students = [player, ...this.bots].map(({ id, name }) => ({ id, name }));
    students.forEach((s) => { this.scores[s.id] = 0; });
    this.emit('roster', { students });
    this.next();
    return { students };
  }

  next() {
    this.#clear();
    this.index++;
    const qs = this.lesson.questions;
    if (this.index >= qs.length) { this.emit('end', { scores: { ...this.scores } }); return; }
    const q = qs[this.index];
    this.firstCorrect = null;
    this.emit('question', { index: this.index, total: qs.length, ...q });
    this.bots.forEach((b, i) => {
      const delay = (2500 + Math.random() * 4000 + i * 700) / this.speed;
      this.#timers.push(setTimeout(() => {
        const correct = Math.random() < b.skill;
        const text = correct ? q.botAnswers[(Math.random() * q.botAnswers.length) | 0] : q.botWrong[(Math.random() * q.botWrong.length) | 0];
        this.#score(b.id, correct);
        this.emit('answer', { studentId: b.id, text, correct });
      }, delay));
    });
  }

  submit(index, { text, correct }) {
    if (index !== this.index) return;
    this.#score(this.player.id, correct);
    this.emit('answer', { studentId: this.player.id, text, correct });
  }

  #score(id, correct) {
    if (!correct) return;
    const bonus = this.firstCorrect ? 0 : 5;
    this.firstCorrect ??= id;
    this.scores[id] += 10 + bonus;
    this.emit('scores', { scores: { ...this.scores } });
  }

  #clear() { this.#timers.forEach(clearTimeout); this.#timers = []; }
  leave() { this.#clear(); super.leave(); }
}

/**
 * Online classroom over WebSocket (server not included yet). Protocol, JSON messages:
 *   client → { type: 'join', lesson, player: { id, name } } | { type: 'answer', index, text, correct } | { type: 'next' }
 *   server → the same events as above: { type: 'roster' | 'question' | 'answer' | 'scores' | 'end', ...payload }
 * The server is the source of truth for questions, timing and scores.
 */
export class WebSocketClassroomSession extends ClassroomSession {
  constructor({ url, lesson }) { super(); this.url = url; this.lesson = lesson; }

  join(player) {
    this.player = player;
    this.ws = new WebSocket(this.url);
    this.ws.onmessage = (e) => { const { type, ...payload } = JSON.parse(e.data); this.emit(type, payload); };
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => { this.ws.send(JSON.stringify({ type: 'join', lesson: this.lesson.id, player })); resolve({}); };
      this.ws.onerror = () => reject(new Error('classroom server unreachable'));
    });
  }

  submit(index, { text, correct }) { this.ws?.send(JSON.stringify({ type: 'answer', index, text, correct })); }
  next() { this.ws?.send(JSON.stringify({ type: 'next' })); }
  leave() { this.ws?.close(); super.leave(); }
}
