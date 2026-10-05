import { colorFor, h, initials } from '../core/dom.js';
import { openPlayer } from '../player/player.js';

function logoBox(name, logo) {
  const box = h('div', { class: 'card__logo', style: { color: colorFor(name) } }, initials(name));
  if (logo) {
    const img = h('img', { src: logo, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' });
    // Si el logo no carga, se quedan las iniciales.
    img.addEventListener('load', () => box.replaceChildren(img), { once: true });
  }
  return box;
}

/**
 * Tarjeta de canal o película.
 * item: { key, name, logo?, category?, live? }
 */
export function mediaCard(item, { movie = false } = {}) {
  const live = item.live ?? !movie;
  return h(
    'button',
    {
      class: `card${movie ? ' card--movie' : ''}`,
      type: 'button',
      'data-focusable': true,
      'aria-label': `Reproducir ${item.name}`,
      onclick: () => openPlayer(item),
    },
    h('span', { class: `badge${live ? ' badge--live' : ''}`, text: live ? 'EN VIVO' : 'VOD' }),
    logoBox(item.name, item.logo),
    h('h3', { text: item.name }),
    item.category ? h('small', { text: item.category }) : null,
  );
}

export function section(title, content, link) {
  return h(
    'section',
    { class: 'section' },
    h('div', { class: 'section__head' }, h('h2', { text: title }), link ? h('a', { href: link.href, text: link.text }) : null),
    content,
  );
}

export function emptyState(message, action) {
  return h('div', { class: 'empty' }, h('p', { text: message }), action || null);
}

export function loading() {
  return h('div', { class: 'empty' }, h('div', { class: 'spinner', 'aria-hidden': 'true' }), h('p', { text: 'Cargando…' }));
}
