import { EV } from '../../core/events.js';

/** Lesson credits (stored in GameState.credits). Earned by playing and by rewarded ads. */
export class CreditWallet {
  constructor(state, bus) { this.state = state; this.bus = bus; }

  get balance() { return this.state.credits; }

  add(n, reason = '') {
    this.state.credits += n;
    this.bus.emit(EV.CREDITS, { balance: this.balance, delta: n, reason });
  }

  trySpend(n) {
    if (this.balance < n) return false;
    this.state.credits -= n;
    this.bus.emit(EV.CREDITS, { balance: this.balance, delta: -n });
    return true;
  }
}
