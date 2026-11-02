import * as sfx from '../audio.js';
import { animate, blackout, bolt, createSvg, flash, glowFilter, shake, sparks, wait } from './fx.js';

const SLOTS = [
  { x: 80, y: 236, s: 0.95 },
  { x: 150, y: 206, s: 0.62 },
  { x: 218, y: 210, s: 0.68 },
  { x: 285, y: 240, s: 1 },
];
const MUZZLE = { x: -36, y: -67 };
const CHEST = { x: 0, y: -78 };
const PIVOT = { x: 238, y: 322 };
const IDLE_ANGLE = -18;
const DEFLECT_POINT = { x: 178, y: 228 };

const pose = ({ x, y, s }) => `translate(${x}px, ${y}px) scale(${s})`;
const forward = ({ x, y, s }) => ({ x: x + (180 - x) * 0.18, y: y + 22, s: s * 1.22 });
const toGlobal = (slot, point) => ({ x: slot.x + point.x * slot.s, y: slot.y + point.y * slot.s });
const saberTransform = (angle) => `translate(${PIVOT.x}px, ${PIVOT.y}px) rotate(${angle}deg)`;

const trooperMarkup = (index) => `
  <g data-trooper="${index}" style="transform: ${pose(SLOTS[index])}">
    <ellipse cx="0" cy="2" rx="26" ry="5" fill="#000" opacity="0.4"/>
    <g data-body>
      <!-- legs -->
      <rect x="-15" y="-46" width="12" height="40" rx="3" fill="#eef1f5"/>
      <rect x="3" y="-46" width="12" height="40" rx="3" fill="#eef1f5"/>
      <rect x="-15" y="-28" width="12" height="4" fill="#1c1f26"/>
      <rect x="3" y="-28" width="12" height="4" fill="#1c1f26"/>
      <rect x="-16" y="-7" width="14" height="8" rx="2" fill="#1c1f26"/>
      <rect x="2" y="-7" width="14" height="8" rx="2" fill="#1c1f26"/>
      <!-- hips & torso -->
      <rect x="-17" y="-58" width="34" height="14" rx="3" fill="#1c1f26"/>
      <rect x="-18" y="-56" width="36" height="5" rx="2" fill="#dfe3ea"/>
      <rect x="-19" y="-98" width="38" height="42" rx="6" fill="#1c1f26"/>
      <path d="M-16 -96 Q0 -101 16 -96 L13 -76 Q0 -72 -13 -76 Z" fill="#f4f6f9"/>
      <rect x="-9" y="-72" width="18" height="12" rx="3" fill="#e4e8ee"/>
      <path d="M-6 -88 h12" stroke="#9aa3b2" stroke-width="1.5"/>
      <!-- shoulders & arms -->
      <circle cx="-21" cy="-92" r="7" fill="#f4f6f9"/>
      <circle cx="21" cy="-92" r="7" fill="#f4f6f9"/>
      <path d="M-22 -88 L-28 -72 L-14 -66" stroke="#eef1f5" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M22 -88 L20 -70 L4 -64" stroke="#eef1f5" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- blaster -->
      <rect x="-34" y="-71" width="40" height="8" rx="2" fill="#15171c"/>
      <rect x="-12" y="-75" width="12" height="5" rx="1" fill="#2a2e37"/>
      <rect x="-6" y="-64" width="5" height="9" rx="1" fill="#15171c"/>
      <!-- helmet -->
      <path d="M-14 -101 Q-16 -130 0 -131 Q16 -130 14 -101 Q8 -97 0 -97 Q-8 -97 -14 -101 Z" fill="#f7f8fb"/>
      <path d="M-11 -116 Q0 -112 11 -116 L9 -109 Q0 -106 -9 -109 Z" fill="#0e1015"/>
      <path d="M-5 -104 v4 M0 -104 v5 M5 -104 v4" stroke="#8d95a3" stroke-width="1.4"/>
      <path d="M-14 -120 Q0 -124 14 -120" stroke="#c5cbd5" stroke-width="1.5" fill="none"/>
      <circle data-sight-dot cx="${MUZZLE.x}" cy="${MUZZLE.y}" r="2.5" fill="#ff3030" opacity="0"/>
    </g>
  </g>`;

