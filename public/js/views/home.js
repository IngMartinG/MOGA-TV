import { h, mount } from '../core/dom.js';
import { api } from '../core/api.js';
import { store } from '../core/store.js';
import { emptyState, loading, mediaCard, section } from '../ui/cards.js';

/** Fila que se llena sola con una lista pública; si falla, desaparece. */
function publicRow(title, kind, code) {
  const row = h('div', { class: 'row' }, loading());
  const el = section(title, row, { href: `#/tv?${kind}=${code}`, text: 'Ver todos' });
  api
    .publicChannels(kind, code)
    .then(({ items }) => {
      // Solo los que funcionan; si aún no hay verificados, los primeros sin probar.
      const verified = items.filter((c) => c.status === 'ok');
      const shown = (verified.length >= 6 ? verified : items).slice(0, 24);
      if (!shown.length) return el.remove();
      row.replaceChildren(...shown.map((c) => mediaCard(c)));
    })
    .catch(() => el.remove());
  return el;
}

export async function renderHome(view) {
  const [catalog, favorites, playlists] = await Promise.all([
    store.loadCatalog(),
    store.loadFavorites(),
    api.playlists().then((r) => r.items),
  ]);
  const firstName = store.user.name.split(' ')[0];

  mount(
    view,
    h(
      'header',
      { class: 'hero' },
      h(
        'div',
        { class: 'hero__content' },
        h('h1', { text: `Hola, ${firstName}` }),
        h('p', { text: 'Canales en vivo, películas libres y tus propias listas IPTV, todo en un solo lugar.' }),
        h(
          'div',
          { class: 'hero__actions' },
          h('a', { class: 'btn btn--primary', href: '#/tv', text: '▶ Ver TV en vivo' }),
          h('a', { class: 'btn', href: '#/listas', text: '+ Agregar mi lista' }),
        ),
      ),
    ),
    h(
      'div',
      { class: 'page' },
      favorites.length
        ? section(
            'Tus favoritos',
            h('div', { class: 'row' }, favorites.slice(0, 20).map((f) => mediaCard(f))),
            { href: '#/favoritos', text: 'Ver todos' },
          )
        : null,
      publicRow('Colombia en vivo', 'pais', 'co'),
      publicRow('Deportes en vivo', 'cat', 'sports'),
      section(
        'Canales MOGA',
        h('div', { class: 'row' }, catalog.channels.map((c) => mediaCard(c))),
        { href: '#/tv?moga=1', text: 'Ver todos' },
      ),
      section(
        'Películas libres',
        h('div', { class: 'row' }, catalog.movies.map((m) => mediaCard({ ...m, category: `${m.category} · ${m.year}` }, { movie: true }))),
        { href: '#/peliculas', text: 'Ver todas' },
      ),
      section(
        'Mis listas',
        playlists.length
          ? h(
              'div',
              { class: 'list' },
              playlists.map((p) =>
                h(
                  'a',
                  { class: 'list-item', href: `#/listas/${p.id}`, 'data-focusable': true },
                  h('div', {}, h('strong', { text: p.name }), h('small', { class: 'muted', text: `${p.live_count} canales · ${p.movie_count} películas` })),
                  h('span', { class: 'btn btn--small', text: 'Abrir' }),
                ),
              ),
            )
          : emptyState(
              'Aún no tienes listas. Agrega tu lista M3U o tu cuenta Xtream para ver tus canales aquí.',
              h('a', { class: 'btn btn--primary', href: '#/listas', text: 'Agregar lista' }),
            ),
      ),
    ),
  );
}
