// ============================================================
// Chor Police Online — Server
// Express + Socket.IO | Server-Authoritative Architecture
// ============================================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  pingInterval: 10000,
  pingTimeout: 5000
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
// Constants
// ============================================================
const ROLES = ['raja', 'mantri', 'chor', 'police'];
const ROLE_LABELS = { raja: '👑 Raja', mantri: '📜 Mantri', chor: '🥷 Chor', police: '🚓 Police' };
const MAX_PLAYERS = 4;
const RECONNECT_TIMEOUT = 60000; // 60 seconds
const DISCUSSION_TIME = 25; // seconds
const COUNTDOWN_TIME = 3;
const REVEAL_TIME = 3;
const SCORE_TIME = 3;
const CHAT_RATE_LIMIT = 1000; // 1 msg per second

// Score constants
const SCORES = {
  correct: { mantri: 100, raja: 50, police: 30, chor: 0 },
  wrong:   { chor: 100, raja: 50, police: 30, mantri: 0 }
};

// ============================================================
// State
// ============================================================
const rooms = new Map();       // roomCode -> RoomState
const playerSessions = new Map(); // socketId -> { roomCode, playerId }
const disconnectedPlayers = new Map(); // playerId -> { roomCode, timeout, playerData }
let matchmakingQueue = [];

