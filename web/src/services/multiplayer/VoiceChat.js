/**
 * One-to-one voice call over WebRTC, only between two players who both agreed
 * (the village server relays signalling for that pair only). The mic is open for the
 * whole call; `setMuted` mutes it.
 */
export class VoiceChat {
  #pc = null;
  #mic = null;
  #audio = null;
  #pending = [];

  /**
   * @param {object} o
   * @param {(state: string) => void} [o.onState]  'connected' | 'failed' | 'blocked-audio' … for the UI
   */
  constructor({ net, iceServers = [{ urls: 'stun:stun.l.google.com:19302' }], onState, relayOnly = false }) {
    this.relayOnly = relayOnly; // ?relayonly: force the TURN relay (to test it)
    this.net = net;
    this.iceServers = iceServers;
    this.onState = onState;
    this.partner = null;
    net.on('rtc', ({ from, data }) => { if (from === this.partner) this.#signal(data); });
  }

  get supported() { return typeof RTCPeerConnection === 'function' && !!navigator.mediaDevices?.getUserMedia; }
  get inCall() { return !!this.partner; }

  /** Start the call; the requester (initiator) sends the offer. Resolves false if the mic is unavailable. */
  async start(partnerId, initiator) {
    this.end();
    if (!this.supported) return false;
    this.partner = partnerId;
    // the server hands out our TURN relay (needed between phones on mobile data and office / school networks)
    const pc = this.#pc = new RTCPeerConnection({ iceServers: this.net.ice ?? this.iceServers, ...(this.relayOnly ? { iceTransportPolicy: 'relay' } : {}) });
    const audio = this.#audio = document.createElement('audio');
    audio.autoplay = true;
    audio.setAttribute('playsinline', '');
    document.body.append(audio);
    pc.ontrack = (e) => {
      audio.srcObject = e.streams[0] ?? new MediaStream([e.track]);
      audio.play().catch(() => this.onState?.('blocked-audio')); // the browser wants a tap first
    };
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (this.#pc !== pc) return;
      if (st === 'connected' || st === 'failed') {
        this.net.send({ type: 'call-diag', state: st, detail: this.#relayInfo() });
        this.onState?.(st);
      }
    };
    pc.onicecandidate = (e) => { if (e.candidate) this.net.send({ type: 'rtc', to: partnerId, data: { candidate: e.candidate } }); };
    let micOk = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (this.#pc !== pc) { stream.getTracks().forEach((t) => t.stop()); return false; }
      this.#mic = stream.getAudioTracks()[0];
      pc.addTrack(this.#mic, stream);
    } catch {
      micOk = false;
      pc.addTransceiver('audio', { direction: 'recvonly' }); // can still hear the other side
    }
    if (initiator) {
      await pc.setLocalDescription(await pc.createOffer());
      this.net.send({ type: 'rtc', to: partnerId, data: { sdp: pc.localDescription } });
    }
    return micOk;
  }

  async #signal(data) {
    const pc = this.#pc;
    if (!pc) return;
    try {
      if (data.sdp) {
        await pc.setRemoteDescription(data.sdp);
        for (const c of this.#pending.splice(0)) await pc.addIceCandidate(c);
        if (data.sdp.type === 'offer') {
          await pc.setLocalDescription(await pc.createAnswer());
          this.net.send({ type: 'rtc', to: this.partner, data: { sdp: pc.localDescription } });
        }
      } else if (data.candidate) {
        if (pc.remoteDescription) await pc.addIceCandidate(data.candidate); else this.#pending.push(data.candidate);
      }
    } catch (e) { console.warn('[voice] signalling error', e); }
  }

  setMuted(muted) { if (this.#mic) this.#mic.enabled = !muted; }

  /** After the browser blocked autoplay: play on a tap. */
  resumeAudio() { return this.#audio?.play().then(() => true).catch(() => false); }

  #relayInfo() {
    const ice = this.net.ice ?? this.iceServers;
    return `turn:${ice.some((s) => String(s.urls).includes('turn:')) ? 'yes' : 'no'}`;
  }

  end() {
    this.#pc?.close();
    this.#pc = null;
    this.#mic?.stop();
    this.#mic = null;
    if (this.#audio) { this.#audio.srcObject = null; this.#audio.remove(); this.#audio = null; }
    this.#pending = [];
    this.partner = null;
  }

  /** Debug/test helpers. */
  states() { return this.#pc ? { [this.partner]: this.#pc.connectionState } : {}; }
  _debugPeers() { return this.#pc ? [this.#pc] : []; }
}
