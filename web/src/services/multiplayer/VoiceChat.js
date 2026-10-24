import { VoiceRecorder } from './VoiceRecorder.js';

/** How long a dropped connection may try to come back before that player is let go. */
const RECONNECT = 12000;

/**
 * Voice call over WebRTC, only between players who all agreed (the village server relays
 * signalling within the call only). Two to start with; more can join (the server says who:
 * `add`), each connected to every other one. The mic is open for the whole call; `setMuted`
 * mutes it, `setSpeaker` the others' voices. While the mic is open my voice also goes to the
 * server, in pieces, for the safety log and reports (VoiceRecorder).
 */
export class VoiceChat {
  #peers = new Map(); // id → { pc, audio, pending, timer }
  #mic = null;
  #micReady = null;   // Promise<boolean>: the mic asked for once per call
  #muted = false;
  #speaker = true;

  /**
   * @param {object} o
   * @param {(state: string, id?: string) => void} [o.onState]  'connected' | 'failed' | 'lost' | 'blocked-audio' … for the UI
   */
  constructor({ net, iceServers = [{ urls: 'stun:stun.l.google.com:19302' }], onState, relayOnly = false }) {
    this.relayOnly = relayOnly; // ?relayonly: force the TURN relay (to test it)
    this.net = net;
    this.iceServers = iceServers;
    this.onState = onState;
    this.recorder = new VoiceRecorder(net);
    net.on('rtc', ({ from, data }) => { if (this.#peers.has(from)) this.#signal(from, data); });
  }

  get supported() { return typeof RTCPeerConnection === 'function' && !!navigator.mediaDevices?.getUserMedia; }
  get inCall() { return this.#peers.size > 0; }
  /** The first one talked to (the call bar's name, a report's first choice). */
  get partner() { return this.#peers.keys().next().value ?? null; }
  get peers() { return [...this.#peers.keys()]; }
  get muted() { return this.#muted; }
  get speaker() { return this.#speaker; }

  /** Start a call with `ids` (those already in it); I send the offers when `initiator`. Resolves false if the mic is unavailable. */
  async start(ids, initiator) {
    this.end();
    if (!this.supported) return false;
    for (const id of ids) this.add(id, initiator);
    return this.#micReady ?? false;
  }

  /** Someone more in the call (or the first ones, from start): connect to them. */
  add(id, initiator) {
    if (!this.supported || this.#peers.has(id)) return;
    // the server hands out our TURN relay (needed between phones on mobile data and office / school networks)
    const pc = new RTCPeerConnection({ iceServers: this.net.ice ?? this.iceServers, ...(this.relayOnly ? { iceTransportPolicy: 'relay' } : {}) });
    const audio = document.createElement('audio');
    audio.autoplay = true;
    audio.muted = !this.#speaker;
    audio.setAttribute('playsinline', '');
    document.body.append(audio);
    const p = { pc, audio, pending: [], timer: null };
    this.#peers.set(id, p);
    pc.ontrack = (e) => {
      audio.srcObject = e.streams[0] ?? new MediaStream([e.track]);
      audio.play().catch((err) => { if (err?.name === 'NotAllowedError') this.onState?.('blocked-audio', id); }); // the browser wants a tap first (an AbortError is only a new source)
    };
    pc.onconnectionstatechange = () => {
      if (this.#peers.get(id) !== p) return;
      const st = pc.connectionState;
      clearTimeout(p.timer);
      if (st === 'connected' || st === 'failed') this.net.send({ type: 'call-diag', state: st, detail: this.#relayInfo() });
      if (st === 'connected') this.onState?.('connected', id);
      else if (st === 'failed') this.onState?.('failed', id);
      else if (st === 'disconnected') p.timer = setTimeout(() => this.onState?.('lost', id), RECONNECT); // (it often comes back by itself)
    };
    pc.onicecandidate = (e) => { if (e.candidate) this.net.send({ type: 'rtc', to: id, data: { candidate: e.candidate } }); };
    this.#micReady ??= this.#openMic();
    this.#micReady.then(async (ok) => {
      if (this.#peers.get(id) !== p) return;
      if (ok) pc.addTrack(this.#mic.track, this.#mic.stream);
      else pc.addTransceiver('audio', { direction: 'recvonly' }); // can still hear the others
      if (initiator) {
        await pc.setLocalDescription(await pc.createOffer());
        this.net.send({ type: 'rtc', to: id, data: { sdp: pc.localDescription } });
      }
    });
  }

  /** Someone left the call: close the connection to them (the call goes on with the others). */
  remove(id) {
    const p = this.#peers.get(id);
    if (!p) return;
    this.#peers.delete(id);
    clearTimeout(p.timer);
    p.pc.close();
    p.audio.srcObject = null;
    p.audio.remove();
  }

  async #openMic() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (!this.inCall) { stream.getTracks().forEach((t) => t.stop()); return false; }
      const track = stream.getAudioTracks()[0];
      this.#mic = { stream, track };
      track.enabled = !this.#muted;
      if (!this.#muted) this.recorder.start(track, 'call');
      return true;
    } catch { return false; }
  }

  async #signal(id, data) {
    const p = this.#peers.get(id);
    if (!p) return;
    const { pc } = p;
    try {
      if (data.sdp) {
        if (data.sdp.type === 'offer') await this.#micReady; // (my mic goes into the answer)
        await pc.setRemoteDescription(data.sdp);
        for (const c of p.pending.splice(0)) await pc.addIceCandidate(c);
        if (data.sdp.type === 'offer') {
          await pc.setLocalDescription(await pc.createAnswer());
          this.net.send({ type: 'rtc', to: id, data: { sdp: pc.localDescription } });
        }
      } else if (data.candidate) {
        if (pc.remoteDescription) await pc.addIceCandidate(data.candidate); else p.pending.push(data.candidate);
      }
    } catch (e) { console.warn('[voice] signalling error', e); }
  }

  setMuted(muted) {
    this.#muted = muted;
    if (!this.#mic) return;
    this.#mic.track.enabled = !muted;
    if (muted) this.recorder.stop(); else this.recorder.start(this.#mic.track, 'call');
  }

  /** The others' voices on or off (the 🔊 button); on also starts any the browser held back. */
  setSpeaker(on) {
    this.#speaker = on;
    for (const { audio } of this.#peers.values()) audio.muted = !on;
    return on ? this.resumeAudio() : Promise.resolve(true);
  }

  /** After the browser blocked autoplay: play on a tap. */
  resumeAudio() {
    return Promise.all([...this.#peers.values()].map(({ audio }) => (audio.srcObject ? audio.play().then(() => true, () => false) : true))).then((r) => r.every(Boolean));
  }

  #relayInfo() {
    const ice = this.net.ice ?? this.iceServers;
    return `turn:${ice.some((s) => String(s.urls).includes('turn:')) ? 'yes' : 'no'}`;
  }

  end() {
    this.recorder.stop();
    for (const id of [...this.#peers.keys()]) this.remove(id);
    this.#mic?.stream.getTracks().forEach((t) => t.stop());
    this.#mic = null;
    this.#micReady = null;
    this.#muted = false;
    this.#speaker = true;
  }

  /** Debug/test helpers. */
  states() { return Object.fromEntries([...this.#peers].map(([id, p]) => [id, p.pc.connectionState])); }
  _debugPeers() { return [...this.#peers.values()].map((p) => p.pc); }
  _debugAudio() { return [...this.#peers.values()].map((p) => p.audio); }
}
