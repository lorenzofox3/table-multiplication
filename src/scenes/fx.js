/** Shared animation helpers for scenes. */

export const SVG_NS = 'http://www.w3.org/2000/svg';

export const prefersReducedMotion = () =>
  globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Element.animate that resolves when finished (or immediately if cancelled / unsupported). */
export const animate = (element, keyframes, options) => {
  if (!element?.animate) return Promise.resolve();
  const animation = element.animate(keyframes, { fill: 'forwards', ...options });
  return animation.finished.then(
    () => animation,
    () => animation,
  );
};

/** Runs an animation, then writes its final keyframe into the inline style so later animations start from it. */
export const settle = async (element, keyframes, options) => {
  const animation = await animate(element, keyframes, options);
  const { offset: _offset, easing: _easing, ...last } = keyframes.at(-1);
  Object.assign(element.style, last);
  animation?.cancel();
};

/** Builds an SVG element from markup. */
export const svgFragment = (markup) => {
  const template = document.createElementNS(SVG_NS, 'g');
  template.innerHTML = markup;
  return template.firstElementChild;
};

export const createSvg = (viewBox, markup, className = '') => {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', viewBox);
  // "meet" keeps every character visible; backgrounds are drawn beyond the viewBox to fill letterboxing.
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('class', `scene-svg ${className}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = markup;
  return svg;
};

/** Reusable glow filter definition (id must be unique per document). */
export const glowFilter = (id, blur = 3) => `
  <filter id="${id}" filterUnits="userSpaceOnUse" x="-400" y="-400" width="1200" height="1200">
    <feGaussianBlur stdDeviation="${blur}" result="blur"/>
    <feMerge><feMergeNode in="blur"/><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>`;

/** Full-scene coloured flash. Softer and slower when reduced motion is preferred. */
export const flash = (host, color = 'rgb(255 40 40)') => {
  const layer = document.createElement('div');
  layer.className = 'fx-flash';
  layer.style.background = color;
  host.append(layer);
  const reduced = prefersReducedMotion();
  return animate(
    layer,
    reduced ? [{ opacity: 0 }, { opacity: 0.35 }, { opacity: 0 }] : [{ opacity: 0.75 }, { opacity: 0 }],
    { duration: reduced ? 700 : 450, easing: 'ease-out' },
  ).then(() => layer.remove());
};

/** Fade the scene to black and back. */
export const blackout = async (host, holdMs = 300) => {
  const layer = document.createElement('div');
  layer.className = 'fx-flash';
  layer.style.background = '#000';
  layer.style.opacity = '0';
  host.append(layer);
  await animate(layer, [{ opacity: 0 }, { opacity: 1 }], { duration: 350, easing: 'ease-in' });
  await wait(holdMs);
  await animate(layer, [{ opacity: 1 }, { opacity: 0 }], { duration: 350, easing: 'ease-out' });
  layer.remove();
};

export const shake = (element, intensity = 8, duration = 400) => {
  if (prefersReducedMotion()) return Promise.resolve();
  const frames = [0, 1, -1, 0.8, -0.6, 0.4, -0.2, 0].map((k, i) => ({
    transform: `translate(${k * intensity}px, ${(i % 2 ? -1 : 1) * k * intensity * 0.5}px)`,
  }));
  return animate(element, frames, { duration, easing: 'linear', fill: 'none' });
};

/** A glowing bolt travelling from one point to another inside an SVG. */
export const bolt = (svg, from, to, { color = '#ff3b3b', length = 26, width = 4, duration = 260, filter } = {}) => {
  const angle = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  const group = document.createElementNS(SVG_NS, 'g');
  group.innerHTML = `
    <line x1="${-length / 2}" y1="0" x2="${length / 2}" y2="0" stroke="${color}" stroke-width="${width}"
      stroke-linecap="round" ${filter ? `filter="url(#${filter})"` : ''}/>
    <line x1="${-length / 2 + 3}" y1="0" x2="${length / 2 - 3}" y2="0" stroke="#fff" stroke-width="${width / 2.5}"
      stroke-linecap="round"/>`;
  svg.append(group);
  return animate(
    group,
    [
      { transform: `translate(${from.x}px, ${from.y}px) rotate(${angle}deg)` },
      { transform: `translate(${to.x}px, ${to.y}px) rotate(${angle}deg)` },
    ],
    { duration, easing: 'linear' },
  ).then(() => group.remove());
};

/** Small burst of sparks around a point. */
export const sparks = (svg, { x, y }, { color = '#ffe28a', count = 8, radius = 22, duration = 380 } = {}) => {
  const group = document.createElementNS(SVG_NS, 'g');
  svg.append(group);
  const animations = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', '0');
    line.setAttribute('y1', '0');
    line.setAttribute('x2', '6');
    line.setAttribute('y2', '0');
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', '2');
    line.setAttribute('stroke-linecap', 'round');
    group.append(line);
    const deg = (angle * 180) / Math.PI;
    const r = radius * (0.6 + Math.random() * 0.6);
    return animate(
      line,
      [
        { transform: `translate(${x}px, ${y}px) rotate(${deg}deg) translateX(2px)`, opacity: 1 },
        { transform: `translate(${x}px, ${y}px) rotate(${deg}deg) translateX(${r}px)`, opacity: 0 },
      ],
      { duration, easing: 'ease-out' },
    );
  });
  return Promise.all(animations).then(() => group.remove());
};

/** Fiery explosion made of expanding circles. */
export const svgExplosion = (svg, { x, y }, { size = 40, duration = 700 } = {}) => {
  const group = document.createElementNS(SVG_NS, 'g');
  const colors = ['#fff6c2', '#ffc94a', '#ff7a1a', '#c2321b'];
  svg.append(group);
  const animations = colors.map((color, i) => {
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', String(x + (Math.random() - 0.5) * size * 0.4));
    circle.setAttribute('cy', String(y + (Math.random() - 0.5) * size * 0.4));
    circle.setAttribute('r', String(size * (1 - i * 0.15)));
    circle.setAttribute('fill', color);
    circle.style.transformBox = 'fill-box';
    circle.style.transformOrigin = 'center';
    group.prepend(circle);
    return animate(
      circle,
      [
        { transform: 'scale(0.1)', opacity: 1 },
        { transform: 'scale(1)', opacity: 0.9, offset: 0.4 },
        { transform: 'scale(1.3)', opacity: 0 },
      ],
      { duration: duration + i * 80, easing: 'ease-out' },
    );
  });
  return Promise.all([sparks(svg, { x, y }, { radius: size * 1.6, count: 12, color: '#ffd56b' }), ...animations]).then(
    () => group.remove(),
  );
};
