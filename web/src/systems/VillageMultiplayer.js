import { EV } from '../core/events.js';

const SEND_EVERY = 0.1; // seconds
const KEEPALIVE = 10;   // seconds: my state goes out at least this often, even standing still (the server drops frozen pages)
const AWAY_AFTER = 20000; // ms in the background before leaving the square
const ASK_RANGE = 4;    // metres: "voice chat with X" appears this close

const DECLINE_TEXT = {
  declined: ['isteğini reddetti', 'declined'],
  busy: ['şu an başka biriyle konuşuyor', 'is busy'],
  far: ['çok uzakta', 'is too far away'],
};
const BLOCKED_TEXT = {
  language: ['Meydanda Türkçe konuşalım! Mesajın gösterilmedi.', "Let's speak Turkish in the square! Your message was not shown."],
  harm: ['Bu mesaj meydana uygun değil, gösterilmedi.', 'This message is not suitable for the square, so it was not shown.'],
  muted: ['Bir süre mesaj gönderemezsin ({m} dk).', 'You cannot send messages for a little while.'],
};
const END_TEXT = { far: 'Uzaklaştınız, sesli sohbet bitti.', left: 'Karşı taraf meydandan ayrıldı.', hangup: 'Sesli sohbet bitti.', blocked: 'Oyuncu engellendi, sohbet bitti.' };

/**
 * The multiplayer village square:
 * - public speech is text: push-to-talk runs speech-to-text and shows a bubble for everyone;
 * - voice is one-to-one: walk up to someone, ask, and talk once they accept.
 * Also an interaction provider ("Voice chat with X") for InteractionSystem.
 */
export class VillageMultiplayer {
  #since = 0;
  #last = '';
  #retryTimer = null;
  #talking = false;
  #awayTimer = null;
  #sentAt = 0; // when my state last went out (wall clock: slow phones have few frames)
  #retryDelay = 0;
  #rolling = new Set(); // balls we kicked last: report where they stop, for players who join later

