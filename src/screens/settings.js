import { t } from '../i18n.js';
import { h } from '../ui/dom.js';
import { confirmDialog } from '../ui/modal.js';
import { backBar } from './common.js';

export const settingsScreen = (_, { store, navigate, applySettings }) => {
  const toggle = (key, label) => {
    const input = h('input', {
      type: 'checkbox',
      class: 'switch',
      checked: store.get().settings[key],
      onChange: (event) => {
        store.setSetting(key, event.target.checked);
        applySettings();
      },
    });
    return h('label', { class: 'setting' }, h('span', {}, label), input);
  };

  const el = h(
    'main',
    { class: 'screen settings' },
    backBar(() => navigate('home')),
    h('h2', { class: 'screen-title' }, t.settings),
    h(
      'div',
      { class: 'settings-list' },
      toggle('timers', t.settingTimers),
      toggle('voice', t.settingVoice),
      toggle('sound', t.settingSound),
    ),
    h(
      'button',
      {
        type: 'button',
        class: 'btn btn-danger',
        onClick: async () => {
          if (await confirmDialog(t.resetConfirm)) {
            store.resetProgress();
            navigate('home');
          }
        },
      },
      t.resetProgress,
    ),
    import.meta.env.DEV || location.search.includes('debug')
      ? h('button', { type: 'button', class: 'btn btn-ghost', onClick: () => navigate('debug') }, t.debug)
      : null,
  );
  return { el };
};
