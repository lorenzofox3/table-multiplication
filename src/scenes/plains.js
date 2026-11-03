import * as sfx from '../audio.js';
import { animate, blackout, bolt, createSvg, flash, glowFilter, prefersReducedMotion, shake, sparks, SVG_NS, wait } from './fx.js';

/** Where the four droids of a wave stand (feet position and depth scale), same layout as the trooper squad. */
export const SLOTS = [
  { x: 80, y: 236, s: 0.95 },
  { x: 150, y: 206, s: 0.62 },
  { x: 218, y: 210, s: 0.68 },
  { x: 285, y: 240, s: 1 },
];
const MUZZLE = { x: -50, y: -76 }; // with the rifle raised
const CHEST = { x: 0, y: -86 };
const ARMS_PIVOT = { x: 0, y: -94 };
const LOWERED = -35;
const HORIZON_Y = 160;

const ARM_PIVOT = { x: 272, y: 362 };
const BALL = { x: -22, y: -112 };
const BALL_R = 15;
const HAND_TARGET = { x: 238, y: 262 };

/** Droids on the left half are mirrored so every rifle points toward the player. */
export const facing = (slot) => (slot.x < 180 ? -1 : 1);
const pose = (slot, dir = facing(slot)) => `translate(${slot.x}px, ${slot.y}px) scale(${dir * slot.s}, ${slot.s})`;
const forward = ({ x, y, s }) => ({ x: x + (180 - x) * 0.18, y: y + 22, s: s * 1.22 });
const toGlobal = (slot, point, dir = facing(slot)) => ({ x: slot.x + point.x * slot.s * dir, y: slot.y + point.y * slot.s });
/** Rifle muzzle in scene coordinates for a droid standing at `slot`. */
export const muzzleAt = (slot) => toGlobal(slot, MUZZLE);

const armsTransform = (angle) =>
  `translate(${ARMS_PIVOT.x}px, ${ARMS_PIVOT.y}px) rotate(${angle}deg) translate(${-ARMS_PIVOT.x}px, ${-ARMS_PIVOT.y}px)`;
const armTransform = (angle) => `translate(${ARM_PIVOT.x}px, ${ARM_PIVOT.y}px) rotate(${angle}deg)`;
/** Centre of the ball held in the hand, in scene coordinates, for a given arm angle. */
const ballAt = (angle) => {
  const r = (angle * Math.PI) / 180;
  return {
    x: ARM_PIVOT.x + BALL.x * Math.cos(r) - BALL.y * Math.sin(r),
    y: ARM_PIVOT.y + BALL.x * Math.sin(r) + BALL.y * Math.cos(r),
  };
};

const ballMarkup = (cx = 0, cy = 0) => `
  <circle cx="${cx}" cy="${cy}" r="${BALL_R + 5}" fill="#5dffd0" opacity="0.35" filter="url(#pl-glow-soft)"/>
  <circle cx="${cx}" cy="${cy}" r="${BALL_R}" fill="url(#pl-ball)"/>
  <path d="M${cx - 9} ${cy - 2} q4 -6 8 0 t8 0 M${cx - 6} ${cy + 6} q4 -5 7 0 t6 -1" stroke="#eafff8" stroke-width="1.4" fill="none" opacity="0.8"/>`;

