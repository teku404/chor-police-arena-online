/* ============================================================
   Animations Module — Confetti & Score Counter
   ============================================================ */

const Animations = {
  // Confetti particle system
  confetti: {
    canvas: null,
    ctx: null,
    particles: [],
    running: false,
    animFrame: null,

    start() {
      this.canvas = document.getElementById('confetti-canvas');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.particles = [];
      this.running = true;

      const colors = ['#f59e0b', '#3b82f6', '#a855f7', '#22c55e', '#ef4444', '#fbbf24', '#60a5fa'];

      for (let i = 0; i < 120; i++) {
        this.particles.push({
          x: Math.random() * this.canvas.width,
          y: Math.random() * this.canvas.height - this.canvas.height,
          w: 4 + Math.random() * 6,
          h: 6 + Math.random() * 10,
          color: colors[Math.floor(Math.random() * colors.length)],
          vx: (Math.random() - 0.5) * 4,
          vy: 2 + Math.random() * 4,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 10,
          opacity: 1
        });
      }

      this.animate();
    },

    animate() {
      if (!this.running) return;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      let alive = 0;
      this.particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05; // gravity
        p.rotation += p.rotationSpeed;

        if (p.y > this.canvas.height) {
          p.opacity -= 0.02;
        }

        if (p.opacity <= 0) return;
        alive++;

        this.ctx.save();
        this.ctx.globalAlpha = p.opacity;
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate((p.rotation * Math.PI) / 180);
        this.ctx.fillStyle = p.color;
        this.ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        this.ctx.restore();
      });

      if (alive > 0) {
        this.animFrame = requestAnimationFrame(() => this.animate());
      } else {
        this.stop();
      }
    },

    stop() {
      this.running = false;
      if (this.animFrame) cancelAnimationFrame(this.animFrame);
      if (this.ctx) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }
  },

  // Score counter roll-up
  scoreCounter(element, targetValue, duration = 800) {
    UI.animateNumber(element, parseInt(element.textContent) || 0, targetValue, duration);
    element.classList.add('score-pop');
    setTimeout(() => element.classList.remove('score-pop'), 500);
  }
};

// Handle resize for confetti canvas
window.addEventListener('resize', () => {
  if (Animations.confetti.canvas && Animations.confetti.running) {
    Animations.confetti.canvas.width = window.innerWidth;
    Animations.confetti.canvas.height = window.innerHeight;
  }
});
