import { el } from '../ui/dom.js';
import { gloss } from '../i18n/Gloss.js';
import { TALKS, CHESS_COMMENTS } from '../content/index.js';
import { TALK_SPOTS } from '../world/locations/VillageSquare.js';

const NEAR = 16;  // m: villagers' speech bubbles show to anyone this close
const PAUSE = 7;  // s between two conversations
const LOG = 5;    // lines kept in the listening panel

/**
 * Sitting places in the square where people talk: the tea garden and the benches round the
 * chess board. The regulars chat among themselves all day (bubbles over their heads); sit
 * down in one of these places and you listen in — every line is read aloud and written in a
 * small panel with its meaning. Online, what other players say there (push-to-talk) joins
 * the panel too, and İsmail Dede comments on the moves of the giant chess game.
 */
export class TalkAreas {
  #timer = 3;
  #queue = [];
  #order = {};
  #listening = null;

  constructor({ host, world, player, cast, labels, tts, vocab }) {
    Object.assign(this, { world, player, cast, labels, tts, vocab });
    this.title = el('b', { class: 'talk-title' });
    this.lines = el('div', { class: 'talk-lines' });
    this.root = el('div', { class: 'talk-panel', attrs: { 'aria-live': 'polite' } }, [this.title, this.lines]);
    host.append(this.root);
  }

  /** Which sitting place the player is listening in (seated inside it), or null. */
  get listening() { return this.#listening; }

  #spotAt(pos) {
    for (const [id, s] of Object.entries(TALK_SPOTS)) if (Math.hypot(pos.x - s.x, pos.z - s.z) < s.r) return id;
    return null;
  }

  update(dt) {
    const inSquare = this.world.current?.id === 'village';
    const here = inSquare && this.player.seated ? this.#spotAt(this.player.position) : null;
    if (here !== this.#listening) this.#listen(here);
    if (!inSquare) return;
    this.#timer -= dt;
    if (this.#timer > 0) return;
    // talk goes on in both places; the one you sit in gets your attention first
    const spot = this.#listening ?? (Math.random() < 0.33 ? 'coffee' : Math.random() < 0.5 ? 'cay' : 'chess');
    if (!this.#queue.length) {
      this.#queue = this.#nextTalk(spot).map((l) => ({ ...l, spot }));
      if (!this.#queue.length) { this.#timer = PAUSE; return; }
    }
    const line = this.#queue.shift();
    this.#timer = this.#say(line) + (this.#queue.length ? 0.6 : PAUSE);
  }

  /** The next conversation of a place (shuffled, none repeated until all were heard). */
  #nextTalk(spot) {
    const all = TALKS[spot] ?? [];
    if (!this.#order[spot]?.length) this.#order[spot] = all.map((_, i) => i).sort(() => Math.random() - 0.5);
    return all[this.#order[spot].shift()] ?? [];
  }

  /** A villager says a line: bubble for anyone near, voice and panel for listeners. Returns its length in s. */
  #say({ who, tr, en, spot }) {
    const c = this.cast.get(who);
    const secs = 2.2 + tr.length * 0.07;
    if (!c?.visible || c.location !== 'village') return 0;
    if (Math.hypot(c.position.x - this.player.position.x, c.position.z - this.player.position.z) < NEAR) this.labels.bubble(c, tr, null, secs);
    if (spot === this.#listening) {
      this.tts.speak(tr, { speaker: who });
      this.#add(c.def?.short ?? who, tr, gloss(en));
    }
    return secs;
  }

  /** Someone online spoke (push-to-talk): goes in the panel if they are in the place I'm listening in. */
  heard(char, text) {
    if (!this.#listening || this.#spotAt(char.position) !== this.#listening) return;
    this.#add(char.name ?? '?', text, '');
  }

  /** A move on the giant board: İsmail Dede reacts (right away, before his next remark). */
  chessMoved({ piece, captured, check, mate }) {
    const c = CHESS_COMMENTS;
    const line = mate ? c.mate : check ? c.check : captured ? c.capture[captured] : c.move[piece];
    if (!line) return;
    this.#queue = this.#queue.filter((l) => l.spot !== 'chess');
    if (this.world.current?.id === 'village') this.#timer = Math.min(this.#timer, 0.8);
    this.#queue.unshift({ who: 'ismail', ...line, spot: 'chess' });
  }

  #listen(spot) {
    this.#listening = spot;
    this.lines.replaceChildren();
    this.root.classList.toggle('open', !!spot);
    if (!spot) return;
    this.title.replaceChildren(
      `🎧 ${spot === 'coffee' ? 'Kahvehane sohbeti' : spot === 'cay' ? 'Çay bahçesi sohbeti' : 'Satranç köşesi'}`,
      el('small', { class: 'en-t', text: ` · ${spot === 'coffee' ? gloss('You are listening to the coffeehouse') : spot === 'cay' ? gloss('You are listening to the tea garden') : gloss('You are watching the chess game')}` }),
    );
    this.#queue = this.#queue.filter((l) => l.spot === spot);
    this.#timer = Math.min(this.#timer, 1.5);
  }

  #add(name, tr, en) {
    const row = el('p', { class: 'talk-line' }, [el('b', { text: `${name}: ` }), tr, en ? el('small', { class: 'en-t', text: en }) : null].filter(Boolean));
    this.lines.append(row);
    while (this.lines.children.length > LOG) this.lines.firstChild.remove();
  }
}
