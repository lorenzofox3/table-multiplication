import { t } from '../i18n.js';
import { h } from '../ui/dom.js';
import { icons } from '../ui/icons.js';

export const backBar = (onBack) =>
  h(
    'div',
    { class: 'top-bar' },
    h('button', { type: 'button', class: 'icon-btn', 'aria-label': t.back, onClick: onBack, html: icons.back }),
  );
