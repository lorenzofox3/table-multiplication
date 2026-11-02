import { t } from '../i18n.js';
import { h } from './dom.js';

/** Minimal confirmation dialog. Resolves true on "yes". */
export const confirmDialog = (message) =>
  new Promise((resolve) => {
    const close = (answer) => {
      dialog.close();
      dialog.remove();
      resolve(answer);
    };
    const dialog = h(
      'dialog',
      { class: 'modal', onCancel: (event) => (event.preventDefault(), close(false)) },
      h('p', { class: 'modal-message' }, message),
      h(
        'div',
        { class: 'modal-actions' },
        h('button', { type: 'button', class: 'btn btn-ghost', onClick: () => close(false) }, t.no),
        h('button', { type: 'button', class: 'btn btn-primary', onClick: () => close(true) }, t.yes),
      ),
    );
    document.body.append(dialog);
    dialog.showModal();
  });
