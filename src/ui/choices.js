import { h } from './dom.js';

/** Two big answer buttons (Avancé mode). Keyboard: ← / → or 1 / 2. */
export const createChoices = ({ onPick }) => {
  let enabled = false;
  let values = [];
  const buttons = [0, 1].map((index) =>
    h('button', {
      type: 'button',
      class: 'choice',
      onClick: () => enabled && onPick(values[index]),
    }),
  );
  const el = h('div', { class: 'choices' }, buttons);

  const onKeydown = (event) => {
    if (!enabled) return;
    const index = { ArrowLeft: 0, 1: 0, ArrowRight: 1, 2: 1 }[event.key];
    if (index === undefined) return;
    event.preventDefault();
    onPick(values[index]);
  };
  document.addEventListener('keydown', onKeydown);

  return {
    el,
    set(next) {
      values = next;
      buttons.forEach((button, i) => {
        button.textContent = String(next[i]);
        button.className = 'choice';
      });
    },
    enable() {
      enabled = true;
      el.classList.remove('is-disabled');
    },
    disable() {
      enabled = false;
      el.classList.add('is-disabled');
    },
    mark(picked, expected) {
      buttons.forEach((button, i) => {
        if (values[i] === expected) button.classList.add('is-correct');
        else if (values[i] === picked) button.classList.add('is-wrong');
      });
    },
    destroy() {
      document.removeEventListener('keydown', onKeydown);
    },
  };
};
