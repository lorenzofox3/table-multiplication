import * as sfx from '../audio.js';
import { ROUND_LENGTH } from '../game/round.js';
import {
  SVG_NS,
  animate,
  bolt,
  createSvg,
  flash,
  glowFilter,
  prefersReducedMotion,
  settle,
  shake,
  sparks,
  svgExplosion,
  wait,
} from './fx.js';

/**
 * Padawan "pod race" scene, seen from the cockpit. The track crosses four zones (desert, cave, canyon,
 * arrival) by question number. Each zone has its own hazard: a correct answer dodges it, a miss gets hit.
 * Damage marks and a smoke trail build up over the round; 10/10 ends with fireworks and a trophy.
 */

/** Zones in track order, with how many questions are asked in each. */
export const ZONES = Object.freeze([
  { id: 'desert', questions: 3 },
  { id: 'cave', questions: 3 },
  { id: 'canyon', questions: 2 },
  { id: 'arrival', questions: 2 },
]);

/** Zone of the question at `index` (0-based). Past the end of the track, stays at the arrival. */
export const zoneFor = (index) => {
  let rest = Math.max(0, index);
  for (const zone of ZONES) {
    if (rest < zone.questions) return zone.id;
    rest -= zone.questions;
  }
  return ZONES.at(-1).id;
};

/** Thickness of the smoke trail (0 = none, 3 = max) after `misses` misses. */
export const smokeLevel = (misses) => (misses >= 5 ? 3 : misses >= 3 ? 2 : misses >= 1 ? 1 : 0);

/** Vanishing point of the track. */
const VP = { x: 180, y: 100 };
/** Engine rear face centres, left then right. */
const ENGINES = [
  { x: 110, y: 145 },
  { x: 250, y: 145 },
];
const EXHAUST_DY = 5;
const PROP_MS = 3400;
const NEEDLE = { x: 180, y: 274, cruise: -40, boost: 55 };
const RAIDER = { x: 60, y: 37, scale: 1.3 };
const RIFLE_TIP = { x: RAIDER.x + 22 * RAIDER.scale, y: RAIDER.y - 6 * RAIDER.scale };
const ROCK_HOME = { x: 236, y: 91 };
const PILLAR_HOME = { x: 205, y: 130 };
const MARK_SLOTS = [
  [-19, -15],
  [19, -14],
  [-22, 10],
  [22, 11],
  [0, -17],
  [-22, -2],
  [22, -1],
];
const MARK_FOR_ZONE = { desert: 'dent', cave: 'scratch', canyon: 'blast', arrival: 'burnt' };
const SMOKE_PERIOD = [0, 650, 420, 260];

const place = (x, y, s = 1) => `translate(${x}px, ${y}px) scale(${s})`;
const around = (x, y, transform) => `translate(${x}px, ${y}px) ${transform} translate(${-x}px, ${-y}px)`;
const needleAt = (deg) => around(NEEDLE.x, NEEDLE.y, `rotate(${deg}deg)`);

/** Keyframes of a roadside prop rushing from the horizon toward the cockpit (perspective-correct). */
const depthFrames = (X, Y, steps = 10) =>
  Array.from({ length: steps + 1 }, (_, k) => {
    const z = 18 + (0.45 - 18) * (k / steps);
    const s = 1 / z;
    return { transform: place(VP.x + X * s, VP.y + Y * s, s), opacity: k === 0 ? 0 : 1 };
  });

// --- markup -------------------------------------------------------------------------------------------

const PROP_MARKUP = {
  spire: `<path d="M-14 0 L-10 -30 L-2 -40 L6 -27 L14 0 Z" fill="#b0703c"/><path d="M-2 -40 L-4 -12" stroke="#d08d52" stroke-width="2"/>`,
  rock: `<path d="M-13 0 Q-11 -14 0 -15 Q12 -14 13 0 Z" fill="#a8693a"/><path d="M-6 -9 Q0 -12 5 -10" stroke="#c98a55" stroke-width="2" fill="none"/>`,
  stalactite: `<path d="M-13 0 L-2 44 L3 30 L13 0 Z" fill="#3e2f4b"/><path d="M-6 2 L-2 30" stroke="#57466a" stroke-width="2"/>`,
  crystal: `<g filter="url(#rc-glow)"><path d="M-6 0 L-9 -14 L-5 -22 L-1 -13 Z" fill="#6ef0ff"/>
    <path d="M0 0 L-2 -20 L3 -30 L7 -18 L5 0 Z" fill="#a8f6ff"/><path d="M6 0 L9 -12 L13 -6 L11 0 Z" fill="#c18cff"/></g>`,
  boulder: `<path d="M-16 0 Q-17 -16 -4 -19 Q12 -20 16 -6 L15 0 Z" fill="#9c4a2c"/><path d="M-8 -12 Q0 -16 8 -13" stroke="#c76a45" stroke-width="2" fill="none"/>`,
  banner: `<path d="M0 0 V-46" stroke="#e8e8e8" stroke-width="2.5"/><path d="M0 -46 L18 -40 L0 -33 Z" fill="#e2493b"/>
    <path d="M0 -30 L14 -26 L0 -21 Z" fill="#f2c43c"/>`,
};

/** Roadside props per zone: lateral X and height Y in world units (floor at +88, ceiling at -80). */
const PROPS = {
  desert: [
    { kind: 'spire', X: -100, Y: 88 },
    { kind: 'rock', X: 110, Y: 88 },
    { kind: 'rock', X: -125, Y: 88 },
    { kind: 'spire', X: 120, Y: 88 },
  ],
  cave: [
    { kind: 'stalactite', X: -70, Y: -80 },
    { kind: 'crystal', X: 95, Y: 88 },
    { kind: 'stalactite', X: 80, Y: -80 },
    { kind: 'crystal', X: -100, Y: 88 },
  ],
  canyon: [
    { kind: 'boulder', X: -90, Y: 88 },
    { kind: 'boulder', X: 105, Y: 88 },
    { kind: 'rock', X: -115, Y: 88 },
  ],
  arrival: [
    { kind: 'banner', X: -105, Y: 88 },
    { kind: 'banner', X: 108, Y: 88 },
  ],
};

