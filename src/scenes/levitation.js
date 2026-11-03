import * as sfx from '../audio.js';
import { ROUND_LENGTH } from '../game/round.js';
import { SVG_NS, animate, createSvg, glowFilter, prefersReducedMotion, settle, wait } from './fx.js';

/**
 * Padawan "levitation" scene: an alien apprentice in a one-hand handstand lifts objects with the Force.
 * The objects float higher with every correct answer and crash down on a miss.
 */

const FLOOR_Y = 262;
const CEILING_Y = 12;
/** Support hand on the floor: the apprentice tumbles around it. */
const HAND = { x: 168, y: 260 };
/** Raised hand reaching toward the objects. */
const PALM = { x: 228, y: 192 };
/** Centre of the finale orbit. */
const ORBIT = { x: 184, y: 158, rx: 126, ry: 96 };
const STEP = 18;
const FORCE = '#6ff5e3';

/** Objects at rest on the floor. `top` is the highest drawn y, `anchor` the visual centre. */
export const OBJECTS = Object.freeze([
  { id: 'crate', x: 62, anchorY: 241, top: 220, width: 46, height: 42, extra: 4, bob: 2600 },
  { id: 'helmet', x: 120, anchorY: 249, top: 236, width: 28, height: 26, extra: 36, bob: 2100 },
  { id: 'droid', x: 262, anchorY: 242, top: 222, width: 32, height: 40, extra: 20, bob: 2900 },
  { id: 'boulder', x: 318, anchorY: 246, top: 228, width: 46, height: 34, extra: 26, bob: 2400 },
]);

/** How far (px) an object is lifted at a given level (number of correct answers). On the floor at 0. */
export const liftFor = (object, level) => (level > 0 ? level * STEP + object.extra : 0);

export { CEILING_Y, ROUND_LENGTH as MAX_LEVEL };

const rotation = (deg) => `translate(${HAND.x}px, ${HAND.y}px) rotate(${deg}deg) translate(${-HAND.x}px, ${-HAND.y}px)`;
const lifted = (lift) => `translate(0px, ${-lift}px)`;
const shadowScale = (lift) => Math.max(0.35, 1 - lift / 320);

const objectMarkup = {
  crate: `
    <rect x="39" y="220" width="46" height="42" rx="3" fill="#8a5a2b" stroke="#5b3a1a" stroke-width="2"/>
    <rect x="44" y="225" width="36" height="32" rx="1" fill="none" stroke="#6e4520" stroke-width="2"/>
    <path d="M45 226 L79 256 M79 226 L45 256" stroke="#6e4520" stroke-width="4" stroke-linecap="round"/>
    <rect x="58" y="236" width="8" height="10" rx="1" fill="#c7a35a"/>`,
  helmet: `
    <path d="M106 262 V252 Q106 236 120 236 Q134 236 134 252 V262 Z" fill="#d9dde3"/>
    <path d="M106 258 h28" stroke="#9aa3b2" stroke-width="2"/>
    <rect x="109" y="247" width="22" height="6" rx="3" fill="#1a2233"/>
    <circle cx="127" cy="250" r="1.4" fill="#9fd8ff"/>
    <path d="M113 240 Q120 237 127 240" stroke="#fff" stroke-width="1.5" fill="none" opacity="0.7"/>`,
  droid: `
    <rect x="246" y="256" width="32" height="6" rx="3" fill="#4a5262"/>
    <rect x="248" y="238" width="28" height="20" rx="3" fill="#c9ced8"/>
    <path d="M248 240 Q248 222 262 222 Q276 222 276 240 Z" fill="#8fb4e0"/>
    <path d="M252 232 h20" stroke="#5f7fae" stroke-width="1.5"/>
    <g data-part="droid-calm">
      <circle cx="262" cy="230" r="3.5" fill="#7dffb0" data-part="droid-light"/>
      <path d="M256 249 h12" stroke="#5a6272" stroke-width="2" stroke-linecap="round"/>
    </g>
    <g data-part="droid-worried" display="none">
      <circle cx="257" cy="231" r="1.8" fill="#1a2233"/>
      <circle cx="267" cy="231" r="1.8" fill="#1a2233"/>
      <path d="M253.5 228.5 L259 226 M270.5 228.5 L265 226" stroke="#1a2233" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M255 249 q1.75 -2 3.5 0 t3.5 0 t3.5 0 t3.5 0" stroke="#5a6272" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    </g>`,
  boulder: `
    <path d="M296 262 Q291 240 306 232 Q318 224 332 232 Q345 243 340 262 Z" fill="#6d6a74"/>
    <path d="M302 244 Q310 236 320 238" stroke="#8e8b96" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M326 246 l6 6 l-2 6" stroke="#4b4952" stroke-width="2" fill="none" stroke-linecap="round"/>
    <circle cx="312" cy="252" r="2.5" fill="#57545e"/>`,
};

