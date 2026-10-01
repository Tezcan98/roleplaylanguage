import { EV } from '../core/events.js';

const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const parseTime = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

/**
 * In-game clock. Time only moves when the story says so (quests and chapters), and it
 * glides towards the new value so the sky visibly changes.
 */
export class TimeSystem {
  #target = null;
  #rate = 0;

  constructor(state, bus) { this.state = state; this.bus = bus; }

  get minutes() { return this.state.minutes; }
  get hour() { return this.state.minutes / 60; }
  get day() { return this.state.day; }
  get dayName() { return DAYS[(this.state.day - 1) % 7]; }
  get dayNameEn() { return DAYS_EN[(this.state.day - 1) % 7]; }
  get isNight() { const h = this.hour; return h >= 20.5 || h < 6; }
  get label() {
    const m = Math.round(this.state.minutes) % (24 * 60);
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  }

  set(day, minutes) {
    this.#target = null;
    this.state.day = day;
    this.state.minutes = minutes;
    this.#emit();
  }

  /** Glide to an absolute time today over `seconds`. */
  advanceTo(minutes, seconds = 2.5) {
    if (minutes <= this.state.minutes) return;
    this.#target = minutes;
    this.#rate = (minutes - this.state.minutes) / seconds;
  }

  advance(delta, seconds = 1.5) { this.advanceTo((this.#target ?? this.state.minutes) + delta, seconds); }

  update(dt) {
    if (this.#target == null) return;
    this.state.minutes = Math.min(this.#target, this.state.minutes + this.#rate * dt);
    if (this.state.minutes >= this.#target) this.#target = null;
    this.#emit();
  }

  #emit() { this.bus.emit(EV.TIME, { day: this.day, minutes: this.minutes, label: this.label }); }
}
