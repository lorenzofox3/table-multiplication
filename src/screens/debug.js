import { createJediScene } from '../scenes/jedi.js';
import { createLevitationScene, MAX_LEVEL } from '../scenes/levitation.js';
import { createPadawanScene } from '../scenes/padawan.js';
import { createPlainsScene } from '../scenes/plains.js';
import { createRaceScene, ZONES } from '../scenes/race.js';
import { createTroopersScene } from '../scenes/troopers.js';
import { h } from '../ui/dom.js';
import { backBar } from './common.js';

/** Plays scene animations on demand to tune them without playing a round (?debug). */
const SCENES = {
  padawan: createPadawanScene,
  levitation: createLevitationScene,
  race: createRaceScene,
  troopers: createTroopersScene,
  plains: createPlainsScene,
  jedi: createJediScene,
};

export const debugScreen = (_, { navigate }) => {
  const host = h('div', { class: 'scene-host' });
  const log = h('p', { class: 'debug-log' });
  let scene = null;
  let busy = false;
  let kind = 'standard';
  let zone = 0;

  const mount = (name, options = {}) => {
    scene?.destroy();
    host.innerHTML = '';
    scene = SCENES[name](host, options);
    kind = 'standard';
    log.textContent = name;
  };

  const run = (label, action) => async () => {
    if (busy || !scene) return;
    busy = true;
    log.textContent = `${label}…`;
    try {
      await action();
      log.textContent = `${label} ✓`;
    } catch (error) {
      log.textContent = `${label} ✗ ${error.message}`;
    } finally {
      busy = false;
    }
  };

  const button = (label, onClick) => h('button', { type: 'button', class: 'btn btn-small', onClick }, label);

  const el = h(
    'main',
    { class: 'screen debug' },
    backBar(() => navigate('home')),
    h('div', { class: 'debug-row' }, Object.keys(SCENES).map((name) => button(name, () => mount(name)))),
    host,
    log,
    h(
      'div',
      { class: 'debug-row' },
      button('present', run('present', () => scene.present({ kind }))),
      button('cockpit ⇄', run('switch', () => {
        kind = kind === 'standard' ? 'targeting' : 'standard';
        return scene.present({ kind });
      })),
      button('threat 5s', run('threat', () => scene.threat(5000))),
      button('threat ∞', run('threat', () => scene.threat(null))),
      button('success', run('success', () => scene.success())),
      button('failure', run('failure', () => scene.failure())),
      button('finale 10/10', run('finale', () => {
        mount('levitation', { level: MAX_LEVEL - 1 });
        return scene.success();
      })),
      button('race: next zone', run('next zone', () => {
        // mount just before the zone starts so the next present plays the transition into it
        zone = (zone + 1) % ZONES.length;
        const start = ZONES.slice(0, zone).reduce((sum, z) => sum + z.questions, 0);
        mount('race', { question: start });
        return scene.present({});
      })),
      button('race: finish 10/10', run('race finish', async () => {
        mount('race', { question: 9, successes: 9 });
        await scene.present({});
        return scene.success();
      })),
      button('plains: next wave', run('next wave', async () => {
        // one droid left: knock it down, then the next present marches a new wave over the hill
        mount('plains', { remaining: 1 });
        await scene.present({});
        await scene.success();
        return scene.present({});
      })),
    ),
  );

  requestAnimationFrame(() => mount('padawan'));
  return { el, fullscreen: true, destroy: () => scene?.destroy() };
};