const objectGroup = (o) => `
  <g data-obj="${o.id}">
    <g data-bob="${o.id}">
      <ellipse cx="${o.x}" cy="${o.anchorY}" rx="${o.width / 2 + 9}" ry="${o.height / 2 + 9}" fill="none"
        stroke="${FORCE}" stroke-width="3" opacity="0" filter="url(#lv-glow)" data-shimmer="${o.id}"/>
      ${objectMarkup[o.id]}
    </g>
  </g>`;

const shadow = (o) =>
  `<ellipse cx="${o.x}" cy="${FLOOR_Y + 2}" rx="${o.width / 2}" ry="4" fill="#000" opacity="0.45"
    style="transform-box: fill-box; transform-origin: center" data-shadow="${o.id}"/>`;

const SKIN = '#5cc3b8';
const SKIN_DARK = '#3f9e94';
const HAIR = '#1d1a2e';
const TUNIC = '#24408f';
const PANTS = '#1b2547';
const SASH = '#e0a83a';
const BOOTS = '#3b2516';

const markup = `
  <defs>
    ${glowFilter('lv-glow', 3)}
    ${glowFilter('lv-glow-soft', 7)}
    <radialGradient id="lv-room" cx="50%" cy="40%" r="75%">
      <stop offset="0" stop-color="#2e3c6e"/>
      <stop offset="1" stop-color="#0a0f1f"/>
    </radialGradient>
    <linearGradient id="lv-floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#20294a"/>
      <stop offset="1" stop-color="#0b1122"/>
    </linearGradient>
  </defs>
  <rect x="-400" y="-400" width="1160" height="1100" fill="#0a0f1f"/>
  <rect x="-60" y="-60" width="480" height="420" fill="url(#lv-room)"/>
  <!-- arched windows -->
  <g>
    <path d="M24 230 V96 Q24 58 56 58 Q88 58 88 96 V230 Z" fill="#03060f" stroke="#3a5280" stroke-width="4"/>
    <path d="M272 230 V96 Q272 58 304 58 Q336 58 336 96 V230 Z" fill="#03060f" stroke="#3a5280" stroke-width="4"/>
    <g fill="#fff">
      <circle cx="40" cy="92" r="1.1"/><circle cx="66" cy="80" r="0.8"/><circle cx="52" cy="130" r="1.3"/>
      <circle cx="74" cy="160" r="0.9"/><circle cx="36" cy="190" r="1"/>
      <circle cx="290" cy="100" r="1"/><circle cx="318" cy="84" r="1.3"/><circle cx="300" cy="150" r="0.8"/>
      <circle cx="324" cy="176" r="1.1"/><circle cx="286" cy="200" r="0.9"/>
    </g>
    <circle cx="316" cy="118" r="12" fill="#c9d4e8" opacity="0.8"/>
    <circle cx="321" cy="114" r="10" fill="#03060f"/>
  </g>
  <!-- ceiling -->
  <rect x="-400" y="-400" width="1160" height="${400 + CEILING_Y}" fill="#0d152b"/>
  <path d="M-400 ${CEILING_Y} H760" stroke="#3d5a8a" stroke-width="3"/>
  <!-- floor -->
  <rect x="-400" y="${FLOOR_Y}" width="1160" height="400" fill="url(#lv-floor)"/>
  <path d="M-400 ${FLOOR_Y} H760" stroke="#34497a" stroke-width="2"/>
  <rect x="134" y="${FLOOR_Y - 1}" width="96" height="7" rx="3" fill="#7a3b2e" opacity="0.85"/>

  ${OBJECTS.map(shadow).join('')}

  <!-- apprentice, handstand pose -->
  <g data-part="stand">
    <!-- legs -->
    <path d="M174 172 L166 122" stroke="${PANTS}" stroke-width="11" stroke-linecap="round"/>
    <path d="M190 172 L200 120" stroke="${PANTS}" stroke-width="11" stroke-linecap="round"/>
    <ellipse cx="165" cy="114" rx="7" ry="9" fill="${BOOTS}"/>
    <ellipse cx="201" cy="112" rx="7" ry="9" fill="${BOOTS}"/>
    <!-- head (upside down: chin up, top of the head toward the floor) -->
    <rect x="185" y="214" width="10" height="12" fill="${SKIN_DARK}"/>
    <path d="M176 235 L163 246 L177 242 Z" fill="${SKIN}"/>
    <path d="M204 235 L217 246 L203 242 Z" fill="${SKIN}"/>
    <circle cx="190" cy="239" r="15" fill="${SKIN}"/>
    <path d="M175 241 Q176 254 190 254 Q204 254 205 241 Q198 247 190 247 Q182 247 175 241 Z" fill="${HAIR}"/>
    <circle cx="190" cy="257.5" r="4.5" fill="${HAIR}"/>
    <circle cx="180" cy="236" r="2.6" fill="#f59a8b" opacity="0.45"/>
    <circle cx="200" cy="236" r="2.6" fill="#f59a8b" opacity="0.45"/>
    <g data-part="eyes-open">
      <circle cx="184.5" cy="242" r="2.8" fill="#14202a"/>
      <circle cx="195.5" cy="242" r="2.8" fill="#14202a"/>
      <circle cx="185.3" cy="243" r="0.9" fill="#fff"/>
      <circle cx="196.3" cy="243" r="0.9" fill="#fff"/>
    </g>
    <g data-part="eyes-closed" display="none" stroke="#14202a" stroke-width="1.6" fill="none" stroke-linecap="round">
      <path d="M182 241 Q184.5 243.5 187 241"/>
      <path d="M193 241 Q195.5 243.5 198 241"/>
    </g>
    <path data-part="mouth-smile" d="M185.5 231 Q190 227 194.5 231" stroke="#1f4d48" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <path data-part="mouth-flat" display="none" d="M186.5 230 H193.5" stroke="#1f4d48" stroke-width="1.8" stroke-linecap="round"/>
    <ellipse data-part="mouth-o" display="none" cx="190" cy="230" rx="2.4" ry="2.8" fill="#1f3a38"/>
    <!-- tunic and sash -->
    <path d="M166 216 Q183 222 201 216 L196 170 Q182 166 169 170 Z" fill="${TUNIC}"/>
    <rect x="167" y="172" width="31" height="7" rx="2" fill="${SASH}"/>
    <path d="M194 178 Q201 192 197 207" stroke="${SASH}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <!-- support arm -->
    <path d="M171 214 L168 258" stroke="${SKIN}" stroke-width="9" stroke-linecap="round"/>
    <path d="M171 213 L170.3 225" stroke="${TUNIC}" stroke-width="12" stroke-linecap="butt"/>
    <ellipse cx="${HAND.x}" cy="${HAND.y}" rx="7" ry="3.5" fill="${SKIN}"/>
    <!-- raised arm -->
    <path d="M198 211 Q212 205 ${PALM.x - 3} ${PALM.y + 3}" stroke="${SKIN}" stroke-width="8.5" stroke-linecap="round" fill="none"/>
    <path d="M198 211 L207 207" stroke="${TUNIC}" stroke-width="11.5"/>
    <circle cx="${PALM.x}" cy="${PALM.y}" r="5.5" fill="${SKIN}"/>
  </g>

  <!-- apprentice, sitting after a tumble -->
  <g data-part="sit" style="opacity: 0">
    <path d="M172 214 L151 256" stroke="${SKIN}" stroke-width="8" stroke-linecap="round"/>
    <path d="M197 214 L218 256" stroke="${SKIN}" stroke-width="8" stroke-linecap="round"/>
    <path d="M177 250 L164 262" stroke="${PANTS}" stroke-width="11" stroke-linecap="round"/>
    <path d="M192 250 L206 262" stroke="${PANTS}" stroke-width="11" stroke-linecap="round"/>
    <ellipse cx="159" cy="264" rx="8" ry="5" fill="${BOOTS}"/>
    <ellipse cx="211" cy="264" rx="8" ry="5" fill="${BOOTS}"/>
    <path d="M168 254 Q184 258 201 254 L197 212 Q184 206 172 212 Z" fill="${TUNIC}"/>
    <rect x="170" y="238" width="29" height="6" rx="2" fill="${SASH}"/>
    <rect x="179.5" y="198" width="10" height="12" fill="${SKIN_DARK}"/>
    <path d="M171 192 L157 181 L172 186 Z" fill="${SKIN}"/>
    <path d="M198 192 L212 181 L197 186 Z" fill="${SKIN}"/>
    <circle cx="184.5" cy="190" r="15" fill="${SKIN}"/>
    <path d="M169.5 188 Q170.5 175 184.5 175 Q198.5 175 199.5 188 Q192 182 184.5 182 Q177 182 169.5 188 Z" fill="${HAIR}"/>
    <circle cx="184.5" cy="171" r="5" fill="${HAIR}"/>
    <circle cx="178.5" cy="190" r="3" fill="#14202a"/>
    <circle cx="190.5" cy="190" r="3" fill="#14202a"/>
    <circle cx="179.4" cy="189" r="1" fill="#fff"/>
    <circle cx="191.4" cy="189" r="1" fill="#fff"/>
    <ellipse cx="184.5" cy="199" rx="2.5" ry="3" fill="#1f3a38"/>
    <g data-part="dizzy" fill="#ffe28a">
      <path d="M166 158 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 z"/>
      <path d="M201 152 l1.6 4 l4 1.6 l-4 1.6 l-1.6 4 l-1.6 -4 l-4 -1.6 l4 -1.6 z"/>
      <path d="M186 146 l1.2 3 l3 1.2 l-3 1.2 l-1.2 3 l-1.2 -3 l-3 -1.2 l3 -1.2 z"/>
    </g>
  </g>

  <!-- the Force -->
  <circle cx="${PALM.x}" cy="${PALM.y}" r="7" fill="none" stroke="${FORCE}" stroke-width="2" opacity="0"
    style="transform-box: fill-box; transform-origin: center" data-part="ripple"/>
  <circle cx="${PALM.x}" cy="${PALM.y}" r="7" fill="none" stroke="${FORCE}" stroke-width="2" opacity="0"
    style="transform-box: fill-box; transform-origin: center" data-part="ripple"/>
  <circle cx="${PALM.x}" cy="${PALM.y}" r="9" fill="#b6fff4" opacity="0" filter="url(#lv-glow-soft)"
    style="transform-box: fill-box; transform-origin: center" data-part="pulse"/>
  <ellipse cx="${ORBIT.x}" cy="${ORBIT.y}" rx="${ORBIT.rx}" ry="${ORBIT.ry}" fill="none" stroke="${FORCE}" stroke-width="6"
    opacity="0" filter="url(#lv-glow-soft)" data-part="aura"/>

  ${OBJECTS.map(objectGroup).join('')}
`;