const propsMarkup = (zone) =>
  `<g data-props="${zone}">${PROPS[zone].map((p) => `<g style="opacity: 0">${PROP_MARKUP[p.kind]}</g>`).join('')}</g>`;

const crystal = (x, y, color, s = 1, rot = 0) =>
  `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" filter="url(#rc-glow)" data-crystal>
    <path d="M-4 0 L-6 -10 L-3 -15 L0 -9 Z" fill="${color}"/><path d="M0 0 L-1 -14 L3 -20 L5 -12 L4 0 Z" fill="${color}" opacity="0.85"/>
  </g>`;

const desert = `
  <g data-zone="desert">
    <rect x="-400" y="-400" width="1160" height="501" fill="url(#rc-desert-sky)"/>
    <circle cx="292" cy="38" r="15" fill="#fff4cf" filter="url(#rc-glow-soft)"/>
    <path d="M-400 101 V92 L18 92 L26 80 L64 79 L74 92 L222 93 L230 83 L262 82 L270 93 L760 93 V101 Z" fill="#c98f5c"/>
    <path d="M-400 100 Q40 90 140 99 Q230 91 320 100 Q420 93 760 100 V700 H-400 Z" fill="url(#rc-sand)"/>
    <g stroke="#d4924c" stroke-width="2" fill="none" opacity="0.6">
      <path d="M-60 140 Q60 128 150 138"/><path d="M220 160 Q300 148 420 162"/><path d="M-100 205 Q40 190 120 200"/>
    </g>
    ${propsMarkup('desert')}
    <g data-part="rock" style="transform: ${place(ROCK_HOME.x, ROCK_HOME.y)}">
      <g data-part="rock-hop">
        <g data-part="rock-spin" style="transform-box: fill-box; transform-origin: center">
          <path d="M-7 3 Q-8 -4 -2 -7 Q5 -8 7 -2 Q8 5 2 7 Q-5 8 -7 3 Z" fill="#9b6a43" stroke="#6e4527" stroke-width="1"/>
          <path d="M-4 -3 L0 -2 M1 3 L4 1" stroke="#c48d5f" stroke-width="1.4" stroke-linecap="round"/>
        </g>
      </g>
    </g>
  </g>`;

const cave = `
  <g data-zone="cave" display="none">
    <rect x="-400" y="-400" width="1160" height="1100" fill="#140e1b"/>
    <rect x="130" y="70" width="100" height="60" fill="#2a2036"/>
    <ellipse cx="180" cy="100" rx="24" ry="15" fill="#4a3a5e" opacity="0.7" filter="url(#rc-glow-soft)"/>
    <path d="M-400 -400 H760 L230 70 H130 Z" fill="#1d1526"/>
    <path d="M-400 -400 L130 70 V130 L-400 700 Z" fill="#251b30"/>
    <path d="M760 -400 L230 70 V130 L760 700 Z" fill="#221a2d"/>
    <path d="M130 130 H230 L760 700 H-400 Z" fill="url(#rc-cave-floor)"/>
    <g stroke="#33263f" stroke-width="2.5" fill="none">
      <path d="M-400 120 L130 95"/><path d="M-400 300 L130 115"/><path d="M760 140 L230 97"/><path d="M760 320 L230 117"/>
    </g>
    ${crystal(40, 70, '#6ef0ff', 1.2, 20)}${crystal(78, 175, '#c18cff', 1.4, -10)}${crystal(108, 98, '#6ef0ff', 0.8, 15)}
    ${crystal(312, 60, '#c18cff', 1.2, -20)}${crystal(286, 170, '#6ef0ff', 1.3, 8)}${crystal(252, 102, '#c18cff', 0.8, -12)}
    ${propsMarkup('cave')}
    <g data-part="pillar" style="transform: ${place(PILLAR_HOME.x, PILLAR_HOME.y)}">
      <path d="M-9 0 L-6 -8 L-6 -52 L-9 -60 L9 -60 L6 -52 L6 -8 L9 0 Z" fill="#7a6690" stroke="#140e1b" stroke-width="1"/>
      <path d="M-2.5 -8 V-52" stroke="#a38fbd" stroke-width="2"/>
      <path d="M3 -12 V-48" stroke="#5b4970" stroke-width="1.5"/>
      <path d="M3 -30 L5 -36 L7 -30 Z" fill="#6ef0ff" filter="url(#rc-glow)"/>
    </g>
  </g>`;

const raider = `
  <g transform="translate(${RAIDER.x} ${RAIDER.y}) scale(${RAIDER.scale})">
    <g data-part="raider">
      <path d="M-3 0 V-8 M3 0 V-8" stroke="#4d3b2a" stroke-width="3" stroke-linecap="round"/>
      <path d="M-10 -6 L0 -25 L10 -6 Z" fill="#c9a877"/>
      <rect x="-6" y="-14" width="5" height="4" fill="#a8885a"/>
      <circle cx="0" cy="-27" r="6" fill="#b8956a"/>
      <path d="M-6 -27 Q-4 -38 1 -37 Q6 -34 6 -27 Z" fill="#a8855a"/>
      <rect x="-6" y="-25" width="12" height="4" rx="1" fill="#7d3b2a"/>
      <circle cx="-2.6" cy="-28.5" r="2.4" fill="#d8a640" stroke="#6b4d1a" stroke-width="0.8"/>
      <circle cx="2.6" cy="-28.5" r="2.4" fill="#d8a640" stroke="#6b4d1a" stroke-width="0.8"/>
      <circle cx="3.3" cy="-29.3" r="0.8" fill="#fff" data-part="glint"/>
      <g data-part="rifle">
        <path d="M-4 -15 L22 -6" stroke="#3a3530" stroke-width="2.6" stroke-linecap="round"/>
        <path d="M-4 -15 L-8 -12" stroke="#6b4a2f" stroke-width="4" stroke-linecap="round"/>
        <circle cx="4" cy="-12" r="2.2" fill="#b8956a"/>
      </g>
    </g>
  </g>`;

