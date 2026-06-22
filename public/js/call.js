// Apex Sessions — call page logic
// This page is reached only by navigating from index.html (or a shared
// link of the form /call.html?room=CODE&name=NAME). It owns the whole
// in-call experience: joining, tiles, chat, and host controls.

(() => {
  const els = {
    roomCodeChip: document.getElementById('room-code-chip'),
    roomCodeText: document.getElementById('room-code-text'),
    callTimer: document.getElementById('call-timer'),
    videoGrid: document.getElementById('video-grid'),

    sidePanel: document.getElementById('side-panel'),
    sidePanelClose: document.getElementById('side-panel-close'),
    sideTabs: document.querySelectorAll('.side-tab'),
    sideBodies: document.querySelectorAll('.side-panel-body'),
    chatLog: document.getElementById('chat-log'),
    chatForm: document.getElementById('chat-form'),
    chatInput: document.getElementById('chat-input'),
    peopleList: document.getElementById('people-list'),
    peopleCount: document.getElementById('people-count'),
    btnMuteAll: document.getElementById('btn-mute-all'),

    ctlMic: document.getElementById('ctl-mic'),
    ctlCam: document.getElementById('ctl-cam'),
    ctlScreen: document.getElementById('ctl-screen'),
    ctlChat: document.getElementById('ctl-chat'),
    ctlPeople: document.getElementById('ctl-people'),
    ctlLeave: document.getElementById('ctl-leave'),

    toast: document.getElementById('toast'),
    tileTemplate: document.getElementById('tile-template'),
  };

  // ---------------- Read join params from the URL ----------------
  const params = new URLSearchParams(window.location.search);
  const roomId = (params.get('room') || '').trim();
  const displayName = (params.get('name') || '').trim() || 'Guest';
  let wantAudio = params.get('audio') !== '0';
  let wantVideo = params.get('video') !== '0';

  if (!roomId) {
    // No session to join — send them back to pick one.
    window.location.href = '/';
    return;
  }

  let socket = null;
  let rtc = null;
  let selfId = null;
  let isHost = false;
  let callStartedAt = null;
  let timerInterval = null;
  let isScreenSharing = false;

  // id -> { name, isHost, audio, video, screenSharing, tileEl }
  const participants = new Map();

  // ---------------- Toast ----------------
  let toastTimer = null;
  function showToast(message, duration = 2600) {
    els.toast.textContent = message;
    els.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { els.toast.hidden = true; }, duration);
  }

  // ---------------- Join on load ----------------
  async function init() {
    els.roomCodeText.textContent = roomId;

    socket = io();
    rtc = new ApexRTC(socket);

    rtc.onRemoteStream = (peerId, stream) => attachStreamToTile(peerId, stream);
    rtc.onRemoteSpeaking = (peerId, speaking) => {
      const p = participants.get(peerId);
      if (p && p.tileEl) p.tileEl.classList.toggle('is-speaking', speaking);
    };
    rtc.onPeerGone = (peerId) => removeTile(peerId);

    try {
      await rtc.getLocalMedia({ audio: wantAudio, video: wantVideo });
    } catch (err) {
      showToast("Couldn't access camera or mic — joining without them.");
      wantAudio = false;
      wantVideo = false;
    }

    bindSocketEvents();
    socket.emit('join-room', { roomId, displayName, audio: wantAudio, video: wantVideo });

    setCtlState(els.ctlMic, wantAudio);
    setCtlState(els.ctlCam, wantVideo);
    startTimer();

    if (rtc.localStream) {
      rtc.watchLocalSpeaking((speaking) => {
        const p = participants.get(selfId);
        if (p && p.tileEl) p.tileEl.classList.toggle('is-speaking', speaking);
      });
    }
  }

  // ---------------- Socket events ----------------
  function bindSocketEvents() {
    socket.on('join-error', ({ message }) => {
      showToast(message);
      setTimeout(() => { window.location.href = '/'; }, 1500);
    });

    socket.on('joined', ({ selfId: id, isHost: host, participants: roster }) => {
      selfId = id;
      isHost = host;
      els.btnMuteAll.hidden = !isHost;

      upsertParticipant(selfId, {
        name: displayName,
        isHost,
        audio: wantAudio,
        video: wantVideo,
        screenSharing: false,
      });
      ensureTile(selfId, true);
      if (rtc.localStream) attachStreamToTile(selfId, rtc.localStream);

      roster.forEach((p) => {
        upsertParticipant(p.id, p);
        ensureTile(p.id, false);
        rtc.callPeer(p.id);
      });

      renderPeopleList();
    });

    socket.on('user-joined', (p) => {
      upsertParticipant(p.id, p);
      ensureTile(p.id, false);
      renderPeopleList();
      showToast(`${p.name} joined`);
    });

    socket.on('user-left', ({ id }) => {
      const p = participants.get(id);
      if (p) showToast(`${p.name} left`);
      rtc.removePeer(id);
      removeTile(id);
      participants.delete(id);
      renderPeopleList();
    });

    socket.on('participant-updated', (p) => {
      upsertParticipant(p.id, p);
      updateTileMeta(p.id);
      renderPeopleList();
    });

    socket.on('host-changed', ({ id }) => {
      isHost = id === selfId;
      els.btnMuteAll.hidden = !isHost;
      if (isHost) showToast("You're the host now");
      renderPeopleList();
    });

    socket.on('force-mute', ({ muted }) => {
      wantAudio = !muted;
      rtc.setLocalAudioEnabled(wantAudio);
      setCtlState(els.ctlMic, wantAudio);
      showToast(muted ? 'The host muted you' : 'The host unmuted you');
    });

    socket.on('chat-message', ({ from, name, text, ts }) => {
      appendChatMessage({ name, text, ts, isSelf: from === selfId });
    });
  }

  // ---------------- Participants & tiles ----------------
  function upsertParticipant(id, data) {
    const existing = participants.get(id) || {};
    participants.set(id, { ...existing, ...data });
  }

  function ensureTile(id, isSelf) {
    const p = participants.get(id);
    if (!p || p.tileEl) return p && p.tileEl;

    const node = els.tileTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.peerId = id;
    node.classList.toggle('is-self', isSelf);
    node.querySelector('.tile-name').textContent = isSelf ? `${p.name} (You)` : p.name;
    if (isSelf) node.querySelector('.tile-video').muted = true;

    els.videoGrid.appendChild(node);
    p.tileEl = node;
    updateTileMeta(id);
    return node;
  }

  function attachStreamToTile(id, stream) {
    const p = participants.get(id);
    if (!p) return;
    const tile = p.tileEl || ensureTile(id, id === selfId);
    const videoEl = tile.querySelector('.tile-video');
    videoEl.srcObject = stream;
    const hasLiveVideo = stream.getVideoTracks().some((t) => t.enabled && t.readyState === 'live');
    tile.classList.toggle('no-video', !hasLiveVideo);
  }

  function updateTileMeta(id) {
    const p = participants.get(id);
    if (!p || !p.tileEl) return;
    p.tileEl.classList.toggle('is-host', !!p.isHost);
    p.tileEl.classList.toggle('is-muted', p.audio === false);
    p.tileEl.classList.toggle('no-video', p.video === false);
  }

  function removeTile(id) {
    const p = participants.get(id);
    if (p && p.tileEl) p.tileEl.remove();
  }

  // ---------------- People panel ----------------
  function renderPeopleList() {
    els.peopleList.innerHTML = '';
    els.peopleCount.textContent = String(participants.size);

    participants.forEach((p, id) => {
      const li = document.createElement('li');
      li.className = 'people-row';

      const avatar = document.createElement('span');
      avatar.className = 'people-avatar';

      const name = document.createElement('span');
      name.className = 'people-name';
      name.textContent = id === selfId ? `${p.name} (You)` : p.name;

      li.append(avatar, name);

      if (p.isHost) {
        const tag = document.createElement('span');
        tag.className = 'people-tag';
        tag.textContent = 'HOST';
        li.appendChild(tag);
      }

      if (isHost && id !== selfId) {
        const muteBtn = document.createElement('button');
        muteBtn.className = 'people-mute-btn';
        muteBtn.classList.toggle('is-muted', p.audio === false);
        muteBtn.title = p.audio === false ? 'Unmute' : 'Mute';
        muteBtn.innerHTML = p.audio === false
          ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M19 10v2a7 7 0 0 1-9.7 6.44"/><line x1="12" y1="19" x2="12" y2="23"/></svg>'
          : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>';
        muteBtn.addEventListener('click', () => {
          socket.emit('host-set-mute', { targetId: id, muted: p.audio !== false });
        });
        li.appendChild(muteBtn);
      }

      els.peopleList.appendChild(li);
    });
  }

  els.btnMuteAll.addEventListener('click', () => {
    socket.emit('host-mute-all');
    showToast('Muted everyone');
  });

  // ---------------- Chat ----------------
  function appendChatMessage({ name, text, ts, isSelf }) {
    const row = document.createElement('div');
    row.className = 'chat-msg' + (isSelf ? ' is-self' : '');

    const head = document.createElement('div');
    head.className = 'chat-msg-head';
    const nameEl = document.createElement('span');
    nameEl.className = 'chat-msg-name';
    nameEl.textContent = isSelf ? 'You' : name;
    const timeEl = document.createElement('span');
    timeEl.className = 'chat-msg-time';
    timeEl.textContent = new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    head.append(nameEl, timeEl);

    const textEl = document.createElement('div');
    textEl.className = 'chat-msg-text';
    textEl.textContent = text;

    row.append(head, textEl);
    els.chatLog.appendChild(row);
    els.chatLog.scrollTop = els.chatLog.scrollHeight;
  }

  els.chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = els.chatInput.value.trim();
    if (!text) return;
    socket.emit('chat-message', { text });
    els.chatInput.value = '';
  });

  // ---------------- Side panel open/close ----------------
  function openSidePanel(which) {
    els.sidePanel.hidden = false;
    els.sideTabs.forEach((t) => t.classList.toggle('is-active', t.dataset.panelTab === which));
    els.sideBodies.forEach((b) => { b.hidden = b.dataset.panelBody !== which; });
    setCtlState(els.ctlChat, which === 'chat');
    setCtlState(els.ctlPeople, which === 'people');
  }
  function closeSidePanel() {
    els.sidePanel.hidden = true;
    setCtlState(els.ctlChat, false);
    setCtlState(els.ctlPeople, false);
  }

  els.sideTabs.forEach((tab) => {
    tab.addEventListener('click', () => openSidePanel(tab.dataset.panelTab));
  });
  els.sidePanelClose.addEventListener('click', closeSidePanel);

  els.ctlChat.addEventListener('click', () => {
    const isOpen = !els.sidePanel.hidden && !els.sidePanel.querySelector('[data-panel-body="chat"]').hidden;
    isOpen ? closeSidePanel() : openSidePanel('chat');
  });
  els.ctlPeople.addEventListener('click', () => {
    const isOpen = !els.sidePanel.hidden && !els.sidePanel.querySelector('[data-panel-body="people"]').hidden;
    isOpen ? closeSidePanel() : openSidePanel('people');
  });

  // ---------------- Mic / camera / screen-share controls ----------------
  function setCtlState(btn, on) {
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-pressed', String(on));
  }

  els.ctlMic.addEventListener('click', () => {
    wantAudio = !wantAudio;
    rtc.setLocalAudioEnabled(wantAudio);
    setCtlState(els.ctlMic, wantAudio);
    socket.emit('media-state', { audio: wantAudio });
  });

  els.ctlCam.addEventListener('click', () => {
    wantVideo = !wantVideo;
    rtc.setLocalVideoEnabled(wantVideo);
    setCtlState(els.ctlCam, wantVideo);
    socket.emit('media-state', { video: wantVideo });
    const p = participants.get(selfId);
    if (p && p.tileEl) p.tileEl.classList.toggle('no-video', !wantVideo);
  });

  els.ctlScreen.addEventListener('click', async () => {
    try {
      if (!isScreenSharing) {
        const stream = await rtc.startScreenShare();
        isScreenSharing = true;
        setCtlState(els.ctlScreen, true);
        attachStreamToTile(selfId, stream);
        socket.emit('media-state', { screenSharing: true });
        stream.getVideoTracks()[0].addEventListener('ended', () => {
          if (isScreenSharing) els.ctlScreen.click();
        });
      } else {
        await rtc.stopScreenShare();
        isScreenSharing = false;
        setCtlState(els.ctlScreen, false);
        if (rtc.localStream) attachStreamToTile(selfId, rtc.localStream);
        socket.emit('media-state', { screenSharing: false });
      }
    } catch (err) {
      // User cancelled the "choose what to share" dialog — no-op.
    }
  });

  // ---------------- Room code copy ----------------
  els.roomCodeChip.addEventListener('click', () => {
    navigator.clipboard.writeText(els.roomCodeText.textContent).then(() => {
      showToast('Session code copied');
    }).catch(() => {
      showToast(`Session code: ${els.roomCodeText.textContent}`);
    });
  });

  // ---------------- Call timer ----------------
  function startTimer() {
    callStartedAt = Date.now();
    timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - callStartedAt) / 1000);
      const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const s = String(elapsed % 60).padStart(2, '0');
      els.callTimer.textContent = `${m}:${s}`;
    }, 1000);
  }

  // ---------------- Leaving: a real navigation back to the landing page ----------------
  els.ctlLeave.addEventListener('click', () => {
    if (socket) socket.emit('leave-room');
    window.location.href = '/';
  });

  window.addEventListener('beforeunload', () => {
    if (socket) socket.emit('leave-room');
  });

  init();
})();
