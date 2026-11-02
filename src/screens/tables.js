import { t } from '../i18n.js';
import { h } from '../ui/dom.js';
import { crystalSvg } from '../ui/icons.js';
import { backBar } from './common.js';

export const tablesScreen = (_, { store, navigate }) => {
  const { crystals } = store.get();
  const el = h(
    'main',
    { class: 'screen tables' },
    backBar(() => navigate('home')),
    h('h2', { class: 'screen-title' }, t.chooseTable),
    h(
      'div',
      { class: 'table-grid' },
      Array.from({ length: 10 }, (_, i) => {
        const table = i + 1;
        return h(
          'button',
          {
            type: 'button',
            class: 'table-btn',
            'aria-label': t.table(table),
            onClick: () => navigate('play', { mode: 'padawan', variant: 'normal', table }),
          },
          h('span', { class: 'table-number' }, `× ${table}`),
          h('span', { html: crystalSvg(table, crystals.includes(table)) }),
        );
      }),
    ),
  );
  return { el };
};
