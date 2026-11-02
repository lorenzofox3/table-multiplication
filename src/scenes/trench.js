import * as sfx from '../audio.js';
import { prefersReducedMotion } from './fx.js';

/**
 * Canvas trench run, viewed from above. The starfighter never steers:
 * a correct answer triggers an automatic dodge, a miss makes it explode.
 */

const WALL_RATIO = 0.2;
const SHIP_Y_RATIO = 0.8;
const OBSTACLE_HOLD_RATIO = 0.42;
const OBSTACLE_HIT_RATIO = 0.66;

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const linear = (t) => t;

export const createTrench = (canvas) => {
  const context = canvas.getContext('2d');
  const reduced = prefersReducedMotion();
  let width = 0;
  let height = 0;
  let running = true;
  let frame = 0;
  let last = performance.now();

  const state = {
    scroll: 0,
    speed: 220, // px/s
    ship: { x: 0, roll: 0, visible: true, blink: 0 },
    obstacle: null, // { y: ratio, gapSide: -1|1 }
    particles: [],
    shockwave: null,
  };

  const tweens = new Set();
  const tween = (target, key, to, duration, easing = easeInOut) =>
    new Promise((resolve) => {
      const from = target[key];
      tweens.add({ target, key, from, to, duration, easing, elapsed: 0, resolve });
    });

  const resize = () => {
    const ratio = Math.min(globalThis.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  const floorLeft = () => width * WALL_RATIO;
  const floorRight = () => width * (1 - WALL_RATIO);
  const lane = () => (floorRight() - floorLeft()) / 4;
  const shipSize = () => Math.min(width * 0.14, height * 0.16);
  const shipPosition = () => ({ x: width / 2 + state.ship.x * lane(), y: height * SHIP_Y_RATIO });

  // --- drawing -------------------------------------------------------------

  const drawTrench = () => {
    const left = floorLeft();
    const right = floorRight();
    const floor = context.createLinearGradient(left, 0, right, 0);
    floor.addColorStop(0, '#0c0f16');
    floor.addColorStop(0.5, '#1b2130');
    floor.addColorStop(1, '#0c0f16');
    context.fillStyle = floor;
    context.fillRect(left, 0, right - left, height);

    // floor panels scrolling down
    const panel = 70;
    const offset = state.scroll % panel;
    context.strokeStyle = 'rgba(120, 140, 180, 0.18)';
    context.lineWidth = 1;
    for (let y = offset - panel; y < height; y += panel) {
      context.beginPath();
      context.moveTo(left, y);
      context.lineTo(right, y);
      context.stroke();
    }
    context.beginPath();
    context.moveTo(width / 2, 0);
    context.lineTo(width / 2, height);
    context.stroke();

    // walls (seen from above) with greebles
    for (const [x0, x1, edge] of [
      [0, left, left],
      [right, width, right],
    ]) {
      context.fillStyle = '#3a4152';
      context.fillRect(x0, 0, x1 - x0, height);
      const block = 46;
      const wallOffset = state.scroll % block;
      for (let y = wallOffset - block, i = 0; y < height; y += block, i++) {
        const seed = Math.floor((state.scroll - wallOffset) / block) + i;
        const w = ((seed * 37) % 5) + 3;
        context.fillStyle = seed % 3 === 0 ? '#2a303d' : '#4a5266';
        context.fillRect(x0 + ((seed * 13) % Math.max(1, x1 - x0 - 16)), y + 6, (x1 - x0) * 0.08 * w, block * 0.45);
        if (seed % 7 === 0) {
          context.fillStyle = '#ff6b4a';
          context.fillRect(x0 + (x1 - x0) / 2 - 2, y + block / 2, 4, 4);
        }
      }
      // wall edge shadow
      const shadow = context.createLinearGradient(edge, 0, edge + (edge === left ? 18 : -18), 0);
      shadow.addColorStop(0, 'rgba(0,0,0,0.6)');
      shadow.addColorStop(1, 'rgba(0,0,0,0)');
      context.fillStyle = shadow;
      context.fillRect(edge === left ? edge : edge - 18, 0, 18, height);
    }
  };

  const drawObstacle = () => {
    const obstacle = state.obstacle;
    if (!obstacle) return;
    const y = obstacle.y * height;
    const left = floorLeft();
    const right = floorRight();
    const gapWidth = lane() * 1.6;
    const thickness = Math.max(14, height * 0.05);
    const segments =
      obstacle.gapSide < 0 ? [[left + gapWidth, right]] : [[left, right - gapWidth]];
    for (const [x0, x1] of segments) {
      context.fillStyle = '#5b6377';
      context.fillRect(x0, y - thickness / 2, x1 - x0, thickness);
      context.fillStyle = '#2c313e';
      context.fillRect(x0, y + thickness / 2 - 4, x1 - x0, 4);
      context.fillStyle = '#ffb347';
      for (let x = x0 + 8; x < x1 - 8; x += 22) context.fillRect(x, y - 2, 10, 4);
    }
    // warning lights on the edge of the gap
    const edgeX = obstacle.gapSide < 0 ? left + gapWidth : right - gapWidth;
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 120);
    context.fillStyle = `rgba(255, 80, 60, ${0.5 + pulse * 0.5})`;
    context.beginPath();
    context.arc(edgeX, y, 4, 0, Math.PI * 2);
    context.fill();
  };

  const drawShip = () => {
    const { ship } = state;
    if (!ship.visible) return;
    if (ship.blink > 0 && Math.floor(ship.blink * 10) % 2 === 0) return;
    const { x, y } = shipPosition();
    const size = shipSize();
    context.save();
    context.translate(x, y);
    context.scale(Math.max(0.25, Math.cos(ship.roll)), 1);

    // engine glow
    context.fillStyle = 'rgba(255, 140, 80, 0.9)';
    for (const ex of [-0.22, 0.22]) {
      const glow = context.createRadialGradient(ex * size, size * 0.42, 0, ex * size, size * 0.42, size * 0.2);
      glow.addColorStop(0, 'rgba(255, 220, 160, 1)');
      glow.addColorStop(1, 'rgba(255, 90, 40, 0)');
      context.fillStyle = glow;
      context.beginPath();
      context.arc(ex * size, size * 0.42, size * 0.2, 0, Math.PI * 2);
      context.fill();
    }
    // wings (attack position: seen from above as two wide trapezoids)
    context.fillStyle = '#d7dbe2';
    for (const side of [-1, 1]) {
      context.beginPath();
      context.moveTo(side * size * 0.12, size * 0.05);
      context.lineTo(side * size * 0.62, size * 0.0);
      context.lineTo(side * size * 0.62, size * 0.2);
      context.lineTo(side * size * 0.12, size * 0.3);
      context.closePath();
      context.fill();
      context.fillStyle = '#c4423a';
      context.fillRect(side > 0 ? size * 0.36 : -size * 0.48, size * 0.04, size * 0.12, size * 0.05);
      context.fillStyle = '#d7dbe2';
      // wing cannon
      context.fillStyle = '#9aa1ad';
      context.fillRect(side * size * 0.62 - size * 0.025, -size * 0.32, size * 0.05, size * 0.5);
      context.fillStyle = '#d7dbe2';
    }
    // engines
    context.fillStyle = '#8b929e';
    for (const ex of [-0.22, 0.22]) context.fillRect(ex * size - size * 0.07, -size * 0.02, size * 0.14, size * 0.42);
    // fuselage
    context.fillStyle = '#eef0f4';
    context.beginPath();
    context.moveTo(0, -size * 0.62);
    context.lineTo(size * 0.09, -size * 0.1);
    context.lineTo(size * 0.11, size * 0.38);
    context.lineTo(-size * 0.11, size * 0.38);
    context.lineTo(-size * 0.09, -size * 0.1);
    context.closePath();
    context.fill();
    context.fillStyle = '#c4423a';
    context.fillRect(-size * 0.05, -size * 0.32, size * 0.1, size * 0.06);
    // canopy
    context.fillStyle = '#2a3a55';
    context.beginPath();
    context.ellipse(0, size * 0.02, size * 0.055, size * 0.12, 0, 0, Math.PI * 2);
    context.fill();
    // astromech dome
    context.fillStyle = '#4a7bd1';
    context.beginPath();
    context.arc(0, size * 0.22, size * 0.045, 0, Math.PI * 2);
    context.fill();
    context.restore();
  };

  const drawParticles = (dt) => {
    if (state.shockwave) {
      const wave = state.shockwave;
      wave.life -= dt;
      const t = 1 - wave.life / wave.duration;
      context.strokeStyle = `rgba(255, 210, 140, ${Math.max(0, 1 - t)})`;
      context.lineWidth = 4;
      context.beginPath();
      context.arc(wave.x, wave.y, t * wave.radius, 0, Math.PI * 2);
      context.stroke();
      if (wave.life <= 0) state.shockwave = null;
    }
    state.particles = state.particles.filter((p) => (p.life -= dt) > 0);
    for (const p of state.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt + state.speed * dt * 0.3;
      p.vx *= 0.97;
      p.vy *= 0.97;
      const alpha = Math.max(0, p.life / p.maxLife);
      context.fillStyle = `hsla(${p.hue}, 100%, ${50 + alpha * 30}%, ${alpha})`;
      context.beginPath();
      context.arc(p.x, p.y, p.size * (0.5 + alpha), 0, Math.PI * 2);
      context.fill();
    }
  };

  const explode = (x, y) => {
    const count = reduced ? 25 : 70;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 220;
      const life = 0.5 + Math.random() * 0.8;
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        size: 2 + Math.random() * 4,
        hue: 15 + Math.random() * 35,
      });
    }
    state.shockwave = { x, y, radius: shipSize() * 2.2, life: 0.6, duration: 0.6 };
  };

  // --- loop ----------------------------------------------------------------

  const step = (now) => {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    for (const t of tweens) {
      t.elapsed += dt * 1000;
      const k = Math.min(1, t.elapsed / t.duration);
      t.target[t.key] = t.from + (t.to - t.from) * t.easing(k);
      if (k >= 1) {
        tweens.delete(t);
        t.resolve();
      }
    }
    if (state.ship.blink > 0) state.ship.blink = Math.max(0, state.ship.blink - dt);
    state.scroll += state.speed * dt;

    context.clearRect(0, 0, width, height);
    drawTrench();
    drawObstacle();
    drawShip();
    drawParticles(dt);
    frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);

  // --- scene API -------------------------------------------------------------

  return {
    pause() {
      running = false;
      cancelAnimationFrame(frame);
    },
    resume() {
      if (running) return;
      running = true;
      last = performance.now();
      frame = requestAnimationFrame(step);
    },

    present() {
      state.obstacle = { y: -0.08, gapSide: Math.random() < 0.5 ? -1 : 1 };
    },

    threat(durationMs) {
      if (!state.obstacle) this.present();
      const target = durationMs ? OBSTACLE_HIT_RATIO - 0.06 : OBSTACLE_HOLD_RATIO;
      tween(state.obstacle, 'y', target, durationMs ?? 2500, durationMs ? linear : easeInOut);
    },

    async success() {
      const obstacle = state.obstacle;
      tweens.forEach((t) => t.target === obstacle && tweens.delete(t));
      const gapX = obstacle.gapSide * 1.15;
      sfx.whoosh();
      await Promise.all([
        tween(state.ship, 'x', gapX, 320),
        tween(state.ship, 'roll', obstacle.gapSide * Math.PI * 0.42, 320),
        tween(obstacle, 'y', 1.15, 650, linear),
      ]);
      state.obstacle = null;
      await Promise.all([tween(state.ship, 'x', 0, 380), tween(state.ship, 'roll', 0, 380)]);
    },

    async failure() {
      const obstacle = state.obstacle;
      tweens.forEach((t) => t.target === obstacle && tweens.delete(t));
      const shipTop = SHIP_Y_RATIO - shipSize() / height / 2;
      await tween(obstacle, 'y', shipTop, 220, linear);
      const { x, y } = shipPosition();
      state.ship.visible = false;
      sfx.explosion();
      explode(x, y);
      const savedSpeed = state.speed;
      state.speed = 40;
      await tween(obstacle, 'y', 1.15, 900, linear);
      state.obstacle = null;
      state.speed = savedSpeed;
      state.ship.x = 0;
      state.ship.roll = 0;
      state.ship.visible = true;
      state.ship.blink = 1;
      await new Promise((r) => setTimeout(r, 500));
    },

    destroy() {
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      tweens.clear();
    },
  };
};