const canyon = `
  <g data-zone="canyon" display="none">
    <rect x="-400" y="-400" width="1160" height="1100" fill="url(#rc-canyon-sky)"/>
    <path d="M140 106 L148 74 L170 70 L176 80 L196 78 L214 106 Z" fill="#c77b52" opacity="0.8"/>
    <path d="M150 105 H210 L760 700 H-400 Z" fill="url(#rc-canyon-floor)"/>
    <path d="M-400 -60 L150 55 L150 105 L-400 700 Z" fill="#b4502f"/>
    <path d="M760 -60 L210 55 L210 105 L760 700 Z" fill="#a64a2c"/>
    <g stroke="#8f3d25" stroke-width="3" fill="none">
      <path d="M-400 80 L150 72"/><path d="M-400 220 L150 86"/><path d="M-400 380 L150 97"/>
      <path d="M760 80 L210 72"/><path d="M760 220 L210 86"/><path d="M760 380 L210 97"/>
    </g>
    <path d="M-400 -60 L150 55 M760 -60 L210 55" stroke="#e08a5e" stroke-width="3"/>
    ${propsMarkup('canyon')}
    ${raider}
  </g>`;

const CROWD_COLORS = ['#e2493b', '#f2c43c', '#4fc3ff', '#7ee07a', '#f39bd0', '#ffffff', '#ff9a3c', '#b48cff'];

/** Spectators in rows on the left stand (mirrored for the right one). */
const crowdDots = (mirror) => {
  const top = (x) => -10 + ((x + 400) * 90) / 540;
  const bottom = (x) => 260 - ((x + 400) * 161) / 540;
  const dots = [];
  for (let row = 0; row < 4; row++) {
    const t = (row + 0.55) / 4.2;
    for (let i = 0; i < 26; i++) {
      const u = i / 25;
      const x = -30 + 166 * u ** 0.8;
      const r = 4 - 2.8 * u;
      const y = top(x) + (bottom(x) - top(x)) * t - r;
      const color = CROWD_COLORS[(row * 5 + i * 3 + (mirror ? 2 : 0)) % CROWD_COLORS.length];
      dots.push(`<circle cx="${(mirror ? 360 - x : x).toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="${color}"/>`);
    }
  }
  return dots.join('');
};

const flag = (x, y, h, color, dir) => `
  <g transform="translate(${x} ${y})">
    <path d="M0 0 V${-h}" stroke="#e6e6e6" stroke-width="1.5"/>
    <path data-part="flag" d="M0 ${-h} L${dir * h * 0.6} ${-h * 0.82} L0 ${-h * 0.64} Z" fill="${color}"
      style="transform-box: fill-box; transform-origin: ${dir > 0 ? 'left' : 'right'} center"/>
  </g>`;

const arrival = `
  <g data-zone="arrival" display="none">
    <rect x="-400" y="-400" width="1160" height="501" fill="url(#rc-arrival-sky)"/>
    <path d="M-400 100 H760 V700 H-400 Z" fill="#d8b27c"/>
    <path d="M152 100 L-130 300 M208 100 L490 300" stroke="#fff" stroke-width="3" opacity="0.85"/>
    <path d="M-400 -10 L140 80 L140 99 L-400 260 Z" fill="#5b4636"/>
    <path d="M760 -10 L220 80 L220 99 L760 260 Z" fill="#54402f"/>
    <g data-part="crowd">${crowdDots(false)}</g>
    <g data-part="crowd">${crowdDots(true)}</g>
    <path d="M-400 260 L140 99 M760 260 L220 99" stroke="#ecdcb4" stroke-width="3"/>
    ${flag(20, 60, 24, '#e2493b', 1)}${flag(92, 72, 14, '#4fc3ff', 1)}
    ${flag(340, 60, 24, '#f2c43c', -1)}${flag(268, 72, 14, '#7ee07a', -1)}
    ${propsMarkup('arrival')}
    <g data-part="arch">
      <rect x="158" y="76" width="3" height="25" fill="#e8e8e8"/>
      <rect x="199" y="76" width="3" height="25" fill="#e8e8e8"/>
      <rect x="156" y="71" width="48" height="9" fill="url(#rc-checker)" stroke="#222" stroke-width="0.6"/>
    </g>
  </g>`;

const engine = (index) => `
  <g transform="translate(${ENGINES[index].x} ${ENGINES[index].y})">
    <g data-engine="${index}" style="transform-box: fill-box; transform-origin: center">
      <path d="M-26 -20 L-15 -44 L15 -44 L26 -20 Z" fill="#b7bbc5"/>
      <path d="M-15 -44 L15 -44" stroke="#e4e7ec" stroke-width="1.5"/>
      <ellipse cx="0" cy="-44" rx="15" ry="4" fill="#2c2f36"/>
      <path d="M-30 2 L-42 16 L-30 18 Z M30 2 L42 16 L30 18 Z" fill="#6c707a"/>
      <rect x="-30" y="-22" width="60" height="46" rx="12" fill="#8e929d" stroke="#5c606a" stroke-width="2"/>
      <rect x="-30" y="-12" width="60" height="6" fill="#e07a2c"/>
      <g fill="#5c606a"><circle cx="-23" cy="-17" r="1.6"/><circle cx="23" cy="-17" r="1.6"/>
        <circle cx="-23" cy="19" r="1.6"/><circle cx="23" cy="19" r="1.6"/></g>
      <g data-marks></g>
      <circle cx="0" cy="${EXHAUST_DY}" r="13" fill="#24252a" stroke="#4a4d55" stroke-width="2"/>
      <g data-exhaust>
        <circle cx="0" cy="${EXHAUST_DY}" r="8.5" fill="#ff9a3c" filter="url(#rc-glow)"/>
        <circle cx="0" cy="${EXHAUST_DY}" r="3.8" fill="#fff1c9"/>
      </g>
    </g>
  </g>`;

const lever = `
  <g data-part="lever" style="transform: ${around(74, 304, 'rotate(0deg)')}">
    <path d="M74 304 L90 252" stroke="#9aa0ab" stroke-width="6" stroke-linecap="round"/>
    <path d="M56 322 L84 262" stroke="#c4682e" stroke-width="15" stroke-linecap="round"/>
    <path d="M82 251 Q82 241 91 240 Q100 240 100 250 Q100 259 91 259 Q83 259 82 251 Z" fill="#6f4a2c"/>
    <path d="M86 245 h10 M85 250 h12 M86 255 h10" stroke="#4f331d" stroke-width="1.2" stroke-linecap="round"/>
  </g>`;

