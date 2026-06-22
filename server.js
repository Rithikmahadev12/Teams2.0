// Apex Sessions — signaling server
// Handles room membership, WebRTC offer/answer/ICE relay, chat, and host mute controls.
// No media ever passes through this server — video/audio/screen-share travel
// peer-to-peer between browsers. This server only exchanges the small
// "handshake" messages needed to set that up.

const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const MAX_NAME_LEN = 40;
const MAX_ROOM_LEN = 40;
const MAX_CHAT_LEN = 1000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/healthz', (req, res) => res.status(200).send('ok'));

// roomId -> Map<socketId, { name, isHost, audio, video, screenSharing }>
const rooms = new Map();

function sanitize(str, maxLen) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>]/g, '').trim().slice(0, maxLen);
}

function getRoom(roomId) {
  if (!rooms.has(roomId)) rooms.set(roomId, new Map());
  return rooms.get(roomId);
}

function publicParticipant(id, p) {
  return {
    id,
    name: p.name,
    isHost: p.isHost,
    audio: p.audio,
    video: p.video,
    screenSharing: p.screenSharing,
  };
}

function roomRoster(roomId) {
  const room = rooms.get(roomId);
  if (!room) return [];
  return Array.from(room.entries()).map(([id, p]) => publicParticipant(id, p));
}

io.on('connection', (socket) => {
  socket.data.roomId = null;

  socket.on('join-room', ({ roomId, displayName, audio, video }) => {
    const cleanRoom = sanitize(roomId, MAX_ROOM_LEN);
    const cleanName = sanitize(displayName, MAX_NAME_LEN) || 'Guest';
    if (!cleanRoom) {
      socket.emit('join-error', { message: 'A session code is required.' });
      return;
    }

    const room = getRoom(cleanRoom);
    const isHost = room.size === 0;

    room.set(socket.id, {
      name: cleanName,
      isHost,
      audio: !!audio,
      video: !!video,
      screenSharing: false,
    });

    socket.data.roomId = cleanRoom;
    socket.join(cleanRoom);

    // Tell the new arrival who's already there, and whether they're the host.
    socket.emit('joined', {
      selfId: socket.id,
      isHost,
      roomId: cleanRoom,
      participants: roomRoster(cleanRoom).filter((p) => p.id !== socket.id),
    });

    // Tell everyone already in the room about the new arrival.
    socket.to(cleanRoom).emit('user-joined', publicParticipant(socket.id, room.get(socket.id)));
  });

  // Generic WebRTC relay: offers, answers, and ICE candidates all flow through here.
  socket.on('signal', ({ to, type, data }) => {
    if (!to || !type) return;
    io.to(to).emit('signal', { from: socket.id, type, data });
  });

  socket.on('chat-message', ({ text }) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = rooms.get(roomId);
    const sender = room && room.get(socket.id);
    const cleanText = sanitize(text, MAX_CHAT_LEN);
    if (!cleanText) return;
    io.to(roomId).emit('chat-message', {
      from: socket.id,
      name: sender ? sender.name : 'Guest',
      text: cleanText,
      ts: Date.now(),
    });
  });

  // A participant toggled their own mic/camera/screen-share — broadcast the new state.
  socket.on('media-state', ({ audio, video, screenSharing }) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = rooms.get(roomId);
    const p = room && room.get(socket.id);
    if (!p) return;
    if (typeof audio === 'boolean') p.audio = audio;
    if (typeof video === 'boolean') p.video = video;
    if (typeof screenSharing === 'boolean') p.screenSharing = screenSharing;
    io.to(roomId).emit('participant-updated', publicParticipant(socket.id, p));
  });

  // Host-only: force-mute (or release the force-mute on) a specific participant.
  socket.on('host-set-mute', ({ targetId, muted }) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = rooms.get(roomId);
    const requester = room && room.get(socket.id);
    const target = room && room.get(targetId);
    if (!requester || !requester.isHost || !target) return;

    target.audio = !muted;
    io.to(targetId).emit('force-mute', { muted });
    io.to(roomId).emit('participant-updated', publicParticipant(targetId, target));
  });

  // Host-only: mute everyone else in the room at once.
  socket.on('host-mute-all', () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = rooms.get(roomId);
    const requester = room && room.get(socket.id);
    if (!requester || !requester.isHost) return;

    room.forEach((p, id) => {
      if (id === socket.id) return;
      p.audio = false;
      io.to(id).emit('force-mute', { muted: true });
      io.to(roomId).emit('participant-updated', publicParticipant(id, p));
    });
  });

  socket.on('leave-room', () => handleLeave(socket));
  socket.on('disconnect', () => handleLeave(socket));
});

function handleLeave(socket) {
  const roomId = socket.data.roomId;
  if (!roomId) return;
  const room = rooms.get(roomId);
  if (!room || !room.has(socket.id)) return;

  const wasHost = room.get(socket.id).isHost;
  room.delete(socket.id);
  socket.data.roomId = null;
  socket.to(roomId).emit('user-left', { id: socket.id });

  if (room.size === 0) {
    rooms.delete(roomId);
    return;
  }

  // If the host left, hand the crown to whoever joined next-earliest.
  if (wasHost) {
    const [nextHostId, nextHost] = room.entries().next().value;
    nextHost.isHost = true;
    io.to(roomId).emit('host-changed', { id: nextHostId });
    io.to(roomId).emit('participant-updated', publicParticipant(nextHostId, nextHost));
  }
}

server.listen(PORT, () => {
  console.log(`Apex Sessions running on port ${PORT}`);
});
