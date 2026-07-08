/* ============================================================
   Network Module — Socket.IO Client
   ============================================================ */

const Network = (() => {
  let socket = null;
  let playerId = null;
  let roomCode = null;
  let reconnectPlayerId = null;

  function connect() {
    socket = io({
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000
    });

    // Connection events
    socket.on('connect', () => {
      console.log('[Network] Connected:', socket.id);
      // Try reconnect if we had a session
      if (reconnectPlayerId) {
        socket.emit('reconnect-attempt', { playerId: reconnectPlayerId });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[Network] Disconnected:', reason);
      if (playerId && roomCode) {
        reconnectPlayerId = playerId;
        UI.toast('Connection lost. Reconnecting...', 'warning');
      }
    });

    socket.on('connect_error', () => {
      UI.toast('Cannot connect to server', 'error');
    });

    // --- Room Events ---
    socket.on('room-created', (data) => {
      playerId = data.playerId;
      roomCode = data.code;
      Screens.lobby.onRoomJoined(data);
    });

    socket.on('room-joined', (data) => {
      playerId = data.playerId;
      roomCode = data.code;
      Audio.play('join');
      Screens.lobby.onRoomJoined(data);
    });

    socket.on('room-update', (data) => {
      Screens.lobby.onRoomUpdate(data);
    });

    // --- Matchmaking ---
    socket.on('matchmaking-status', (data) => {
      playerId = data.playerId;
      Screens.lobby.onMatchmakingStatus(data);
    });

    socket.on('matchmaking-cancelled', () => {
      UI.toast('Matchmaking cancelled', 'info');
      App.showScreen('menu');
    });

    // --- Match Events ---
    socket.on('match-start', (data) => {
      Screens.game.onMatchStart(data);
    });

    socket.on('role-assigned', (data) => {
      Screens.game.onRoleAssigned(data);
    });

    socket.on('discussion-start', (data) => {
      Screens.game.onDiscussionStart(data);
    });

    socket.on('chat-message', (data) => {
      Screens.game.onChatMessage(data);
    });

    socket.on('guess-phase', (data) => {
      Screens.game.onGuessPhase(data);
    });

    socket.on('round-result', (data) => {
      Screens.game.onRoundResult(data);
    });

    socket.on('match-end', (data) => {
      Screens.results.onMatchEnd(data);
    });

    // --- Reconnect ---
    socket.on('reconnect-state', (data) => {
      playerId = data.playerId;
      roomCode = data.code;
      reconnectPlayerId = null;
      UI.toast('Reconnected!', 'success');
      Screens.game.onReconnect(data);
    });

    socket.on('reconnect-failed', (data) => {
      reconnectPlayerId = null;
      UI.toast(data.message, 'error');
    });

    // --- Player Events ---
    socket.on('player-disconnected', (data) => {
      UI.toast(`${data.playerName} disconnected`, 'warning');
    });

    socket.on('player-reconnected', (data) => {
      UI.toast(`${data.playerName} reconnected`, 'success');
    });

    // --- Errors ---
    socket.on('error-msg', (data) => {
      UI.toast(data.message, 'error');
    });
  }

  function emit(event, data) {
    if (socket && socket.connected) {
      socket.emit(event, data);
    } else {
      UI.toast('Not connected to server', 'error');
    }
  }

  function getPlayerId() { return playerId; }
  function getRoomCode() { return roomCode; }

  function reset() {
    playerId = null;
    roomCode = null;
    reconnectPlayerId = null;
  }

  return {
    connect,
    emit,
    getPlayerId,
    getRoomCode,
    reset
  };
})();
