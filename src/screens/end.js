import * as sfx from '../audio.js';
import { t } from '../i18n.js';
import { h } from '../ui/dom.js';
import { crystalSvg, icons } from '../ui/icons.js';

export const endScreen = ({ summary, outcome, params }, { navigate }) => {
  const diehard = summary.variant === 'diehard';
  const celebrate = summary.perfect || outcome.newRecord || outcome.newCrystal;
  if (celebrate) setTimeout(sfx.fanfare, 300);

  const el = h(
    'main',
    { class: `screen end mode-${summary.mode}` },
    h('h2', { class: 'screen-title' }, diehard ? t.fallen : t.missionComplete),
    diehard
      ? h('p', { class: 'big-score' }, t.diehardScore(summary.score))
      : h('p', { class: 'big-score' }, t.score(summary.correct, summary.answered)),
    diehard ? null : h('div', { class: 'stars', html: [1, 2, 3].map((n) => icons.star(n <= summary.stars)).join('') }),
    summary.mode === 'jedi' ? h('p', { class: 'end-line' }, t.fighters(summary.fightersDestroyed)) : null,
    outcome.newRecord ? h('p', { class: 'end-line is-highlight' }, t.newRecord) : null,
    outcome.newCrystal
      ? h('div', { class: 'end-crystal' }, h('span', { html: crystalSvg(summary.table, true) }), h('p', {}, t.newCrystal(summary.table)))
      : null,
    outcome.knighted ? h('p', { class: 'end-line is-highlight' }, t.knighted) : null,
    h(
      'div',
      { class: 'end-actions' },
      h('button', { type: 'button', class: 'btn btn-primary', onClick: () => navigate('play', params) }, t.playAgain),
      h('button', { type: 'button', class: 'btn btn-ghost', onClick: () => navigate(summary.mode === 'padawan' ? 'tables' : 'home') }, t.menu),
    ),
  );
  return { el };
};
