<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Apex Sessions — In session</title>
<link rel="icon" href="data:," />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/style.css" />
</head>
<body>

<div class="summit-glow" aria-hidden="true"></div>

<main id="view-call" class="view view-call">

  <header class="call-topbar">
    <div class="call-topbar-left">
      <span class="brand-mark brand-mark-sm" aria-hidden="true"></span>
      <div class="room-meta">
        <span class="room-label">Apex Sessions</span>
        <button id="room-code-chip" class="room-code-chip" title="Copy session code">
          <span id="room-code-text">—</span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
      </div>
    </div>
    <div class="call-topbar-right">
      <span id="call-timer" class="call-timer">00:00</span>
    </div>
  </header>

  <section class="stage" aria-label="Video grid">
    <div id="video-grid" class="video-grid"></div>
  </section>

  <aside id="side-panel" class="side-panel" hidden>
    <div class="side-panel-tabs">
      <button class="side-tab is-active" data-panel-tab="chat">Chat</button>
      <button class="side-tab" data-panel-tab="people">People <span id="people-count" class="count-badge">1</span></button>
      <button class="side-panel-close" id="side-panel-close" aria-label="Close panel">✕</button>
    </div>

    <div class="side-panel-body" data-panel-body="chat">
      <div id="chat-log" class="chat-log" aria-live="polite"></div>
      <form id="chat-form" class="chat-form">
        <input id="chat-input" type="text" maxlength="1000" placeholder="Message everyone…" autocomplete="off" />
        <button type="submit" class="chat-send" aria-label="Send message">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </form>
    </div>

    <div class="side-panel-body" data-panel-body="people" hidden>
      <div class="people-host-actions">
        <button id="btn-mute-all" class="btn btn-ghost btn-sm" hidden>Mute all</button>
      </div>
      <ul id="people-list" class="people-list"></ul>
    </div>
  </aside>

  <footer class="control-bar">
    <div class="control-bar-inner">
      <button id="ctl-mic" class="ctl-btn is-on" type="button" aria-pressed="true">
        <svg class="icon-on" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>
        <svg class="icon-off" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M19 10v2a7 7 0 0 1-9.7 6.44"/><line x1="12" y1="19" x2="12" y2="23"/></svg>
        <span class="ctl-label">Mic</span>
      </button>

      <button id="ctl-cam" class="ctl-btn is-on" type="button" aria-pressed="true">
        <svg class="icon-on" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
        <svg class="icon-off" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 16v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"/><path d="M23 7l-7 5 7 5V7z"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
        <span class="ctl-label">Camera</span>
      </button>

      <button id="ctl-screen" class="ctl-btn" type="button" aria-pressed="false">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        <span class="ctl-label">Share</span>
      </button>

      <button id="ctl-chat" class="ctl-btn" type="button" aria-pressed="false">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
        <span class="ctl-label">Chat</span>
      </button>

      <button id="ctl-people" class="ctl-btn" type="button" aria-pressed="false">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <span class="ctl-label">People</span>
      </button>

      <button id="ctl-leave" class="ctl-btn ctl-leave" type="button">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a1 1 0 0 1 1.11-.21 12.35 12.35 0 0 0 3.81 1.21 1 1 0 0 1 .86 1v3.5a1 1 0 0 1-1 1A18.36 18.36 0 0 1 3 3a1 1 0 0 1 1-1h3.53a1 1 0 0 1 1 .86 12.35 12.35 0 0 0 1.2 3.81 1 1 0 0 1-.21 1.11z"/><line x1="22" y1="2" x2="2" y2="22"/></svg>
        <span class="ctl-label">Leave</span>
      </button>
    </div>
  </footer>
</main>

<div id="toast" class="toast" role="status" aria-live="assertive" hidden></div>

<template id="tile-template">
  <div class="tile" data-tile>
    <video class="tile-video" autoplay playsinline></video>
    <div class="tile-placeholder">
      <span class="tile-avatar"></span>
    </div>
    <div class="tile-meta">
      <span class="tile-name"></span>
      <span class="tile-mic-off" title="Microphone off">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M19 10v2a7 7 0 0 1-9.7 6.44"/><line x1="12" y1="19" x2="12" y2="23"/></svg>
      </span>
      <span class="tile-host-flag" title="Host">★</span>
    </div>
  </div>
</template>

<script src="/socket.io/socket.io.js"></script>
<script src="/js/webrtc.js"></script>
<script src="/js/call.js"></script>
</body>
</html>
