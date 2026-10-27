import { EV } from '../core/events.js';
import { CONFIG } from '../config/remote.js';
import { CONSENT_VERSION } from '../ui/ConsentDialog.js';
import { VoiceRecorder } from '../services/multiplayer/VoiceRecorder.js';

const SEND_EVERY = 0.1; // seconds
const KEEPALIVE = 10;   // seconds: my state goes out at least this often, even standing still (the server drops frozen pages)
const AWAY_AFTER = 20000; // ms in the background before leaving the square
const PHONE = !!window.Capacitor?.isNativePlatform?.() || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const ASK_RANGE = 4;    // metres: "voice chat with X" appears this close
/** In a talking zone: how loud someone is at `d` metres (1 m and nearer: full; 4 m: half; 7 m: a fifth). */
export const zoneVolume = (d) => 1 / (1 + (Math.max(0, d - 1) / 3) ** 2);

const DECLINE_TEXT = {
  declined: ['isteğini reddetti', 'declined'],
  busy: ['şu an başka biriyle konuşuyor', 'is busy'],
  far: ['çok uzakta', 'is too far away'],
  full: ['olan sohbet dolu (en çok 5 kişi)', 'is in a full voice chat (5 at most)'],
};
const BLOCKED_TEXT = {
  language: ['Meydanda Türkçe konuşalım! Mesajın gösterilmedi.', "Let's speak Turkish in the square! Your message was not shown."],
  harm: ['Bu mesaj meydana uygun değil, gösterilmedi.', 'This message is not suitable for the square, so it was not shown.'],
  muted: ['Bir süre mesaj gönderemezsin ({m} dk).', 'You cannot send messages for a little while.'],
};
const REPORT_FAILED = {
  limit: ['Kısa sürede çok şikayet gönderdin, biraz sonra tekrar dene.', 'Too many reports — try again a little later.'],
  again: ['Bu oyuncuyu az önce şikayet ettin, inceleniyor.', 'You already reported this player; it is being checked.'],
  gone: ['Bu oyuncu meydandan ayrılmış.', 'That player has left the square.'],
  paused: ['Son şikayetlerin asılsız çıktı. {d} gün şikayet edemezsin.', 'Your last reports were unfounded, so you cannot report for a few days.'],
};
const END_TEXT = { far: 'Uzaklaştınız, sesli sohbet bitti.', left: 'Karşı taraf meydandan ayrıldı.', hangup: 'Sesli sohbet bitti.', blocked: 'Oyuncu engellendi, sohbet bitti.', lost: 'Ses bağlantısı koptu, sohbet bitti.' };

