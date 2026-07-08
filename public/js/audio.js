/* ============================================================
   Audio Engine — Web Audio API Sound Effects
   Programmatically generated — no external files needed
   ============================================================ */

const Audio = (() => {
  let ctx = null;
  let sfxVolume = 0.8;
  let musicVolume = 0.5;
  let initialized = false;

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    return ctx;
  }

  function init() {
    if (initialized) return;
    // Init on first user interaction
    const unlock = () => {
      getCtx();
      initialized = true;
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('click', unlock);
    };
    document.addEventListener('touchstart', unlock);
    document.addEventListener('click', unlock);
  }

  // Generate a simple tone
  function playTone(freq, duration, type = 'sine', vol = 0.3) {
    try {
      const c = getCtx();
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = vol * sfxVolume;
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + duration);
    } catch (e) { /* ignore audio errors */ }
  }

  // Sound library
  const sounds = {
    click() {
      playTone(800, 0.08, 'sine', 0.15);
    },

    countdown() {
      playTone(440, 0.15, 'sine', 0.25);
      setTimeout(() => playTone(440, 0.15, 'sine', 0.15), 100);
    },

    siren() {
      try {
        const c = getCtx();
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = 600;
        osc.frequency.linearRampToValueAtTime(900, c.currentTime + 0.5);
        osc.frequency.linearRampToValueAtTime(600, c.currentTime + 1);
        gain.gain.value = 0.08 * sfxVolume;
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.2);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(c.currentTime);
        osc.stop(c.currentTime + 1.2);
      } catch(e) {}
    },

    suspense() {
      playTone(120, 1.5, 'sine', 0.1);
      setTimeout(() => playTone(130, 1.5, 'sine', 0.08), 300);
    },

    correct() {
      playTone(523, 0.15, 'sine', 0.25);
      setTimeout(() => playTone(659, 0.15, 'sine', 0.25), 100);
      setTimeout(() => playTone(784, 0.25, 'sine', 0.3), 200);
    },

    wrong() {
      playTone(300, 0.2, 'sawtooth', 0.15);
      setTimeout(() => playTone(250, 0.3, 'sawtooth', 0.12), 150);
    },

    winner() {
      const notes = [523, 659, 784, 1047, 784, 1047];
      notes.forEach((f, i) => {
        setTimeout(() => playTone(f, 0.2, 'sine', 0.2), i * 120);
      });
    },

    roleReveal() {
      playTone(200, 0.1, 'sine', 0.2);
      setTimeout(() => playTone(400, 0.1, 'sine', 0.25), 80);
      setTimeout(() => playTone(600, 0.2, 'sine', 0.3), 160);
    },

    chat() {
      playTone(1200, 0.05, 'sine', 0.08);
    },

    ready() {
      playTone(660, 0.1, 'sine', 0.2);
      setTimeout(() => playTone(880, 0.15, 'sine', 0.2), 80);
    },

    join() {
      playTone(440, 0.1, 'sine', 0.15);
      setTimeout(() => playTone(550, 0.1, 'sine', 0.15), 100);
      setTimeout(() => playTone(660, 0.15, 'sine', 0.2), 200);
    }
  };

  return {
    init,
    play(name) {
      if (sounds[name]) sounds[name]();
    },
    setSfxVolume(v) { sfxVolume = v / 100; },
    setMusicVolume(v) { musicVolume = v / 100; },
    getSfxVolume() { return sfxVolume * 100; },
    getMusicVolume() { return musicVolume * 100; }
  };
})();