const droidMarkup = (index) => `
  <g data-droid="${index}" style="transform: ${pose(SLOTS[index])}">
    <ellipse cx="0" cy="2" rx="22" ry="4.5" fill="#000" opacity="0.3"/>
    <g data-body>
      <path d="M-5 -60 L-11 -32 L-6 -6 M5 -60 L11 -32 L7 -6" stroke="#c9ad74" stroke-width="5" fill="none"
        stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="-11" cy="-32" r="3.5" fill="#6e5a3a"/><circle cx="11" cy="-32" r="3.5" fill="#6e5a3a"/>
      <rect x="-14" y="-7" width="12" height="5" rx="2" fill="#a88d5a"/>
      <rect x="3" y="-7" width="12" height="5" rx="2" fill="#a88d5a"/>
      <rect x="-9" y="-66" width="18" height="8" rx="3" fill="#a88d5a"/>
      <line x1="0" y1="-66" x2="0" y2="-72" stroke="#6e5a3a" stroke-width="4"/>
      <rect x="8" y="-98" width="8" height="22" rx="2" fill="#a88d5a"/>
      <path d="M-13 -100 L13 -100 L9 -71 L-9 -71 Z" fill="#d9c08a"/>
      <path d="M-10 -92 h20 M-9 -85 h18 M-8 -78 h16" stroke="#a88d5a" stroke-width="2"/>
      <line x1="0" y1="-100" x2="0" y2="-107" stroke="#6e5a3a" stroke-width="3"/>
      <g data-arms style="transform: ${armsTransform(LOWERED)}">
        <path d="M10 -96 L14 -82 L2 -76" stroke="#c9ad74" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="-46" y="-79" width="48" height="6" rx="2" fill="#3b3f46"/>
        <rect x="-52" y="-78" width="7" height="4" fill="#23262b"/>
        <rect x="-26" y="-83" width="11" height="4" rx="1" fill="#555b66"/>
        <path d="M-10 -96 L-20 -84 L-28 -78" stroke="#c9ad74" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
    </g>
    <g data-head>
      <line x1="3" y1="-124" x2="7" y2="-138" stroke="#6e5a3a" stroke-width="1.6"/>
      <circle cx="7" cy="-139" r="1.9" fill="#ff7a5a"/>
      <circle cx="0" cy="-116" r="10" fill="#d9c08a" stroke="#a88d5a" stroke-width="1.5"/>
      <path d="M-9 -112 Q0 -108 9 -112" stroke="#a88d5a" stroke-width="1.5" fill="none"/>
      <circle data-eye-glow cx="-5" cy="-117" r="7" fill="#ff3a2a" opacity="0" filter="url(#pl-glow)"/>
      <circle cx="-5" cy="-117" r="3.6" fill="#2a1512"/>
      <circle data-eye cx="-5" cy="-117" r="2.6" fill="#ff3a2a"/>
    </g>
  </g>`;

