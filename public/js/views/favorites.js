import { h, mount } from '../core/dom.js';
import { store } from '../core/store.js';
import { emptyState, mediaCard } from '../ui/cards.js';

export async function renderFavorites(view) {
  const items = await store.loadFavorites();
  mount(
    view,
    h(
      'div',
      { class: 'page' },
      h('div', { class: 'page__head' }, h('div', {}, h('h1', { text: 'Favoritos' }), h('p', { class: 'muted', text: 'Abre un canal y pulsa “☆ Favorito” para guardarlo aquí.' }))),
      items.length
        ? h('div', { class: 'grid' }, items.map((f) => mediaCard({ ...f, live: !f.key.startsWith('movie:') })))
        : emptyState('Todavía no tienes favoritos.', h('a', { class: 'btn btn--primary', href: '#/tv', text: 'Explorar canales' })),
    ),
  );
}
