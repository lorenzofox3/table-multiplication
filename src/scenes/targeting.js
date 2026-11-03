import * as sfx from '../audio.js';
import { animate, bolt, createSvg, flash, glowFilter, shake, svgExplosion, wait } from './fx.js';

/** Cockpit view with the targeting computer: lock the enemy fighter. */

const SCREEN = { x: 92, y: 150, w: 176, h: 130 };
const CENTER = { x: SCREEN.x + SCREEN.w / 2, y: SCREEN.y + SCREEN.h / 2 };
// enemy fighter seen through the windshield, between the canopy struts
const FIGHTER = { x: 180, y: 70 };
// wing cannons, hidden below the canopy frame
const CANNONS = [
  { x: 40, y: 175 },
  { x: 320, y: 175 },
];

const WOBBLE = [
  [0, 0],
  [-18, -8],
  [14, 6],
  [-6, 10],
  [0, 0],
];
const WOBBLE_MS = 2600;
const SPACE_WOBBLE_SCALE = 1.4;

const hexWing = (cx) =>
  `M${cx} ${FIGHTER.y - 30} l7 10 v40 l-7 10 l-7 -10 v-40 Z`;

const fighter = `
  <g stroke="#aab2c0" stroke-width="1.2" stroke-linejoin="round">
    <rect x="${FIGHTER.x - 26}" y="${FIGHTER.y - 2.5}" width="52" height="5" fill="#5d6574"/>
    <path d="${hexWing(FIGHTER.x - 28)}" fill="#3a404c"/>
    <path d="${hexWing(FIGHTER.x + 28)}" fill="#3a404c"/>
    <path d="M${FIGHTER.x - 28} ${FIGHTER.y - 28} v56 M${FIGHTER.x + 28} ${FIGHTER.y - 28} v56" stroke="#6b7383"/>
    <circle cx="${FIGHTER.x}" cy="${FIGHTER.y}" r="12" fill="#7a8292"/>
    <circle cx="${FIGHTER.x}" cy="${FIGHTER.y}" r="6.5" fill="#141a26"/>
    <path d="M${FIGHTER.x} ${FIGHTER.y - 6.5} v13 M${FIGHTER.x - 6.5} ${FIGHTER.y} h13" stroke="#5d6574" stroke-width="1"/>
  </g>`;

const stars = Array.from({ length: 40 }, (_, i) => {
  const x = (i * 97) % 360;
  const y = (i * 53) % 140;
  return `<circle cx="${x}" cy="${y}" r="${(i % 3) * 0.4 + 0.5}" fill="#fff" opacity="${0.4 + (i % 5) * 0.12}"/>`;
}).join('');

const grid = () => {
  const lines = [];
  const vanishing = { x: CENTER.x, y: SCREEN.y + 26 };
  for (let i = 0; i <= 8; i++) {
    const x = SCREEN.x + (SCREEN.w / 8) * i;
    lines.push(`<line x1="${x}" y1="${SCREEN.y + SCREEN.h}" x2="${vanishing.x}" y2="${vanishing.y}"/>`);
  }
  return lines.join('');
};