/**
 * @param {HTMLElement} host
 * @param {object} [options]
 * @param {number} [options.level] starting level (debug page only)
 */
export const createLevitationScene = (host, { level: startLevel = 0 } = {}) => {
  const svg = createSvg('0 0 360 300', markup, 'scene-levitation');
  host.append(svg);
  const part = (name) => svg.querySelector(`[data-part="${name}"]`);
  const stand = part('stand');
  const sit = part('sit');
  const dizzy = part('dizzy');
  const pulse = part('pulse');
  const aura = part('aura');
  const ripples = [...svg.querySelectorAll('[data-part="ripple"]')];
  const droidCalm = part('droid-calm');
  const droidWorried = part('droid-worried');
  const droidLight = part('droid-light');
  const reduced = prefersReducedMotion();

  const items = OBJECTS.map((object) => ({
    ...object,
    group: svg.querySelector(`[data-obj="${object.id}"]`),
    bobber: svg.querySelector(`[data-bob="${object.id}"]`),
    shimmer: svg.querySelector(`[data-shimmer="${object.id}"]`),
    shadow: svg.querySelector(`[data-shadow="${object.id}"]`),
    lift: 0,
  }));

  let alive = true;
  let level = Math.max(0, Math.min(ROUND_LENGTH, startLevel));
  let pose = 'stand';
  let bobbing = [];
  let rippling = [];

  const sound = (play) => alive && play();

  const setFace = (eyes, mouth) => {
    for (const name of ['eyes-open', 'eyes-closed']) part(name).setAttribute('display', name === `eyes-${eyes}` ? 'inline' : 'none');
    for (const name of ['mouth-smile', 'mouth-flat', 'mouth-o']) {
      part(name).setAttribute('display', name === `mouth-${mouth}` ? 'inline' : 'none');
    }
  };

  const setDroidWorried = (worried) => {
    droidCalm.setAttribute('display', worried ? 'none' : 'inline');
    droidWorried.setAttribute('display', worried ? 'inline' : 'none');
  };

  const placeItem = (item, lift) => {
    item.lift = lift;
    item.group.style.transform = lifted(lift);
    item.shadow.style.transform = `scale(${shadowScale(lift)})`;
    item.shadow.style.opacity = String(0.45 * shadowScale(lift));
  };

  const startBobbing = () => {
    if (reduced || bobbing.length) return;
    bobbing = items.map((item, i) =>
      item.bobber.animate(
        [{ transform: 'translate(0px, 0px)' }, { transform: 'translate(0px, -4px)' }, { transform: 'translate(0px, 0px)' }],
        { duration: item.bob, delay: -i * 650, iterations: Infinity, easing: 'ease-in-out' },
      ),
    );
    bobbing.push(droidLight.animate([{ opacity: 1 }, { opacity: 0.25 }, { opacity: 1 }], { duration: 1400, iterations: Infinity }));
  };

  const stopBobbing = () => {
    bobbing.forEach((a) => a.cancel());
    bobbing = [];
  };

  const startRipples = () => {
    stopRipples();
    rippling = ripples.map((ring, i) =>
      ring.animate(
        [
          { transform: 'scale(1)', opacity: 0.7 },
          { transform: 'scale(3.6)', opacity: 0 },
        ],
        { duration: reduced ? 2600 : 1800, delay: i * (reduced ? 1300 : 900), iterations: Infinity, easing: 'ease-out' },
      ),
    );
  };

  function stopRipples() {
    rippling.forEach((a) => a.cancel());
    rippling = [];
  }

  const shimmer = () =>
    Promise.all(
      items.map((item, i) =>
        animate(item.shimmer, [{ opacity: 0 }, { opacity: 0.85, offset: 0.35 }, { opacity: 0 }], {
          duration: 900,
          delay: i * 60,
          easing: 'ease-out',
          fill: 'none',
        }),
      ),
    );

  const pulseHand = () =>
    animate(
      pulse,
      [
        { transform: 'scale(0.6)', opacity: 0 },
        { transform: 'scale(1.6)', opacity: 0.9, offset: 0.3 },
        { transform: 'scale(2.4)', opacity: 0 },
      ],
      { duration: 700, easing: 'ease-out', fill: 'none' },
    );

  /** Floats every object to the height of `target` level. */
  const liftTo = (target, duration) =>
    Promise.all(
      items.map((item, i) => {
        const to = liftFor(item, target);
        const from = item.lift;
        item.lift = to;
        const options = { duration, delay: i * 70, easing: 'cubic-bezier(0.3, 0.7, 0.4, 1)' };
        return Promise.all([
          settle(item.group, [{ transform: lifted(from) }, { transform: lifted(to) }], options),
          settle(
            item.shadow,
            [
              { transform: `scale(${shadowScale(from)})`, opacity: String(0.45 * shadowScale(from)) },
              { transform: `scale(${shadowScale(to)})`, opacity: String(0.45 * shadowScale(to)) },
            ],
            options,
          ),
        ]);
      }),
    );

  const dust = (x) =>
    Promise.all(
      [-1, 1].flatMap((side) =>
        [0, 1].map((k) => {
          const puff = document.createElementNS(SVG_NS, 'circle');
          puff.setAttribute('cx', String(x + side * (6 + k * 6)));
          puff.setAttribute('cy', String(FLOOR_Y - 3));
          puff.setAttribute('r', String(4 + k * 2));
          puff.setAttribute('fill', '#a7adb8');
          svg.append(puff);
          return animate(
            puff,
            [
              { transform: 'translate(0px, 0px)', opacity: 0.7 },
              { transform: `translate(${side * (14 + k * 8)}px, -10px)`, opacity: 0 },
            ],
            { duration: 600 + k * 120, easing: 'ease-out' },
          ).then(() => puff.remove());
        }),
      ),
    );

  /** Every lifted object crashes down, each with a thud, a bounce and a puff of dust. */
  const dropAll = () =>
    Promise.all(
      items.map(async (item, i) => {
        const from = item.lift;
        if (from === 0) return;
        placeItem(item, from);
        item.lift = 0;
        if (reduced) {
          await settle(item.group, [{ opacity: 1 }, { opacity: 0 }], { duration: 220, delay: i * 50 });
          placeItem(item, 0);
          await settle(item.group, [{ opacity: 0 }, { opacity: 1 }], { duration: 260 });
          return;
        }
        const duration = 240 + Math.sqrt(from) * 22;
        const options = { duration, delay: i * 80, easing: 'cubic-bezier(0.55, 0, 1, 0.45)' };
        await Promise.all([
          settle(item.group, [{ transform: lifted(from) }, { transform: lifted(0) }], options),
          settle(
            item.shadow,
            [
              { transform: `scale(${shadowScale(from)})`, opacity: String(0.45 * shadowScale(from)) },
              { transform: 'scale(1)', opacity: '0.45' },
            ],
            options,
          ),
        ]);
        sound(sfx.thud);
        await Promise.all([
          dust(item.x),
          settle(item.group, [{ transform: lifted(0) }, { transform: lifted(7) }, { transform: lifted(0) }], {
            duration: 260,
            easing: 'ease-out',
          }),
        ]);
      }),
    );

  const wobble = () =>
    reduced
      ? Promise.resolve()
      : settle(
          stand,
          [-0, -5, 4, -6, 3, 0].map((deg) => ({ transform: rotation(deg) })),
          { duration: 520, easing: 'ease-in-out' },
        );

  /** The apprentice loses balance and lands sitting on the floor. */
  const tumble = async () => {
    pose = 'sit';
    if (reduced) {
      await Promise.all([
        settle(stand, [{ opacity: 1 }, { opacity: 0 }], { duration: 350 }),
        settle(sit, [{ opacity: 0 }, { opacity: 1 }], { duration: 350 }),
      ]);
      sound(sfx.oof);
      return;
    }
    await settle(stand, [{ transform: rotation(0), opacity: 1 }, { transform: rotation(75), opacity: 0 }], {
      duration: 300,
      easing: 'ease-in',
    });
    await settle(sit, [{ transform: 'translate(0px, -26px)', opacity: 0 }, { transform: 'translate(0px, 0px)', opacity: 1 }], {
      duration: 240,
      easing: 'ease-in',
    });
    sound(sfx.oof);
    animate(dizzy, [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], {
      duration: 1100,
    });
  };

  /** Back into the handstand. */
  const standUp = async () => {
    pose = 'stand';
    sound(sfx.whoosh);
    if (reduced) {
      stand.style.transform = rotation(0);
      await Promise.all([
        settle(sit, [{ opacity: 1 }, { opacity: 0 }], { duration: 350 }),
        settle(stand, [{ opacity: 0 }, { opacity: 1 }], { duration: 350 }),
      ]);
      return;
    }
    await settle(sit, [{ transform: 'translate(0px, 0px)', opacity: 1 }, { transform: 'translate(0px, -12px)', opacity: 0 }], {
      duration: 200,
      easing: 'ease-in',
    });
    await settle(
      stand,
      [
        { transform: rotation(-80), opacity: 0 },
        { transform: rotation(8), opacity: 1, offset: 0.75 },
        { transform: rotation(0), opacity: 1 },
      ],
      { duration: 520, easing: 'ease-out' },
    );
  };

  /** 10/10: the objects spin in a circle around the apprentice, then settle back. */
  const finale = async () => {
    stopBobbing();
    sound(sfx.whoosh);
    if (reduced) {
      await Promise.all([
        animate(aura, [{ opacity: 0 }, { opacity: 0.5, offset: 0.4 }, { opacity: 0 }], { duration: 2000, fill: 'none' }),
        shimmer(),
      ]);
      startBobbing();
      return;
    }
    const turns = 2;
    const steps = 48;
    const duration = 2800;
    const auraGlow = animate(aura, [{ opacity: 0 }, { opacity: 0.35, offset: 0.2 }, { opacity: 0.35, offset: 0.8 }, { opacity: 0 }], {
      duration,
      fill: 'none',
    });
    setTimeout(() => sound(sfx.whoosh), duration / 2);
    await Promise.all([
      auraGlow,
      ...items.map((item, i) => {
        const start = -Math.PI / 2 + (i * Math.PI * 2) / items.length;
        const home = { transform: lifted(item.lift), offset: 0 };
        const orbit = Array.from({ length: steps + 1 }, (_, k) => {
          const angle = start + (k / steps) * turns * Math.PI * 2;
          const x = ORBIT.x + ORBIT.rx * Math.cos(angle) - item.x;
          const y = ORBIT.y + ORBIT.ry * Math.sin(angle) - item.anchorY;
          return { transform: `translate(${x}px, ${y}px)`, offset: 0.15 + (k / steps) * 0.7 };
        });
        return Promise.all([
          settle(item.group, [home, ...orbit, { transform: lifted(item.lift), offset: 1 }], { duration, easing: 'ease-in-out' }),
          animate(item.shimmer, [{ opacity: 0 }, { opacity: 0.8, offset: 0.2 }, { opacity: 0.8, offset: 0.8 }, { opacity: 0 }], {
            duration,
            fill: 'none',
          }),
        ]);
      }),
    ]);
    startBobbing();
  };

  items.forEach((item) => placeItem(item, liftFor(item, level)));
  stand.style.transform = rotation(0);
  startBobbing();

  return {
    async present() {
      if (pose === 'sit') await standUp();
      if (!alive) return;
      setFace('open', 'smile');
      if (items.some((item) => item.lift !== liftFor(item, level))) {
        setFace('closed', 'flat');
        sound(sfx.whoosh);
        await Promise.all([pulseHand(), shimmer(), liftTo(level, 800)]);
        setDroidWorried(false);
        setFace('open', 'smile');
      }
      startBobbing();
    },

    threat() {
      setFace('closed', 'flat');
      startRipples();
    },

    async success() {
      stopRipples();
      level = Math.min(level + 1, ROUND_LENGTH);
      setFace('open', 'smile');
      sound(sfx.whoosh);
      await Promise.all([pulseHand(), shimmer(), liftTo(level, 700)]);
      if (alive && level >= ROUND_LENGTH) await finale();
    },

    async failure() {
      stopRipples();
      setFace('open', 'o');
      setDroidWorried(true);
      await wobble();
      stopBobbing();
      await Promise.all([dropAll(), tumble()]);
      await wait(300);
    },

    destroy() {
      alive = false;
      stopRipples();
      stopBobbing();
      svg.getAnimations?.({ subtree: true }).forEach((a) => a.cancel());
      svg.remove();
    },
  };
};
