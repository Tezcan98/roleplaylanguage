import { EV } from '../core/events.js';

const SEND_EVERY = 0.1; // seconds

/**
 * Turns the village square into a shared space: connects when the player walks in
 * (asking for a username once), mirrors other players, streams our position and runs
 * push-to-talk voice. Leaving the square disconnects.
 */
export class VillageMultiplayer {
  #since = 0;
  #last = '';

  constructor({ bus, net, voice, remotes, world, player, ptt, usernames, settings, labels, toasts, recognizer, locationId = 'village' }) {
    Object.assign(this, { net, voice, remotes, world, player, ptt, usernames, settings, labels, toasts, recognizer, locationId });
    bus.on(EV.LOCATION, ({ id }) => (id === locationId ? this.join() : this.leave()));
    net.on('join', ({ peer }) => {
      this.remotes.add(this.#loc(), peer);
      this.voice.expect(peer.id);
      this.toasts.show(`${peer.name} meydana geldi`, 'joined the square');
      this.#count();
    });
    net.on('leave', ({ id }) => {
      const name = this.remotes.get(id)?.name;
      this.remotes.remove(id);
      this.voice.drop(id);
      this.#count();
      if (name) this.toasts.show(`${name} meydandan ayrıldı`, 'left the square');
    });
    net.on('states', ({ players }) => this.remotes.setStates(players));
    net.on('talk', ({ id, on }) => this.remotes.setTalking(id, on));
    net.on('say', ({ id, text }) => { const c = this.remotes.get(id); if (c) this.labels.bubble(c, text, null, 5); });
    net.on('disconnected', () => { this.toasts.show('Bağlantı koptu', 'Disconnected from the square'); this.#reset(); });
  }

  #loc() { return this.world.get(this.locationId); }
  #count() { this.ptt.setOnline(this.remotes.count + 1, this.net.name); }

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
      const welcome = await this.net.connect(name);
      welcome.peers.forEach((p) => this.remotes.add(this.#loc(), p));
      this.voice.callAll(welcome.peers.map((p) => p.id));
      this.ptt.show(true);
      this.#count();
      this.toasts.show(`Meydana hoş geldin, ${welcome.name}!`, 'T tuşunu basılı tut ve konuş · hold T to talk');
    } catch (e) {
      this.toasts.show('Çok oyunculu sunucuya bağlanılamadı', `Playing offline (${e.message})`);
    } finally { this.joining = false; }
  }

  leave() { if (this.net.connected) this.net.close(); this.#reset(); }

  #reset() {
    this.voice.closeAll();
    this.remotes.clear();
    this.ptt.show(false);
    this.player.voice = false;
  }

  /** Push-to-talk: open the mic, tell the others and, if possible, show what we said as text. */
  async talk(on) {
    if (!this.net.connected) return;
    this.net.send({ type: 'talk', on });
    this.player.voice = on;
    try { await this.voice.setTalking(on); } catch { this.toasts.show('Mikrofon izni gerekli', 'Microphone permission needed'); }
    if (!this.recognizer?.supported) return;
    if (on) {
      this.recognizer.listen().then(({ transcript }) => {
        if (!transcript) return;
        this.net.send({ type: 'say', text: transcript });
        this.labels.bubble(this.player, transcript, null, 5);
      }).catch(() => {});
    } else this.recognizer.stop?.();
  }

  update(dt, t) {
    if (!this.net.connected) return;
    this.remotes.update(dt, t);
    const P = this.player.position;
    this.remotes.ids().forEach((id) => {
      const c = this.remotes.get(id);
      const d = Math.hypot(c.position.x - P.x, c.position.z - P.z);
      this.voice.setVolume(id, 1 - Math.max(0, d - 3) / 18); // quieter further away
    });
    this.#since += dt;
    if (this.#since < SEND_EVERY) return;
    this.#since = 0;
    const s = { x: +P.x.toFixed(2), z: +P.z.toFixed(2), rot: +this.player.group.rotation.y.toFixed(2), moving: !!this.player.moving };
    const key = JSON.stringify(s);
    if (key === this.#last) return;
    this.#last = key;
    this.net.send({ type: 'state', ...s });
  }
}