/**
 * The multiplayer village square:
 * - public speech is text: push-to-talk runs speech-to-text and shows a bubble for everyone;
 * - voice is one-to-one: walk up to someone, ask, and talk once they accept;
 * - except in a talking zone (the kahvehane): there the talk button sends your voice to everyone
 *   inside, and you hear them — the nearer, the louder (GroupVoice).
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
  #pttRec = null;      // push-to-talk's voice recorder
  #elsewhereTimer = null; // alone here: how many are in the other squares, once a minute
  #zoneOk = new Set();  // talking zones the player said yes to at the door (until leaving the square)
  #atDoor = false;      // the "go in?" card is up
  #outside = null;      // where the player last stood outside every zone (stopped there at the door)

  /**
   * @param {object} o
   * @param {Object<string, { suffix: string, balls?: object[], label: string }>} o.places
   *   public places: location id → room suffix (the city server + suffix is the room), its shared balls
   */
  constructor({ bus, net, voice, group = null, zones = {}, remotes, world, player, ptt, calls, usernames, settings, labels, toasts, recognizer, onFirstVisit, places, rooms = [], healthUrl = '', choice = null, reportDialog = null, consent = null, canAsk = null }) {
    Object.assign(this, { canAsk, net, voice, group, zones, remotes, world, player, ptt, calls, usernames, settings, labels, toasts, recognizer, onFirstVisit, places, rooms, healthUrl, choice, reportDialog, consent });
    this.stayOffline = false; // the server said so (a ban after a report): offline this game, without a word
    this.consentDeclined = false; // said no this time: offline in the square until the next game (or the menu)
    ptt.onReport = () => this.report();
    ptt.onRetry = () => { this.consentDeclined = false; this.join(); }; // "📴 Çevrimdışı" tapped: the recording question again
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
    net.on('jump', ({ id }) => this.remotes.get(id)?.jump?.()); // another player's horse jumps
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
    net.on('call-request', async ({ from, name, join = false, with: others = [] }) => {
      if (this.isBlocked(from, name)) { this.net.send({ type: 'call-answer', to: from, accept: false }); return; }
      const answer = await this.calls.ask(name, { join, others });
      if (answer === 'block') this.blockPlayer(from, name);
      this.net.send({ type: 'call-answer', to: from, accept: answer === true && !this.isBlocked(from, name) });
    });
    net.on('call-declined', ({ id, reason }) => {
      const [tr, en] = DECLINE_TEXT[reason] ?? DECLINE_TEXT.declined;
      this.toasts.show(`${this.remotes.get(id)?.name ?? 'Oyuncu'} ${tr}`, en);
    });
    net.on('call-start', ({ with: id, initiator, peers }) => this.#startCall(peers ?? [id], initiator));
    net.on('call-join', ({ id, name }) => { if (!this.voice.inCall) return; this.voice.add(id, false); this.#callNames(); this.toasts.show(`${name} sohbete katıldı`, 'joined the voice chat'); });
    net.on('call-leave', ({ id }) => { const n = this.remotes.get(id)?.name ?? 'Oyuncu'; this.#markCall(id, false); this.voice.remove(id); this.#callNames(); this.toasts.show(`${n} sohbetten ayrıldı`, 'left the voice chat'); });
    net.on('report-ok', ({ name }) => this.toasts.show(`Şikayetin alındı${name ? ` (${name})` : ''}. İnceleyeceğiz, teşekkürler!`, 'Thanks — your report was sent and will be checked.'));
    net.on('report-failed', ({ reason, until }) => {
      const [tr, en] = REPORT_FAILED[reason] ?? ['Şikayet şu an gönderilemedi.', 'The report could not be sent right now.'];
      this.toasts.show(tr.replace('{d}', Math.max(1, Math.ceil(((until ?? 0) - Date.now()) / 86_400_000))), en);
    });
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
   * Which room to go to: from the story (no square picked on the menu), where the people are — two
   * friends who meet "in the square" end up in the same room, whatever city each picked some other
   * day; but not a room that is full already (CONFIG.roomFull: then the busiest one below it). A
   * player who never picked a city by hand doesn't go into a full room from the menu either.
   */
  async #joinFriends(suffix) {
    if (!this.healthUrl) return;
    let rooms;
    try {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 5000); // slow phone connections too
      rooms = (await (await fetch(this.healthUrl, { cache: 'no-store', signal: ctl.signal })).json()).rooms ?? {};
      clearTimeout(t);
    } catch { return; }
    const count = (id) => Number(rooms[`${id}${suffix}`] ?? 0), full = CONFIG.roomFull;
    const mine = this.settings.get('serverRegion', 'ankara');
    const ids = this.rooms.map(([id]) => id), open = ids.filter((id) => count(id) < full);
    const [best] = open.length ? open.sort((a, b) => count(b) - count(a)) : ids.sort((a, b) => count(a) - count(b)); // the busiest that isn't full (all full: the emptiest)
    if (!best) return;
    if (!this.chosenRoom ? count(best) > count(mine) || count(mine) >= full : count(mine) >= full && !this.settings.get('serverPicked', false)) this.settings.set('serverRegion', best);
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
    if (this.voice.peers.includes(id)) { this.net.send({ type: 'call-end' }); this.#endCall(END_TEXT.blocked); }
    this.toasts.show(`${name ?? 'Oyuncu'} engellendi`, 'Player blocked');
  }

  unblockPlayer(id, name) {
    const list = this.#blockedList().filter((p) => p?.id !== id && p?.name !== name);
    this.settings.set('blockedPlayers', list);
  }

  /** Hang up here (the app went to the background…): the server is told too, or the others would stay "busy" with me. */
  endVoiceCall(reason = 'hangup') {
    if (!this.voice.inCall) return;
    this.net.send({ type: 'call-end' });
    this.#endCall(END_TEXT[reason] ?? END_TEXT.hangup);
  }
  #count() {
    this.ptt.setOnline(this.remotes.count + 1, this.net.name, this.#roomLabel());
    clearInterval(this.#elsewhereTimer);
    if (this.remotes.count > 0) return;
    this.#lookElsewhere();
    this.#elsewhereTimer = setInterval(() => (this.net.connected && this.remotes.count === 0 ? this.#lookElsewhere() : clearInterval(this.#elsewhereTimer)), 60000);
  }

  /** Alone here: are there players in the other cities' squares (of this place)? The note on the left only then. */
  async #lookElsewhere() {
    if (!this.healthUrl) return;
    let rooms;
    try { rooms = (await (await fetch(this.healthUrl, { cache: 'no-store' })).json()).rooms ?? {}; } catch { return; }
    const mine = `${this.settings.get('serverRegion', 'ankara')}${this.places[this.joinedAt]?.suffix ?? ''}`, suffix = this.places[this.joinedAt]?.suffix ?? '';
    const n = this.rooms.map(([id]) => `${id}${suffix}`).filter((r) => r !== mine).reduce((t, r) => t + Number(rooms[r] ?? 0), 0);
    if (this.remotes.count === 0) this.ptt.setElsewhere(n);
  }

  async join() {
    if (this.net.connected || this.joining || this.stayOffline) return;
    this.joining = true;
    try {
      // before the first time online: agree that what is said here is recorded and may be processed
      if (!await this.#agreed()) return;
      if (!this.settings.get('deviceId')) this.settings.set('deviceId', Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => (b % 36).toString(36)).join('')); // (a username belongs to this device)
      let name = this.settings.get('username', null);
      if (!this.settings.get('usernameAsked', false) && (!name || this.autoNamed?.(name))) { // never chosen by the player (a new game starts in the square): asked once, the made-up name filled in
        const made = name || this.autoName?.() || '';
        const picked = await this.usernames.ask(made, (n) => this.#nameFree(n), this.nameNote ?? '', { skip: made ? ['Bu adla devam et', 'Keep this name'] : ['Vazgeç', 'Cancel'] });
        this.nameNote = '';
        this.settings.set('usernameAsked', true);
        name = picked || made || null;
        if (name) this.settings.set('username', name);
        if (!this.#inSquare()) return;
      }
      if (!name && !this.chosenRoom && this.autoName) { // story mode: in straight away, under the character's name
        name = this.autoName();
        this.settings.set('username', name);
      }
      if (!name) {
        name = await this.usernames.ask('', (n) => this.#nameFree(n), this.nameNote ?? '');
        this.nameNote = '';
        if (!name) { this.onNameCancel?.(); return; } // "Vazgeç": back to the menu
        this.settings.set('username', name);
      }
      const here = this.world.current.id;
      if (!this.places[here]) return;
      await this.#joinFriends(this.places[here].suffix); // (where the people are — or not into a full room)
      if (this.world.current.id !== here) return;
      const room = `${this.settings.get('serverRegion', 'ankara')}${this.places[here].suffix}`;
      const welcome = await this.net.connect(name, room, this.settings.get('gender', 'boy'), this.settings.get('look', ''), this.settings.get('deviceId'), this.outfit?.() ?? {}, this.settings.get('playGamesId', ''), this.settings.get('dataConsent', null));
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
      if (e.code === 'offline') { this.stayOffline = true; return; } // banned: the square just stays single-player (no message, no retries)
      if (e.code === 'name-taken' || e.code === 'name-bad') { // the name is another device's (names are unique), or not allowed: pick another
        this.settings.set('username', null);
        this.settings.set('usernameAsked', false); // (the question comes again, with why)
        this.nameNote = e.code === 'name-bad' ? ['Bu kullanıcı adı kullanılamaz, başka bir ad seç.', 'This username is not allowed, choose another one.'] : ['Bu kullanıcı adı alınmış, başka bir ad seç.', 'This username is taken, choose another one.'];
        this.joining = false;
        if (this.#inSquare()) this.join();
        return;
      }
      this.toasts.show('Çok oyunculu sunucuya bağlanılamadı', `Playing offline (${e.message})`);
      if ((e.message === 'unreachable' || e.message === 'timeout') && this.#inSquare()) this.#retryLater(); // network trouble, not a refusal
    } finally { this.joining = false; }
  }

  /**
   * Has the player agreed to the recording (this version of it)? Asks once (ConsentDialog); the
   * answer "yes" is kept on the device and sent with every join (the server logs it as proof).
   * No: from the menu back to it; from the story the square stays offline this game.
   */
  async #agreed() {
    const c = this.settings.get('dataConsent', null);
    if (!this.consent || c?.v >= CONSENT_VERSION) return true;
    if (this.consentDeclined && !this.chosenRoom) { this.ptt.setOffline(); return false; }
    const yes = await this.consent.ask();
    if (yes) { this.settings.set('dataConsent', { v: CONSENT_VERSION, at: Date.now() }); this.consentDeclined = false; return true; }
    this.consentDeclined = true;
    if (this.chosenRoom) this.onNameCancel?.(); // picked the square on the menu: back to it
    else { this.toasts.show('Meydanda çevrimdışı devam ediyorsun · bağlanmak için üstteki 📴', 'You go on offline in the square — tap 📴 at the top to connect'); this.ptt.setOffline(); }
    return false;
  }

  /** The player picked a city square ("Meydan seç"): kept for this game (not moved to a busier one), and joined at once when in a square. */
  switchRoom(id) {
    this.chosenRoom = true;
    if (id === this.settings.get('serverRegion', 'ankara') && this.net.connected) return;
    this.settings.set('serverRegion', id);
    if (this.net.connected) this.leave();
    if (this.#inSquare()) this.join();
  }

  /** The menu: a new username (the first one was made for the player: "Oyuncu37"). Taking effect when the square is joined again. */
  async rename() {
    const name = await this.usernames.ask(this.settings.get('username', '') ?? '', (n) => this.#nameFree(n), '', { title: ['Yeni adın ne?', 'Your new name?'], ok: ['Kaydet', 'Save'], chap: ['Kullanıcı adı', 'Username'] });
    if (!name) return null;
    this.settings.set('username', name);
    this.settings.set('usernameAsked', true);
    if (!this.deviceIdSet()) this.settings.set('deviceId', Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => (b % 36).toString(36)).join(''));
    if (this.net.connected) this.leave(); // (it joins again under the new name when the game goes on)
    return name;
  }
  deviceIdSet() { return !!this.settings.get('deviceId'); }

  /** true, or why not: 'taken' (another device's) | 'bad' (the word list or the moderation model won't have it). */
  async #nameFree(name) {
    if (!this.healthUrl) return true;
    try {
      const url = `${this.healthUrl}?name=${encodeURIComponent(name)}&pid=${encodeURIComponent(this.settings.get('deviceId', ''))}`;
      const r = await (await fetch(url, { cache: 'no-store' })).json();
      return r.ok !== false || (r.reason === 'bad' ? 'bad' : 'taken');
    } catch { return true; }
  }

  /** The local player kicked the shared ball: everyone else gets its new position and speed. */
  ballKicked(ball) {
    const n = this.balls.indexOf(ball);
    if (!this.net.connected || n < 0) return;
    this.net.send({ type: 'ball', n, ...ball.state() });
    this.#rolling.add(ball);
    this.lastKick = Date.now();
  }
  /** My horse jumped: the others see it too. */
  jumped() { if (this.net.connected) this.net.send({ type: 'jump' }); }

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
    this.#zoneOk.clear();
    this.#setZone(null, { tell: false });
    this.#endCall(null);
    this.remotes.clear();
    this.ptt.show(false);
    this.player.voice = false;
  }

  /** Public push-to-talk: speech becomes a text bubble for everyone (no open voice) — in a talking zone, your voice. */
  talk(on) {
    if (!this.net.connected) { if (on) { this.ptt.set(false); this.toasts.show('Meydana bağlı değilsin', 'Not connected to the square'); } return; }
    if (this.group?.zone) {
      if (on && !this.group.micOk) { this.ptt.set(false); this.toasts.show('Mikrofon izni yok: sadece dinleyebilirsin', 'No microphone: you can listen only'); return; }
      this.group.talk(on);
      this.player.voice = on;
      this.net.send({ type: 'talk', on });
      return;
    }
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
    // the voice itself is kept too (encrypted, 48 h), not only the text — but not on a phone: there the
    // speech recognizer is another app (Google's), and while the game holds the mic it hears silence
    const mic = PHONE ? Promise.resolve(null) : this.#recordPtt();
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
    mic.then((track) => { this.#pttRec?.stop(); track?.stop(); });
    const text = parts.join(' ').trim();
    if (text) this.say(text);
    else if (problem === 'permission') this.toasts.show('Mikrofon izni yok', 'Allow the microphone for this site in the browser settings');
    else if (problem === 'failed') { this.toasts.show('Konuşma yazıya çevrilemedi, yazarak gönder', 'Speech-to-text failed — type it instead'); this.ptt.typeInstead(); }
    else this.toasts.show('Seni duyamadım, bir daha dene', "Didn't catch that — try again");
  }


  /** Push-to-talk held: my voice goes to the server's voice log in pieces (services/multiplayer/VoiceRecorder.js). Resolves with the mic track. */
  async #recordPtt() {
    try {
      const track = (await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })).getAudioTracks()[0];
      if (!this.#talking) { track?.stop(); return null; } // let go already
      (this.#pttRec ??= new VoiceRecorder(this.net)).start(track, 'ptt'); // (its own: a call's recording goes on beside it)
      return track;
    } catch { return null; }
  }

  /** A sentence for everyone here (spoken and turned into text, or typed). */
  say(text) {
    if (!this.net.connected || !text) return;
    this.net.send({ type: 'say', text });
    this.onStat?.('chat'); // (a count for the play numbers: never the words)
    this.labels.bubble(this.player, text, null, 6);
  }

  // --- one-to-one voice ---------------------------------------------------------------

  /** Interaction provider: offer "voice chat with X" next to another player. */
  find(pos) {
    if (!this.net.connected || this.world.current.id !== this.joinedAt) return null;
    if (this.chess?.myColor || this.chess?.squareAt(pos)) return null; // at the chess board the action key is for the pieces
    if (this.group?.zone || this.#zoneAt(pos)) return null; // in a talking zone everyone hears everyone (hold the talk button): no one-to-one call there
    let best = null;
    const inCall = this.voice.inCall, mine = this.voice.peers;
    if (inCall && mine.length >= 4) return null; // (a call holds five)
    for (const id of this.remotes.ids()) {
      if (mine.includes(id)) continue; // already talking with them
      const c = this.remotes.get(id);
      const d = Math.hypot(c.position.x - pos.x, c.position.z - pos.z);
      if (d < ASK_RANGE && (!best || d < best.dist)) best = { id, name: c.name, dist: d };
    }
    if (!best) return null;
    const blocked = this.isBlocked(best.id, best.name);
    return {
      label: blocked ? `${best.name} engelini kaldır` : inCall ? `${best.name} kişisini sohbete çağır` : `${best.name} ile sesli sohbet et`,
      dist: best.dist,
      priority: blocked ? 0.9 : 1,
      left: true, // its own button, on the left
      run: () => {
        if (blocked) this.unblockPlayer(best.id, best.name);
        else this.net.send({ type: 'call-request', to: best.id });
        if (!blocked) this.toasts.show(`${best.name} kişisine istek gönderildi`, 'Waiting for them to accept…');
      },
    };
  }

  /** A call starts (or I join one): connect to everyone already in it. */
  async #startCall(ids, initiator) {
    this.onStat?.('voice');
    this.calls.showCall({
      onMute: (m) => this.voice.setMuted(m),
      onSpeaker: (on) => this.voice.setSpeaker(on),
      onEnd: () => this.net.send({ type: 'call-end' }),
      onReport: () => this.report(this.voice.peers),
    });
    const micOk = this.voice.start(ids, initiator);
    ids.forEach((id) => this.#markCall(id, true));
    this.#callNames();
    const names = ids.map((id) => this.remotes.get(id)?.name ?? 'Oyuncu').join(', ');
    this.toasts.show(`${names} ile sesli sohbet başladı`, (await micOk) ? 'Voice chat started' : 'Mikrofon yok: sadece dinleyebilirsin · listen only');
  }

  #markCall(id, on) { const c = this.remotes.get(id); if (c) c.call = on; }
  #callNames() {
    const ids = this.voice.peers;
    ids.forEach((id) => this.#markCall(id, true));
    this.calls.setNames(ids.map((id) => this.remotes.get(id)?.name ?? 'Oyuncu'));
  }

  /** How the voice connection to `id` is doing (from VoiceChat). */
  voiceState(st, id) {
    const name = this.remotes.get(id)?.name ?? 'Oyuncu';
    if (st === 'connected') this.toasts.show(this.voice.peers.length > 1 ? `${name} ile ses bağlandı 🔊` : 'Ses bağlandı 🔊', 'Voice connected');
    else if (st === 'failed' || st === 'lost') {
      // no voice between us: a call of two is over (it would only look "busy" to everyone else); in a bigger one the others go on
      if (this.voice.peers.length <= 1) { this.endVoiceCall(st === 'lost' ? 'lost' : 'hangup'); if (st === 'failed') this.toasts.show('Ses bağlantısı kurulamadı', 'Voice could not connect on this network. You can still talk with text.'); }
      else this.toasts.show(`${name} ile ses bağlantısı kurulamadı`, 'No voice connection to them on this network');
    } else if (st === 'blocked-audio') this.calls.showUnmute();
  }

  #endCall(message) {
    const ids = this.voice.peers;
    ids.forEach((id) => this.#markCall(id, false));
    if (!ids.length) return;
    this.voice.end();
    this.calls.hideCall();
    if (message) this.toasts.show(message, 'Voice chat ended');
  }

  // --- reports ("Şikayet et") ----------------------------------------------------------

  /**
   * Pick a player here (the call partner, or the nearest first) and why; the server checks what
   * they said in the last ten minutes, text and voice, and the operator decides on a ban.
   */
  async report(only = null) { // only: an id, or the ids of a call
    if (!this.net.connected) { this.toasts.show('Meydana bağlı değilsin', 'Not connected to the square'); return; }
    const here = this.player.position;
    const players = this.remotes.ids()
      .filter((id) => !only || (Array.isArray(only) ? only.includes(id) : id === only))
      .map((id) => { const c = this.remotes.get(id); return { id, name: c.name, dist: Math.hypot(c.position.x - here.x, c.position.z - here.z) }; })
      .sort((a, b) => this.voice.peers.includes(b.id) - this.voice.peers.includes(a.id) || a.dist - b.dist)
      .slice(0, 12)
      .map((p) => ({ ...p, note: this.voice.peers.includes(p.id) ? 'sesli sohbet' : this.group?.ids().includes(p.id) ? 'yanında konuşuyor' : `${Math.round(p.dist)} m` }));
    if (!players.length) { this.toasts.show('Şikayet edilecek kimse yok', 'Nobody here to report'); return; }
    const pick = await this.reportDialog?.ask(players);
    if (!pick || !this.net.connected) return;
    this.net.send({ type: 'report', to: pick.id, reason: pick.reason });
  }

  // --- talking zones (the kahvehane) ----------------------------------------------------

  /** Which talking zone the player stands in (a step of slack on the way out). */
  #zoneAt(p) {
    if (this.joinedAt !== 'village' || this.world.current?.id !== 'village') return null;
    for (const [id, r] of Object.entries(this.zones)) {
      const m = id === this.group.zone ? 0.8 : 0;
      if (Math.abs(p.x - r.x) <= r.w / 2 + m && Math.abs(p.z - r.z) <= r.d / 2 + m) return id;
    }
    return null;
  }

  #setZone(zone, { tell = true } = {}) {
    if (!this.group || (this.group.zone ?? null) === zone) return;
    if (this.ptt.on) this.ptt.set(false);
    if (zone) {
      this.group.enter(zone);
      this.ptt.setZone(this.zones[zone].name);
      this.toasts.show(`${this.zones[zone].name}: toplu konuşma alanı 🎙️ Konuşmak için 🎤 düğmesine dokun, bitince tekrar dokun.`, 'Everyone in here hears each other. Tap the 🎤 button to speak, tap it again when you are done.');
    } else {
      this.group.leave({ tell });
      this.ptt.setZone(null);
    }
  }

  /**
   * Walking into a talking zone: the player stops at the door — "sure?" (the recording itself was
   * agreed to once, before going online: ConsentDialog). Yes: in (not asked again until they leave
   * the square); no: they stay outside.
   */
  async #door(zone) {
    if (this.#atDoor) return;
    if (!this.choice) { this.#zoneOk.add(zone); return; }
    this.#atDoor = true;
    const inside = { x: this.player.position.x, z: this.player.position.z, rot: this.player.group.rotation.y };
    if (this.#outside) this.player.place(this.#outside);
    const name = this.zones[zone].name;
    const go = await this.choice.ask({
      title: `${name}: emin misin?`,
      text: 'Burası toplu konuşma alanı: içeridekiler seni duyar.',
      en: 'This is a talking area: everyone inside hears you.',
      yes: 'Gir', no: 'Girme',
    });
    this.#atDoor = false;
    if (!go || !this.net.connected) return;
    this.#zoneOk.add(zone);
    this.player.place(inside);
  }

  /** How the zone's voices are doing (from GroupVoice). */
  zoneState(st) {
    if (st === 'full') { this.ptt.setZone(null); this.toasts.show('Burası şu an çok kalabalık, sesler kapalı', 'Too many people in here for voices right now'); }
    else if (st === 'no-mic') this.toasts.show('Mikrofon izni yok: sadece dinleyebilirsin', 'No microphone: you can listen only');
    else if (st === 'blocked-audio') this.toasts.show('Sesleri duymak için ekrana dokun', 'Tap the screen to hear the voices');
  }

  update(dt, t) {
    if (!this.net.connected) return;
    if (this.group) {
      const P = this.player.position, zone = this.#zoneAt(P);
      if (!zone) this.#outside = { x: P.x, z: P.z, rot: this.player.group.rotation.y };
      if (zone && zone !== this.group.zone && !this.#zoneOk.has(zone)) { if (this.canAsk?.() !== false) this.#door(zone); } // not in yet: stop at the door and ask (not in the middle of a talk: the story may walk you in — asked once it's over)
      else this.#setZone(zone);
      for (const id of this.group.ids()) {
        const c = this.remotes.get(id);
        const d = c ? Math.hypot(c.position.x - this.player.position.x, c.position.z - this.player.position.z) : 99;
        this.group.setVolume(id, c && !this.isBlocked(id, c.name) ? zoneVolume(d) : 0);
      }
    }
    const onPitch = !!this.onPitch?.(this.player.position); // a match: the hard-shot button there, not the talk button
    if (onPitch === !this.ptt.root.hidden) this.ptt.show(!onPitch);
    this.ptt.keepAbove?.(document.getElementById('act-more'), document.getElementById('act'), document.getElementById('shot'), document.getElementById('jump')); // down in the corner, but never over the action buttons
    this.remotes.update(dt, t, this.player.position); // (only the nearest are drawn: a crowd of a hundred)
    this.#since += dt;
    if (this.#since < SEND_EVERY) return;
    this.#since = 0;
    this.#rolling.forEach((b) => { if (!b.moving) { this.#rolling.delete(b); const n = this.balls.indexOf(b); if (n >= 0) this.net.send({ type: 'ball', n, ...b.state() }); } });
    const P = this.player.position;
    const s = { x: +P.x.toFixed(2), z: +P.z.toFixed(2), rot: +this.player.group.rotation.y.toFixed(2), moving: !!this.player.moving, sit: !!this.player.seated, ...(['horse', 'scooter', 'bike'].includes(this.player.mount?.kind) ? { ride: this.player.mount.kind } : {}) };
    const key = JSON.stringify(s);
    const now = performance.now();
    if (key === this.#last && now - this.#sentAt < KEEPALIVE * 1000) return;
    this.#last = key;
    this.#sentAt = now;
    this.net.send({ type: 'state', ...s, ka: 1 });
  }
}
