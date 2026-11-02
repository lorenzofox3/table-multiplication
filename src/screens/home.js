import { t } from '../i18n.js';
import { CRYSTAL_COUNT, isKnight } from '../game/storage.js';
import { h } from '../ui/dom.js';
import { crystalSvg, icons } from '../ui/icons.js';

const LONG_PRESS_MS = 2000;

const modeCard = (mode, onClick) =>
  h(
    'button',
    { type: 'button', class: `mode-card mode-${mode}`, onClick },
    h('span', { class: 'mode-emblem', 'aria-hidden': 'true' }),
    h('span', { class: 'mode-text' }, h('span', { class: 'mode-name' }, t.modes[mode].name), h('span', { class: 'mode-hint' }, t.modes[mode].hint)),
  );

/** Gear button that only opens settings after a 2 s press (keeps little hands out). */
const settingsButton = (onOpen, onShortPress) => {
  let timer = null;
  let started = 0;
  const button = h('button', { type: 'button', class: 'icon-btn gear', 'aria-label': t.settingsHold, html: icons.gear });
  const ring = h('span', { class: 'gear-ring', 'aria-hidden': 'true' });
  button.append(ring);
  const cancel = () => {
    clearTimeout(timer);
    timer = null;
    button.classList.remove('is-holding');
  };
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    started = performance.now();
    button.classList.add('is-holding');
    timer = setTimeout(() => {
      cancel();
      onOpen();
    }, LONG_PRESS_MS);
  });
  button.addEventListener('pointerup', () => {
    if (timer && performance.now() - started < LONG_PRESS_MS) onShortPress();
    cancel();
  });
  button.addEventListener('pointerleave', cancel);
  button.addEventListener('pointercancel', cancel);
  button.addEventListener('contextmenu', (event) => event.preventDefault());
  // keyboard users: Enter opens directly
  button.addEventListener('keydown', (event) => event.key === 'Enter' && onOpen());
  return button;
};

export const homeScreen = (_, { store, navigate }) => {
  const state = store.get();
  const knight = isKnight(state);
  const hint = h('p', { class: 'toast', role: 'status' });
  let hintTimer = null;
  const showHint = () => {
    hint.textContent = t.settingsHold;
    hint.classList.add('is-visible');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => hint.classList.remove('is-visible'), 1800);
  };

  const crystals = h(
    'div',
    { class: 'crystals', 'aria-label': `${t.crystals} : ${state.crystals.length} / ${CRYSTAL_COUNT}` },
    Array.from({ length: CRYSTAL_COUNT }, (_, i) => h('span', { html: crystalSvg(i + 1, state.crystals.includes(i + 1)) })),
  );

  const el = h(
    'main',
    { class: 'screen home' },
    h('div', { class: 'top-bar' }, h('span'), settingsButton(() => navigate('settings'), showHint)),
    h(
      'header',
      { class: 'title-block' },
      h('h1', { class: 'title' }, t.appTitle),
      h('p', { class: 'subtitle' }, t.appSubtitle),
      knight ? h('p', { class: 'knight-badge' }, t.knight) : null,
    ),
    crystals,
    h(
      'nav',
      { class: 'modes' },
      modeCard('padawan', () => navigate('tables')),
      modeCard('advanced', () => navigate('variant', { mode: 'advanced' })),
      modeCard('jedi', () => navigate('variant', { mode: 'jedi' })),
    ),
    hint,
  );
  return { el, destroy: () => clearTimeout(hintTimer) };
};
