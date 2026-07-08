/* ============================================================
   Game Screen — Role Reveal, Discussion, Guess, Result
   ============================================================ */

Screens.game = {
  currentRole: null,
  currentRound: 0,
  totalRounds: 10,
  timerInterval: null,
  players: [],

  ROLE_EMOJIS: {
    raja: '👑',
    mantri: '📜',
    chor: '🥷',
    police: '🚓'
  },

  ROLE_COLORS: {
    raja: '#a855f7',
    mantri: '#3b82f6',
    chor: '#ef4444',
    police: '#22c55e'
  },

  allRoles: null,
  rajaId: null,
  rajaName: null,
  currentRoleLabel: null,

  // --- Match Start (Countdown) ---
  onMatchStart(data) {
    this.currentRound = data.round;
    this.totalRounds = data.totalRounds;
    App.showScreen('game');

    // Update header
    document.getElementById('game-round').textContent = `Round ${data.round}`;
    document.getElementById('game-round-total').textContent = `/ ${data.totalRounds}`;
    document.getElementById('game-phase-label').textContent = 'Get Ready';

    // Hide all game elements
    document.getElementById('role-card-container').style.display = 'none';
    document.getElementById('player-cards').style.display = 'none';
    document.getElementById('chat-area').style.display = 'none';
    document.getElementById('game-timer').style.display = 'none';

    // Show countdown
    UI.showCountdown(data.countdown);
  },

  // --- Role Assigned ---
  onRoleAssigned(data) {
    this.currentRole = data.role;
    this.currentRound = data.round;
    this.totalRounds = data.totalRounds;
    this.rajaId = data.rajaId;
    this.rajaName = data.rajaName;
    this.currentRoleLabel = data.roleLabel;

    document.getElementById('game-round').textContent = `Round ${data.round}`;
    document.getElementById('game-round-total').textContent = `/ ${data.totalRounds}`;
    document.getElementById('game-phase-label').textContent = 'Your Role';

    // Setup role card
    const container = document.getElementById('role-card-container');
    const card = document.getElementById('role-card');
    const back = document.getElementById('role-card-back');
    const emoji = document.getElementById('role-emoji');
    const name = document.getElementById('role-name');

    // Reset card
    card.classList.remove('flipped');
    back.className = 'role-card-back role-' + data.role;
    emoji.textContent = this.ROLE_EMOJIS[data.role];
    name.textContent = data.roleLabel;
    name.style.color = this.ROLE_COLORS[data.role];

    container.style.display = 'block';

    // Flip card after a moment
    setTimeout(() => {
      card.classList.add('flipped');
      Audio.play('roleReveal');
      UI.showRoleFlash(data.role);
    }, 800);
  },

  // --- Discussion Start ---
  onDiscussionStart(data) {
    document.getElementById('game-phase-label').textContent = 'Discussion';
    document.getElementById('role-card-container').style.display = 'none';

    // Show chat
    const chatArea = document.getElementById('chat-area');
    chatArea.style.display = 'flex';
    document.getElementById('chat-messages').innerHTML = `
      <div class="chat-msg chat-msg-system">💬 Discussion Phase — Talk, bluff, and deduce!</div>
    `;

    // Show timer
    document.getElementById('game-timer').style.display = 'flex';
    this.startTimer(data.duration);

    // Show your own role badge (visible throughout round)
    this.showMyRoleBadge();

    // Show mini scoreboard
    this.updateMiniScoreboard();

    // Focus chat on desktop
    if (window.innerWidth > 768) {
      document.getElementById('chat-input').focus();
    }

    // Chat enter key
    document.getElementById('chat-input').onkeydown = (e) => {
      if (e.key === 'Enter') this.sendChat();
    };

    Audio.play('suspense');
  },

  sendChat() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg) return;
    Network.emit('chat-message', { message: msg });
    input.value = '';
  },

  onChatMessage(data) {
    const container = document.getElementById('chat-messages');
    const myId = Network.getPlayerId();
    const isSelf = data.playerId === myId;

    const div = document.createElement('div');
    div.className = 'chat-msg';
    div.innerHTML = `<span class="chat-msg-name" style="${isSelf ? 'color: var(--accent-gold)' : ''}">${data.playerName}:</span> ${data.message}`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;

    if (!isSelf) Audio.play('chat');
  },

  // --- Guess Phase ---
  onGuessPhase(data) {
    clearInterval(this.timerInterval);
    document.getElementById('game-phase-label').textContent =
      data.mantriId === Network.getPlayerId() ? '📜 Chor Kaun Hai? Guess Karo!' : '📜 Mantri Guess Kar Raha Hai...';

    // Hide chat, show player cards for mantri
    document.getElementById('chat-area').style.display = 'none';
    document.getElementById('game-timer').style.display = 'none';

    const isMantri = data.mantriId === Network.getPlayerId();
    const playerCards = document.getElementById('player-cards');

    // Keep your role badge visible
    this.showMyRoleBadge();

    if (isMantri) {
      // Mantri: show only 2 guess options (Chor & Police, excluding Raja & self)
      let html = '<div style="grid-column: 1/-1; text-align: center; margin-bottom: 12px;"><div style="font-size: 1rem; color: var(--text-secondary);">In dono me se Chor kaun hai?</div></div>';
      data.guessOptions.forEach(p => {
        const initial = p.name.charAt(0).toUpperCase();
        html += `
          <div class="player-guess-card" onclick="Screens.game.makeGuess('${p.id}')" data-player-id="${p.id}">
            <div class="guess-avatar">${initial}</div>
            <div class="guess-name">${p.name}</div>
          </div>
        `;
      });
      playerCards.innerHTML = html;
      playerCards.style.display = 'grid';

      // Timer for guess (15 seconds)
      document.getElementById('game-timer').style.display = 'flex';
      this.startTimer(15);

      Audio.play('siren');
    } else {
      // Others: show waiting message
      playerCards.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
          <div style="font-size: 3rem; margin-bottom: 16px;">📜</div>
          <div style="font-size: 1.1rem; font-weight: 600; color: var(--color-mantri);">${data.mantriName} guess kar raha hai...</div>
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 8px;">Chor kaun hai?</div>
        </div>
      `;
      playerCards.style.display = 'grid';
    }
  },

  makeGuess(targetId) {
    Audio.play('click');
    // Highlight selected
    document.querySelectorAll('.player-guess-card').forEach(c => {
      c.classList.remove('selected');
      c.classList.add('disabled');
    });
    const selected = document.querySelector(`[data-player-id="${targetId}"]`);
    if (selected) {
      selected.classList.add('selected');
      selected.classList.remove('disabled');
    }

    Network.emit('mantri-guess', { targetPlayerId: targetId });
  },

  // --- Round Result ---
  onRoundResult(data) {
    clearInterval(this.timerInterval);

    // Update stored players with scores
    const players = [];
    Object.entries(data.roles).forEach(([id, info]) => {
      players.push({ id, ...info });
    });
    this.players = players;
    if (Screens.lobby.currentRoom) {
      Screens.lobby.currentRoom.players = players.map(p => ({
        id: p.id,
        name: p.name,
        score: p.totalScore
      }));
    }

    App.showScreen('round-result');

    // Title
    document.getElementById('result-title').textContent = `Round ${data.round} Result`;

    // Verdict
    const verdict = document.getElementById('result-verdict');
    verdict.className = `result-verdict glass-card ${data.correct ? 'correct' : 'wrong'}`;
    const targetName = data.roles[data.targetId]?.name || 'Unknown';
    const mantriName = data.roles[data.mantriId]?.name || 'Unknown';
    verdict.innerHTML = `
      <div class="verdict-icon">${data.correct ? '✅' : '❌'}</div>
      <div class="verdict-text ${data.correct ? 'correct' : 'wrong'}">
        ${data.correct ? 'Mantri Ne Pakad Liya!' : 'Chor Nikal Gaya!'}
      </div>
      <div class="verdict-detail">
        Mantri <strong>${mantriName}</strong> ne <strong>${targetName}</strong> ko chuna — jo tha <strong>${data.roles[data.targetId]?.roleLabel || '?'}</strong>
      </div>
    `;

    Audio.play(data.correct ? 'correct' : 'wrong');

    // Roles reveal
    const rolesDiv = document.getElementById('result-roles');
    let rolesHtml = '';
    Object.entries(data.roles).forEach(([id, info]) => {
      const isSelf = id === Network.getPlayerId();
      rolesHtml += `
        <div class="result-role-card">
          <div class="result-role-emoji">${this.ROLE_EMOJIS[info.role]}</div>
          <div class="result-role-info">
            <div class="result-role-name">${info.name}${isSelf ? ' (You)' : ''}</div>
            <div class="result-role-label role-${info.role}">${info.roleLabel}</div>
          </div>
        </div>
      `;
    });
    rolesDiv.innerHTML = rolesHtml;

    // Scores
    const scoresDiv = document.getElementById('result-scores');
    let scoresHtml = '';
    Object.entries(data.roles)
      .sort((a, b) => b[1].totalScore - a[1].totalScore)
      .forEach(([id, info]) => {
        const isSelf = id === Network.getPlayerId();
        scoresHtml += `
          <div class="result-score-row">
            <span class="result-score-name" ${isSelf ? 'style="color: var(--accent-blue)"' : ''}>${info.name}</span>
            <span>
              <span class="result-score-change ${info.roundScore === 0 ? 'zero' : ''}">
                +${info.roundScore}
              </span>
              <span class="result-score-total">${info.totalScore}</span>
            </span>
          </div>
        `;
      });
    scoresDiv.innerHTML = scoresHtml;
  },

  // --- Reconnect ---
  onReconnect(data) {
    this.players = data.players;
    if (Screens.lobby.currentRoom) {
      Screens.lobby.currentRoom.players = data.players;
    }

    if (data.state === 'discussion') {
      App.showScreen('game');
      if (data.role) {
        this.currentRole = data.role;
      }
      // Restore chat
      const chatArea = document.getElementById('chat-area');
      chatArea.style.display = 'flex';
      const chatMessages = document.getElementById('chat-messages');
      chatMessages.innerHTML = '';
      data.chat.forEach(msg => {
        this.onChatMessage(msg);
      });
    } else if (data.state === 'lobby') {
      App.showScreen('lobby');
      Screens.lobby.onRoomUpdate(data);
    } else {
      App.showScreen('game');
    }
  },

  // --- Helpers ---
  startTimer(seconds) {
    const timerEl = document.getElementById('timer-value');
    let remaining = seconds;
    timerEl.textContent = remaining;
    timerEl.classList.remove('urgent');

    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      remaining--;
      timerEl.textContent = remaining;

      if (remaining <= 5) {
        timerEl.classList.add('urgent');
        Audio.play('countdown');
      }

      if (remaining <= 0) {
        clearInterval(this.timerInterval);
      }
    }, 1000);
  },

  // --- Show Own Role Badge + Raja Info (only your role visible to you) ---
  showMyRoleBadge() {
    const container = document.getElementById('role-badges-bar');
    if (!container) return;
    if (!this.currentRole) { container.innerHTML = ''; return; }

    let html = '';

    // Show your own role
    html += `
      <div class="role-badge role-badge-${this.currentRole} role-badge-self">
        <span class="role-badge-emoji">${this.ROLE_EMOJIS[this.currentRole]}</span>
        <span class="role-badge-name">You</span>
        <span class="role-badge-label" style="color: ${this.ROLE_COLORS[this.currentRole]}">${this.currentRoleLabel}</span>
      </div>
    `;

    // Show Raja announcement (everyone knows who Raja is)
    if (this.rajaName && this.currentRole !== 'raja') {
      html += `
        <div class="role-badge role-badge-raja role-badge-raja-highlight">
          <span class="role-badge-emoji">${this.ROLE_EMOJIS['raja']}</span>
          <span class="role-badge-name">${this.rajaName}</span>
          <span class="role-badge-label" style="color: ${this.ROLE_COLORS['raja']}">👑 Raja</span>
        </div>
      `;
    }

    container.innerHTML = html;
    container.style.display = 'flex';
  },

  updateMiniScoreboard() {
    const container = document.getElementById('mini-scoreboard');
    const players = Screens.lobby.currentRoom ? Screens.lobby.currentRoom.players : this.players;
    if (!players || players.length === 0) {
      container.innerHTML = '';
      return;
    }

    const myId = Network.getPlayerId();
    let html = '';
    [...players].sort((a, b) => (b.score || 0) - (a.score || 0)).forEach(p => {
      const isSelf = p.id === myId;
      html += `
        <div class="mini-score-row">
          <span class="mini-score-name ${isSelf ? 'self' : ''}">${p.name}</span>
          <span class="mini-score-value">${p.score || 0}</span>
        </div>
      `;
    });
    container.innerHTML = html;
  }
};