// ============================================================
// Utility Functions
// ============================================================

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[crypto.randomInt(chars.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function generatePlayerId() {
  return crypto.randomBytes(8).toString('hex');
}

function shuffleRoles() {
  const roles = [...ROLES];
  // Fisher-Yates with crypto.randomInt for fairness
  for (let i = roles.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  return roles;
}

function createRoom(hostId, hostName, rounds, isPrivate) {
  const code = generateRoomCode();
  const room = {
    code,
    host: hostId,
    isPrivate,
    rounds,
    currentRound: 0,
    state: 'lobby', // lobby, countdown, role-assign, discussion, guess, reveal, score, final
    players: new Map(),
    roles: {},        // playerId -> role (current round)
    scores: {},       // playerId -> total score
    chat: [],
    policeGuess: null,
    roundTimer: null,
    stateTimer: null,
    createdAt: Date.now()
  };
  rooms.set(code, room);
  return room;
}

function addPlayerToRoom(room, playerId, playerName, socketId) {
  room.players.set(playerId, {
    id: playerId,
    name: playerName,
    socketId,
    ready: false,
    connected: true,
    lastChat: 0
  });
  room.scores[playerId] = 0;
  playerSessions.set(socketId, { roomCode: room.code, playerId });
}

function getRoomPlayers(room) {
  const players = [];
  room.players.forEach((p, id) => {
    players.push({
      id,
      name: p.name,
      ready: p.ready,
      connected: p.connected,
      score: room.scores[id] || 0
    });
  });
  return players;
}

function getMantriId(room) {
  for (const [playerId, role] of Object.entries(room.roles)) {
    if (role === 'mantri') return playerId;
  }
  return null;
}

function getRajaId(room) {
  for (const [playerId, role] of Object.entries(room.roles)) {
    if (role === 'raja') return playerId;
  }
  return null;
}

// ============================================================
// Match Engine — State Machine
// ============================================================

function startMatch(room) {
  room.currentRound = 0;
  // Reset scores
  room.players.forEach((_, id) => { room.scores[id] = 0; });
  startNextRound(room);
}

function startNextRound(room) {
  room.currentRound++;
  room.policeGuess = null;
  room.chat = [];

  if (room.currentRound > room.rounds) {
    endMatch(room);
    return;
  }

  // Countdown
  room.state = 'countdown';
  io.to(room.code).emit('match-start', {
    round: room.currentRound,
    totalRounds: room.rounds,
    countdown: COUNTDOWN_TIME
  });

  room.stateTimer = setTimeout(() => assignRoles(room), COUNTDOWN_TIME * 1000);
}

function assignRoles(room) {
  room.state = 'role-assign';
  const playerIds = Array.from(room.players.keys());
  const shuffled = shuffleRoles();

  room.roles = {};
  playerIds.forEach((id, i) => {
    room.roles[id] = shuffled[i];
  });

  // Find Raja — Raja is publicly known to all
  const rajaId = getRajaId(room);
  const rajaName = rajaId ? room.players.get(rajaId)?.name : 'Unknown';

  // Send each player ONLY their own role + Raja info (no one else's role)
  room.players.forEach((player, id) => {
    if (player.connected) {
      io.to(player.socketId).emit('role-assigned', {
        role: room.roles[id],
        roleLabel: ROLE_LABELS[room.roles[id]],
        round: room.currentRound,
        totalRounds: room.rounds,
        rajaId,
        rajaName
      });
    }
  });

  // After reveal animation, start discussion
  room.stateTimer = setTimeout(() => startDiscussion(room), REVEAL_TIME * 1000);
}

function startDiscussion(room) {
  room.state = 'discussion';
  io.to(room.code).emit('discussion-start', {
    duration: DISCUSSION_TIME,
    round: room.currentRound
  });

  room.roundTimer = setTimeout(() => startGuessPhase(room), DISCUSSION_TIME * 1000);
}

function startGuessPhase(room) {
  room.state = 'guess';
  const mantriId = getMantriId(room);
  const rajaId = getRajaId(room);

  // Only 2 guess options: exclude Raja and Mantri (self)
  const guessOptions = Array.from(room.players.keys()).filter(id => id !== mantriId && id !== rajaId);

  io.to(room.code).emit('guess-phase', {
    mantriId,
    mantriName: room.players.get(mantriId)?.name || 'Unknown',
    guessOptions: guessOptions.map(id => ({ id, name: room.players.get(id)?.name || 'Unknown' }))
  });

  // Auto-resolve if mantri doesn't guess in 15 seconds
  room.stateTimer = setTimeout(() => {
    if (room.state === 'guess' && !room.policeGuess) {
      // Random guess if mantri doesn't pick
      const randomTarget = guessOptions[crypto.randomInt(guessOptions.length)];
      processGuess(room, mantriId, randomTarget);
    }
  }, 15000);
}

function processGuess(room, mantriId, targetId) {
  if (room.state !== 'guess') return;
  if (room.policeGuess) return; // Already guessed

  room.policeGuess = targetId;
  room.state = 'reveal';

  const targetRole = room.roles[targetId];
  const correct = targetRole === 'chor';

  // Calculate scores
  const roundScores = {};
  room.players.forEach((_, id) => {
    const role = room.roles[id];
    roundScores[id] = correct ? SCORES.correct[role] : SCORES.wrong[role];
    room.scores[id] += roundScores[id];
  });

  // Build all roles for reveal
  const allRoles = {};
  room.players.forEach((player, id) => {
    allRoles[id] = {
      name: player.name,
      role: room.roles[id],
      roleLabel: ROLE_LABELS[room.roles[id]],
      roundScore: roundScores[id],
      totalScore: room.scores[id]
    };
  });

  io.to(room.code).emit('round-result', {
    mantriId,
    targetId,
    targetRole,
    correct,
    roles: allRoles,
    round: room.currentRound,
    totalRounds: room.rounds
  });

  clearTimeout(room.stateTimer);

  // After score animation, next round
  room.stateTimer = setTimeout(() => {
    room.state = 'score';
    startNextRound(room);
  }, (REVEAL_TIME + SCORE_TIME) * 1000);
}

function endMatch(room) {
  room.state = 'final';
  clearTimeout(room.roundTimer);
  clearTimeout(room.stateTimer);

  // Sort players by score
  const finalScores = getRoomPlayers(room)
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({ ...p, rank: i + 1 }));

  io.to(room.code).emit('match-end', {
    finalScores,
    winner: finalScores[0]
  });

  // Reset room for replay
  room.state = 'lobby';
  room.currentRound = 0;
  room.roles = {};
  room.policeGuess = null;
  room.players.forEach(p => { p.ready = false; });
}

// ============================================================
// Matchmaking
// ============================================================

function tryMatchmaking() {
  while (matchmakingQueue.length >= MAX_PLAYERS) {
    const group = matchmakingQueue.splice(0, MAX_PLAYERS);
    const room = createRoom(group[0].playerId, group[0].name, 10, false);

    group.forEach(({ playerId, name, socketId }) => {
      addPlayerToRoom(room, playerId, name, socketId);
      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        socket.join(room.code);
      }
    });

    // Auto-ready all and start
    room.players.forEach(p => { p.ready = true; });
    io.to(room.code).emit('room-update', {
      code: room.code,
      players: getRoomPlayers(room),
      rounds: room.rounds,
      state: room.state,
      host: room.host
    });

    setTimeout(() => startMatch(room), 1000);
  }
}

// ============================================================
// Socket.IO Event Handlers
// ============================================================

io.on('connection', (socket) => {
  console.log(`[+] Connected: ${socket.id}`);

  // --- Create Room ---
  socket.on('create-room', ({ playerName, rounds }) => {
    const validRounds = [10, 15, 20].includes(rounds) ? rounds : 10;
    const playerId = generatePlayerId();
    const room = createRoom(playerId, playerName, validRounds, true);
    addPlayerToRoom(room, playerId, playerName, socket.id);
    socket.join(room.code);

    socket.emit('room-created', {
      code: room.code,
      playerId,
      players: getRoomPlayers(room),
      rounds: room.rounds,
      host: room.host
    });
  });

  // --- Join Room ---
  socket.on('join-room', ({ roomCode, playerName }) => {
    const code = (roomCode || '').toUpperCase().trim();
    const room = rooms.get(code);

    if (!room) {
      return socket.emit('error-msg', { message: 'Room not found!' });
    }
    if (room.players.size >= MAX_PLAYERS) {
      return socket.emit('error-msg', { message: 'Room is full!' });
    }
    if (room.state !== 'lobby') {
      return socket.emit('error-msg', { message: 'Match already in progress!' });
    }

    const playerId = generatePlayerId();
    addPlayerToRoom(room, playerId, playerName, socket.id);
    socket.join(room.code);

    socket.emit('room-joined', {
      code: room.code,
      playerId,
      players: getRoomPlayers(room),
      rounds: room.rounds,
      host: room.host
    });

    io.to(room.code).emit('room-update', {
      code: room.code,
      players: getRoomPlayers(room),
      rounds: room.rounds,
      state: room.state,
      host: room.host
    });
  });

  // --- Find Match (Public Matchmaking) ---
  socket.on('find-match', ({ playerName }) => {
    const playerId = generatePlayerId();
    matchmakingQueue.push({ playerId, name: playerName, socketId: socket.id });
    playerSessions.set(socket.id, { roomCode: null, playerId, matchmaking: true });

    socket.emit('matchmaking-status', {
      playerId,
      position: matchmakingQueue.length,
      needed: MAX_PLAYERS
    });

    tryMatchmaking();
  });

  // --- Cancel Matchmaking ---
  socket.on('cancel-matchmaking', () => {
    matchmakingQueue = matchmakingQueue.filter(p => p.socketId !== socket.id);
    playerSessions.delete(socket.id);
    socket.emit('matchmaking-cancelled');
  });

  // --- Player Ready ---
  socket.on('player-ready', () => {
    const session = playerSessions.get(socket.id);
    if (!session || !session.roomCode) return;

    const room = rooms.get(session.roomCode);
    if (!room || room.state !== 'lobby') return;

    const player = room.players.get(session.playerId);
    if (!player) return;

    player.ready = !player.ready;

    io.to(room.code).emit('room-update', {
      code: room.code,
      players: getRoomPlayers(room),
      rounds: room.rounds,
      state: room.state,
      host: room.host
    });

    // Check if all 4 players are ready
    if (room.players.size === MAX_PLAYERS) {
      let allReady = true;
      room.players.forEach(p => { if (!p.ready) allReady = false; });
      if (allReady) {
        startMatch(room);
      }
    }
  });

  // --- Chat Message ---
  socket.on('chat-message', ({ message }) => {
    const session = playerSessions.get(socket.id);
    if (!session || !session.roomCode) return;

    const room = rooms.get(session.roomCode);
    if (!room || room.state !== 'discussion') return;

    const player = room.players.get(session.playerId);
    if (!player) return;

    // Rate limit
    const now = Date.now();
    if (now - player.lastChat < CHAT_RATE_LIMIT) return;
    player.lastChat = now;

    // Sanitize & limit length
    const cleanMsg = String(message).slice(0, 200).replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const chatData = {
      playerId: session.playerId,
      playerName: player.name,
      message: cleanMsg,
      timestamp: now
    };

    room.chat.push(chatData);
    io.to(room.code).emit('chat-message', chatData);
  });

  // --- Mantri Guess ---
  socket.on('mantri-guess', ({ targetPlayerId }) => {
    const session = playerSessions.get(socket.id);
    if (!session || !session.roomCode) return;

    const room = rooms.get(session.roomCode);
    if (!room || room.state !== 'guess') return;

    // Validate: only mantri can guess
    if (room.roles[session.playerId] !== 'mantri') return;

    // Validate: can't guess self
    if (targetPlayerId === session.playerId) return;

    // Validate: target exists in room
    if (!room.players.has(targetPlayerId)) return;

    processGuess(room, session.playerId, targetPlayerId);
  });

  // --- Reconnect ---
  socket.on('reconnect-attempt', ({ playerId }) => {
    const disconnected = disconnectedPlayers.get(playerId);
    if (!disconnected) {
      return socket.emit('reconnect-failed', { message: 'Session expired' });
    }

    const room = rooms.get(disconnected.roomCode);
    if (!room) {
      disconnectedPlayers.delete(playerId);
      return socket.emit('reconnect-failed', { message: 'Room no longer exists' });
    }

    // Restore player
    clearTimeout(disconnected.timeout);
    disconnectedPlayers.delete(playerId);

    const player = room.players.get(playerId);
    if (player) {
      player.socketId = socket.id;
      player.connected = true;
      playerSessions.set(socket.id, { roomCode: room.code, playerId });
      socket.join(room.code);

      // Send full state
      socket.emit('reconnect-state', {
        playerId,
        code: room.code,
        players: getRoomPlayers(room),
        rounds: room.rounds,
        currentRound: room.currentRound,
        state: room.state,
        role: room.roles[playerId] || null,
        roleLabel: room.roles[playerId] ? ROLE_LABELS[room.roles[playerId]] : null,
        scores: room.scores,
        host: room.host,
        chat: room.chat
      });

      io.to(room.code).emit('player-reconnected', {
        playerId,
        playerName: player.name
      });
    }
  });

  // --- Play Again ---
  socket.on('play-again', () => {
    const session = playerSessions.get(socket.id);
    if (!session || !session.roomCode) return;

    const room = rooms.get(session.roomCode);
    if (!room || room.state !== 'lobby') return;

    const player = room.players.get(session.playerId);
    if (player) player.ready = false;

    io.to(room.code).emit('room-update', {
      code: room.code,
      players: getRoomPlayers(room),
      rounds: room.rounds,
      state: room.state,
      host: room.host
    });
  });

  // --- Leave Room ---
  socket.on('leave-room', () => {
    handleDisconnect(socket);
  });

  // --- Disconnect ---
  socket.on('disconnect', () => {
    console.log(`[-] Disconnected: ${socket.id}`);
    handleDisconnect(socket);
  });
});

function handleDisconnect(socket) {
  const session = playerSessions.get(socket.id);
  if (!session) {
    // Remove from matchmaking queue
    matchmakingQueue = matchmakingQueue.filter(p => p.socketId !== socket.id);
    return;
  }

  const { roomCode, playerId } = session;
  playerSessions.delete(socket.id);

  if (!roomCode) {
    matchmakingQueue = matchmakingQueue.filter(p => p.socketId !== socket.id);
    return;
  }

  const room = rooms.get(roomCode);
  if (!room) return;

  const player = room.players.get(playerId);
  if (!player) return;

  if (room.state === 'lobby') {
    // In lobby — just remove
    room.players.delete(playerId);
    delete room.scores[playerId];

    if (room.players.size === 0) {
      clearTimeout(room.roundTimer);
      clearTimeout(room.stateTimer);
      rooms.delete(roomCode);
    } else {
      // Transfer host if needed
      if (room.host === playerId) {
        room.host = room.players.keys().next().value;
      }
      io.to(room.code).emit('room-update', {
        code: room.code,
        players: getRoomPlayers(room),
        rounds: room.rounds,
        state: room.state,
        host: room.host
      });
    }
  } else {
    // In game — allow reconnect
    player.connected = false;
    const timeout = setTimeout(() => {
      disconnectedPlayers.delete(playerId);
      // If still disconnected after timeout, remove
      room.players.delete(playerId);
      if (room.players.size < 2) {
        // Not enough players, end match
        clearTimeout(room.roundTimer);
        clearTimeout(room.stateTimer);
        room.state = 'lobby';
        io.to(room.code).emit('error-msg', { message: 'Not enough players. Match ended.' });
        io.to(room.code).emit('room-update', {
          code: room.code,
          players: getRoomPlayers(room),
          rounds: room.rounds,
          state: 'lobby',
          host: room.host
        });
      }
    }, RECONNECT_TIMEOUT);

    disconnectedPlayers.set(playerId, { roomCode, timeout, playerData: player });

    io.to(room.code).emit('player-disconnected', {
      playerId,
      playerName: player.name
    });
  }
}

// ============================================================
// Start Server
// ============================================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║     🚓 Chor Police Online Server 🚓     ║
  ║                                          ║
  ║   Running on http://localhost:${PORT}       ║
  ║   Waiting for players...                 ║
  ╚══════════════════════════════════════════╝
  `);
});
