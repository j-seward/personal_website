/* ============================================================
   Causal Graph — Animated Network Visualization
   Hero section background for jseward.com

   Nodes float freely across the full canvas like a constellation.
   A glassmorphism card in the HTML handles text readability.
   ============================================================ */

(function () {
  'use strict';

  const canvas = document.getElementById('causal-graph-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width, height, dpr;
  let mouseX = -1000;
  let mouseY = -1000;
  let animationId;
  let isVisible = true;
  const mouseInfluenceRadius = 220;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (prefersReducedMotion.matches) {
    canvas.style.display = 'none';
    return;
  }

  // Research topic nodes
  const labels = [
    'Health\nEconomics',
    'Causal\nInference',
    'Mental\nHealth',
    'Healthcare\nMarkets',
    'Medicare\nPolicy',
    'Vertical\nIntegration',
    'Criminal\nJustice',
    'Physician\nLabor',
    'Difference-in-\nDifferences',
    'Instrumental\nVariables',
    'Regression\nDiscontinuity',
    'Synthetic\nControl',
    'Provider\nBehavior',
    'Insurance\nDesign',
  ];

  const edges = [
    [0, 1],   // Health Economics -> Causal Inference
    [0, 3],   // Health Economics -> Healthcare Markets
    [0, 4],   // Health Economics -> Medicare Policy
    [0, 13],  // Health Economics -> Insurance Design
    [0, 7],   // Health Economics -> Physician Labor
    [0, 2],   // Health Economics -> Mental Health
    [3, 5],   // Healthcare Markets -> Vertical Integration
    [3, 12],  // Healthcare Markets -> Provider Behavior
    [3, 7],   // Healthcare Markets -> Physician Labor
    [3, 4],   // Healthcare Markets -> Medicare Policy
    [5, 12],  // Vertical Integration -> Provider Behavior
    [4, 12],  // Medicare Policy -> Provider Behavior
    [4, 13],  // Medicare Policy -> Insurance Design
    [2, 6],   // Mental Health -> Criminal Justice
    [2, 1],   // Mental Health -> Causal Inference
    [6, 1],   // Criminal Justice -> Causal Inference
    [1, 8],   // Causal Inference -> Difference-in-Differences
    [1, 9],   // Causal Inference -> Instrumental Variables
    [1, 10],  // Causal Inference -> Regression Discontinuity
    [1, 11],  // Causal Inference -> Synthetic Control
    [8, 10],  // Difference-in-Differences -> Regression Discontinuity
    [9, 12],  // Instrumental Variables -> Provider Behavior
  ];

  class Node {
    constructor(label, index, total) {
      this.label = label;
      this.index = index;

      // Distribute in a spiral pattern across the full canvas
      const angle = (index / total) * Math.PI * 2 + Math.PI * 0.5;
      const ringFactor = 0.22 + (index % 3) * 0.08;
      this.relX = 0.5 + Math.cos(angle) * ringFactor;
      this.relY = 0.5 + Math.sin(angle) * ringFactor;

      this.x = 0;
      this.y = 0;
      this.baseX = 0;
      this.baseY = 0;

      // Keep every node in motion (avoid near-zero random velocities).
      const minSpeed = 0.04;
      this.vx = (Math.random() < 0.5 ? -1 : 1) * (minSpeed + Math.random() * 0.08);
      this.vy = (Math.random() < 0.5 ? -1 : 1) * (minSpeed + Math.random() * 0.08);

      this.radius = 28 + Math.random() * 8;
      this.alpha = 0.78 + Math.random() * 0.2;
      this.phase = Math.random() * Math.PI * 2;
    }

    setPosition(w, h) {
      this.baseX = this.relX * w;
      this.baseY = this.relY * h;
      this.x = this.baseX;
      this.y = this.baseY;
    }

    update(time) {
      const drift = Math.sin(time * 0.001 + this.phase) * 1.8;
      const driftY = Math.cos(time * 0.0008 + this.phase * 1.3) * 1.8;

      this.x += this.vx + drift * 0.06;
      this.y += this.vy + driftY * 0.06;

      // Mouse repulsion
      const dx = this.x - mouseX;
      const dy = this.y - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < mouseInfluenceRadius && dist > 0) {
        const force = (1 - dist / mouseInfluenceRadius) * 0.95;
        this.x += (dx / dist) * force * 4;
        this.y += (dy / dist) * force * 4;
      }

      // Spring back to base
      this.x += (this.baseX - this.x) * 0.015;
      this.y += (this.baseY - this.y) * 0.015;
    }

    draw(ctx, time) {
      const pulse = 1 + Math.sin(time * 0.002 + this.phase) * 0.04;
      const r = this.radius * pulse;

      // Glow
      const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r * 1.8);
      gradient.addColorStop(0, `rgba(197, 165, 90, ${this.alpha * 0.23})`);
      gradient.addColorStop(1, 'rgba(197, 165, 90, 0)');
      ctx.beginPath();
      ctx.arc(this.x, this.y, r * 1.8, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Node circle
      ctx.beginPath();
      ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(26, 42, 58, ${this.alpha * 0.98})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(197, 165, 90, ${this.alpha * 0.82})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha * 0.98})`;
      ctx.font = `500 9px "Space Grotesk", "Inter", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const lines = this.label.split('\n');
      const lineHeight = 12;
      const startY = this.y - ((lines.length - 1) * lineHeight) / 2;
      lines.forEach((line, i) => {
        ctx.fillText(line, this.x, startY + i * lineHeight);
      });
    }
  }

  const nodes = labels.map((label, i) => new Node(label, i, labels.length));

  function drawEdge(ctx, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const maxDist = Math.min(width, height) * 0.6;
    const opacity = Math.max(0, 0.24 * (1 - dist / maxDist));
    if (opacity <= 0) return;

    const mx = (a.x + b.x) / 2 + (dy * 0.08);
    const my = (a.y + b.y) / 2 - (dx * 0.08);

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(mx, my, b.x, b.y);
    ctx.strokeStyle = `rgba(197, 165, 90, ${opacity})`;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Arrowhead
    const t = 0.8;
    const ax2 = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * mx + t * t * b.x;
    const ay2 = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * my + t * t * b.y;
    const ttx = 2 * (1 - t) * (mx - a.x) + 2 * t * (b.x - mx);
    const tty = 2 * (1 - t) * (my - a.y) + 2 * t * (b.y - my);
    const angle = Math.atan2(tty, ttx);
    const sz = 6;

    ctx.beginPath();
    ctx.moveTo(ax2, ay2);
    ctx.lineTo(ax2 - sz * Math.cos(angle - Math.PI / 6), ay2 - sz * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(ax2, ay2);
    ctx.lineTo(ax2 - sz * Math.cos(angle + Math.PI / 6), ay2 - sz * Math.sin(angle + Math.PI / 6));
    ctx.strokeStyle = `rgba(197, 165, 90, ${opacity * 1.5})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Floating particles
  const particles = [];
  function initParticles() {
    particles.length = 0;
    const count = Math.min(40, Math.floor((width * height) / 30000));
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 1 + Math.random() * 1.5,
        speed: 0.1 + Math.random() * 0.2,
        alpha: 0.24 + Math.random() * 0.2,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function drawParticles(ctx, time) {
    particles.forEach(p => {
      p.y -= p.speed;
      p.x += Math.sin(time * 0.001 + p.phase) * 0.2;
      if (p.y < -10) {
        p.y = height + 10;
        p.x = Math.random() * width;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(197, 165, 90, ${p.alpha})`;
      ctx.fill();
    });
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.parentElement.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    nodes.forEach(n => n.setPosition(width, height));
    initParticles();
  }

  function animate(time) {
    if (!isVisible) {
      animationId = requestAnimationFrame(animate);
      return;
    }

    ctx.clearRect(0, 0, width, height);
    edges.forEach(([i, j]) => drawEdge(ctx, nodes[i], nodes[j]));
    drawParticles(ctx, time);
    nodes.forEach(n => {
      n.update(time);
      n.draw(ctx, time);
    });

    animationId = requestAnimationFrame(animate);
  }

  function clearPointer() {
    mouseX = -1000;
    mouseY = -1000;
  }

  function setPointerFromClient(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
      mouseX = x;
      mouseY = y;
    } else {
      clearPointer();
    }
  }

  window.addEventListener('mousemove', (e) => {
    setPointerFromClient(e.clientX, e.clientY);
  }, { passive: true });

  window.addEventListener('mouseleave', clearPointer);
  canvas.addEventListener('mouseleave', clearPointer);

  window.addEventListener('touchmove', (e) => {
    if (!e.touches || e.touches.length === 0) {
      clearPointer();
      return;
    }
    const touch = e.touches[0];
    setPointerFromClient(touch.clientX, touch.clientY);
  }, { passive: true });

  window.addEventListener('touchend', clearPointer, { passive: true });
  window.addEventListener('touchcancel', clearPointer, { passive: true });

  document.addEventListener('visibilitychange', () => { isVisible = !document.hidden; });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  resize();
  animationId = requestAnimationFrame(animate);
})();
