# Apex Sessions

Video, audio, and screen-share calls in the browser — with live chat and
host mute controls. No accounts, no install: open the link, type a name,
join.

- **Camera or audio-only calls** — peer-to-peer via WebRTC
- **Screen sharing** — swap your camera feed for your screen in one click
- **Live chat** — sidebar text chat for the whole room
- **Host controls** — whoever creates the session can mute/unmute anyone,
  or mute everyone at once
- Built with **Node.js + Express + Socket.io** on the server (signaling
  only — no video/audio ever passes through the server) and plain
  HTML/CSS/JS on the client (no build step).

## How it's structured

```
apex-sessions/
├── package.json
├── server.js              # Express + Socket.io signaling server
├── .gitignore
└── public/
    ├── index.html          # landing screen + in-call screen
    ├── css/
    │   └── style.css       # all visual design
    └── js/
        ├── webrtc.js       # peer connections, camera/mic, screen share
        └── app.js          # UI wiring, chat, host controls
```

## Run it locally

You'll need [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
npm start
```

Then open `http://localhost:3000` in two browser tabs (or two devices on
the same network) to test a call with yourself.

> Camera/mic access requires either `localhost` or HTTPS — that's a
> browser security rule, not something this app controls. Render gives
> you HTTPS automatically (see below), so this only matters for local
> testing on a device other than the one running the server.

## Push it to GitHub

```bash
git init
git add .
git commit -m "Apex Sessions"
git branch -M main
git remote add origin https://github.com/<your-username>/apex-sessions.git
git push -u origin main
```

(Create the empty `apex-sessions` repo on GitHub first if you haven't.)

## Deploy on Render

1. Go to [render.com](https://render.com) → **New** → **Web Service**.
2. Connect your GitHub account and pick the `apex-sessions` repo.
3. Render should auto-detect Node. Set:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free is fine to try it out.
4. Click **Create Web Service**. Render builds and deploys — you'll get
   a URL like `https://apex-sessions.onrender.com`.
5. Open that URL, allow camera/mic, and share the URL with whoever
   you're calling. Anyone who opens it and enters the same session code
   joins the same room.

That's it — no environment variables or database needed for this
version.

### Render free-tier note

Free Render web services spin down after periods of inactivity and take
a few seconds to wake back up on the next visit. Fine for testing and
casual use; if you want it always-on and instantly responsive, upgrade
the instance type in Render's dashboard.

## How calls actually connect (good to know)

This app uses a **mesh** WebRTC topology: every participant connects
directly to every other participant. That's simple, fast, and needs no
media server — but it scales to roughly **6–8 people per call**
comfortably. Past that, each participant's upload bandwidth has to
cover every other participant individually, and quality will degrade.
If you outgrow that, the next step is routing media through an SFU
(e.g., [mediasoup](https://mediasoup.org) or
[LiveKit](https://livekit.io)) — a bigger change, but the chat/host-mute
logic in `server.js` would carry over conceptually.

Two public STUN servers (Google's) are used to help peers discover each
other across NATs. Most home/office networks work fine with just STUN.
Some strict corporate or campus networks block the direct peer-to-peer
connections WebRTC needs — if a call won't connect on a network like
that, the standard fix is adding a **TURN server** (e.g., via
[Twilio](https://www.twilio.com/docs/stun-turn) or
[Cloudflare Calls](https://developers.cloudflare.com/calls/turn/)) to
the `ICE_SERVERS` list in `public/js/webrtc.js`.

## Customizing

- **Colors / fonts / shapes** — all in `public/css/style.css`, defined
  as CSS variables at the top (`--ember`, `--violet`, `--peak`, etc.).
- **Room code style** — `randomRoomCode()` in `public/js/app.js`.
- **Max participants** — not enforced yet; add a check in `server.js`'s
  `join-room` handler if you want a hard cap.
