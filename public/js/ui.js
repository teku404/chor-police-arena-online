/* ============================================================
   UI Utilities — Toast, Modal, Screen Transitions
   ============================================================ */

const UI = {
  // Show toast notification
  toast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // Show/Hide modal
  showModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
  },

  hideModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
  },

  // Screen transition
  transitionTo(screenId) {
    const current = document.querySelector('.screen.active');
    const next = document.getElementById(`screen-${screenId}`);
    if (!next || current === next) return;

    if (current) {
      current.classList.add('exiting');
      setTimeout(() => {
        current.classList.remove('active', 'exiting');
      }, 300);
    }

    setTimeout(() => {
      next.classList.add('active', 'entering');
      setTimeout(() => {
        next.classList.remove('entering');
      }, 400);
    }, current ? 150 : 0);
  },

  // Create countdown overlay
  showCountdown(seconds, callback) {
    let count = seconds;
    const show = () => {
      if (count <= 0) {
        if (callback) callback();
        return;
      }
      const el = document.createElement('div');
      el.className = 'countdown-number';
      el.textContent = count;
      document.body.appendChild(el);
      Audio.play('countdown');
      setTimeout(() => el.remove(), 1000);
      count--;
      setTimeout(show, 1000);
    };
    show();
  },

  // Show role reveal flash
  showRoleFlash(role) {
    const el = document.createElement('div');
    el.className = `role-reveal-flash ${role}`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 600);
  },

  // Format number with animation
  animateNumber(element, from, to, duration = 600) {
    const start = performance.now();
    const update = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const current = Math.round(from + (to - from) * eased);
      element.textContent = current;
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  },

  // Create floating particles
  createParticles(count = 15) {
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = `${Math.random() * 100}%`;
      p.style.animationDuration = `${8 + Math.random() * 12}s`;
      p.style.animationDelay = `${Math.random() * 10}s`;
      p.style.width = `${1 + Math.random() * 2}px`;
      p.style.height = p.style.width;
      document.getElementById('bg-effects').appendChild(p);
    }
  }
};
