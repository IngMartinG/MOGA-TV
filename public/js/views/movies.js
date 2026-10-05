import { colorFor, debounce, h, initials, mount } from '../core/dom.js';
import { api } from '../core/api.js';
import { normalize } from '../core/text.js';
import { store } from '../core/store.js';
import { emptyState, loading } from '../ui/cards.js';
import { toast } from '../ui/toast.js';
import { openPlayer } from '../player/player.js';

const PAGE = 120;

function posterImage(name, url) {
  const box = h('span', { class: 'poster__img', style: { color: colorFor(name) } }, initials(name));
  if (url) {
    const img = h('img', { src: url, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' });
    // Si la imagen no carga, quedan visibles las iniciales.
    img.addEventListener('error', () => img.remove(), { once: true });
    box.append(img);
  }
  return box;
}

/** Ficha de la película: póster, año, sinopsis, Ver y Favorito. */
function openDetail(movie) {
  const close = () => {
    root.remove();
    document.removeEventListener('keydown', onKey);
    opener?.focus?.();
  };
  const onKey = (e) => {
    if (e.key === 'Escape' || e.key === 'BrowserBack') close();
  };
  const opener = document.activeElement;
  const favBtn = h('button', { class: 'btn', type: 'button' });
  const renderFav = () => {
    favBtn.textContent = store.favorites.has(movie.key) ? '★ En favoritos' : '☆ Favorito';
  };
  renderFav();
  favBtn.addEventListener('click', async () => {
    try {
      const added = await store.toggleFavorite(movie.key);
      toast(added ? 'Agregada a favoritos' : 'Quitada de favoritos', 'ok', 2000);
      renderFav();
    } catch (err) {
      toast(err.message, 'error');
    }
  });
  const playBtn = h('button', {
    class: 'btn btn--primary',
    type: 'button',
    text: '▶ Ver película',
    onclick: () => {
      close();
      openPlayer({ ...movie, live: false });
    },
  });
  const poster = h('div', { class: 'detail__poster' });
  if (movie.logo) poster.append(h('img', { src: movie.logo, alt: '', referrerpolicy: 'no-referrer' }));
  const root = h(
    'div',
    {
      class: 'detail',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': movie.name,
      onclick: (e) => e.target === root && close(),
    },
    h(
      'div',
      { class: 'detail__box' },
      poster,
      h(
        'div',
        { class: 'detail__body' },
        h('h2', { text: movie.name }),
        h('small', { class: 'muted', text: [movie.year, movie.category].filter(Boolean).join(' · ') }),
        movie.description ? h('p', { text: movie.description }) : null,
        h('div', { class: 'toolbar' }, playBtn, favBtn, h('button', { class: 'btn', type: 'button', text: 'Cerrar', onclick: close })),
      ),
    ),
  );
  document.addEventListener('keydown', onKey);
  document.body.append(root);
  playBtn.focus();
}

function posterCard(movie) {
  return h(
    'button',
    { class: 'poster', type: 'button', 'data-focusable': true, onclick: () => openDetail(movie) },
    posterImage(movie.name, movie.logo),
    h('strong', { text: movie.name }),
    movie.year || movie.category ? h('small', { text: [movie.year, movie.category].filter(Boolean).join(' · ') }) : null,
  );
}

/** Películas estilo Magma: categorías a la izquierda, pósters a la derecha. */
export async function renderMovies(view) {
  const [catalog, { items: playlists }] = await Promise.all([store.loadCatalog(), api.playlists()]);
  const withMovies = playlists.filter((p) => p.movie_count > 0);
  const state = { group: 'ia:populares', items: [], total: 0, limit: PAGE, requestId: 0 };

  const side = h('nav', { class: 'vod__side', 'aria-label': 'Categorías de películas' });
  const grid = h('div', { class: 'posters' });
  const titleEl = h('h1', { text: 'Películas' });
  const info = h('small', { class: 'muted' });
  const search = h('input', { type: 'search', placeholder: 'Buscar película…', 'aria-label': 'Buscar película' });
  const more = h('button', { class: 'btn', type: 'button', text: 'Cargar más', hidden: true });

  function groupButton(id, label) {
    return h('button', {
      class: `group${state.group === id ? ' is-active' : ''}`,
      type: 'button',
      'data-focusable': true,
      text: label,
      onclick: () => {
        state.group = id;
        titleEl.textContent = label;
        search.value = '';
        drawSide();
        load();
      },
    });
  }

  function drawSide() {
    mount(
      side,
      h('div', { class: 'group-title', text: 'Clásicos completos' }),
      catalog.movieCategories.map((c) => groupButton(`ia:${c.code}`, c.name)),
      groupButton('moga', 'Películas abiertas MOGA'),
      groupButton('favs', '★ Mis favoritas'),
      withMovies.length ? h('div', { class: 'group-title', text: 'Mis listas' }) : null,
      withMovies.map((p) => groupButton(`pl:${p.id}`, `${p.name} (${p.movie_count})`)),
    );
  }

  function visible() {
    if (state.group.startsWith('pl:')) return state.items;
    const q = normalize(search.value);
    return q ? state.items.filter((m) => normalize(m.name).includes(q)) : state.items;
  }

  function draw() {
    const items = visible();
    const shown = state.group.startsWith('pl:') ? items : items.slice(0, state.limit);
    mount(grid, shown.length ? shown.map(posterCard) : emptyState('No hay películas aquí.'));
    more.hidden = state.group.startsWith('pl:') ? state.items.length >= state.total : items.length <= state.limit;
    info.textContent = `${state.group.startsWith('pl:') ? state.total : items.length} películas`;
  }

  async function load({ append = false } = {}) {
    const myRequest = ++state.requestId;
    if (!append) {
      state.limit = PAGE;
      mount(grid, loading());
      info.textContent = '';
    }
    try {
      if (state.group.startsWith('ia:')) {
        state.items = (await api.archiveMovies(state.group.slice(3))).items;
      } else if (state.group === 'moga') {
        state.items = catalog.movies.map((m) => ({ ...m, category: m.license }));
      } else if (state.group === 'favs') {
        state.items = (await store.loadFavorites()).filter((f) => /^(movie|ia):/.test(f.key));
      } else {
        const data = await api.channels(state.group.slice(3), {
          type: 'movie',
          q: search.value,
          offset: append ? state.items.length : 0,
          limit: PAGE,
        });
        if (myRequest !== state.requestId) return;
        state.items = append ? state.items.concat(data.items) : data.items;
        state.total = data.total;
      }
      if (myRequest === state.requestId) draw();
    } catch (err) {
      if (myRequest === state.requestId) mount(grid, emptyState(`No se pudieron cargar las películas: ${err.message}`));
    }
  }

  more.addEventListener('click', () => {
    if (state.group.startsWith('pl:')) load({ append: true });
    else {
      state.limit += PAGE;
      draw();
    }
  });
  search.addEventListener(
    'input',
    debounce(() => (state.group.startsWith('pl:') ? load() : ((state.limit = PAGE), draw())), 250),
  );

  titleEl.textContent = catalog.movieCategories[0]?.name || 'Películas';
  drawSide();
  mount(
    view,
    h(
      'div',
      { class: 'vod' },
      side,
      h(
        'section',
        { class: 'vod__main' },
        h(
          'div',
          { class: 'page__head' },
          h('div', {}, titleEl, info),
          h('div', { class: 'toolbar' }, search),
        ),
        grid,
        more,
        h('p', {
          class: 'muted',
          text: 'Los clásicos vienen de Internet Archive: películas completas de dominio público, legales y gratuitas. Los estrenos solo están en tus propias listas.',
        }),
      ),
    ),
  );
  await load();
}
