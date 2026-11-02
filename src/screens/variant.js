import { t } from '../i18n.js';
import { h } from '../ui/dom.js';
import { backBar } from './common.js';

export const variantScreen = ({ mode }, { store, navigate }) => {
  const record = store.get().records[mode] ?? 0;
  const option = (variant, label, hint, extra) =>
    h(
      'button',
      { type: 'button', class: `variant-btn variant-${variant}`, onClick: () => navigate('play', { mode, variant }) },
      h('span', { class: 'variant-name' }, label),
      h('span', { class: 'variant-hint' }, hint),
      extra ? h('span', { class: 'variant-record' }, extra) : null,
    );
  const el = h(
    'main',
    { class: `screen variant mode-${mode}` },
    backBar(() => navigate('home')),
    h('h2', { class: 'screen-title' }, t.modes[mode].name),
    h('p', { class: 'screen-hint' }, t.modes[mode].hint),
    h(
      'div',
      { class: 'variant-list' },
      option('normal', t.normal, t.normalHint),
      option('diehard', t.diehard, t.diehardHint, t.record(record)),
    ),
  );
  return { el };
};