const reed = (x, h, lean, color) =>
  `<path d="M${x} 305 Q${x + lean * 0.3} ${305 - h * 0.6} ${x + lean} ${305 - h}" stroke="${color}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
const cattail = (x, h, lean) =>
  `<ellipse cx="${x + lean}" cy="${305 - h + 6}" rx="3" ry="8" fill="#6b4a2b" transform="rotate(${lean} ${x + lean} ${305 - h + 6})"/>`;

const markup = `
  <defs>
    ${glowFilter('pl-glow', 3)}
    ${glowFilter('pl-glow-soft', 7)}
    <linearGradient id="pl-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4f9fdc"/><stop offset="0.75" stop-color="#a9dcf3"/><stop offset="1" stop-color="#e3f4f2"/>
    </linearGradient>
    <linearGradient id="pl-ground" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6fb556"/><stop offset="0.35" stop-color="#4d9a43"/><stop offset="1" stop-color="#2f6f2e"/>
    </linearGradient>
    <radialGradient id="pl-ball" cx="0.4" cy="0.38" r="0.65">
      <stop offset="0" stop-color="#ffffff"/><stop offset="0.35" stop-color="#9dffe2"/>
      <stop offset="0.8" stop-color="#22c9a6"/><stop offset="1" stop-color="#0f8a78"/>
    </radialGradient>
    <linearGradient id="pl-skin" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#3f9a8c"/><stop offset="1" stop-color="#2a7469"/>
    </linearGradient>
  </defs>
  <g data-part="world">
    <rect x="-400" y="-400" width="1160" height="580" fill="url(#pl-sky)"/>
    <g fill="#ffffff" opacity="0.8">
      <ellipse cx="60" cy="48" rx="34" ry="9"/><ellipse cx="82" cy="42" rx="20" ry="9"/>
      <ellipse cx="280" cy="70" rx="40" ry="8"/><ellipse cx="300" cy="64" rx="18" ry="8"/>
    </g>
    <!-- energy shield overhead -->
    <g data-part="shield">
      <path d="M-140 185 Q180 -170 500 185 Z" fill="#8fdcff" opacity="0.07"/>
      <path d="M-140 185 Q180 -170 500 185" stroke="#a8e6ff" stroke-width="3" fill="none" opacity="0.55" filter="url(#pl-glow)"/>
      <path d="M-110 185 Q180 -138 470 185" stroke="#d6f4ff" stroke-width="1" fill="none" opacity="0.4"/>
    </g>
    <!-- distant hills and a domed city -->
    <path d="M-400 158 Q-200 120 0 150 Q90 128 180 146 Q280 118 380 142 Q560 130 760 150 L760 400 L-400 400 Z" fill="#7fb58a"/>
    <g fill="#c9d8c2">
      <rect x="292" y="122" width="34" height="12"/><path d="M296 123 a13 13 0 0 1 26 0 Z"/>
      <rect x="318" y="116" width="5" height="16"/><path d="M286 131 a6 6 0 0 1 12 0 Z"/>
    </g>
    <path d="M-400 175 Q-150 150 40 166 Q130 148 230 162 Q330 150 420 166 Q600 156 760 172 L760 700 L-400 700 Z" fill="#5ea660"/>
    <rect x="-400" y="${HORIZON_Y + 12}" width="1160" height="600" fill="url(#pl-ground)"/>
    <!-- grass tufts -->
    <g stroke="#3f8a3a" stroke-width="1.5" fill="none" opacity="0.8">
      <path d="M120 200 l-3 -7 M123 200 l1 -8 M126 200 l4 -6"/><path d="M250 196 l-3 -6 M253 196 l1 -7 M256 196 l3 -5"/>
      <path d="M190 228 l-3 -8 M193 228 l1 -9 M196 228 l4 -7"/><path d="M40 262 l-4 -9 M44 262 l1 -10 M48 262 l5 -8"/>
      <path d="M330 270 l-4 -9 M334 270 l1 -10 M338 270 l5 -8"/>
    </g>
    <!-- mossy ruins -->
    <g>
      <rect x="14" y="128" width="24" height="98" fill="#b9b39e"/>
      <path d="M14 128 l6 -10 l6 6 l5 -9 l7 13 Z" fill="#b9b39e"/>
      <path d="M14 150 h24 M14 185 h24" stroke="#8f8a76" stroke-width="2"/>
      <path d="M12 130 q6 -8 14 -2 q8 -6 14 2 l0 6 q-14 -4 -28 0 Z" fill="#6f9d4a"/>
      <rect x="40" y="212" width="30" height="14" rx="2" fill="#a8a28c" transform="rotate(-8 55 219)"/>
      <path d="M318 236 V150 a22 22 0 0 1 44 0 V236 h-10 V156 a12 12 0 0 0 -24 0 V236 Z" fill="#b9b39e"/>
      <path d="M318 150 a22 22 0 0 1 22 -22 q4 6 -4 10 q-10 2 -18 12 Z" fill="#6f9d4a"/>
    </g>
  </g>
  <g data-part="squad"></g>
  <g data-part="front">
    ${[
      [6, 70, -6, '#3f7d3a'], [16, 88, 4, '#5a9a44'], [26, 62, 10, '#3f7d3a'], [38, 78, -4, '#4d8c3f'],
      [50, 54, 8, '#5a9a44'], [60, 40, 12, '#3f7d3a'],
    ].map(([x, h, lean, color]) => reed(x, h, lean, color)).join('')}
    ${cattail(16, 88, 4)}${cattail(38, 78, -4)}
  </g>
  <g data-part="fx"></g>
  <!-- the player's webbed hand holding an energy ball -->
  <g data-part="arm" style="transform: ${armTransform(0)}">
    <path d="M-16 20 L-26 -96 L-2 -96 L18 20 Z" fill="url(#pl-skin)"/>
    <path d="M-20 -40 L-4 -40 L-3 -70 L-23 -70 Z" fill="#7a5530"/>
    <path d="M-20 -46 h16 M-21 -58 h17" stroke="#5a3d22" stroke-width="2"/>
    <g fill="#2e7f72" opacity="0.6">
      <circle cx="-12" cy="-20" r="3"/><circle cx="-4" cy="-6" r="2.4"/><circle cx="-16" cy="-84" r="2.2"/>
    </g>
    <g data-ball style="transform-box: fill-box; transform-origin: center">${ballMarkup(BALL.x, BALL.y)}</g>
    <ellipse cx="-14" cy="-98" rx="15" ry="9" fill="#3f9a8c"/>
    <!-- webbed fingers curling around the ball -->
    <path d="M-28 -98 Q-40 -108 -36 -122 L-30 -112 Q-26 -104 -22 -100 Z" fill="#4fb0a0" opacity="0.85"/>
    <path d="M-27 -99 Q-38 -108 -36 -122" stroke="#3f9a8c" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M-20 -101 Q-26 -114 -24 -126" stroke="#3f9a8c" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M-2 -100 Q2 -110 -4 -120" stroke="#3f9a8c" stroke-width="6" fill="none" stroke-linecap="round"/>
  </g>