const cockpit = `
  <g data-part="cockpit">
    <path d="M-400 700 V244 Q40 226 180 228 Q320 226 760 244 V700 Z" fill="#2f343e"/>
    <path d="M-400 244 Q40 226 180 228 Q320 226 760 244" stroke="#6b7383" stroke-width="3" fill="none"/>
    <path d="M-400 700 V266 Q180 248 760 266 V700 Z" fill="#252931"/>
    <rect x="136" y="238" width="88" height="48" rx="9" fill="#15171d" stroke="#4a505c" stroke-width="2"/>
    <path d="M158 274 A22 22 0 0 1 202 274" stroke="#3d4350" stroke-width="5" fill="none"/>
    <path d="M191 255 A22 22 0 0 1 202 274" stroke="#e0533c" stroke-width="5" fill="none"/>
    <path data-part="needle" d="M180 274 L180 257" stroke="#ff6b4a" stroke-width="2.2" stroke-linecap="round"
      style="transform: ${needleAt(NEEDLE.cruise)}"/>
    <circle cx="180" cy="274" r="3" fill="#9aa0ab"/>
    <circle cx="148" cy="250" r="3.2" fill="#4fc3ff" filter="url(#rc-glow)"/>
    <circle data-part="eng-light" cx="212" cy="250" r="3.6" fill="#ffb53c" filter="url(#rc-glow)"/>
    ${lever}
    <g transform="translate(360 0) scale(-1 1)">${lever}</g>
    <g data-part="trophy" style="opacity: 0; transform-box: fill-box; transform-origin: center bottom">
      <path d="M170 196 H190 V200 Q190 212 180 214 Q170 212 170 200 Z" fill="#f5c542" stroke="#a87b12" stroke-width="1"/>
      <path d="M170 199 Q163 199 164 205 Q165 209 171 208 M190 199 Q197 199 196 205 Q195 209 189 208" stroke="#f5c542"
        stroke-width="2" fill="none"/>
      <rect x="177" y="214" width="6" height="6" fill="#d9a92e"/>
      <rect x="172" y="220" width="16" height="4" rx="1" fill="#a87b12"/>
      <path d="M174 201 Q175 207 179 209" stroke="#fff6cf" stroke-width="1.5" fill="none" opacity="0.8"/>
    </g>
  </g>`;

const markup = `
  <defs>
    ${glowFilter('rc-glow', 2.5)}
    ${glowFilter('rc-glow-soft', 7)}
    <linearGradient id="rc-desert-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.55" stop-color="#8fd0f0"/><stop offset="1" stop-color="#fde2b0"/>
    </linearGradient>
    <linearGradient id="rc-sand" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.25" stop-color="#eab36a"/><stop offset="0.6" stop-color="#d18b45"/>
    </linearGradient>
    <linearGradient id="rc-cave-floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.2" stop-color="#1f1828"/><stop offset="0.6" stop-color="#3a2e44"/>
    </linearGradient>
    <linearGradient id="rc-canyon-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.4" stop-color="#7ec8f2"/><stop offset="0.55" stop-color="#cbe9fb"/>
    </linearGradient>
    <linearGradient id="rc-canyon-floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.2" stop-color="#d79a63"/><stop offset="0.6" stop-color="#c46a3a"/>
    </linearGradient>
    <linearGradient id="rc-arrival-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.5" stop-color="#6fb6e8"/><stop offset="1" stop-color="#f3d9a8"/>
    </linearGradient>
    <pattern id="rc-checker" width="6" height="6" patternUnits="userSpaceOnUse">
      <rect width="6" height="6" fill="#fff"/><rect width="3" height="3" fill="#111"/><rect x="3" y="3" width="3" height="3" fill="#111"/>
    </pattern>
  </defs>
  <rect x="-400" y="-400" width="1160" height="1100" fill="#000"/>
  <g data-part="view">
    <g data-part="world">${desert}${cave}${canyon}${arrival}</g>
    <g data-part="pod">
      <g data-part="steer">
        <path d="M108 168 Q130 210 162 234 M252 168 Q230 210 198 234" stroke="#1b1d22" stroke-width="2.5" fill="none"/>
        <g filter="url(#rc-glow)" stroke="#8fe0ff" stroke-width="2" fill="none" stroke-linejoin="round">
          <path data-part="link" d="M140 138 L150 133 L160 142 L170 134 L180 141 L190 133 L200 142 L210 134 L220 138"/>
          <path data-part="link" d="M140 138 L150 142 L160 134 L170 141 L180 133 L190 142 L200 134 L210 141 L220 138" opacity="0.3"/>
        </g>
        ${engine(0)}${engine(1)}
      </g>
    </g>
    <g data-part="smoke"></g>
    <g data-part="fx"></g>
    <g data-part="mouth" display="none">
      <path d="M-60 12 Q-58 -26 -30 -34 Q0 -48 30 -34 Q58 -26 60 12 Z" fill="#7a5a3e"/>
      <path d="M-30 12 Q-30 -18 0 -20 Q30 -18 30 12 Z" fill="#000"/>
    </g>
    <ellipse data-part="light" cx="0" cy="0" rx="20" ry="14" fill="#fff8e6" display="none"/>
    ${cockpit}
  </g>
`;

const MARKS = {
  dent: `<ellipse rx="5" ry="3.5" fill="#3a2c22" opacity="0.55"/><path d="M-3 0 Q0 -3 3 0" stroke="#5a5e68" stroke-width="1.6" fill="none"/>
    <path d="M-3 0.8 Q0 3 3 0.8" stroke="#c9ccd3" stroke-width="1" fill="none"/>`,
  scratch: `<path d="M-6 -3 L5 2 M-5 0 L6 4 M-4 -5 L4 -1" stroke="#e8eaee" stroke-width="1.1" stroke-linecap="round"/>
    <path d="M-6 -2 L5 3" stroke="#4a4d55" stroke-width="0.8"/>`,
  blast: `<path d="M0 -6 L1.5 -2 L6 -3 L2.5 0 L5 4 L0.5 2 L-3 6 L-2 1.5 L-6 1 L-2 -1.5 Z" fill="#1d1a18"/>
    <circle r="1.6" fill="#ff7a2a"/>`,
  burnt: `<path d="M-6 -1 Q-5 -6 0 -5 Q6 -6 6 0 Q6 5 0 5 Q-6 6 -6 -1 Z" fill="#2a221d" opacity="0.85"/>
    <circle cx="2" cy="1" r="1.2" fill="#ff9a3c"/>`,
};

