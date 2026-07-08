/* ============================================================
   App.js — Main Entry Point
   Screen Router & Initialization
   ============================================================ */

const App = {
  currentScreen: 'menu',

  init() {
    console.log('🚓 Chor Police Online — Initializing...');

    // Initialize modules
    Audio.init();
    Screens.menu.init();
    Screens.settings.init();

    // Connect to server
    Network.connect();

    // Create background particles
    UI.createParticles(12);

    // Add click sound to all buttons
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn');
      if (btn && !btn.classList.contains('btn-send')) {
        // Ripple effect handled by CSS
      }
    });

    console.log('🚓 Chor Police Online — Ready!');
  },

  showScreen(screenId) {
    this.currentScreen = screenId;
    UI.transitionTo(screenId);
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
