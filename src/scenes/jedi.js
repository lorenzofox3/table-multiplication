import * as sfx from '../audio.js';
import { animate } from './fx.js';
import { createTargeting } from './targeting.js';
import { createTrench } from './trench.js';

/** Jedi mode: trench run (canvas, top view) with periodic cockpit targeting phases. */
export const createJediScene = (host) => {
  const canvas = document.createElement('canvas');
  canvas.className = 'scene-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  host.append(canvas);
  const trench = createTrench(canvas);
  const targeting = createTargeting(host);
  targeting.hide();

  let view = 'standard';
  let active = trench;

  const switchTo = async (kind) => {
    if (kind === view) return;
    sfx.whoosh();
    const outgoing = kind === 'targeting' ? canvas : host.querySelector('.scene-targeting');
    await animate(outgoing, [{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'none' });
    if (kind === 'targeting') {
      trench.pause();
      canvas.style.display = 'none';
      targeting.show();
    } else {
      targeting.hide();
      canvas.style.display = '';
      trench.resume();
    }
    const incoming = kind === 'targeting' ? host.querySelector('.scene-targeting') : canvas;
    await animate(incoming, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: 'none' });
    view = kind;
    active = kind === 'targeting' ? targeting : trench;
  };

  return {
    async present(question) {
      await switchTo(question.kind);
      active.present(question);
    },
    threat(durationMs) {
      active.threat(durationMs);
    },
    success() {
      return active.success();
    },
    failure() {
      return active.failure();
    },
    destroy() {
      trench.destroy();
      targeting.destroy();
      canvas.remove();
    },
  };
};
