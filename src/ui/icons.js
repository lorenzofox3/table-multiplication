/** Inline SVG icons and the kyber crystal badge. */

export const CRYSTAL_HUES = [200, 130, 50, 280, 0, 170, 320, 30, 240, 90];

export const crystalSvg = (table, collected) => {
  const hue = CRYSTAL_HUES[(table - 1) % CRYSTAL_HUES.length];
  const fill = collected ? `hsl(${hue} 95% 60%)` : 'transparent';
  const stroke = collected ? `hsl(${hue} 100% 80%)` : 'rgb(255 255 255 / 0.25)';
  return `<svg viewBox="0 0 24 32" class="crystal ${collected ? 'is-collected' : ''}" style="--hue:${hue}" aria-hidden="true">
    <path d="M12 1 L21 9 L18 27 L12 31 L6 27 L3 9 Z" fill="${fill}" stroke="${stroke}" stroke-width="1.5" stroke-linejoin="round"/>
    ${collected ? '<path d="M12 1 L9 10 L12 31 M3 9 L9 10 L21 9" stroke="rgb(255 255 255 / 0.55)" stroke-width="1" fill="none"/>' : ''}
  </svg>`;
};

export const icons = {
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>',
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.4-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.3h-4l-.4 2.7a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.4L6.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.4 2.5-1a7.4 7.4 0 0 0 1.7 1l.4 2.7h4l.4-2.7a7.4 7.4 0 0 0 1.7-1l2.5 1 2-3.4zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" transform="translate(-1 0)"/></svg>',
  soundOn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
  soundOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9l6 6M22 9l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  erase: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5h11v14H9l-6-7z" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/><path d="M12 9l6 6M18 9l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  star: (on) =>
    `<svg viewBox="0 0 24 24" class="star ${on ? 'is-on' : ''}" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" stroke-linejoin="round"/></svg>`,
};
