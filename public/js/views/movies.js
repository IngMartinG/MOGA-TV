import { h, mount } from '../core/dom.js';
import { api } from '../core/api.js';
import { store } from '../core/store.js';
import { mediaCard, section } from '../ui/cards.js';

export async function renderMovies(view) {
  const [catalog, { items: playlists }] = await Promise.all([store.loadCatalog(), api.playlists()]);
  const withMovies = playlists.filter((p) => p.movie_count > 0);

  mount(
    view,
    h(
      'div',
      { class: 'page' },
      h(
        'div',
        { class: 'page__head' },
        h('div', {}, h('h1', { text: 'Películas' }), h('p', { class: 'muted', text: 'Obras de dominio público y licencia abierta, más las películas de tus listas.' })),
      ),
      section(
        'Películas libres',
        h(
          'div',
          { class: 'grid' },
          catalog.movies.map((m) => mediaCard({ ...m, category: `${m.category} · ${m.year} · ${m.license}` }, { movie: true })),
        ),
      ),
      withMovies.length
        ? section(
            'Películas de tus listas',
            h(
              'div',
              { class: 'list' },
              withMovies.map((p) =>
                h(
                  'a',
                  { class: 'list-item', href: `#/listas/${p.id}?tipo=movie`, 'data-focusable': true },
                  h('div', {}, h('strong', { text: p.name }), h('small', { class: 'muted', text: `${p.movie_count} películas` })),
                  h('span', { class: 'btn btn--small', text: 'Ver' }),
                ),
              ),
            ),
          )
        : null,
    ),
  );
}
