/**
 * Voices in a talking zone (the kahvehane): everyone inside hears everyone else there, the
 * nearer the louder (`setVolume`, from the distance). The mic is sent only while the talk button
 * is held (`talk(true)`). Each player is connected to every other one in the zone (WebRTC, audio
 * only); the newcomer calls those already there (the village server relays the offer and the
 * answer between two players of the same zone only). Offers and answers carry their ICE
 * candidates (no trickling: a room of sixteen would flood the server with small messages).
 */
const GATHER_MS = 2500;

export class GroupVoice {
  #peers = new Map(); // id → { pc, audio, gain }
  #mic = null;
  #stream = null;
  #ctx = null;
  #volume = new Map(); // id → 0–1, kept for a peer whose audio arrives later

  constructor({ net, iceServers = [{ urls: 'stun:stun.l.google.com:19302' }], onState }) {
    Object.assign(this, { net, iceServers, onState });
    this.zone = null;
    net.on('zone-peers', ({ zone, ids }) => { if (zone === this.zone) ids.forEach((id) => this.#call(id)); });
    net.on('zone-leave', ({ id }) => this.#drop(id));
    net.on('zone-rtc', ({ from, data }) => this.#signal(from, data));
    net.on('zone-full', () => { this.zone = null; this.onState?.('full'); });
    net.on('disconnected', () => this.leave({ tell: false }));
    // the browser lets audio play only after a tap: try again on the next one
    addEventListener('pointerdown', () => { if (this.#ctx?.state === 'suspended') this.#ctx.resume().catch(() => {}); }, { capture: true });
  }

  get supported() { return typeof RTCPeerConnection === 'function'; }
  get micOk() { return !!this.#mic; }
  ids() { return [...this.#peers.keys()]; }

  /** Walked into a talking zone: ask for the mic (muted until the talk button), then join it. */
  async enter(zone) {
    if (this.zone === zone || !this.supported) return;
    this.leave();
    this.zone = zone;
    this.#audioContext();
    if (!this.#mic && navigator.mediaDevices?.getUserMedia) {
      try {
        this.#stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        this.#mic = this.#stream.getAudioTracks()[0];
        this.#mic.enabled = false;
      } catch { this.onState?.('no-mic'); } // can still listen
    }
    if (this.zone !== zone) return; // walked out meanwhile
    this.net.send({ type: 'zone', zone });
  }

  /** Out of the zone: every connection closed, the mic let go. */
  leave({ tell = true } = {}) {
    if (this.zone && tell) this.net.send({ type: 'zone', zone: null });
    this.zone = null;
    [...this.#peers.keys()].forEach((id) => this.#drop(id));
    this.#stream?.getTracks().forEach((t) => t.stop());
    this.#stream = this.#mic = null;
    this.#volume.clear();
  }

  /** The talk button: the mic goes out to everyone in the zone while it is held. */
  talk(on) { if (this.#mic) this.#mic.enabled = on; }

  /** How loud this player is for me (0–1). */
  setVolume(id, v) {
    this.#volume.set(id, v);
    const p = this.#peers.get(id);
    if (!p) return;
    if (p.gain) p.gain.gain.setTargetAtTime(v, this.#ctx.currentTime, 0.1);
    else if (p.audio) p.audio.volume = Math.max(0, Math.min(1, v));
  }

  #audioContext() {
    const AC = window.AudioContext ?? window.webkitAudioContext;
    if (!this.#ctx && AC) this.#ctx = new AC();
    this.#ctx?.resume?.().catch(() => {});
  }

  #peer(id) {
    this.#drop(id);
    const pc = new RTCPeerConnection({ iceServers: this.net.ice ?? this.iceServers });
    const p = { pc, audio: null, gain: null, source: null };
    this.#peers.set(id, p);
    if (this.#mic) pc.addTrack(this.#mic, this.#stream); else pc.addTransceiver('audio', { direction: 'recvonly' });
    pc.ontrack = (e) => {
      const stream = e.streams[0] ?? new MediaStream([e.track]);
      // Chrome plays a WebRTC stream through Web Audio only while a media element holds it too
      const audio = p.audio = document.createElement('audio');
      audio.autoplay = true; audio.setAttribute('playsinline', ''); audio.srcObject = stream;
      document.body.append(audio);
      if (this.#ctx) {
        audio.muted = true;
        p.gain = this.#ctx.createGain();
        p.gain.gain.value = this.#volume.get(id) ?? 1;
        p.source = this.#ctx.createMediaStreamSource(stream);
        p.source.connect(p.gain).connect(this.#ctx.destination);
      } else audio.volume = this.#volume.get(id) ?? 1;
      audio.play().catch(() => this.onState?.('blocked-audio'));
    };
    pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed') this.onState?.('failed', id); };
    return p;
  }

  /** The local description once its candidates are in (or after a while: what there is by then). */
  async #described(pc) {
    if (pc.iceGatheringState !== 'complete') {
      await new Promise((r) => {
        const t = setTimeout(r, GATHER_MS);
        pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); r(); } });
      });
    }
    return pc.localDescription;
  }

  async #call(id) {
    const { pc } = this.#peer(id);
    try {
      await pc.setLocalDescription(await pc.createOffer());
      const sdp = await this.#described(pc);
      if (this.#peers.get(id)?.pc === pc) this.net.send({ type: 'zone-rtc', to: id, data: { sdp } });
    } catch (e) { console.warn('[zone voice] offer', e); }
  }

  async #signal(from, data) {
    if (!this.zone || !data?.sdp) return;
    try {
      if (data.sdp.type === 'offer') {
        const { pc } = this.#peer(from);
        await pc.setRemoteDescription(data.sdp);
        await pc.setLocalDescription(await pc.createAnswer());
        const sdp = await this.#described(pc);
        if (this.#peers.get(from)?.pc === pc) this.net.send({ type: 'zone-rtc', to: from, data: { sdp } });
      } else {
        await this.#peers.get(from)?.pc.setRemoteDescription(data.sdp);
      }
    } catch (e) { console.warn('[zone voice] signalling', e); }
  }

  #drop(id) {
    const p = this.#peers.get(id);
    if (!p) return;
    p.pc.close();
    if (p.audio) { p.audio.srcObject = null; p.audio.remove(); }
    p.source?.disconnect(); p.gain?.disconnect();
    this.#peers.delete(id);
  }

  /** Debug/test helpers. */
  states() { return Object.fromEntries([...this.#peers].map(([id, p]) => [id, p.pc.connectionState])); }
  volumes() { return Object.fromEntries(this.#volume); }
  _debugPeers() { return [...this.#peers.values()].map((p) => p.pc); }
}
