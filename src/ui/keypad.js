import * as sfx from '../audio.js';
import { t } from '../i18n.js';
import { h } from './dom.js';
import { icons } from './icons.js';

const MAX_DIGITS = 3;

/**
 * On-screen numeric keypad (also driven by the physical keyboard).
 * @param {object} options
 * @param {(value: string) => void} options.onChange
 * @param {(value: number) => void} options.onSubmit
 */
export const createKeypad = ({ onChange, onSubmit }) => {
  let value = '';
  let enabled = false;

  const update = (next) => {
    value = next;
    onChange(value);
    submit.disabled = !enabled || value === '';
  };

  const press = (key) => {
    if (!enabled) return;
    if (key === 'erase') {
      if (value) update(value.slice(0, -1));
    } else if (key === 'submit') {
      if (value !== '') onSubmit(Number(value));
    } else if (value.length < MAX_DIGITS) {
      update(value === '0' ? key : value + key);
    }
  };

  const key = (label, action, className = '', ariaLabel) =>
    h(
      'button',
      {
        type: 'button',
        class: `key ${className}`,
        'aria-label': ariaLabel ?? label,
        onPointerdown: (event) => {
          event.preventDefault();
          sfx.click();
          press(action);
        },
        onClick: (event) => {
          // keyboard activation (Enter/Space on a focused key) — pointer presses are handled above
          if (event.detail === 0) press(action);
        },
      },
      label,
    );

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => key(d, d));
  const erase = key('', 'erase', 'key-erase', t.erase);
  erase.innerHTML = icons.erase;
  const submit = key('', 'submit', 'key-submit', t.validate);
  submit.innerHTML = icons.check;

  const el = h('div', { class: 'keypad', role: 'group' }, digits, erase, key('0', '0'), submit);

  const onKeydown = (event) => {
    if (!enabled) return;
    if (/^[0-9]$/.test(event.key)) press(event.key);
    else if (event.key === 'Backspace') press('erase');
    else if (event.key === 'Enter') press('submit');
    else return;
    event.preventDefault();
  };
  document.addEventListener('keydown', onKeydown);

  return {
    el,
    enable() {
      enabled = true;
      el.classList.remove('is-disabled');
      update('');
    },
    disable() {
      enabled = false;
      el.classList.add('is-disabled');
      submit.disabled = true;
    },
    destroy() {
      document.removeEventListener('keydown', onKeydown);
    },
  };
};
