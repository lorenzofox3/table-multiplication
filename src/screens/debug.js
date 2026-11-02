import { createJediScene } from '../scenes/jedi.js';
import { createPadawanScene } from '../scenes/padawan.js';
import { createTroopersScene } from '../scenes/troopers.js';
import { h } from '../ui/dom.js';
import { backBar } from './common.js';

/** Plays scene animations on demand to tune them without playing a round (?debug). */
const SCENES = {
  padawan: createPadawanScene,
  troopers: createTroopersScene,
  jedi: createJediScene,
};

export const debugScreen = (_, { navigate }) => {
  const host = h('div', { class: 'scene-host' });
  const log = h('p', { class: 'debug-log' });
  let scene = null;
  let busy = false;
  let kind = 'standard';

  const mount = (name) => {
    scene?.destroy();
    host.innerHTML = '';
    scene = SCENES[name](host, {});
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
    ),
  );

  requestAnimationFrame(() => mount('padawan'));
  return { el, fullscreen: true, destroy: () => scene?.destroy() };
};