`;

/** Forked electric arcs flickering around a point. */
const crackle = (layer, { x, y }, size, color = '#9dffe2') => {
  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('filter', 'url(#pl-glow)');
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 + Math.random();
    const points = [[x, y]];
    for (let step = 1; step <= 4; step++) {
      const r = (size * step) / 4;
      const jitter = (Math.random() - 0.5) * size * 0.5;
      points.push([x + Math.cos(angle) * r - Math.sin(angle) * jitter, y + Math.sin(angle) * r + Math.cos(angle) * jitter]);
    }
    const line = document.createElementNS(SVG_NS, 'polyline');
    line.setAttribute('points', points.map((p) => p.join(',')).join(' '));
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', '1.8');
    line.setAttribute('fill', 'none');
    group.append(line);
  }
  layer.append(group);
  return animate(group, [{ opacity: 1 }, { opacity: 0.3 }, { opacity: 1 }, { opacity: 0.4 }, { opacity: 0.9 }, { opacity: 0 }], {
    duration: 520,
    easing: 'linear',
  }).then(() => group.remove());
};

/** A soft glowing disc that swells and fades (reduced-motion stand-in for arcs and pops). */
const glow = (layer, { x, y }, r, color) => {
  const circle = document.createElementNS(SVG_NS, 'circle');
  circle.setAttribute('cx', String(x));
  circle.setAttribute('cy', String(y));
  circle.setAttribute('r', String(r));
  circle.setAttribute('fill', color);
  circle.setAttribute('filter', 'url(#pl-glow-soft)');
  layer.append(circle);
  return animate(circle, [{ opacity: 0 }, { opacity: 0.7 }, { opacity: 0 }], { duration: 700, easing: 'ease-in-out' }).then(() =>
    circle.remove(),
  );
};

const flyingBall = (layer, at) => {
  const group = document.createElementNS(SVG_NS, 'g');
  group.innerHTML = ballMarkup();
  group.style.transform = `translate(${at.x}px, ${at.y}px)`;
  layer.append(group);
  return group;
};

/**
 * Advanced-mode world: droids line up on a grassy plain under an energy shield; the player throws energy balls.
 * @param {HTMLElement} host
 * @param {{ rng?: () => number, remaining?: number }} [options] `remaining` starts with fewer droids standing (debug only).
 */
export const createPlainsScene = (host, { rng = Math.random, remaining = SLOTS.length } = {}) => {
  const svg = createSvg('0 0 360 300', markup, 'scene-plains');
  host.append(svg);
  const squad = svg.querySelector('[data-part="squad"]');
  const fx = svg.querySelector('[data-part="fx"]');
  const arm = svg.querySelector('[data-part="arm"]');
  const ball = arm.querySelector('[data-ball]');
  const reduced = prefersReducedMotion();

  let alive = true;
  let standing = [];
  let active = null;
  let sight = null;
  let threatAnimations = [];
  const timers = new Set();
  const later = (ms, fn) => {
    const id = setTimeout(() => {
      timers.delete(id);
      if (alive) fn();
    }, ms);
    timers.add(id);
  };

  const idleArm = reduced
    ? null
    : arm.animate([{ transform: armTransform(0) }, { transform: armTransform(3) }, { transform: armTransform(0) }], {
        duration: 2600,
        iterations: Infinity,
        easing: 'ease-in-out',
      });
  if (!reduced) {
    ball.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }], {
      duration: 1200,
      iterations: Infinity,
      easing: 'ease-in-out',
    });
  }
  if (!reduced) {
    svg.querySelector('[data-part="shield"]').animate([{ opacity: 0.75 }, { opacity: 1 }, { opacity: 0.75 }], {
      duration: 4000,
      iterations: Infinity,
      easing: 'ease-in-out',
    });
  }

  const droidEl = (index) => squad.querySelector(`[data-droid="${index}"]`);
  const activeSlot = () => forward(SLOTS[active]);
  const activeDir = () => facing(SLOTS[active]);

  /** Places a new wave. On the first wave (or under reduced motion) droids fade in; later waves march over the hill. */
  const spawnWave = async (count, march) => {
    const indexes = SLOTS.map((_, i) => i).slice(SLOTS.length - count);
    squad.innerHTML = indexes.map(droidMarkup).join('');
    standing = indexes;
    if (!march || reduced) {
      await Promise.all(
        indexes.map((index, i) =>
          animate(droidEl(index), [{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: i * 90, easing: 'ease-out', fill: 'both' }),
        ),
      );
      return;
    }
    const duration = 1500;
    const steps = 8;
    for (let i = 0; i < steps; i++) later((i * duration) / steps + 120, () => sfx.clank());
    await Promise.all(
      indexes.map((index, i) => {
        const to = SLOTS[index];
        const from = { x: 180 + (to.x - 180) * 0.55, y: HORIZON_Y + 4, s: to.s * 0.38 };
        const frames = Array.from({ length: steps + 1 }, (_, step) => {
          const k = step / steps;
          const at = { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k, s: from.s + (to.s - from.s) * k };
          const bob = step % 2 ? -3 * at.s : 0;
          return { transform: pose({ ...at, y: at.y + bob }, facing(to)), opacity: step === 0 ? 0 : 1 };
        });
        return animate(droidEl(index), frames, { duration, delay: i * 140, easing: 'linear', fill: 'both' });
      }),
    );
  };

  let ready = spawnWave(Math.max(1, Math.min(SLOTS.length, remaining)), false);

  const clearThreat = () => {
    threatAnimations.forEach((a) => a.cancel());
    threatAnimations = [];
    sight?.remove();
    sight = null;
  };

  const raiseArms = (droid, from, to, duration) =>
    animate(droid.querySelector('[data-arms]'), [{ transform: armsTransform(from) }, { transform: armsTransform(to) }], {
      duration,
      easing: 'ease-out',
    });

  /** New ball fizzing into the hand. */
  const regrowBall = async () => {
    sfx.fizz();
    ball.style.opacity = '1';
    sparks(fx, ballAt(0), { color: '#9dffe2', radius: 18, count: 6 });
    await animate(ball, [{ transform: 'scale(0.1)' }, { transform: 'scale(1.15)', offset: 0.7 }, { transform: 'scale(1)' }], {
      duration: 380,
      easing: 'ease-out',
      fill: 'none',
    });
  };

  const rotateArm = (frames, duration, easing = 'ease-out') =>
    animate(
      arm,
      frames.map((angle) => ({ transform: armTransform(angle) })),
      { duration, easing },
    );

  return {
    async present() {
      await ready;
      if (standing.length === 0) {
        ready = spawnWave(SLOTS.length, true);
        await ready;
      }
      active = standing[Math.floor(rng() * standing.length)];
      const droid = droidEl(active);
      squad.append(droid); // bring to front
      sfx.click();
      await Promise.all([
        animate(droid, [{ transform: pose(SLOTS[active]) }, { transform: pose(activeSlot(), activeDir()) }], {
          duration: 420,
          easing: 'cubic-bezier(.2,.8,.3,1)',
        }),
        raiseArms(droid, LOWERED, 0, 420),
      ]);
    },

    threat(durationMs) {
      clearThreat();
      const from = toGlobal(activeSlot(), MUZZLE, activeDir());
      sight = document.createElementNS(SVG_NS, 'line');
      sight.setAttribute('x1', String(from.x));
      sight.setAttribute('y1', String(from.y));
      sight.setAttribute('x2', '180');
      sight.setAttribute('y2', '300');
      sight.setAttribute('stroke', '#ff2a2a');
      sight.setAttribute('stroke-width', '1.2');
      sight.setAttribute('stroke-dasharray', '3 5');
      fx.append(sight);
      const eye = droidEl(active).querySelector('[data-eye-glow]');
      threatAnimations = durationMs
        ? [
            sight.animate([{ opacity: 0.15 }, { opacity: 0.95, strokeWidth: 2.2 }], { duration: durationMs, fill: 'forwards' }),
            eye.animate([{ opacity: 0.1 }, { opacity: 1 }], { duration: durationMs, fill: 'forwards' }),
          ]
        : [
            sight.animate([{ opacity: 0.2 }, { opacity: 0.6 }, { opacity: 0.2 }], { duration: 1600, iterations: Infinity }),
            eye.animate([{ opacity: 0.2 }, { opacity: 0.7 }, { opacity: 0.2 }], { duration: 1600, iterations: Infinity }),
          ];
    },

    async success() {
      clearThreat();
      idleArm?.pause();
      const slot = activeSlot();
      const dir = activeDir();
      const chest = toGlobal(slot, CHEST, dir);
      const droid = droidEl(active);
      standing = standing.filter((i) => i !== active);

      // wind up and throw
      await rotateArm([0, 24], 170, 'ease-in');
      sfx.toss();
      await rotateArm([24, -30], 130, 'ease-in');
      const release = ballAt(-30);
      ball.style.opacity = '0';
      const back = rotateArm([-30, 0], 380, 'ease-in-out');
      const thrown = flyingBall(fx, release);
      const lift = Math.min(release.y, chest.y) - 34;
      await animate(
        thrown,
        [
          { transform: `translate(${release.x}px, ${release.y}px) scale(1)` },
          { transform: `translate(${(release.x + chest.x) / 2}px, ${lift}px) scale(${0.5 + slot.s * 0.35})`, offset: 0.5 },
          { transform: `translate(${chest.x}px, ${chest.y}px) scale(${slot.s * 0.55})` },
        ],
        { duration: 360, easing: 'linear' },
      );
      thrown.remove();

      // electric burst
      sfx.zap();
      const body = droid.querySelector('[data-body]');
      const head = droid.querySelector('[data-head]');
      if (reduced) {
        await glow(fx, chest, 34 * slot.s, '#7dffd8');
        await animate(droid, [{ opacity: 1 }, { opacity: 0 }], { duration: 400 });
      } else {
        sparks(fx, chest, { color: '#9dffe2', radius: 30 * slot.s, count: 10 });
        await Promise.all([
          crackle(fx, chest, 40 * slot.s),
          animate(
            body,
            [0, 2, -2, 2, -1.5, 1.5, -1, 0].map((dx, i) => ({ transform: `translate(${dx}px, ${i % 2 ? -1 : 0}px)` })),
            { duration: 480, easing: 'linear', fill: 'none' },
          ),
        ]);
        // head pops off, body folds into a heap
        sfx.boing();
        head.style.transformBox = 'fill-box';
        head.style.transformOrigin = 'center';
        const popHead = animate(
          head,
          [
            { transform: 'translate(0px, 0px) rotate(0deg)' },
            { transform: 'translate(10px, -46px) rotate(200deg)', offset: 0.4, easing: 'ease-in' },
            { transform: 'translate(22px, 104px) rotate(420deg)', offset: 0.85, easing: 'ease-out' },
            { transform: 'translate(25px, 96px) rotate(440deg)', offset: 0.93 },
            { transform: 'translate(26px, 104px) rotate(450deg)' },
          ],
          { duration: 820 },
        );
        const fold = animate(
          body,
          [
            { transform: 'rotate(0deg) scale(1, 1)' },
            { transform: 'rotate(10deg) scale(1.05, 0.55)', offset: 0.5 },
            { transform: 'rotate(18deg) scale(1.15, 0.28)' },
          ],
          { duration: 520, delay: 120, easing: 'cubic-bezier(.5,0,.9,.6)' },
        );
        await Promise.all([popHead, fold, back]);
        await animate(droid, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, delay: 150 });
      }
      await back;
      droid.remove();
      arm.getAnimations().forEach((a) => a !== idleArm && a.cancel());
      idleArm?.play();
      await regrowBall();
      if (standing.length === 0) {
        sfx.chime();
        await wait(250);
      }
    },

    async failure() {
      clearThreat();
      const slot = activeSlot();
      const dir = activeDir();
      const droid = droidEl(active);
      sfx.droidBlaster();
      await bolt(fx, toGlobal(slot, MUZZLE, dir), HAND_TARGET, { filter: 'pl-glow', duration: 240, width: 6, length: 30 });
      sfx.hit();
      idleArm?.pause();
      sparks(fx, HAND_TARGET, { color: '#ffb08a', radius: 22 });

      // the ball slips out of the jerked hand and fizzles in the grass
      const dropFrom = ballAt(14);
      ball.style.opacity = '0';
      const dropped = flyingBall(fx, dropFrom);
      const drop = animate(
        dropped,
        [
          { transform: `translate(${dropFrom.x}px, ${dropFrom.y}px) scale(1)`, opacity: 1 },
          { transform: `translate(${dropFrom.x - 18}px, 318px) scale(0.8)`, opacity: 0.6 },
        ],
        { duration: 420, easing: 'ease-in' },
      ).then(() => dropped.remove());
      const jerk = rotateArm([0, 14, 6], 260);
      await Promise.all([drop, jerk, flash(host), shake(svg, 12, 450)]);
      await blackout(host, 300);
      arm.getAnimations().forEach((a) => a !== idleArm && a.cancel());
      idleArm?.play();
      ball.style.opacity = '1';
      await Promise.all([
        animate(droid, [{ transform: pose(slot, dir) }, { transform: pose(SLOTS[active]) }], { duration: 300 }),
        raiseArms(droid, 0, LOWERED, 300),
      ]);
    },

    destroy() {
      alive = false;
      timers.forEach(clearTimeout);
      clearThreat();
      svg.getAnimations?.({ subtree: true }).forEach((a) => a.cancel());
      svg.remove();
    },
  };
};
