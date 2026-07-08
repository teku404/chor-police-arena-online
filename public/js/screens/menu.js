/* ============================================================
   Menu Screen
   ============================================================ */

const Screens = window.Screens || {};

Screens.menu = {
  init() {
    // Check if name is already saved
    const savedName = localStorage.getItem('cp_playerName');
    if (savedName) {
      UI.hideModal('name-modal');
      this.updateDisplay(savedName);
    }

    // Enter key on name input
    document.getElementById('input-player-name').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.saveName();
    });
  },

  saveName() {
    const input = document.getElementById('input-player-name');
    const name = input.value.trim();
    if (!name || name.length < 2) {
      UI.toast('Name must be at least 2 characters', 'error');
      return;
    }
    localStorage.setItem('cp_playerName', name);
    UI.hideModal('name-modal');
    Audio.play('click');
    this.updateDisplay(name);
    UI.toast(`Welcome, ${name}!`, 'success');
  },

  updateDisplay(name) {
    document.getElementById('menu-player-name').textContent = name;
    // Load stats from localStorage
    const coins = localStorage.getItem('cp_coins') || '0';
    const level = localStorage.getItem('cp_level') || '1';
    document.getElementById('menu-coins').textContent = coins;
    document.getElementById('menu-level').textContent = `Lv.${level}`;
  },

  getPlayerName() {
    return localStorage.getItem('cp_playerName') || 'Player';
  },

  playOnline() {
    Audio.play('click');
    const name = this.getPlayerName();
    App.showScreen('matchmaking');
    Network.emit('find-match', { playerName: name });
  },

  createRoom() {
    Audio.play('click');
    App.showScreen('create');
  },

  joinRoom() {
    Audio.play('click');
    App.showScreen('join');
  },

  leaderboard() {
    Audio.play('click');
    UI.toast('Leaderboard coming soon!', 'info');
  },

  profile() {
    Audio.play('click');
    UI.toast('Profile coming soon!', 'info');
  },

  settings() {
    Audio.play('click');
    App.showScreen('settings');
  }
};
