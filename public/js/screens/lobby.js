/* ============================================================
   Lobby Screen — Create/Join/Matchmaking
   ============================================================ */

Screens.lobby = {
  selectedRounds: 10,
  isReady: false,
  currentRoom: null,

  selectRounds(btn) {
    Audio.play('click');
    document.querySelectorAll('.round-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    this.selectedRounds = parseInt(btn.dataset.rounds);
  },

  createRoom() {
    Audio.play('click');
    const name = Screens.menu.getPlayerName();
    Network.emit('create-room', {
      playerName: name,
      rounds: this.selectedRounds
    });
  },

  joinRoom() {
    Audio.play('click');
    const code = document.getElementById('input-room-code').value.trim().toUpperCase();
    if (!code || code.length < 4) {
      UI.toast('Please enter a valid room code', 'error');
      return;
    }
    const name = Screens.menu.getPlayerName();
    Network.emit('join-room', { roomCode: code, playerName: name });
  },

  onRoomJoined(data) {
    this.currentRoom = data;
    this.isReady = false;
    App.showScreen('lobby');
    document.getElementById('lobby-room-code').textContent = data.code;
    document.getElementById('lobby-rounds').textContent = `${data.rounds} Rounds`;
    this.updatePlayerSlots(data.players);
    Audio.play('join');
  },

  onRoomUpdate(data) {
    this.currentRoom = data;
    this.updatePlayerSlots(data.players);

    // If match is in progress and we're still on lobby, stay
    if (data.state === 'lobby') {
      document.getElementById('lobby-rounds').textContent = `${data.rounds} Rounds`;
    }
  },

  updatePlayerSlots(players) {
    const container = document.getElementById('player-slots');
    const myId = Network.getPlayerId();
    let html = '';

    for (let i = 0; i < 4; i++) {
      const player = players[i];
      if (player) {
        const isSelf = player.id === myId;
        const readyClass = player.ready ? 'ready' : '';
        const selfClass = isSelf ? 'self' : '';
        html += `
          <div class="player-slot glass-card ${readyClass} ${selfClass}">
            <div class="slot-number">${i + 1}</div>
            <div class="slot-info">
              <span class="slot-name">${player.name}${isSelf ? ' (You)' : ''}</span>
              <span class="slot-status">${player.ready ? '✓ Ready' : ''}</span>
            </div>
          </div>
        `;
      } else {
        html += `
          <div class="player-slot glass-card empty">
            <div class="slot-number">${i + 1}</div>
            <div class="slot-info">
              <span class="slot-name">Waiting...</span>
            </div>
          </div>
        `;
      }
    }

    container.innerHTML = html;

    // Update ready button
    const btn = document.getElementById('btn-ready');
    if (this.isReady) {
      btn.classList.add('is-ready');
      btn.querySelector('.btn-text').textContent = '✓ Ready!';
    } else {
      btn.classList.remove('is-ready');
      btn.querySelector('.btn-text').textContent = 'Ready!';
    }
  },

  toggleReady() {
    Audio.play('ready');
    this.isReady = !this.isReady;
    Network.emit('player-ready');
  },

  copyCode() {
    const code = document.getElementById('lobby-room-code').textContent;
    navigator.clipboard.writeText(code).then(() => {
      UI.toast('Room code copied!', 'success');
      Audio.play('click');
    }).catch(() => {
      UI.toast(`Room code: ${code}`, 'info');
    });
  },

  leaveRoom() {
    Audio.play('click');
    Network.emit('leave-room');
    this.currentRoom = null;
    this.isReady = false;
    Network.reset();
    App.showScreen('menu');
  },

  // Matchmaking
  onMatchmakingStatus(data) {
    document.getElementById('matchmaking-status-text').textContent =
      `${data.position} / ${data.needed} players found...`;
  },

  cancelMatchmaking() {
    Audio.play('click');
    Network.emit('cancel-matchmaking');
    App.showScreen('menu');
  }
};