  /**
   * @param {object} o
   * @param {Object<string, { suffix: string, balls?: object[], label: string }>} o.places
   *   public places: location id → room suffix (the city server + suffix is the room), its shared balls
   */
  constructor({ bus, net, voice, remotes, world, player, ptt, calls, usernames, settings, labels, toasts, recognizer, onFirstVisit, places, rooms = [], healthUrl = '', choice = null }) {
    Object.assign(this, { net, voice, remotes, world, player, ptt, calls, usernames, settings, labels, toasts, recognizer, onFirstVisit, places, rooms, healthUrl, choice });
    this.locationId = 'village'; // the main square (chess, menu entry)
    this.joinedAt = null;
    this.chosenRoom = false; // true when the player picked the square on the main menu
    // phones drop the connection when the screen locks or the app goes to the background:
    // come back → reconnect, and keep retrying (with back-off) while still in the square
    // In the background for a while → leave the square (the others don't see a statue); a chess seat
    // waits 45 s for us by name. The page also sends its state every 10 s, so a frozen page that the
    // server still hears pinging is dropped there too.
    document.addEventListener('visibilitychange', () => {
      clearTimeout(this.#awayTimer);
      if (document.hidden) { this.#awayTimer = setTimeout(() => { if (document.hidden && this.net.connected && !this.voice.inCall) this.leave(); }, AWAY_AFTER); return; } // a voice call keeps going
      if (this.#inSquare() && !this.net.connected) this.join();
    });
    bus.on(EV.LOCATION, ({ id }) => {
      if (!this.places[id]) { this.leave(); return; }
      if (this.joinedAt && this.joinedAt !== id) this.leave(); // square ↔ schoolyard: another room
      this.join();
    });
    net.on('join', ({ peer }) => { this.remotes.add(this.#loc(), peer); this.toasts.show(`${peer.name} meydana geldi`, 'joined the square'); this.#count(); });
    net.on('leave', ({ id }) => {
      const name = this.remotes.get(id)?.name;
      this.remotes.remove(id);
      this.#count();
      if (name) this.toasts.show(`${name} meydandan ayrıldı`, 'left the square');
    });
    net.on('states', ({ players }) => this.remotes.setStates(players));
    net.on('talk', ({ id, on }) => this.remotes.setTalking(id, on));
    net.on('ball', (b) => this.balls[b.n ?? 0]?.setState(b)); // someone else kicked a shared ball
    net.on('goal', ({ side }) => this.onGoal?.(this.joinedAt, side, false)); // someone scored in a match
    net.on('score-reset', () => this.onScoreReset?.(this.joinedAt)); // someone reset the score board
    net.on('chess', (st) => { if (this.joinedAt === 'village') this.chess?.applyServer(st); }); // the square's giant chess board
    // my bubble was held back by the square's moderator: take it down and say why
    net.on('say-blocked', ({ reason, until }) => {
      this.labels.bubble(this.player, '', null, 0);
      const [tr, en] = until ? BLOCKED_TEXT.muted : BLOCKED_TEXT[reason === 'language' ? 'language' : 'harm'];
      this.toasts.show(tr.replace('{m}', Math.max(1, Math.ceil(((until ?? 0) - Date.now()) / 60000))), en);
    });
    net.on('say', ({ id, text }) => { const c = this.remotes.get(id); if (c && !this.isBlocked(id, c.name)) this.labels.bubble(c, text, null, 6); });
    net.on('call-request', async ({ from, name }) => {
      if (this.isBlocked(from, name)) { this.net.send({ type: 'call-answer', to: from, accept: false }); return; }
      const answer = await this.calls.ask(name);
      if (answer === 'block') this.blockPlayer(from, name);
      this.net.send({ type: 'call-answer', to: from, accept: answer === true && !this.isBlocked(from, name) });
    });
    net.on('call-declined', ({ id, reason }) => {
      const [tr, en] = DECLINE_TEXT[reason] ?? DECLINE_TEXT.declined;
      this.toasts.show(`${this.remotes.get(id)?.name ?? 'Oyuncu'} ${tr}`, en);
    });
    net.on('call-start', ({ with: id, initiator }) => this.#startCall(id, initiator));
    net.on('call-end', ({ reason }) => this.#endCall(END_TEXT[reason] ?? END_TEXT.hangup));
    net.on('disconnected', () => {
      this.#reset({ keepChess: true }); // the server keeps the game: show it as it was until we are back
      if (!this.#inSquare() || document.hidden) return; // in the background: we come back when the page does
      this.toasts.show('Bağlantı koptu, yeniden bağlanılıyor…', 'Disconnected — reconnecting…');
      this.#retryLater();
    });
  }

  #loc() { return this.world.get(this.joinedAt ?? this.world.current?.id); }
  #inSquare() { return !!this.places[this.world.current?.id]; }
  /** The shared balls of the place I am in. */
  get balls() { return this.places[this.joinedAt ?? this.world.current?.id]?.balls ?? []; }
  #roomLabel(id = this.settings.get('serverRegion', 'ankara')) {
    const city = this.rooms.find(([r]) => r === id)?.[1] ?? id;
    const place = this.places[this.joinedAt ?? this.world.current?.id];
    return place?.label ? `${city} · ${place.label}` : city;
  }

  #retryLater() {
    clearTimeout(this.#retryTimer);
    this.#retryDelay = Math.min(15000, (this.#retryDelay || 1000) * 2);
    this.#retryTimer = setTimeout(() => { if (this.#inSquare() && !this.net.connected && !document.hidden) this.join(); }, this.#retryDelay);
  }

  /**
   * Walking in from the story (no square picked on the menu): go where the people are.
   * Two friends who meet "in the square" must end up in the same room, whatever city
   * each of them picked some other day.
   */
  async #joinFriends(suffix) {
    if (!this.healthUrl) return;
    let rooms;
    try {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 5000); // slow phone connections too
      rooms = (await (await fetch(this.healthUrl, { cache: 'no-store', signal: ctl.signal })).json()).rooms ?? {};
      clearTimeout(t);
    } catch { return; }
    const count = (id) => Number(rooms[`${id}${suffix}`] ?? 0);
    const mine = this.settings.get('serverRegion', 'ankara');
    const [best] = this.rooms.map(([id]) => id).sort((a, b) => count(b) - count(a));
    if (best && count(best) > count(mine)) this.settings.set('serverRegion', best);
  }

  /** Alone in this room while another room has players: offer to go there (from the story: go there). */
  async #suggestBusierRoom() {
    if (!this.healthUrl || !this.choice || this.remotes.count > 0) return;
    let rooms;
    try { rooms = (await (await fetch(this.healthUrl, { cache: 'no-store' })).json()).rooms ?? {}; } catch { return; }
    const mine = this.settings.get('serverRegion', 'ankara');
    const suffix = this.places[this.joinedAt]?.suffix ?? '';
    const [best, n] = Object.entries(rooms).filter(([r]) => r.endsWith(suffix) && this.rooms.some(([id]) => `${id}${suffix}` === r)).map(([r, k]) => [r.slice(0, r.length - suffix.length || undefined), k]).filter(([r]) => r !== mine).sort((a, b) => b[1] - a[1])[0] ?? [];
    if (!best || !n || this.remotes.count > 0 || !this.net.connected) return;
    // walked in from the story (the room lookup was too slow before joining): just go where the others are
    const go = !this.chosenRoom || await this.choice.ask({
      title: `${this.#roomLabel(mine)} meydanı şimdilik boş`,
      text: `${this.#roomLabel(best)} meydanında ${n} kişi var. Oraya geçelim mi?`,
      en: 'This square is empty right now. Another square has players — switch there?',
      yes: `${this.#roomLabel(best)} meydanına geç`, no: 'Burada kal',
    });
    if (!go || !this.#inSquare()) return;
    this.settings.set('serverRegion', best);
    this.leave();
    this.join();
  }

  #blockedList() {
    const list = this.settings.get('blockedPlayers', []);
    return Array.isArray(list) ? list : [];
  }

  isBlocked(id, name) {
    return this.#blockedList().some((p) => (p?.id && p.id === id) || (p?.name && p.name === name));
  }

  blockPlayer(id, name) {
    if (!id && !name) return;
    const list = this.#blockedList().filter((p) => p?.id !== id && p?.name !== name);
    list.push({ id, name });
    this.settings.set('blockedPlayers', list.slice(-100));
    const c = this.remotes.get(id);
    if (c) this.labels.bubble?.(c, '', null, 0);
    if (this.voice.partner === id) { this.net.send({ type: 'call-end' }); this.#endCall(END_TEXT.blocked); }
    this.toasts.show(`${name ?? 'Oyuncu'} engellendi`, 'Player blocked');
  }

  unblockPlayer(id, name) {
    const list = this.#blockedList().filter((p) => p?.id !== id && p?.name !== name);
    this.settings.set('blockedPlayers', list);
  }

  endVoiceCall(reason = 'hangup') {
    if (this.voice.inCall) this.#endCall(END_TEXT[reason] ?? END_TEXT.hangup);
  }
  #count() { this.ptt.setOnline(this.remotes.count + 1, this.net.name, this.#roomLabel()); }

  async join() {
    if (this.net.connected || this.joining) return;
    this.joining = true;
    try {
      let name = this.settings.get('username', null);
      if (!name && !this.chosenRoom && this.autoName) { // story mode: in straight away, under the character's name
        name = this.autoName();
        this.settings.set('username', name);
      }
      if (!name) {
        name = await this.usernames.ask();
        if (!name) return;
        this.settings.set('username', name);
      }
      const here = this.world.current.id;
      if (!this.places[here]) return;
      if (!this.chosenRoom) await this.#joinFriends(this.places[here].suffix);
      if (this.world.current.id !== here) return;
      const room = `${this.settings.get('serverRegion', 'ankara')}${this.places[here].suffix}`;
      if (!this.settings.get('deviceId')) this.settings.set('deviceId', Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => (b % 36).toString(36)).join(''));
      const welcome = await this.net.connect(name, room, this.settings.get('gender', 'boy'), this.settings.get('look', ''), this.settings.get('deviceId'), this.outfit?.() ?? {}, this.settings.get('playGamesId', ''));
      this.joinedAt = here;
      this.#last = null; // tell the others where I am right away (not the spawn point)
      welcome.peers.forEach((p) => this.remotes.add(this.#loc(), p));
      (welcome.balls ?? [welcome.ball]).forEach((b, i) => b && this.balls[i]?.setState(b));
      if (welcome.chess && here === 'village') this.chess?.applyServer(welcome.chess);
      this.ptt.show(true);
      this.#count();
      this.toasts.show(`${this.#roomLabel()} meydanına hoş geldin, ${welcome.name}!`, 'Bas-konuş: söylediğin yazı olarak görünür · Push-to-talk shows your words as text');
      if (!this.settings.get('villageIntroSeen', false)) { this.settings.set('villageIntroSeen', true); this.onFirstVisit?.(); }
      this.#retryDelay = 0;
      this.#suggestBusierRoom();
    } catch (e) {
      this.toasts.show('Çok oyunculu sunucuya bağlanılamadı', `Playing offline (${e.message})`);
      if ((e.message === 'unreachable' || e.message === 'timeout') && this.#inSquare()) this.#retryLater(); // network trouble, not a refusal
    } finally { this.joining = false; }
  }

  /** The local player kicked the shared ball: everyone else gets its new position and speed. */
  ballKicked(ball) {
    const n = this.balls.indexOf(ball);
    if (!this.net.connected || n < 0) return;
    this.net.send({ type: 'ball', n, ...ball.state() });
    this.#rolling.add(ball);
    this.lastKick = Date.now();
  }
  /** I scored (my kick): tell the others in this place. */
  goal(side) { if (this.net.connected) this.net.send({ type: 'goal', side }); }

  leave() {
    this.joinedAt = null;
    clearTimeout(this.#retryTimer);
    this.#retryDelay = 0;
    if (this.voice.inCall) this.net.send({ type: 'call-end' });
    if (this.net.connected) this.net.close();
    this.#reset();
  }

  #reset({ keepChess = false } = {}) {
    if (!keepChess) this.chess?.goOffline();
    this.#endCall(null);
    this.remotes.clear();
    this.ptt.show(false);
    this.player.voice = false;
  }

  /** Public push-to-talk: speech becomes a text bubble for everyone (no open voice). */
  talk(on) {
    if (!this.net.connected) { if (on) { this.ptt.set(false); this.toasts.show('Meydana bağlı değilsin', 'Not connected to the square'); } return; }
    if (!this.recognizer?.supported) { // no speech-to-text in this browser: type it
      if (on) { this.ptt.set(false); this.ptt.typeInstead(); }
      return;
    }
    if (!on) { this.recognizer.stop?.(); return; } // let go: the listening loop below sends what was said
    if (this.#talking) return;
    this.#listenLoop();
  }

  /**
   * Listen while the button is held (or until the second tap). The phone's speech recognizer stops
   * by itself after a short silence — then it simply starts again, and the pieces are joined.
   */
  async #listenLoop() {
    this.#talking = true;
    this.net.send({ type: 'talk', on: true });
    this.player.voice = true;
    const until = Date.now() + 20000; // tapped and forgot: 20 s at most
    const parts = [];
    let problem = null;
    while (this.ptt.on && Date.now() < until) {
      try {
        const { transcript } = await this.recognizer.listen({ expected: ['Merhaba! Nasılsın?'] });
        if (transcript) parts.push(transcript);
      } catch (e) {
        const msg = String(e?.message ?? e);
        if (/not-allowed|service-not-allowed|Permission|denied/i.test(msg)) { problem = 'permission'; break; }
        if (!/no-speech|aborted|No match|didn't understand|7|6/i.test(msg)) { problem = 'failed'; break; }
        await new Promise((r) => setTimeout(r, 150)); // nothing heard yet: listen again
      }
    }
    this.ptt.set(false);
    this.#talking = false;
    this.player.voice = false;
    this.net.send({ type: 'talk', on: false });
    const text = parts.join(' ').trim();
    if (text) this.say(text);
    else if (problem === 'permission') this.toasts.show('Mikrofon izni yok', 'Allow the microphone for this site in the browser settings');
    else if (problem === 'failed') { this.toasts.show('Konuşma yazıya çevrilemedi, yazarak gönder', 'Speech-to-text failed — type it instead'); this.ptt.typeInstead(); }
    else this.toasts.show('Seni duyamadım, bir daha dene', "Didn't catch that — try again");
  }


  /** A sentence for everyone here (spoken and turned into text, or typed). */
  say(text) {
    if (!this.net.connected || !text) return;
    this.net.send({ type: 'say', text });
    this.labels.bubble(this.player, text, null, 6);
  }

  // --- one-to-one voice ---------------------------------------------------------------

  /** Interaction provider: offer "voice chat with X" next to another player. */
  find(pos) {
    if (!this.net.connected || this.voice.inCall || this.world.current.id !== this.joinedAt) return null;
    if (this.chess?.myColor || this.chess?.squareAt(pos)) return null; // at the chess board the action key is for the pieces
    let best = null;
    for (const id of this.remotes.ids()) {
      const c = this.remotes.get(id);
      const d = Math.hypot(c.position.x - pos.x, c.position.z - pos.z);
      if (d < ASK_RANGE && (!best || d < best.dist)) best = { id, name: c.name, dist: d };
    }
    if (!best) return null;
    const blocked = this.isBlocked(best.id, best.name);
    return {
      label: blocked ? `${best.name} engelini kaldır` : `${best.name} ile sesli sohbet et`,
      dist: best.dist,
      priority: blocked ? 0.9 : 1,
      run: () => {
        if (blocked) this.unblockPlayer(best.id, best.name);
        else this.net.send({ type: 'call-request', to: best.id });
        if (!blocked) this.toasts.show(`${best.name} kişisine istek gönderildi`, 'Waiting for them to accept…');
      },
    };
  }

  async #startCall(id, initiator) {
    const c = this.remotes.get(id);
    const name = c?.name ?? 'Oyuncu';
    if (c) c.call = true;
    this.calls.showCall(name, { onMute: (m) => this.voice.setMuted(m), onEnd: () => this.net.send({ type: 'call-end' }) });
    const micOk = await this.voice.start(id, initiator);
    this.toasts.show(`${name} ile sesli sohbet başladı`, micOk ? 'Voice chat started' : 'Mikrofon yok: sadece dinleyebilirsin · listen only');
  }

  /** How the voice connection is doing (from VoiceChat). */
  voiceState(st) {
    if (st === 'connected') this.toasts.show('Ses bağlandı 🔊', 'Voice connected');
    else if (st === 'failed') this.toasts.show('Ses bağlantısı kurulamadı', 'Voice could not connect on this network. You can still talk with text.');
    else if (st === 'blocked-audio') this.calls.showUnmute(() => this.voice.resumeAudio());
  }

  #endCall(message) {
    const id = this.voice.partner;
    const c = id && this.remotes.get(id);
    if (c) c.call = false;
    if (!id) return;
    this.voice.end();
    this.calls.hideCall();
    if (message) this.toasts.show(message, 'Voice chat ended');
  }

  update(dt, t) {
    if (!this.net.connected) return;
    const onPitch = !!this.onPitch?.(this.player.position); // a match: the hard-shot button there, not the talk button
    if (onPitch === !this.ptt.root.hidden) this.ptt.show(!onPitch);
    this.remotes.update(dt, t);
    this.#since += dt;
    if (this.#since < SEND_EVERY) return;
    this.#since = 0;
    this.#rolling.forEach((b) => { if (!b.moving) { this.#rolling.delete(b); const n = this.balls.indexOf(b); if (n >= 0) this.net.send({ type: 'ball', n, ...b.state() }); } });
    const P = this.player.position;
    const s = { x: +P.x.toFixed(2), z: +P.z.toFixed(2), rot: +this.player.group.rotation.y.toFixed(2), moving: !!this.player.moving, sit: !!this.player.seated, ...(this.player.mount ? { ride: 1 } : {}) };
    const key = JSON.stringify(s);
    const now = performance.now();
    if (key === this.#last && now - this.#sentAt < KEEPALIVE * 1000) return;
    this.#last = key;
    this.#sentAt = now;
    this.net.send({ type: 'state', ...s, ka: 1 });
  }
}
