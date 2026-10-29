import * as THREE from 'three';
import { CINEMA } from '../world/locations/VillageSquare.js';
import { gloss, ui, turkishOnly } from '../i18n/Gloss.js';

/**
 * Köy sineması (the village's open-air cinema): sit on one of the open-air cinema's chairs and a film plays on the screen, the
 * Voscreen way — a few seconds of a real cartoon from its official YouTube channel at a time
 * (content/cinema.js; our player page in an iframe over the screen, ui/ClipScreen.js). Each line is
 * heard once with no subtitle, then the player picks what it meant out of two (or, with no language
 * for meanings, which sentence they heard); the line is shown with its meaning, can be heard again
 * (also slower), and its words go into the notebook. A film done with at most two misses earns a
 * credit the first time. Getting up (or ✕) stops it.
 * No films yet (or YouTube can't play): the projectionist isn't here, films are coming soon.
 * Ambient system (update every frame) + effect `cinema`.
 */
export class Cinema {
  #film = null; // { film, i, right, missed, phase: 'title' | 'say' | 'ask' | 'shown' | 'end', timer, ready, said }
  #pop = null;
  #noVideo = false; // YouTube didn't come up this session
  #corners = [0, 1, 2, 3].map(() => new THREE.Vector3());

  constructor({ films, world, renderer, player, camera, vocab, wallet, toasts, state, modes, view, clips }) {
    Object.assign(this, { films, world, renderer, player, camera, vocab, wallet, toasts, state, modes, view, clips });
    view.onPick = (k) => this.#pick(k);
    view.onAgain = (slow) => this.#say(slow ? 0.75 : 1);
    view.onNext = () => this.#next();
    view.onOther = () => this.#start(this.#nextFilm());
    view.onClose = () => this.stop();
  }

