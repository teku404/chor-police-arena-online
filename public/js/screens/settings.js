/* ============================================================
   Settings Screen
   ============================================================ */

Screens.settings = {
  init() {
    // Load saved settings
    const sfx = localStorage.getItem('cp_sfx') || '80';
    const music = localStorage.getItem('cp_music') || '50';
    document.getElementById('setting-sfx').value = sfx;
    document.getElementById('setting-music').value = music;
    Audio.setSfxVolume(parseInt(sfx));
    Audio.setMusicVolume(parseInt(music));
  },

  updateSfx(value) {
    Audio.setSfxVolume(parseInt(value));
    localStorage.setItem('cp_sfx', value);
    Audio.play('click');
  },

  updateMusic(value) {
    Audio.setMusicVolume(parseInt(value));
    localStorage.setItem('cp_music', value);
  },

  changeName() {
    const input = document.getElementById('setting-name');
    const name = input.value.trim();
    if (!name || name.length < 2) {
      UI.toast('Name must be at least 2 characters', 'error');
      return;
    }
    localStorage.setItem('cp_playerName', name);
    Screens.menu.updateDisplay(name);
    input.value = '';
    Audio.play('click');
    UI.toast(`Name changed to ${name}!`, 'success');
  }
};
