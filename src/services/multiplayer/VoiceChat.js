/**
 * Push-to-talk voice over WebRTC (peer-to-peer mesh; the village server only relays
 * signalling). The newcomer sends the offers with a send/receive audio transceiver; the
 * answerer adopts the transceiver created by the offer. The mic track is attached later
 * with replaceTrack, so pressing push-to-talk never needs renegotiation.
 */
export class VoiceChat {
  #peers = new Map();
  #mic = null;
  #micPromise = null;

  constructor({ net, iceServers = [{ urls: 'stun:stun.l.google.com:19302' }] }) {
    this.net = net;
    this.iceServers = iceServers;
    net.on('rtc', ({ from, data }) => this.#signal(from, data));
  }

  get supported() { return typeof RTCPeerConnection === 'function' && !!navigator.mediaDevices?.getUserMedia; }

  /** We just joined: call everyone already there. */
  callAll(peerIds) { peerIds.forEach((id) => this.#connect(id, true)); }
  /** Someone joined after us: wait for their offer. */
  expect(peerId) { this.#connect(peerId, false); }

  #connect(id, initiator) {
    if (!this.supported || this.#peers.has(id)) return this.#peers.get(id);
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    const audio = new Audio();
    audio.autoplay = true;
    const peer = { pc, audio, pending: [] };
    this.#peers.set(id, peer);
    if (initiator) this.#attach(peer, pc.addTransceiver('audio', { direction: 'sendrecv' }));
    pc.ontrack = (e) => { audio.srcObject = e.streams[0] ?? new MediaStream([e.track]); audio.play().catch(() => {}); };
    pc.onicecandidate = (e) => { if (e.candidate) this.net.send({ type: 'rtc', to: id, data: { candidate: e.candidate } }); };
    if (initiator) {
      pc.createOffer()
        .then((o) => pc.setLocalDescription(o))
        .then(() => this.net.send({ type: 'rtc', to: id, data: { sdp: pc.localDescription } }))
        .catch((e) => console.warn('[voice] offer failed', e));
    }
    return peer;
  }

  async #signal(from, data) {
    const peer = this.#connect(from, false);
    if (!peer) return;
    const { pc } = peer;
    try {
      if (data.sdp) {
        await pc.setRemoteDescription(data.sdp);
        for (const c of peer.pending.splice(0)) await pc.addIceCandidate(c);
        if (data.sdp.type === 'offer') {
          const t = pc.getTransceivers().find((x) => x.receiver.track.kind === 'audio');
          if (t) { t.direction = 'sendrecv'; this.#attach(peer, t); }
          await pc.setLocalDescription(await pc.createAnswer());
          this.net.send({ type: 'rtc', to: from, data: { sdp: pc.localDescription } });
        }
      } else if (data.candidate) {
        if (pc.remoteDescription) await pc.addIceCandidate(data.candidate); else peer.pending.push(data.candidate);
      }
    } catch (e) { console.warn('[voice] signalling error', e); }
  }

  #attach(peer, transceiver) {
    peer.transceiver = transceiver;
    if (this.#mic) transceiver.sender.replaceTrack(this.#mic);
  }

  /** Ask for the microphone once (on the first push-to-talk). */
  async #ensureMic() {
    if (this.#mic) return this.#mic;
    this.#micPromise ??= navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
      .then((stream) => {
        this.#mic = stream.getAudioTracks()[0];
        this.#mic.enabled = false;
        this.#peers.forEach((p) => p.transceiver?.sender.replaceTrack(this.#mic));
        return this.#mic;
      })
      .finally(() => { this.#micPromise = null; });
    return this.#micPromise;
  }

  async setTalking(on) {
    if (!this.supported) return false;
    if (!on) { if (this.#mic) this.#mic.enabled = false; return true; }
    const mic = await this.#ensureMic();
    mic.enabled = true;
    return true;
  }

  /** 0..1 per peer, e.g. by distance. */
  setVolume(id, v) { const p = this.#peers.get(id); if (p) p.audio.volume = Math.max(0, Math.min(1, v)); }

  drop(id) {
    const p = this.#peers.get(id);
    if (!p) return;
    p.pc.close();
    p.audio.srcObject = null;
    this.#peers.delete(id);
  }

  /** Debug/test helpers: connection state per peer, raw peer connections. */
  states() { return Object.fromEntries([...this.#peers].map(([id, p]) => [id, p.pc.connectionState])); }
  _debugPeers() { return [...this.#peers.values()].map((p) => p.pc); }

  closeAll() {
    [...this.#peers.keys()].forEach((id) => this.drop(id));
    this.#mic?.stop();
    this.#mic = null;
  }
}
