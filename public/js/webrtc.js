// Apex Sessions — WebRTC engine
// Mesh topology: every participant opens one RTCPeerConnection to every
// other participant. This is simple and works great for small calls
// (roughly up to 6-8 people). For larger rooms you'd swap this for an
// SFU (e.g. mediasoup), but mesh keeps the whole app deployable as a
// single lightweight Node service on Render.

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

class ApexRTC {
  constructor(socket) {
    this.socket = socket;
    this.peers = new Map();        // peerId -> RTCPeerConnection
    this.localStream = null;       // camera+mic (or null if never granted)
    this.screenStream = null;      // active screen-share stream, if any
    this.cameraTrack = null;       // kept so we can swap back from screen-share

    this.onRemoteStream = null;    // (peerId, stream) => void
    this.onRemoteSpeaking = null;  // (peerId, isSpeaking) => void
    this.onPeerGone = null;        // (peerId) => void

    this._speakingAnalysers = new Map();

    socket.on('signal', ({ from, type, data }) => this._handleSignal(from, type, data));
  }

  async getLocalMedia({ audio, video }) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio, video });
    this.localStream = stream;
    this.cameraTrack = stream.getVideoTracks()[0] || null;
    return stream;
  }

  setLocalAudioEnabled(enabled) {
    if (!this.localStream) return;
    this.localStream.getAudioTracks().forEach((t) => (t.enabled = enabled));
  }

  setLocalVideoEnabled(enabled) {
    if (!this.localStream) return;
    this.localStream.getVideoTracks().forEach((t) => (t.enabled = enabled));
  }

  /** Open (or re-use) a connection to a peer and send it our current tracks. */
  _ensurePeer(peerId) {
    if (this.peers.has(peerId)) return this.peers.get(peerId);

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => pc.addTrack(track, this.localStream));
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.socket.emit('signal', { to: peerId, type: 'ice-candidate', data: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      const [stream] = e.streams;
      if (this.onRemoteStream) this.onRemoteStream(peerId, stream);
      this._watchSpeaking(peerId, stream);
    };

    pc.onconnectionstatechange = () => {
      if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
        // 'disconnected' can be transient, but for a small mesh app
        // it's safer to just clean up than to leave zombie tiles.
        if (pc.connectionState !== 'disconnected') this._teardownPeer(peerId);
      }
    };

    this.peers.set(peerId, pc);
    return pc;
  }

  /** Call this for every participant already in the room when you join. */
  async callPeer(peerId) {
    const pc = this._ensurePeer(peerId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.socket.emit('signal', { to: peerId, type: 'offer', data: offer });
  }

  async _handleSignal(from, type, data) {
    if (type === 'offer') {
      const pc = this._ensurePeer(from);
      await pc.setRemoteDescription(new RTCSessionDescription(data));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.socket.emit('signal', { to: from, type: 'answer', data: answer });
    } else if (type === 'answer') {
      const pc = this.peers.get(from);
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(data));
    } else if (type === 'ice-candidate') {
      const pc = this.peers.get(from);
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data));
        } catch (err) {
          // Benign if it arrives before the remote description is set.
        }
      }
    }
  }

  _teardownPeer(peerId) {
    const pc = this.peers.get(peerId);
    if (pc) {
      pc.close();
      this.peers.delete(peerId);
    }
    const analyser = this._speakingAnalysers.get(peerId);
    if (analyser) {
      clearInterval(analyser.interval);
      analyser.ctx.close().catch(() => {});
      this._speakingAnalysers.delete(peerId);
    }
    if (this.onPeerGone) this.onPeerGone(peerId);
  }

  removePeer(peerId) {
    this._teardownPeer(peerId);
  }

  /** Push a freshly captured local track out to every open connection. */
  _replaceOutgoingTrack(track, kind) {
    this.peers.forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track && s.track.kind === kind);
      if (sender) sender.replaceTrack(track);
    });
  }

  async startScreenShare() {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    this.screenStream = stream;
    const screenTrack = stream.getVideoTracks()[0];
    this._replaceOutgoingTrack(screenTrack, 'video');

    // If the user stops sharing via the browser's own "Stop sharing" UI,
    // fall back to the camera automatically.
    screenTrack.onended = () => this.stopScreenShare();

    return stream;
  }

  async stopScreenShare() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => t.stop());
      this.screenStream = null;
    }
    if (this.cameraTrack) {
      this._replaceOutgoingTrack(this.cameraTrack, 'video');
    }
  }

  /** Lightweight volume watch so the UI can put a glow ring on whoever's talking. */
  _watchSpeaking(peerId, stream) {
    if (this._speakingAnalysers.has(peerId)) return;
    if (!stream || stream.getAudioTracks().length === 0) return;

    let ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (err) {
      return;
    }
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    let wasSpeaking = false;
    const interval = setInterval(() => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      const isSpeaking = avg > 14;
      if (isSpeaking !== wasSpeaking) {
        wasSpeaking = isSpeaking;
        if (this.onRemoteSpeaking) this.onRemoteSpeaking(peerId, isSpeaking);
      }
    }, 180);

    this._speakingAnalysers.set(peerId, { ctx, interval });
  }

  /** Same idea, but for our own mic so our own tile can glow too. */
  watchLocalSpeaking(callback) {
    if (!this.localStream || this.localStream.getAudioTracks().length === 0) return;
    this._watchSpeaking('self', this.localStream);
    const original = this.onRemoteSpeaking;
    this.onRemoteSpeaking = (peerId, speaking) => {
      if (peerId === 'self') callback(speaking);
      else if (original) original(peerId, speaking);
    };
  }

  closeAll() {
    this.peers.forEach((pc) => pc.close());
    this.peers.clear();
    this._speakingAnalysers.forEach((a) => {
      clearInterval(a.interval);
      a.ctx.close().catch(() => {});
    });
    this._speakingAnalysers.clear();
    if (this.localStream) this.localStream.getTracks().forEach((t) => t.stop());
    if (this.screenStream) this.screenStream.getTracks().forEach((t) => t.stop());
  }
}