const markup = `
  <defs>
    ${glowFilter('tr-glow', 3)}
    ${glowFilter('tr-glow-soft', 7)}
    <linearGradient id="tr-floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1a1f2b"/><stop offset="1" stop-color="#3a4050"/>
    </linearGradient>
    <linearGradient id="tr-wall-l" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#454c5c"/><stop offset="1" stop-color="#232834"/>
    </linearGradient>
    <linearGradient id="tr-wall-r" x1="1" y1="0" x2="0" y2="0">
      <stop offset="0" stop-color="#454c5c"/><stop offset="1" stop-color="#232834"/>
    </linearGradient>
  </defs>
  <g data-part="world">
    <rect x="-400" y="-400" width="1160" height="1100" fill="#232834"/>
    <polygon points="-300,-185 660,-185 240,74 120,74" fill="#1b202b"/>
    <polygon points="-300,-185 120,74 120,190 -300,575" fill="url(#tr-wall-l)"/>
    <polygon points="660,-185 240,74 240,190 660,575" fill="url(#tr-wall-r)"/>
    <polygon points="-300,575 120,190 240,190 660,575" fill="url(#tr-floor)"/>
    <rect x="120" y="74" width="120" height="116" fill="#11151d"/>
    <rect x="150" y="96" width="60" height="94" fill="#07090d" stroke="#3a4253" stroke-width="3"/>
    <rect x="150" y="96" width="60" height="6" fill="#ffb347" opacity="0.6"/>
    <!-- ceiling lights -->
    <g fill="#cfe6ff" filter="url(#tr-glow)" opacity="0.85">
      <polygon points="150,20 210,20 204,30 156,30"/>
      <polygon points="164,52 196,52 193,58 167,58"/>
    </g>
    <!-- wall details -->
    <g stroke="#5d6578" stroke-width="2" fill="none" opacity="0.7">
      <path d="M30 50 L30 250 M70 74 L70 222 M330 50 L330 250 M290 74 L290 222"/>
      <path d="M0 150 L120 132 M360 150 L240 132"/>
    </g>
    <g fill="#ff5f5f" filter="url(#tr-glow)">
      <rect x="44" y="120" width="10" height="4"/><rect x="306" y="120" width="10" height="4"/>
    </g>
    <path d="M60 300 L150 190 M300 300 L210 190" stroke="#4c5466" stroke-width="2"/>
  </g>
  <g data-part="squad"></g>
  <g data-part="fx"></g>
  <!-- player's laser sword -->
  <g data-part="saber" style="transform: ${saberTransform(IDLE_ANGLE)}">
    <line x1="0" y1="-30" x2="0" y2="-200" stroke="#3aa8ff" stroke-width="12" stroke-linecap="round" filter="url(#tr-glow-soft)"/>
    <line x1="0" y1="-30" x2="0" y2="-200" stroke="#eaf6ff" stroke-width="4.5" stroke-linecap="round"/>
    <rect x="-9" y="-34" width="18" height="60" rx="4" fill="#aeb5c1"/>
    <rect x="-9" y="-18" width="18" height="5" fill="#2b2f37"/>
    <rect x="-9" y="-6" width="18" height="5" fill="#2b2f37"/>
    <rect x="-11" y="-38" width="22" height="8" rx="2" fill="#e3e7ee"/>
  </g>
`;

