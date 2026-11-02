import { prefersReducedMotion } from '../scenes/fx.js';

/** Full-screen drifting starfield, drawn behind the menus. */
export const createStarfield = (canvas) => {
  const context = canvas.getContext('2d');
  const reduced = prefersReducedMotion();
  let stars = [];
  let width = 0;
  let height = 0;
  let frame = 0;
  let running = false;
  let last = 0;

  const resize = () => {
    const ratio = Math.min(globalThis.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    stars = Array.from({ length: Math.round((width * height) / 2500) }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      z: Math.random() * 0.9 + 0.1,
      twinkle: Math.random() * Math.PI * 2,
    }));
    draw(0);
  };

  const draw = (dt) => {
    context.clearRect(0, 0, width, height);
    for (const star of stars) {
      if (!reduced) {
        star.y += star.z * 14 * dt;
        if (star.y > height) {
          star.y = 0;
          star.x = Math.random() * width;
        }
        star.twinkle += dt * 2;
      }
      const alpha = 0.35 + star.z * 0.5 + Math.sin(star.twinkle) * 0.15;
      context.fillStyle = `rgba(220, 230, 255, ${alpha})`;
      context.fillRect(star.x, star.y, star.z * 2, star.z * 2);
    }
  };

  const step = (now) => {
    if (!running) return;
    draw(Math.min(0.05, (now - last) / 1000));
    last = now;
    frame = requestAnimationFrame(step);
  };

  new ResizeObserver(resize).observe(canvas);

  return {
    start() {
      if (running) return;
      running = true;
      last = performance.now();
      frame = requestAnimationFrame(step);
    },
    stop() {
      running = false;
      cancelAnimationFrame(frame);
    },
  };
};