  get watching() { return !!this.#film; }
  get open() { return this.films.length > 0 && !this.#noVideo; }

  /** The poster on the screen, once the square is built. */
  build() {
    const loc = this.world.get('village');
    if (!loc?.cinemaScreen) return;
    this.loc = loc;
    this.poster = posterTexture(this.open);
    const m = loc.cinemaScreen.material;
    m.map = this.poster; m.toneMapped = false; m.needsUpdate = true;
  }

  /** Effect `cinema`: just sat down on a cinema chair. */
  watch() {
    if (!this.loc || this.#film) return;
    if (!this.open) { this.#comingSoon(); return; }
    if (!this.#pop) this.#pop = this.modes.push('overlay');
    const p = this.player.position, S = CINEMA, sy = S.screen.y + S.screen.h / 2;
    this.camera.setFixed(new THREE.Vector3(p.x * 0.35, 3.4, p.z + 6.5), new THREE.Vector3(S.x + p.x * 0.1, sy - 1.6, S.z - S.d / 2)); // the whole screen above the panel, the chairs in front
    this.#start(this.#nextFilm());
  }

  #comingSoon() {
    this.toasts.show(`🎬 ${ui('Sinemacı henüz gelmedi. Filmler yakında başlayacak!', "The projectionist isn't here yet. Films are coming soon!")}`); // one line, in the player's own language
  }

  stop() {
    if (!this.#film && !this.#pop) return;
    this.#film = null;
    this.view.close();
    this.#pop?.(); this.#pop = null;
    this.camera.clearFixed();
    this.clips.hide();
    if (this.loc) { this.#screen(this.poster); this.loc.cinemaBeam.visible = false; }
  }

  /** The poster, or dark under the video. */
  #screen(map) {
    const m = this.loc.cinemaScreen.material;
    m.map = map; m.color.set(map ? 0xffffff : 0x101010); m.needsUpdate = true;
  }

  /** The first film not seen to the end yet, then round again. */
  #nextFilm() {
    const seen = this.state.flags ?? {}, n = this.films.length;
    const from = (this.state.cinemaNext ?? 0) % n;
    for (let k = 0; k < n; k++) { const f = this.films[(from + k) % n]; if (!seen[`film-${f.id}`]) return f; }
    return this.films[from];
  }

  /** YouTube didn't come up or play: the projectionist is away again (films coming soon). */
  #videoFailed() {
    this.#noVideo = true;
    this.stop();
    this.#comingSoon();
  }

  #start(film) {
    this.state.cinemaNext = (this.films.indexOf(film) + 1) % this.films.length;
    const f = this.#film = { film, i: 0, right: 0, missed: 0, phase: 'title', timer: 2.2, ready: false };
    this.#screen(null);
    this.clips.open().then((ok) => { if (this.#film !== f) return; if (ok) f.ready = true; else this.#videoFailed(); });
    this.loc.cinemaBeam.visible = true;
    this.view.open(film);
    this.view.showTitle(film);
  }

  get #line() { const f = this.#film; return f?.film.lines[f.i]; }

  /** The line's seconds of the video; then the question (heard again later: the answers stay). */
  #say(rate = 1) {
    const f = this.#film, line = this.#line;
    if (!f || !line) return;
    if (f.phase === 'say') this.view.listening(true);
    const run = (f.said = (f.said ?? 0) + 1);
    this.clips.play({ id: f.film.youtube, start: line.start, end: line.end }, rate).then((how) => {
      if (this.#film !== f || f.said !== run) return;
      if (how === 'ended') setTimeout(() => { if (this.#film === f && f.said === run && f.phase === 'say') this.#ask(); }, 250);
      else if (how !== 'stopped') this.#videoFailed();
    });
  }

  /** Two answers, in random order: what it meant, or (every third line, or with no language for meanings) what was heard. */
  #ask() {
    const f = this.#film, line = this.#line;
    f.phase = 'ask';
    const heard = turkishOnly() || f.i % 3 === 2 || !gloss(line.en);
    const right = heard ? line.tr : gloss(line.en), wrong = heard ? line.altTr : gloss(line.altEn) || line.altEn;
    f.flip = Math.random() < 0.5;
    this.view.ask(heard, f.flip ? [wrong, right] : [right, wrong]);
  }

  #pick(k) {
    const f = this.#film, line = this.#line;
    if (!f || f.phase !== 'ask') return;
    const ok = (k === 1) === f.flip;
    if (ok) f.right++; else f.missed++;
    f.phase = 'shown';
    line.words?.forEach(([tr, en]) => this.vocab?.learn(tr, en));
    this.view.answer(ok, f.flip ? 1 : 0, line, { i: f.i, n: f.film.lines.length, right: f.right });
  }

  #next() {
    const f = this.#film;
    if (!f) return;
    if (f.phase === 'end') { this.#start(this.#nextFilm()); return; }
    if (f.phase !== 'shown') return;
    if (++f.i >= f.film.lines.length) { this.#end(); return; }
    f.phase = 'say';
    this.view.progress(f.i, f.film.lines.length, f.right);
    this.#say();
  }

  #end() {
    const f = this.#film, flags = (this.state.flags ??= {}), key = `film-${f.film.id}`;
    f.phase = 'end';
    const good = f.missed <= 2, first = good && !flags[key];
    if (good) flags[key] = true;
    if (first) { this.wallet?.add(1, 'reward'); this.toasts.show(`“${f.film.title}” bitti! +1 kredi`, 'You finished the film! +1 credit'); }
    this.view.end(f.film, f.right, f.film.lines.length, first, good);
  }

  update(dt) {
    const f = this.#film;
    if (!f) return;
    if (!this.player.seated || this.world.current?.id !== 'village') { this.stop(); return; }
    if (f.phase === 'title' && f.ready && (f.timer -= dt) <= 0) { f.phase = 'say'; this.view.progress(0, f.film.lines.length, 0); this.#say(); }
    this.#placeVideo();
  }

  /** The video's iframe over the screen where the camera shows it (the screen's corners on the page). */
  #placeVideo() {
    const scr = this.loc.cinemaScreen, cam = this.camera.camera, el = this.renderer.domElement.getBoundingClientRect();
    const hw = scr.geometry.parameters.width / 2, hh = scr.geometry.parameters.height / 2;
    scr.updateMatrixWorld();
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].forEach(([x, y], i) => {
      const v = this.#corners[i].set(x, y, 0).applyMatrix4(scr.matrixWorld).project(cam);
      const px = el.left + (v.x + 1) / 2 * el.width, py = el.top + (1 - v.y) / 2 * el.height;
      x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
    });
    this.clips.place({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
  }
}

/** The poster on the screen: what's on, or (no films yet) that they are coming soon. */
function posterTexture(open) {
  const c = document.createElement('canvas'); c.width = 640; c.height = 360;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 360); grad.addColorStop(0, '#2B1D14'); grad.addColorStop(1, '#5B3A29');
  g.fillStyle = grad; g.fillRect(0, 0, 640, 360);
  g.strokeStyle = '#E0B04A'; g.lineWidth = 10; g.strokeRect(14, 14, 612, 332);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#F4D58D'; g.font = 'bold 64px Fredoka, sans-serif'; g.fillText('🎬 KÖY SİNEMASI', 320, 112);
  g.fillStyle = '#F4E6C8'; g.font = 'bold 40px Fredoka, sans-serif'; g.fillText(open ? 'Bu akşam: çizgi filmler' : 'ÇOK YAKINDA', 320, 200);
  g.fillStyle = '#E0B04A'; g.font = 'bold 28px Fredoka, sans-serif';
  g.fillText(open ? 'Bir sandalyeye otur, film başlasın!' : 'Sinemacı yakında geliyor. Filmler yakında!', 320, 268);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