const markup = `
  <defs>
    ${glowFilter('tg-glow', 2)}
    <clipPath id="tg-screen-clip"><rect x="${SCREEN.x}" y="${SCREEN.y}" width="${SCREEN.w}" height="${SCREEN.h}" rx="10"/></clipPath>
    <linearGradient id="tg-dash" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3b4150"/><stop offset="1" stop-color="#171a22"/>
    </linearGradient>
  </defs>
  <g data-part="cockpit">
    <rect x="-400" y="-400" width="1160" height="1100" fill="#02030a"/>
    <g data-part="space">
      <g data-part="stars">${stars}</g>
      <g data-part="fighter-approach" style="transform-box: view-box; transform-origin: ${FIGHTER.x}px ${FIGHTER.y}px">
        <g data-part="fighter">${fighter}</g>
      </g>
      <g data-part="space-shots"></g>
    </g>
    <!-- canopy struts -->
    <path d="M-400 -400 L-10 -400 L70 0 L130 140 L-400 190 Z" fill="#20242e"/>
    <path d="M760 -400 L370 -400 L290 0 L230 140 L760 190 Z" fill="#20242e"/>
    <path d="M70 0 L130 140 M290 0 L230 140" stroke="#4b5263" stroke-width="3"/>
    <!-- dashboard -->
    <path d="M-400 175 L0 150 Q180 118 360 150 L760 175 L760 700 L-400 700 Z" fill="url(#tg-dash)"/>
    <g data-part="lights">
      <circle cx="40" cy="200" r="5" fill="#ffb347"/><circle cx="58" cy="206" r="5" fill="#45d483"/>
      <circle cx="320" cy="200" r="5" fill="#ff5f5f"/><circle cx="302" cy="206" r="5" fill="#45d483"/>
      <rect x="28" y="230" width="44" height="26" rx="4" fill="#0c1a12" stroke="#2e3644"/>
      <rect x="288" y="230" width="44" height="26" rx="4" fill="#0c1a12" stroke="#2e3644"/>
    </g>
    <!-- targeting screen -->
    <rect x="${SCREEN.x - 8}" y="${SCREEN.y - 8}" width="${SCREEN.w + 16}" height="${SCREEN.h + 16}" rx="14" fill="#11141a" stroke="#4b5263" stroke-width="2"/>
    <g clip-path="url(#tg-screen-clip)">
      <rect x="${SCREEN.x}" y="${SCREEN.y}" width="${SCREEN.w}" height="${SCREEN.h}" fill="#03140b"/>
      <g stroke="#2aff7a" stroke-width="1" opacity="0.35">${grid()}</g>
      <g data-part="rungs" stroke="#2aff7a" stroke-width="1" opacity="0.35"></g>
      <g data-part="enemy" filter="url(#tg-glow)" stroke="#5dff9a" stroke-width="2" fill="none">
        <circle cx="${CENTER.x}" cy="${CENTER.y}" r="7"/>
        <circle cx="${CENTER.x}" cy="${CENTER.y}" r="3" fill="#5dff9a"/>
        <path d="M${CENTER.x - 7} ${CENTER.y} h-9 M${CENTER.x + 7} ${CENTER.y} h9"/>
        <path d="M${CENTER.x - 16} ${CENTER.y - 16} l-4 8 v16 l4 8 M${CENTER.x - 16} ${CENTER.y - 16} v32"/>
        <path d="M${CENTER.x + 16} ${CENTER.y - 16} l4 8 v16 l-4 8 M${CENTER.x + 16} ${CENTER.y - 16} v32"/>
      </g>
      <g data-part="reticle" stroke="#ffe066" stroke-width="1.5" fill="none" filter="url(#tg-glow)">
        <circle cx="${CENTER.x}" cy="${CENTER.y}" r="30" stroke-dasharray="10 6"/>
        <path d="M${CENTER.x - 44} ${CENTER.y} h20 M${CENTER.x + 24} ${CENTER.y} h20 M${CENTER.x} ${CENTER.y - 44} v20 M${CENTER.x} ${CENTER.y + 24} v20"/>
      </g>
      <g data-part="static" opacity="0"></g>
    </g>
    <!-- lock bar -->
    <rect x="${SCREEN.x}" y="${SCREEN.y + SCREEN.h + 14}" width="${SCREEN.w}" height="7" rx="3.5" fill="#0c1a12" stroke="#2e3644"/>
    <rect data-part="lock" x="${SCREEN.x}" y="${SCREEN.y + SCREEN.h + 14}" width="${SCREEN.w}" height="7" rx="3.5" fill="#2aff7a" style="transform-box: fill-box; transform-origin: left; transform: scaleX(0)"/>
  </g>
`;

