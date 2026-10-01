import { EV } from '../core/events.js';

const SEND_EVERY = 0.1; // seconds
const ASK_RANGE = 2.5;  // metres: "voice chat with X" appears this close

const DECLINE_TEXT = {
  declined: ['isteğini reddetti', 'declined'],
  busy: ['şu an başka biriyle konuşuyor', 'is busy'],
  far: ['çok uzakta', 'is too far away'],
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
  #warnedStt = false;
  #retryTimer = null;
  #retryDelay = 0;
  #ballRolling = false; // we kicked it last: report where it stops, for players who join later

  constructor({ bus, net, voice, remotes, world, player, ptt, calls, usernames, settings, labels, toasts, recognizer, onFirstVisit, ball = null, rooms = [], healthUrl = '', choice = null, locationId = 'village' }) {
    Object.assign(this, { net, voice, remotes, world, player, ptt, calls, usernames, settings, labels, toasts, recognizer, onFirstVisit, ball, rooms, healthUrl, choice, locationId });
    // phones drop the connection when the screen locks or the app goes to the background:
    // come back → reconnect, and keep retrying (with back-off) while still in the square
    document.addEventListener('visibilitychange', () => { if (!document.hidden && this.#inSquare() && !this.net.connected) this.join(); });
    bus.on(EV.LOCATION, ({ id }) => (id === locationId ? this.join() : this.leave()));
    net.on('join', ({ peer }) => { this.remotes.add(this.#loc(), peer); this.toasts.show(`${peer.name} meydana geldi`, 'joined the square'); this.#count(); });
    net.on('leave', ({ id }) => {
      const name = this.remotes.get(id)?.name;
      this.remotes.remove(id);
      this.#count();
      if (name) this.toasts.show(`${name} meydandan ayrıldı`, 'left the square');
    });
    net.on('states', ({ players }) => this.remotes.setStates(players));
    net.on('talk', ({ id, on }) => this.remotes.setTalking(id, on));
    net.on('ball', (b) => this.ball?.setState(b)); // someone else kicked the shared ball
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
      this.#reset();
      if (!this.#inSquare()) return;
      this.toasts.show('Bağlantı koptu, yeniden bağlanılıyor…', 'Disconnected — reconnecting…');
      this.#retryLater();
    });
  }

  #loc() { return this.world.get(this.locationId); }
  #inSquare() { return this.world.current?.id === this.locationId; }
  #roomLabel(id = this.settings.get('serverRegion', 'ankara')) { return this.rooms.find(([r]) => r === id)?.[1] ?? id; }

  #retryLater() {
    clearTimeout(this.#retryTimer);
    this.#retryDelay = Math.min(15000, (this.#retryDelay || 1000) * 2);
    this.#retryTimer = setTimeout(() => { if (this.#inSquare() && !this.net.connected && !document.hidden) this.join(); }, this.#retryDelay);
  }

  /** Alone in this room while another room has players: offer to go there. */
  async #suggestBusierRoom() {
    if (!this.healthUrl || !this.choice || this.remotes.count > 0) return;
    let rooms;
    try { rooms = (await (await fetch(this.healthUrl, { cache: 'no-store' })).json()).rooms ?? {}; } catch { return; }
    const mine = this.settings.get('serverRegion', 'ankara');
    const [best, n] = Object.entries(rooms).filter(([r]) => r !== mine && this.rooms.some(([id]) => id === r)).sort((a, b) => b[1] - a[1])[0] ?? [];
    if (!best || !n || this.remotes.count > 0 || !this.net.connected) return;
    const go = await this.choice.ask({
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
      if (!name) {
        name = await this.usernames.ask();
        if (!name) return;
        this.settings.set('username', name);
      }
      if (this.world.current.id !== this.locationId) return;
      const room = this.settings.get('serverRegion', 'ankara');
      const welcome = await this.net.connect(name, room, this.settings.get('gender', 'boy'));
      welcome.peers.forEach((p) => this.remotes.add(this.#loc(), p));
      if (welcome.ball) this.ball?.setState(welcome.ball);
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
  ballKicked(ball) { if (this.net.connected) { this.net.send({ type: 'ball', ...ball.state() }); this.#ballRolling = true; } }

  leave() {
    clearTimeout(this.#retryTimer);
    this.#retryDelay = 0;
    if (this.voice.inCall) this.net.send({ type: 'call-end' });
    if (this.net.connected) this.net.close();
    this.#reset();
  }

  #reset() {
    this.#endCall(null);
    this.remotes.clear();
    this.ptt.show(false);
    this.player.voice = false;
  }

  /** Public push-to-talk: speech becomes a text bubble for everyone (no open voice). */
  talk(on) {
    if (!this.net.connected) return;
    this.net.send({ type: 'talk', on });
    this.player.voice = on;
    if (!this.recognizer?.supported) {
      if (on && !this.#warnedStt) { this.#warnedStt = true; this.toasts.show('Bu cihazda konuşma yazıya çevrilemiyor', 'Speech-to-text is not available on this device'); }
      return;
    }
    if (on) {
      this.recognizer.listen({ expected: ['Merhaba! Nasılsın?'] }).then(({ transcript }) => {
        if (!transcript) return;
        this.net.send({ type: 'say', text: transcript });
        this.labels.bubble(this.player, transcript, null, 6);
      }).catch(() => {});
    } else this.recognizer.stop?.();
  }

  // --- one-to-one voice ---------------------------------------------------------------

  /** Interaction provider: offer "voice chat with X" next to another player. */
  find(pos) {
    if (!this.net.connected || this.voice.inCall || this.world.current.id !== this.locationId) return null;
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
    this.remotes.update(dt, t);
    this.#since += dt;
    if (this.#since < SEND_EVERY) return;
    this.#since = 0;
    if (this.#ballRolling && !this.ball.moving) { this.#ballRolling = false; this.net.send({ type: 'ball', ...this.ball.state() }); }
    const P = this.player.position;
    const s = { x: +P.x.toFixed(2), z: +P.z.toFixed(2), rot: +this.player.group.rotation.y.toFixed(2), moving: !!this.player.moving };
    const key = JSON.stringify(s);
    if (key === this.#last) return;
    this.#last = key;
    this.net.send({ type: 'state', ...s });
  }
}
