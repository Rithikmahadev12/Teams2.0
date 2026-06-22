// Apex Sessions — landing page logic
// This page never connects to Socket.io or opens any peer connections —
// it just previews the camera/mic, then hands off to call.html via a
// normal URL navigation (a real page, not a hidden section).

(() => {
  const PEAK_WORDS = ['ridge', 'summit', 'ascent', 'basecamp', 'alpine', 'crest', 'ledge', 'switchback'];

  const els = {
    displayName: document.getElementById('display-name'),
    entryTabs: document.querySelectorAll('.entry-tab'),
    entryPanels: document.querySelectorAll('.entry-panel'),
    btnCreate: document.getElementById('btn-create'),
    btnJoin: document.getElementById('btn-join'),
    roomCodeInput: document.getElementById('room-code'),
    entryError: document.getElementById('entry-error'),

    precheckVideo: document.getElementById('precheck-video'),
    precheckPlaceholder: document.getElementById('precheck-placeholder'),
    precheckMic: document.getElementById('precheck-mic'),
    precheckCam: document.getElementById('precheck-cam'),
  };

  let wantAudio = true;
  let wantVideo = true;
  let precheckStream = null;

  // ---------------- Tabs ----------------
  els.entryTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      els.entryTabs.forEach((t) => { t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false'); });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');
      const which = tab.dataset.tab;
      els.entryPanels.forEach((p) => { p.hidden = p.dataset.panel !== which; });
      els.entryError.hidden = true;
    });
  });

  // ---------------- Camera/mic precheck ----------------
  async function initPrecheck() {
    try {
      precheckStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    } catch (err) {
      try {
        precheckStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        wantVideo = false;
        setPillState(els.precheckCam, false);
      } catch (err2) {
        wantAudio = false;
        wantVideo = false;
        setPillState(els.precheckMic, false);
        setPillState(els.precheckCam, false);
        els.precheckPlaceholder.querySelector('p').textContent = 'Camera & mic unavailable';
        return;
      }
    }
    els.precheckVideo.srcObject = precheckStream;
    els.precheckPlaceholder.style.display = wantVideo ? 'none' : 'flex';
  }

  function setPillState(pillEl, on) {
    pillEl.classList.toggle('is-on', on);
    pillEl.setAttribute('aria-pressed', String(on));
  }

  els.precheckMic.addEventListener('click', () => {
    wantAudio = !wantAudio;
    setPillState(els.precheckMic, wantAudio);
    if (precheckStream) precheckStream.getAudioTracks().forEach((t) => (t.enabled = wantAudio));
  });

  els.precheckCam.addEventListener('click', () => {
    wantVideo = !wantVideo;
    setPillState(els.precheckCam, wantVideo);
    if (precheckStream) precheckStream.getVideoTracks().forEach((t) => (t.enabled = wantVideo));
    els.precheckPlaceholder.style.display = wantVideo && precheckStream && precheckStream.getVideoTracks().length ? 'none' : 'flex';
  });

  initPrecheck();

  // ---------------- Create / join → navigate to call.html ----------------
  function randomRoomCode() {
    const word = PEAK_WORDS[Math.floor(Math.random() * PEAK_WORDS.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    return `${word}-${num}`;
  }

  function showEntryError(msg) {
    els.entryError.textContent = msg;
    els.entryError.hidden = false;
  }

  function goToCall(roomId) {
    if (precheckStream) precheckStream.getTracks().forEach((t) => t.stop());
    const params = new URLSearchParams({
      room: roomId,
      name: els.displayName.value.trim(),
      audio: wantAudio ? '1' : '0',
      video: wantVideo ? '1' : '0',
    });
    window.location.href = `/call.html?${params.toString()}`;
  }

  els.btnCreate.addEventListener('click', () => {
    const name = els.displayName.value.trim();
    if (!name) return showEntryError('Enter your name first.');
    goToCall(randomRoomCode());
  });

  els.btnJoin.addEventListener('click', () => {
    const name = els.displayName.value.trim();
    const code = els.roomCodeInput.value.trim().toLowerCase();
    if (!name) return showEntryError('Enter your name first.');
    if (!code) return showEntryError('Enter a session code to join.');
    goToCall(code);
  });

  // Pressing Enter in either field submits the visible panel's button.
  els.displayName.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const activePanel = document.querySelector('.entry-panel:not([hidden])').dataset.panel;
    (activePanel === 'create' ? els.btnCreate : els.btnJoin).click();
  });
  els.roomCodeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') els.btnJoin.click();
  });
})();