export const createTargeting = (host) => {
  const svg = createSvg('0 0 360 300', markup, 'scene-targeting');
  host.append(svg);
  const part = (name) => svg.querySelector(`[data-part="${name}"]`);
  const enemy = part('enemy');
  const reticle = part('reticle');
  const lock = part('lock');
  const rungs = part('rungs');
  const cockpit = part('cockpit');
  const fighterShip = part('fighter');
  const fighterApproach = part('fighter-approach');
  const spaceShots = part('space-shots');

  let wobble = null;
  let fighterWobble = null;
  let lockAnimation = null;
  let reticleSpin = null;

  // trench rungs scrolling towards the pilot
  const rungAnimations = Array.from({ length: 4 }, (_, i) => {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(SCREEN.x));
    line.setAttribute('x2', String(SCREEN.x + SCREEN.w));
    line.setAttribute('y1', '0');
    line.setAttribute('y2', '0');
    rungs.append(line);
    return line.animate(
      [
        { transform: `translateY(${SCREEN.y + 30}px) scaleX(0.2)`, opacity: 0 },
        { transform: `translateY(${SCREEN.y + SCREEN.h}px) scaleX(1)`, opacity: 1 },
      ],
      { duration: 1600, delay: i * 400, iterations: Infinity, easing: 'ease-in' },
    );
  });
  rungs.querySelectorAll('line').forEach((l) => {
    l.style.transformBox = 'view-box';
    l.style.transformOrigin = `${CENTER.x}px 0`;
  });

  const startWobble = () => {
    wobble?.cancel();
    fighterWobble?.cancel();
    enemy.style.opacity = '1';
    fighterShip.style.opacity = '1';
    fighterShip.style.transform = '';
    const options = { duration: WOBBLE_MS, iterations: Infinity, easing: 'ease-in-out' };
    wobble = enemy.animate(
      WOBBLE.map(([x, y]) => ({ transform: `translate(${x}px, ${y}px)` })),
      options,
    );
    // the fighter seen through the windshield moves in sync with its blip on the targeting screen
    fighterWobble = fighterShip.animate(
      WOBBLE.map(([x, y]) => ({
        transform: `translate(${x * SPACE_WOBBLE_SCALE}px, ${y * SPACE_WOBBLE_SCALE}px) rotate(${-x * 0.4}deg)`,
      })),
      options,
    );
    fighterShip.style.transformBox = 'view-box';
    fighterShip.style.transformOrigin = `${FIGHTER.x}px ${FIGHTER.y}px`;
  };

  /** Freezes a wobbling element where it is and returns its current offset. */
  const freeze = (element, animation) => {
    animation?.pause();
    const current = getComputedStyle(element).transform;
    animation?.cancel();
    element.style.transform = current === 'none' ? '' : current;
    return new DOMMatrix(current === 'none' ? undefined : current);
  };

  const stopLock = () => {
    lockAnimation?.cancel();
    lockAnimation = null;
    reticleSpin?.cancel();
    reticleSpin = null;
  };

  // lasers fired from the wing cannons, travelling out into space towards the fighter
  const volley = (target) =>
    Promise.all(
      CANNONS.map((from) =>
        bolt(spaceShots, from, target, { color: '#ff4040', length: 34, width: 5, duration: 240, filter: 'tg-glow' }),
      ),
    );

  startWobble();

  return {
    show() {
      rungAnimations.forEach((a) => a.play());
      svg.style.display = '';
    },
    hide() {
      rungAnimations.forEach((a) => a.pause());
      svg.style.display = 'none';
    },

    present() {
      startWobble();
      fighterApproach.animate([{ transform: 'scale(0.15)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], {
        duration: 900,
        easing: 'ease-out',
      });
      lock.style.transform = 'scaleX(0)';
      reticle.setAttribute('stroke', '#ffe066');
    },

    threat(durationMs) {
      stopLock();
      reticleSpin = reticle.animate([{ opacity: 1 }, { opacity: 0.55 }, { opacity: 1 }], { duration: 900, iterations: Infinity });
      lockAnimation = durationMs
        ? lock.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)', fill: '#ff6b4a' }], {
            duration: durationMs,
            fill: 'forwards',
          })
        : lock.animate([{ transform: 'scaleX(0.1)' }, { transform: 'scaleX(0.6)' }, { transform: 'scaleX(0.1)' }], {
            duration: 2400,
            iterations: Infinity,
          });
    },

    async success() {
      stopLock();
      const blip = freeze(enemy, wobble);
      const ship = freeze(fighterShip, fighterWobble);
      // reticle snaps to the target
      reticle.setAttribute('stroke', '#ff4a3d');
      sfx.lockOn();
      await animate(lock, [{ transform: 'scaleX(1)', fill: '#ffe066' }], { duration: 200 });
      await wait(150);
      const target = { x: FIGHTER.x + ship.e, y: FIGHTER.y + ship.f };
      sfx.blaster();
      await volley(target);
      sfx.explosion();
      fighterShip.style.opacity = '0';
      enemy.style.opacity = '0';
      await Promise.all([
        svgExplosion(spaceShots, target, { size: 34 }),
        svgExplosion(svg, { x: CENTER.x + blip.e, y: CENTER.y + blip.f }, { size: 26 }),
      ]);
      enemy.style.transform = '';
      fighterShip.style.transform = '';
      await wait(200);
    },

    async failure() {
      stopLock();
      sfx.blaster();
      sfx.hit();
      await Promise.all([flash(host), shake(cockpit, 10, 500)]);
      await wait(200);
    },

    destroy() {
      stopLock();
      svg.getAnimations?.({ subtree: true }).forEach((a) => a.cancel());
      svg.remove();
    },
  };
};
