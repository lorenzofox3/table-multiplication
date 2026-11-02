import * as sfx from '../audio.js';
import { animate, bolt, createSvg, glowFilter, shake, sparks, wait } from './fx.js';

const PIVOT = { x: 162, y: 188 };
const DRONE = { x: 268, y: 104 };
const CHEST = { x: 132, y: 172 };
const INTERCEPT = { x: 200, y: 137 };
const IDLE_ANGLE = 18;
const BLOCK_ANGLE = 37;

const saberTransform = (angle) => `translate(${PIVOT.x}px, ${PIVOT.y}px) rotate(${angle}deg)`;

const markup = `
  <defs>
    ${glowFilter('pd-glow', 3)}
    ${glowFilter('pd-glow-soft', 6)}
    <radialGradient id="pd-room" cx="50%" cy="35%" r="75%">
      <stop offset="0" stop-color="#25406e"/>
      <stop offset="1" stop-color="#070d1d"/>
    </radialGradient>
    <radialGradient id="pd-sphere" cx="35%" cy="30%" r="70%">
      <stop offset="0" stop-color="#d9dde3"/>
      <stop offset="0.6" stop-color="#7b8494"/>
      <stop offset="1" stop-color="#2c3240"/>
    </radialGradient>
    <linearGradient id="pd-floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1b2a48"/>
      <stop offset="1" stop-color="#0a1222"/>
    </linearGradient>
  </defs>
  <rect x="-400" y="-400" width="1160" height="1100" fill="#070d1d"/>
  <rect x="-60" y="-60" width="480" height="420" fill="url(#pd-room)"/>
  <!-- round viewport with stars -->
  <g>
    <circle cx="58" cy="62" r="40" fill="#02040b" stroke="#4a5e86" stroke-width="6"/>
    <circle cx="58" cy="62" r="40" fill="none" stroke="#7f95c2" stroke-width="1.5" stroke-dasharray="4 8"/>
    <g fill="#fff">
      <circle cx="42" cy="48" r="1.2"/><circle cx="70" cy="44" r="0.9"/><circle cx="62" cy="78" r="1.4"/>
      <circle cx="38" cy="76" r="0.8"/><circle cx="84" cy="66" r="1"/><circle cx="54" cy="60" r="0.7"/>
    </g>
    <circle cx="76" cy="80" r="7" fill="#b0623f" opacity="0.85"/>
  </g>
  <!-- wall panels -->
  <g stroke="#2f4672" stroke-width="2" fill="none">
    <path d="M150 20 h190 v150 h-190 z" opacity="0.5"/>
    <path d="M170 40 h150 M170 60 h150" opacity="0.35"/>
  </g>
  <rect x="-400" y="262" width="1160" height="400" fill="url(#pd-floor)"/>
  <ellipse cx="160" cy="268" rx="130" ry="14" fill="#3a5d9c" opacity="0.25"/>
  <ellipse cx="122" cy="270" rx="32" ry="5" fill="#000" opacity="0.45"/>

  <!-- apprentice -->
  <g data-part="kid">
    <rect x="104" y="248" width="13" height="22" rx="3" fill="#3b2516"/>
    <rect x="124" y="248" width="13" height="22" rx="3" fill="#3b2516"/>
    <rect x="106" y="214" width="29" height="38" rx="5" fill="#8a6b48"/>
    <path d="M100 150 Q120 142 141 150 L148 226 Q120 233 93 226 Z" fill="#e6d3ae"/>
    <path d="M104 150 L134 222" stroke="#c9b48c" stroke-width="5"/>
    <rect x="96" y="194" width="50" height="9" rx="3" fill="#6b4b2c"/>
    <rect x="116" y="194" width="9" height="9" rx="2" fill="#c7a35a"/>
    <!-- arms -->
    <path d="M104 156 Q112 186 158 192" stroke="#d8c39b" stroke-width="11" stroke-linecap="round" fill="none"/>
    <path d="M138 156 Q152 172 165 186" stroke="#e6d3ae" stroke-width="11" stroke-linecap="round" fill="none"/>
    <!-- head -->
    <rect x="114" y="136" width="12" height="12" fill="#e9b48f"/>
    <circle cx="120" cy="122" r="22" fill="#f2c39d"/>
    <path d="M98 120 Q98 96 121 97 Q143 97 143 118 Q134 108 121 109 Q106 110 98 120 Z" fill="#4a2d1a"/>
    <path d="M138 116 Q146 130 141 150" stroke="#4a2d1a" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <circle cx="141" cy="151" r="2.5" fill="#4a2d1a"/>
    <circle cx="127" cy="123" r="2.4" fill="#2a1a10"/>
    <circle cx="115" cy="123" r="2.4" fill="#2a1a10"/>
    <path d="M115 133 Q121 137 127 133" stroke="#9a5a3c" stroke-width="2" fill="none" stroke-linecap="round" data-part="mouth"/>
    <circle cx="111" cy="130" r="3" fill="#f59a8b" opacity="0.5"/>
    <circle cx="131" cy="130" r="3" fill="#f59a8b" opacity="0.5"/>
  </g>

  <!-- laser sword (local coordinates: pivot at the hands, blade pointing up) -->
  <g data-part="saber" style="transform: ${saberTransform(IDLE_ANGLE)}">
    <line x1="0" y1="-12" x2="0" y2="-118" stroke="#3dff6e" stroke-width="7" stroke-linecap="round" filter="url(#pd-glow-soft)" data-part="blade"/>
    <line x1="0" y1="-12" x2="0" y2="-118" stroke="#eaffef" stroke-width="2.5" stroke-linecap="round"/>
    <rect x="-4.5" y="-14" width="9" height="28" rx="2" fill="#b8bec9"/>
    <rect x="-4.5" y="-6" width="9" height="3" fill="#2b2f37"/>
    <rect x="-4.5" y="2" width="9" height="3" fill="#2b2f37"/>
    <rect x="-5.5" y="-16" width="11" height="4" rx="1" fill="#e3e7ee"/>
  </g>
  <circle cx="${PIVOT.x}" cy="${PIVOT.y}" r="6" fill="#f2c39d"/>

  <!-- training drone -->
  <g data-part="drone">
    <ellipse cx="${DRONE.x}" cy="${DRONE.y + 70}" rx="20" ry="4" fill="#000" opacity="0.25"/>
    <circle cx="${DRONE.x}" cy="${DRONE.y}" r="24" fill="url(#pd-sphere)"/>
    <path d="M${DRONE.x - 24} ${DRONE.y} h48" stroke="#2c3240" stroke-width="2"/>
    <path d="M${DRONE.x} ${DRONE.y - 24} v48" stroke="#2c3240" stroke-width="1.2" opacity="0.6"/>
    <circle cx="${DRONE.x - 12}" cy="${DRONE.y - 10}" r="3" fill="#2c3240"/>
    <circle cx="${DRONE.x + 12}" cy="${DRONE.y - 10}" r="3" fill="#2c3240"/>
    <circle cx="${DRONE.x - 12}" cy="${DRONE.y + 11}" r="3" fill="#2c3240"/>
    <circle cx="${DRONE.x + 12}" cy="${DRONE.y + 11}" r="3" fill="#2c3240"/>
    <path d="M${DRONE.x - 30} ${DRONE.y - 4} h-8 M${DRONE.x + 30} ${DRONE.y - 4} h8" stroke="#9aa3b2" stroke-width="3" stroke-linecap="round"/>
    <circle cx="${DRONE.x - 8}" cy="${DRONE.y + 4}" r="6" fill="#4a0d0d"/>
    <circle cx="${DRONE.x - 8}" cy="${DRONE.y + 4}" r="4" fill="#ff4d4d" filter="url(#pd-glow)" data-part="eye"/>
    <circle cx="${DRONE.x - 8}" cy="${DRONE.y + 4}" r="10" fill="none" stroke="#ff4d4d" stroke-width="2" opacity="0" data-part="charge" style="transform-box: fill-box; transform-origin: center"/>
  </g>
`;