// --- scene ------------------------------------------------------------------------------------------

/**
 * @param {HTMLElement} host
 * @param {object} [options] debug page only
 * @param {number} [options.question] index of the next question to present
 * @param {number} [options.successes] correct answers already given
 */
export const createRaceScene = (host, { question: startQuestion = 0, successes: startSuccesses = 0 } = {}) => {
  const svg = createSvg('0 0 360 300', markup, 'scene-race');
  host.append(svg);
  const part = (name) => svg.querySelector(`[data-part="${name}"]`);
  const parts = (name) => [...svg.querySelectorAll(`[data-part="${name}"]`)];
  const reduced = prefersReducedMotion();

  const view = part('view');
  const world = part('world');
  const pod = part('pod');
  const steer = part('steer');
  const fx = part('fx');
  const smokeLayer = part('smoke');
  const needle = part('needle');
  const engLight = part('eng-light');
  const trophy = part('trophy');
  const levers = parts('lever');
  const zones = Object.fromEntries(ZONES.map(({ id }) => [id, svg.querySelector(`[data-zone="${id}"]`)]));
  const engines = ENGINES.map((position, index) => {
    const body = svg.querySelector(`[data-engine="${index}"]`);
    return { ...position, body, marks: body.querySelector('[data-marks]'), exhaust: body.querySelector('[data-exhaust]'), count: 0 };
  });

  let alive = true;
  let asked = Math.max(0, startQuestion);
  let index = asked;
  let successes = Math.max(0, startSuccesses);
  let misses = 0;
  let shown = zoneFor(asked - 1);
  let props = [];
  let loops = [];
  let hazardLoops = [];
  let smokeTimer = null;
  let engineOut = null;

  const sound = (play) => alive && play();
  const run = (element, keyframes, options) => element.animate(keyframes, options);
  const exhaust = (engine) => ({ x: engine.x, y: engine.y + EXHAUST_DY });

  const setZone = (id) => {
    for (const [zoneId, group] of Object.entries(zones)) group.setAttribute('display', zoneId === id ? 'inline' : 'none');
    shown = id;
  };

  // --- cruise: roadside props, sway, exhaust flicker -------------------------------------------------

  const startCruise = () => {
    stopCruise();
    const elements = [...zones[shown].querySelector('[data-props]').children];
    const list = PROPS[shown];
    if (reduced) {
      // still props spread along the road
      elements.forEach((element, i) => {
        const frames = depthFrames(list[i].X, list[i].Y);
        Object.assign(element.style, frames[4 + ((i * 2) % 5)]);
      });
    } else {
      props = elements.map((element, i) =>
        run(element, depthFrames(list[i].X, list[i].Y), {
          duration: PROP_MS,
          delay: -(i * PROP_MS) / elements.length,
          iterations: Infinity,
          easing: 'linear',
        }),
      );
      loops.push(
        run(pod, [{ transform: 'translate(0px, 0px)' }, { transform: 'translate(2.5px, -1px)' }, { transform: 'translate(-2.5px, 1px)' }, { transform: 'translate(0px, 0px)' }], {
          duration: 2600,
          iterations: Infinity,
          easing: 'ease-in-out',
        }),
        ...parts('link').map((link, i) =>
          run(link, [{ opacity: i ? 0.3 : 1 }, { opacity: i ? 1 : 0.3 }], { duration: 260, iterations: Infinity, direction: 'alternate', easing: 'steps(1)' }),
        ),
      );
      engines.forEach((engine) => engine !== engineOut && flicker(engine));
      if (shown === 'arrival') {
        loops.push(
          ...parts('flag').map((element, i) =>
            run(element, [{ transform: 'skewY(0deg) scaleX(1)' }, { transform: 'skewY(8deg) scaleX(0.85)' }], {
              duration: 420 + i * 60,
              iterations: Infinity,
              direction: 'alternate',
              easing: 'ease-in-out',
            }),
          ),
        );
      }
    }
  };

  function flicker(engine) {
    engine.flicker?.cancel();
    if (reduced) return;
    engine.flicker = run(engine.exhaust, [{ opacity: 1 }, { opacity: 0.75 }], { duration: 160 + engine.x / 4, iterations: Infinity, direction: 'alternate' });
    loops.push(engine.flicker);
  }

  function stopCruise() {
    props.forEach((a) => a.cancel());
    loops.forEach((a) => a.cancel());
    props = [];
    loops = [];
  }

  const setSpeed = (rate) => props.forEach((a) => (a.playbackRate = rate));

  // --- hazards ---------------------------------------------------------------------------------------

  const stopHazard = () => {
    hazardLoops.forEach((a) => a.cancel());
    hazardLoops = [];
  };

  /** Puts the zone's hazard back in place and starts its idle animation. */
  const armHazard = async () => {
    stopHazard();
    const fadeIn = (element, transform) => {
      element.style.transform = transform;
      if (element.style.opacity === '0') return settle(element, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
      return Promise.resolve();
    };
    if (shown === 'desert') {
      await fadeIn(part('rock'), place(ROCK_HOME.x, ROCK_HOME.y));
      if (!reduced) {
        hazardLoops.push(
          run(part('rock-spin'), [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 1400, iterations: Infinity }),
          run(part('rock-hop'), [{ transform: 'translate(-3px, 0px)' }, { transform: 'translate(0px, -4px)' }, { transform: 'translate(3px, 0px)' }], {
            duration: 700,
            iterations: Infinity,
            direction: 'alternate',
            easing: 'ease-in-out',
          }),
        );
      }
    } else if (shown === 'cave') {
      await fadeIn(part('pillar'), place(PILLAR_HOME.x, PILLAR_HOME.y));
    } else if (shown === 'canyon') {
      hazardLoops.push(run(part('glint'), [{ opacity: 1 }, { opacity: 0.1 }, { opacity: 1 }], { duration: 1600, iterations: Infinity }));
    } else if (shown === 'arrival') {
      engLight.setAttribute('fill', '#ffb53c');
      hazardLoops.push(
        run(engLight, [{ opacity: 1 }, { opacity: 0.25 }, { opacity: 1 }, { opacity: 0.6 }, { opacity: 1 }], {
          duration: reduced ? 2400 : 1100,
          iterations: Infinity,
        }),
      );
    }
  };

  // --- pod motion ------------------------------------------------------------------------------------

  const swerve = (dir) =>
    reduced
      ? Promise.resolve()
      : Promise.all([
          animate(steer, [{ transform: 'translate(0px, 0px) rotate(0deg)' }, { transform: `translate(${dir * 24}px, 0px) rotate(${dir * -3}deg)`, offset: 0.4 }, { transform: 'translate(0px, 0px) rotate(0deg)' }], {
            duration: 700,
            easing: 'ease-in-out',
            fill: 'none',
          }),
          animate(world, [{ transform: 'translate(0px, 0px)' }, { transform: `translate(${-dir * 10}px, 0px)`, offset: 0.4 }, { transform: 'translate(0px, 0px)' }], {
            duration: 700,
            easing: 'ease-in-out',
            fill: 'none',
          }),
        ]);

  const speedLines = () => {
    if (reduced) return Promise.resolve();
    const angles = [-160, -130, -50, -20, 160, 20, 200, -90];
    return Promise.all(
      angles.map((deg, i) => {
        const line = document.createElementNS(SVG_NS, 'line');
        const rad = (deg * Math.PI) / 180;
        const [dx, dy] = [Math.cos(rad), Math.sin(rad)];
        line.setAttribute('x1', String(VP.x + dx * 50));
        line.setAttribute('y1', String(VP.y + dy * 50));
        line.setAttribute('x2', String(VP.x + dx * 80));
        line.setAttribute('y2', String(VP.y + dy * 80));
        line.setAttribute('stroke', '#fff');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-linecap', 'round');
        fx.append(line);
        return animate(line, [{ transform: 'translate(0px, 0px)', opacity: 0 }, { opacity: 0.8, offset: 0.3 }, { transform: `translate(${dx * 160}px, ${dy * 160}px)`, opacity: 0 }], {
          duration: 450,
          delay: i * 40,
          easing: 'ease-in',
        }).then(() => line.remove());
      }),
    );
  };

  const setNeedle = (deg, duration = 400) => settle(needle, [{ transform: needle.style.transform }, { transform: needleAt(deg) }], { duration, easing: 'ease-out' });

  const pushLevers = () =>
    reduced
      ? Promise.resolve()
      : Promise.all(
          levers.map((element) =>
            animate(element, [{ transform: around(74, 304, 'rotate(0deg)') }, { transform: around(74, 304, 'rotate(9deg)'), offset: 0.3 }, { transform: around(74, 304, 'rotate(0deg)') }], {
              duration: 900,
              easing: 'ease-in-out',
              fill: 'none',
            }),
          ),
        );

  const boost = async () => {
    sound(sfx.whoosh);
    sound(sfx.rev);
    setSpeed(4);
    await Promise.all([speedLines(), pushLevers(), setNeedle(NEEDLE.boost, 300)]);
    setSpeed(1);
    await setNeedle(NEEDLE.cruise, 500);
  };

  const jolt = (engine) =>
    Promise.all([
      reduced ? Promise.resolve() : animate(engine.body, [0, -9, 7, -4, 0].map((deg) => ({ transform: `rotate(${deg}deg)` })), { duration: 500, fill: 'none' }),
      reduced ? flash(host, 'rgb(255 170 60)') : shake(view, 6, 380),
    ]);

  const puffs = (at, { color = '#6f7480', count = 4, size = 5 } = {}) =>
    Promise.all(
      Array.from({ length: count }, (_, i) => {
        const puff = document.createElementNS(SVG_NS, 'circle');
        puff.setAttribute('cx', String(at.x + (i - count / 2) * 4));
        puff.setAttribute('cy', String(at.y));
        puff.setAttribute('r', String(size));
        puff.setAttribute('fill', color);
        puff.style.transformBox = 'fill-box';
        puff.style.transformOrigin = 'center';
        fx.append(puff);
        const dx = (i - count / 2) * 9;
        return animate(puff, [{ transform: 'translate(0px, 0px) scale(0.6)', opacity: 0.8 }, { transform: `translate(${dx}px, ${-18 - i * 4}px) scale(2.2)`, opacity: 0 }], {
          duration: 900 + i * 120,
          easing: 'ease-out',
        }).then(() => puff.remove());
      }),
    );

  /** A lasting damage mark on the engine that was hit. */
  const addMark = (engine, kind) => {
    const [x, y] = MARK_SLOTS[engine.count % MARK_SLOTS.length];
    engine.count++;
    const holder = document.createElementNS(SVG_NS, 'g');
    holder.setAttribute('transform', `translate(${x} ${y})`);
    const mark = document.createElementNS(SVG_NS, 'g');
    mark.innerHTML = MARKS[kind];
    mark.style.transformBox = 'fill-box';
    mark.style.transformOrigin = 'center';
    holder.append(mark);
    engine.marks.append(holder);
    return animate(mark, [{ transform: 'scale(0)' }, { transform: 'scale(1.4)', offset: 0.6 }, { transform: 'scale(1)' }], { duration: 350, easing: 'ease-out' });
  };

  /** Grey smoke streaming back from every damaged engine, thicker with more misses. */
  const updateSmoke = () => {
    clearInterval(smokeTimer);
    const level = smokeLevel(misses);
    if (!level) return;
    smokeTimer = setInterval(() => {
      if (!alive) return;
      for (const [i, engine] of engines.entries()) {
        if (!engine.count) continue;
        const side = i === 0 ? -1 : 1;
        const from = exhaust(engine);
        const puff = document.createElementNS(SVG_NS, 'circle');
        puff.setAttribute('cx', String(from.x + (Math.random() - 0.5) * 6));
        puff.setAttribute('cy', String(from.y));
        puff.setAttribute('r', String(2.5 + level));
        puff.setAttribute('fill', '#8a8f99');
        puff.style.transformBox = 'fill-box';
        puff.style.transformOrigin = 'center';
        smokeLayer.append(puff);
        const dx = side * (8 + Math.random() * 22);
        animate(puff, [{ transform: 'translate(0px, 0px) scale(1)', opacity: 0.3 + level * 0.12 }, { transform: `translate(${dx}px, ${110 + Math.random() * 40}px) scale(${3 + level * 0.7})`, opacity: 0 }], {
          duration: reduced ? 2400 : 1500,
          easing: 'ease-in',
        }).then(() => puff.remove());
      }
    }, SMOKE_PERIOD[level]);
  };

  // --- per-zone outcomes -----------------------------------------------------------------------------

  const fadeOut = (element) => settle(element, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 });

  const hits = {
    async desert(engine, side) {
      const rock = part('rock');
      const impact = { x: engine.x, y: engine.y - 12 };
      if (!reduced) await settle(rock, [{ transform: place(ROCK_HOME.x, ROCK_HOME.y) }, { transform: place(impact.x, impact.y, 3) }], { duration: 450, easing: 'ease-in' });
      sound(sfx.bonk);
      await Promise.all([
        sparks(fx, impact, { count: 9 }),
        puffs(impact),
        jolt(engine),
        reduced
          ? fadeOut(rock)
          : settle(rock, [{ transform: place(impact.x, impact.y, 3), opacity: 1 }, { transform: place(impact.x + side * 140, 30, 3.4), opacity: 0 }], {
              duration: 450,
              easing: 'ease-out',
            }),
      ]);
    },
    async cave(engine, side) {
      const pillar = part('pillar');
      const edge = { x: engine.x + side * 32, y: engine.y + 4 };
      if (!reduced) {
        await settle(pillar, [{ transform: place(PILLAR_HOME.x, PILLAR_HOME.y) }, { transform: place(engine.x + side * 52, 300, 4.6) }], {
          duration: 520,
          easing: 'ease-in',
        });
      }
      sound(sfx.screech);
      await Promise.all([
        sparks(fx, edge, { count: 10, radius: 26 }),
        wait(140).then(() => sparks(fx, { x: edge.x, y: edge.y - 14 }, { count: 8 })),
        jolt(engine),
        reduced
          ? fadeOut(pillar)
          : Promise.all([
              settle(pillar, [{ transform: place(engine.x + side * 52, 300, 4.6), opacity: 1 }, { transform: place(engine.x + side * 120, 440, 7), opacity: 0 }], { duration: 380, easing: 'linear' }),
              animate(steer, [{ transform: 'translate(0px, 0px)' }, { transform: `translate(${-side * 16}px, 0px) rotate(${side * 4}deg)`, offset: 0.4 }, { transform: 'translate(0px, 0px)' }], {
                duration: 650,
                fill: 'none',
              }),
            ]),
      ]);
    },
    async canyon(engine) {
      const rifle = part('rifle');
      const impact = { x: engine.x, y: engine.y - 6 };
      sound(sfx.blaster);
      await bolt(fx, RIFLE_TIP, impact, { color: '#ff8a2a', length: 20, width: 5, duration: reduced ? 700 : 520, filter: 'rc-glow' });
      sound(sfx.hit);
      await Promise.all([
        sparks(fx, impact, { color: '#ffb36b', count: 9 }),
        puffs(impact, { color: '#4b4e56' }),
        jolt(engine),
        reduced
          ? Promise.resolve()
          : animate(rifle, [0, -5, 0, -5, 0].map((y) => ({ transform: `translate(0px, ${y}px)` })), { duration: 700, fill: 'none' }),
      ]);
    },
    async arrival(engine) {
      engLight.setAttribute('fill', '#ff3b3b');
      stopHazard();
      sound(sfx.bang);
      engineOut = engine;
      engine.flicker?.cancel();
      const at = exhaust(engine);
      await Promise.all([
        reduced ? flash(host, 'rgb(255 170 60)') : svgExplosion(fx, at, { size: 16, duration: 500 }),
        puffs(at, { color: '#25262b', count: 6, size: 6 }),
        jolt(engine),
        settle(engine.exhaust, [{ opacity: 1 }, { opacity: 0.4 }, { opacity: 0.8 }, { opacity: 0.1 }], { duration: 700 }),
      ]);
      sound(sfx.cough);
      await puffs(at, { color: '#25262b', count: 3, size: 4 });
    },
  };

  const dodges = {
    async desert() {
      const rock = part('rock');
      await Promise.all([
        swerve(-1),
        reduced
          ? fadeOut(rock)
          : settle(rock, [{ transform: place(ROCK_HOME.x, ROCK_HOME.y), opacity: 1 }, { transform: place(440, 250, 5), opacity: 0.6 }], { duration: 600, easing: 'ease-in' }),
      ]);
      rock.style.opacity = '0';
    },
    async cave() {
      const pillar = part('pillar');
      await Promise.all([
        swerve(-1),
        reduced
          ? fadeOut(pillar)
          : settle(pillar, [{ transform: place(PILLAR_HOME.x, PILLAR_HOME.y), opacity: 1 }, { transform: place(470, 420, 7), opacity: 0.8 }], { duration: 600, easing: 'ease-in' }),
      ]);
      pillar.style.opacity = '0';
    },
    async canyon() {
      sound(sfx.blaster);
      await Promise.all([
        swerve(1),
        bolt(fx, RIFLE_TIP, { x: 360, y: 210 }, { color: '#ff8a2a', length: 20, width: 5, duration: 600, filter: 'rc-glow' }),
      ]);
      if (!reduced) {
        await animate(part('raider'), [0, -4, 0, -4, 0].map((y) => ({ transform: `translate(0px, ${y}px)` })), { duration: 500, fill: 'none' });
      }
    },
    async arrival() {
      stopHazard();
      engLight.setAttribute('fill', '#5be37d');
    },
  };

  // --- zone transitions ------------------------------------------------------------------------------

  const zoom = (s) => around(VP.x, VP.y, `scale(${s})`);

  const crossfade = async (next) => {
    const from = zones[shown];
    const to = zones[next];
    to.style.opacity = '0';
    to.setAttribute('display', 'inline');
    await Promise.all([settle(from, [{ opacity: 1 }, { opacity: 0 }], { duration: 600 }), settle(to, [{ opacity: 0 }, { opacity: 1 }], { duration: 600 })]);
    setZone(next);
    from.style.opacity = '';
  };

  /** Something grows from the horizon until it fills the view, then the new zone is revealed under it. */
  const throughOverlay = async (overlay, next, sizeEnd) => {
    overlay.setAttribute('display', 'inline');
    overlay.style.opacity = '1';
    await settle(overlay, [{ transform: place(VP.x, VP.y, 0.15) }, { transform: place(VP.x, VP.y, sizeEnd) }], { duration: 1100, easing: 'cubic-bezier(0.7, 0, 1, 0.6)' });
    setZone(next);
    await settle(overlay, [{ opacity: 1 }, { opacity: 0 }], { duration: 450 });
    overlay.setAttribute('display', 'none');
  };

  const transitionTo = async (next) => {
    stopCruise();
    stopHazard();
    sound(sfx.whoosh);
    if (reduced) return crossfade(next);
    if (shown === 'desert' && next === 'cave') return throughOverlay(part('mouth'), next, 26);
    if (shown === 'cave' && next === 'canyon') return throughOverlay(part('light'), next, 34);
    if (shown === 'canyon' && next === 'arrival') {
      const from = zones.canyon;
      const to = zones.arrival;
      to.style.opacity = '0';
      to.setAttribute('display', 'inline');
      world.append(from); // canyon walls fly past over the opening stadium
      await Promise.all([
        settle(from, [{ transform: zoom(1), opacity: 1 }, { transform: zoom(2.6), opacity: 0 }], { duration: 1200, easing: 'ease-in' }),
        settle(to, [{ opacity: 0 }, { opacity: 1 }], { duration: 1000, easing: 'ease-out' }),
      ]);
      setZone(next);
      from.style.transform = '';
      from.style.opacity = '';
      return undefined;
    }
    return crossfade(next);
  };

  // --- finish line -----------------------------------------------------------------------------------

  const fireworks = () =>
    Promise.all(
      [
        { x: 60, y: 34, color: '#ffd56b' },
        { x: 300, y: 28, color: '#8fe0ff' },
        { x: 180, y: 22, color: '#f39bd0' },
        { x: 110, y: 18, color: '#7ee07a' },
      ].map(async (burst, i) => {
        await wait(i * 380);
        sound(sfx.firework);
        await wait(350);
        if (reduced) {
          const glow = document.createElementNS(SVG_NS, 'circle');
          glow.setAttribute('cx', String(burst.x));
          glow.setAttribute('cy', String(burst.y));
          glow.setAttribute('r', '14');
          glow.setAttribute('fill', burst.color);
          glow.setAttribute('filter', 'url(#rc-glow-soft)');
          fx.append(glow);
          await animate(glow, [{ opacity: 0 }, { opacity: 0.7 }, { opacity: 0 }], { duration: 1200 });
          glow.remove();
          return;
        }
        await Promise.all([
          sparks(fx, burst, { color: burst.color, count: 14, radius: 34, duration: 800 }),
          sparks(fx, burst, { color: '#fff', count: 7, radius: 18, duration: 600 }),
        ]);
      }),
    );

  const finish = async (boosted) => {
    const arch = part('arch');
    sound(sfx.cheer);
    const crowdCheer = reduced
      ? Promise.resolve()
      : Promise.all(parts('crowd').map((crowd, i) => animate(crowd, [{ transform: 'translate(0px, 0px)' }, { transform: 'translate(0px, -3px)' }, { transform: 'translate(0px, 0px)' }], { duration: 300, delay: i * 90, iterations: 5, fill: 'none' })));
    const cross = reduced
      ? settle(arch, [{ opacity: 1 }, { opacity: 0 }], { duration: 800 })
      : settle(arch, [{ transform: around(180, 86, 'scale(1)'), opacity: 1 }, { transform: around(180, 86, 'scale(14)'), opacity: 1, offset: 0.85 }, { transform: around(180, 86, 'scale(18)'), opacity: 0 }], {
          duration: boosted ? 1100 : 2000,
          easing: 'ease-in',
        });
    if (!boosted) setSpeed(0.5);
    await Promise.all([cross, crowdCheer]);
    setSpeed(1);
    if (!alive || successes < ROUND_LENGTH) return;
    sound(sfx.fanfare);
    await Promise.all([
      fireworks(),
      settle(
        trophy,
        reduced
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [{ opacity: 0, transform: 'translate(0px, 20px) scale(0.2)' }, { opacity: 1, transform: 'translate(0px, -4px) scale(1.15)', offset: 0.6 }, { opacity: 1, transform: 'translate(0px, 0px) scale(1)' }],
        { duration: 700, easing: 'ease-out' },
      ),
    ]);
    await wait(600);
  };

  const isLast = () => index >= ROUND_LENGTH - 1;

  // --- start -----------------------------------------------------------------------------------------

  setZone(shown);
  startCruise();
  armHazard();

  return {
    async present() {
      index = Math.min(asked, ROUND_LENGTH - 1);
      asked++;
      const next = zoneFor(index);
      if (next !== shown) {
        await transitionTo(next);
        if (!alive) return;
        startCruise();
      }
      if (engineOut) {
        const engine = engineOut;
        engineOut = null;
        sound(sfx.rev);
        await Promise.all([sparks(fx, exhaust(engine), { count: 6, radius: 14 }), settle(engine.exhaust, [{ opacity: 0.1 }, { opacity: 1 }], { duration: 400 })]);
        engine.exhaust.style.opacity = '';
        flicker(engine);
      } else {
        sound(sfx.rev);
      }
      if (!alive) return;
      if (!props.length && !reduced) startCruise();
      const arch = part('arch');
      arch.style.transform = '';
      arch.style.opacity = '';
      await armHazard();
    },

    threat() {},

    async success() {
      successes++;
      stopHazard();
      await Promise.all([boost(), dodges[shown]()]);
      if (alive && isLast()) await finish(true);
    },

    async failure() {
      const engine = engines[misses % 2];
      const side = engine === engines[0] ? -1 : 1;
      misses++;
      stopHazard();
      await hits[shown](engine, side);
      if (!alive) return;
      await addMark(engine, MARK_FOR_ZONE[shown]);
      updateSmoke();
      if (isLast()) await finish(false);
      await wait(300);
    },

    destroy() {
      alive = false;
      clearInterval(smokeTimer);
      stopCruise();
      stopHazard();
      svg.getAnimations?.({ subtree: true }).forEach((a) => a.cancel());
      svg.remove();
    },
  };
};
