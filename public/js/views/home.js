import { h, mount } from '../core/dom.js';
import { api } from '../core/api.js';
import { store } from '../core/store.js';
import { mediaCard, section } from '../ui/cards.js';

function tile(href, kind, icon, title, subtitle) {
  return h(
    'a',
    { class: `tile tile--${kind}`, href, 'data-focusable': true },
    h('span', { class: 'tile__icon', 'aria-hidden': 'true', text: icon }),
    h('strong', { text: title }),
    h('span', { text: subtitle }),
  );
}

/** Inicio estilo Magma: mosaicos grandes para entrar a cada sección. */
export async function renderHome(view) {
  const [favorites, { items: playlists }] = await Promise.all([store.loadFavorites(), api.playlists()]);
  const firstName = store.user.name.split(' ')[0];
  const liveInLists = playlists.reduce((n, p) => n + p.live_count, 0);
  const moviesInLists = playlists.reduce((n, p) => n + p.movie_count, 0);

  mount(
    view,
    h(
      'div',
      { class: 'home' },
      h(
        'div',
        { class: 'home__hello' },
        h('h1', { text: `Hola, ${firstName}` }),
        h('p', { text: '¿Qué quieres ver hoy?' }),
      ),
      h(
        'div',
        { class: 'tiles' },
        tile(
          '#/tv',
          'live',
          '📺',
          'TV EN VIVO',
          liveInLists ? `Canales verificados + ${liveInLists} de tus listas` : 'Miles de canales abiertos, verificados',
        ),
        tile('#/peliculas', 'movies', '🎬', 'PELÍCULAS', moviesInLists ? `Clásicos completos + ${moviesInLists} de tus listas` : 'Clásicos completos y gratis'),
        tile('#/listas', 'lists', '☰', 'MIS LISTAS', playlists.length ? `${playlists.length} lista(s) IPTV` : 'Agrega tu M3U o Xtream'),
        tile('#/favoritos', 'favs', '★', 'FAVORITOS', favorites.length ? `${favorites.length} guardados` : 'Guarda lo que más ves'),
        tile('#/cuenta', 'account', '⚙', 'MI CUENTA', 'Perfil, contraseña y sesiones'),
      ),
      favorites.length
        ? section(
            'Tus favoritos',
            h('div', { class: 'row' }, favorites.slice(0, 20).map((f) => mediaCard({ ...f, live: !/^(movie|ia):/.test(f.key) }))),
            { href: '#/favoritos', text: 'Ver todos' },
          )
        : null,
    ),
  );
}