const EMITTER = { x: DRONE.x - 8, y: DRONE.y + 4 };

export const createPadawanScene = (host) => {
  const svg = createSvg('0 0 360 300', markup, 'scene-padawan');
  host.append(svg);
  const part = (name) => svg.querySelector(`[data-part="${name}"]`);
  const drone = part('drone');
  const saber = part('saber');
  const kid = part('kid');
  const eye = part('eye');
  const charge = part('charge');
  const mouth = part('mouth');

  let floating = null;
  let charging = [];

  const startFloating = () => {
    floating = drone.animate(
      [
        { transform: 'translate(0px, 0px)' },
        { transform: 'translate(-10px, -8px)' },
        { transform: 'translate(6px, 6px)' },
        { transform: 'translate(0px, 0px)' },
      ],
      { duration: 3200, iterations: Infinity, easing: 'ease-in-out' },
    );
  };

  /** Freeze the drone at its home position so the bolt starts from the emitter. */
  const settleDrone = async () => {
    const current = getComputedStyle(drone).transform;
    floating?.cancel();
    floating = null;
    await animate(drone, [{ transform: current === 'none' ? 'none' : current }, { transform: 'translate(0px, 0px)' }], {
      duration: 180,
      easing: 'ease-out',
    });
  };

  const stopCharging = () => {
    charging.forEach((a) => a.cancel());
    charging = [];
  };

  const idleSaber = saber.animate(
    [{ transform: saberTransform(IDLE_ANGLE) }, { transform: saberTransform(IDLE_ANGLE - 4) }, { transform: saberTransform(IDLE_ANGLE) }],
    { duration: 2400, iterations: Infinity, easing: 'ease-in-out' },
  );

  startFloating();

  const fire = async (target) => {
    stopCharging();
    await settleDrone();
    sfx.blaster();
    await bolt(svg, EMITTER, target, { filter: 'pd-glow', duration: 240 });
  };

  return {
    async present() {
      if (!floating) startFloating();
    },

    threat(durationMs) {
      stopCharging();
      charging.push(
        eye.animate([{ opacity: 1 }, { opacity: 0.35 }, { opacity: 1 }], { duration: 700, iterations: Infinity }),
        charge.animate(
          [
            { transform: 'scale(0.6)', opacity: 0.8 },
            { transform: 'scale(1.8)', opacity: 0 },
          ],
          { duration: durationMs ? Math.min(900, durationMs / 4) : 1100, iterations: Infinity },
        ),
      );
    },

    async success() {
      idleSaber.pause();
      sfx.swing();
      const swing = animate(
        saber,
        [{ transform: saberTransform(IDLE_ANGLE) }, { transform: saberTransform(-15) }, { transform: saberTransform(BLOCK_ANGLE) }],
        { duration: 260, easing: 'ease-out' },
      );
      const [swingAnimation] = await Promise.all([swing, fire(INTERCEPT)]);
      sfx.deflect();
      sparks(svg, INTERCEPT, { color: '#b8ffc8' });
      await bolt(svg, INTERCEPT, { x: 380, y: -20 }, { filter: 'pd-glow', duration: 260 });
      const back = await animate(saber, [{ transform: saberTransform(BLOCK_ANGLE) }, { transform: saberTransform(IDLE_ANGLE) }], {
        duration: 350,
        easing: 'ease-in-out',
      });
      swingAnimation?.cancel();
      back?.cancel();
      idleSaber.play();
      startFloating();
    },

    async failure() {
      await fire(CHEST);
      sfx.hit();
      sparks(svg, CHEST, { color: '#ff9b6b' });
      mouth.setAttribute('d', 'M116 134 Q121 131 126 134');
      const puffs = Array.from({ length: 4 }, (_, i) => {
        const puff = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        puff.setAttribute('cx', String(CHEST.x + i * 4 - 6));
        puff.setAttribute('cy', String(CHEST.y));
        puff.setAttribute('r', String(6 + i * 2));
        puff.setAttribute('fill', '#a7adb8');
        svg.append(puff);
        return animate(
          puff,
          [
            { transform: 'translate(0px, 0px)', opacity: 0.8 },
            { transform: `translate(${i * 6 - 8}px, -40px)`, opacity: 0 },
          ],
          { duration: 900 + i * 120, easing: 'ease-out' },
        ).then(() => puff.remove());
      });
      await Promise.all([shake(kid, 6, 450), ...puffs]);
      await wait(150);
      mouth.setAttribute('d', 'M115 133 Q121 137 127 133');
      startFloating();
    },

    destroy() {
      stopCharging();
      svg.getAnimations?.({ subtree: true }).forEach((a) => a.cancel());
      svg.remove();
    },
  };
};