export const createTroopersScene = (host, { rng = Math.random } = {}) => {
  const svg = createSvg('0 0 360 300', markup, 'scene-troopers');
  host.append(svg);
  const squad = svg.querySelector('[data-part="squad"]');
  const fx = svg.querySelector('[data-part="fx"]');
  const saber = svg.querySelector('[data-part="saber"]');

  let standing = [];
  let active = null;
  let sight = null;
  let sightAnimation = null;

  const idleSaber = saber.animate(
    [{ transform: saberTransform(IDLE_ANGLE) }, { transform: saberTransform(IDLE_ANGLE + 4) }, { transform: saberTransform(IDLE_ANGLE) }],
    { duration: 2600, iterations: Infinity, easing: 'ease-in-out' },
  );

  const spawnSquad = async () => {
    squad.innerHTML = SLOTS.map((_, i) => trooperMarkup(i)).join('');
    standing = SLOTS.map((_, i) => i);
    await Promise.all(
      [...squad.children].map((trooper, i) =>
        animate(trooper, [{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: i * 90, easing: 'ease-out' }),
      ),
    );
  };

  const trooperEl = (index) => squad.querySelector(`[data-trooper="${index}"]`);

  const clearSight = () => {
    sightAnimation?.cancel();
    sightAnimation = null;
    sight?.remove();
    sight = null;
  };

  const ready = spawnSquad();

  const activeSlot = () => forward(SLOTS[active]);

  const fireAtPlayer = (target, width) =>
    bolt(fx, toGlobal(activeSlot(), MUZZLE), target, { filter: 'tr-glow', duration: 260, width, length: 34 });

  return {
    async present() {
      await ready;
      if (standing.length === 0) await spawnSquad();
      active = standing[Math.floor(rng() * standing.length)];
      const trooper = trooperEl(active);
      squad.append(trooper); // bring to front
      sfx.click();
      await animate(trooper, [{ transform: pose(SLOTS[active]) }, { transform: pose(activeSlot()) }], {
        duration: 420,
        easing: 'cubic-bezier(.2,.8,.3,1)',
      });
    },

    threat(durationMs) {
      clearSight();
      const from = toGlobal(activeSlot(), MUZZLE);
      sight = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      sight.setAttribute('x1', String(from.x));
      sight.setAttribute('y1', String(from.y));
      sight.setAttribute('x2', '180');
      sight.setAttribute('y2', '300');
      sight.setAttribute('stroke', '#ff2a2a');
      sight.setAttribute('stroke-width', '1.2');
      sight.setAttribute('stroke-dasharray', '3 5');
      fx.append(sight);
      sightAnimation = durationMs
        ? sight.animate([{ opacity: 0.15 }, { opacity: 0.95, strokeWidth: 2.2 }], { duration: durationMs, fill: 'forwards' })
        : sight.animate([{ opacity: 0.2 }, { opacity: 0.6 }, { opacity: 0.2 }], { duration: 1600, iterations: Infinity });
    },

    async success() {
      clearSight();
      idleSaber.pause();
      sfx.swing();
      const swing = animate(
        saber,
        [{ transform: saberTransform(IDLE_ANGLE) }, { transform: saberTransform(-55) }, { transform: saberTransform(-8) }],
        { duration: 280, easing: 'ease-out' },
      );
      sfx.blaster();
      const [swingAnimation] = await Promise.all([swing, fireAtPlayer(DEFLECT_POINT, 6)]);
      sfx.deflect();
      sparks(fx, DEFLECT_POINT, { color: '#bfe6ff', radius: 34 });
      const slot = activeSlot();
      const chest = toGlobal(slot, CHEST);
      await bolt(fx, DEFLECT_POINT, chest, { filter: 'tr-glow', duration: 200, width: 5, length: 30 });
      sparks(fx, chest, { color: '#ffd28a', radius: 20 * slot.s });
      const trooper = trooperEl(active);
      const body = trooper.querySelector('[data-body]');
      standing = standing.filter((i) => i !== active);
      const falls = animate(body, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-82deg)' }], {
        duration: 520,
        easing: 'cubic-bezier(.5,0,.9,.6)',
      }).then(() => animate(trooper, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 }));
      const back = animate(saber, [{ transform: saberTransform(-8) }, { transform: saberTransform(IDLE_ANGLE) }], {
        duration: 400,
        easing: 'ease-in-out',
      });
      const [, backAnimation] = await Promise.all([falls, back]);
      swingAnimation?.cancel();
      backAnimation?.cancel();
      idleSaber.play();
      if (standing.length === 0) {
        sfx.chime();
        await wait(250);
      }
    },

    async failure() {
      clearSight();
      sfx.blaster();
      await fireAtPlayer({ x: 175, y: 275 }, 10);
      sfx.hit();
      await Promise.all([flash(host), shake(svg, 12, 450)]);
      await blackout(host, 300);
      const trooper = trooperEl(active);
      await animate(trooper, [{ transform: pose(activeSlot()) }, { transform: pose(SLOTS[active]) }], { duration: 300 });
    },

    destroy() {
      clearSight();
      svg.getAnimations?.({ subtree: true }).forEach((a) => a.cancel());
      svg.remove();
    },
  };
};
