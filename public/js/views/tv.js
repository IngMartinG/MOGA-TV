import { colorFor, debounce, h, initials, mount } from '../core/dom.js';
import { api } from '../core/api.js';
import { normalize } from '../core/text.js';
import { store } from '../core/store.js';
import { emptyState, loading } from '../ui/cards.js';
import { toast } from '../ui/toast.js';
import { VideoSession } from '../player/engine.js';
import { onPlayerOpen } from '../player/player.js';

const PAGE = 200;
let activePreview = null;

// Al salir de TV en vivo o abrir el reproductor grande, se detiene la vista previa.
window.addEventListener('hashchange', () => {
  if (!location.hash.startsWith('#/tv')) activePreview?.stop();
});
onPlayerOpen(() => activePreview?.stop());

function logo(name, url) {
  const box = h('span', { class: 'channel__logo', style: { color: colorFor(name) } }, initials(name));
  if (url) {
    const img = h('img', { src: url, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' });
    // Si la imagen no carga, quedan visibles las iniciales.
    img.addEventListener('error', () => img.remove(), { once: true });
    box.append(img);
  }
  return box;
}

function tags(item) {
  const list = [];
  if (item.status === 'ok') list.push(h('span', { class: 'tag tag--ok', text: '✓' }));
  if (item.status === 'dead') list.push(h('span', { class: 'tag tag--dead', text: 'Sin señal' }));
  if (item.quality) list.push(h('span', { class: 'tag', text: item.quality }));
  if (item.category) list.push(h('small', { class: 'muted', text: item.category }));
  return list.length ? h('span', { class: 'card__tags' }, list) : null;
}

/** Grupo inicial según la URL (compatible con #/tv?pais=co, ?cat=sports, ?moga=1). */
function initialGroup(query, catalog) {
  if (query.get('moga')) return 'moga';
  const cat = query.get('cat');
  if (cat && catalog.categories.some((c) => c.code === cat)) return `cat:${cat}`;
  const pais = query.get('pais');
  if (pais && catalog.countries.some((c) => c.code === pais)) return `pais:${pais}`;
  return 'pais:co';
}

/**
 * TV en vivo estilo Magma: grupos | canales numerados | vista previa.
 * Elegir un canal lo reproduce al instante en la vista previa; Enter o doble clic
 * lo pasa a pantalla completa; Re Pág / Av Pág cambian de canal.
 */
export async function renderTv(view, { query }) {
  const [catalog, { items: playlists }] = await Promise.all([store.loadCatalog(), api.playlists()]);
  const livePlaylists = playlists.filter((p) => p.live_count > 0);

  const state = {
    source: 'free', // 'free' | id de lista
    group: initialGroup(query, catalog),
    items: [],
    total: 0,
    selected: null,
    showAll: false,
    requestId: 0,
  };

  // ── Vista previa ──
  const video = h('video', { playsinline: true, controls: true });
  const status = h('p', { text: 'Elige un canal de la lista' });
  const overlay = h('div', { class: 'player__overlay' }, h('div', { class: 'spinner', 'aria-hidden': 'true' }), status);
  const titleEl = h('h2', { text: 'TV en vivo' });
  const subEl = h('small', { class: 'muted' });
  const favBtn = h('button', { class: 'btn', type: 'button', text: '☆ Favorito', disabled: true });
  activePreview?.stop();
  const preview = new VideoSession({ video, overlay, status });
  activePreview = preview;
  overlay.classList.add('is-error'); // sin spinner hasta elegir canal

  const fullscreen = () => (video.requestFullscreen ? video.requestFullscreen() : video.webkitEnterFullscreen?.());

  // ── Columnas ──
  const groupsBox = h('div', { class: 'live__scroll' });
  const channelsBox = h('div', { class: 'live__scroll', role: 'listbox', 'aria-label': 'Canales' });
  const counter = h('small', { class: 'muted' });
  const search = h('input', { type: 'search', placeholder: 'Buscar canal…', 'aria-label': 'Buscar canal' });
  const showAllBox = h('input', { type: 'checkbox' });
  const showAllLabel = h('label', { class: 'check' }, showAllBox, 'Incluir los que no tienen señal');
  const sourceSelect = h(
    'select',
    { 'aria-label': 'Origen de los canales' },
    h('option', { value: 'free', text: 'Canales gratuitos' }),
    livePlaylists.map((p) => h('option', { value: String(p.id), text: `${p.name} (${p.live_count})` })),
  );

  function groupButton(id, label, count) {
    return h(
      'button',
      {
        class: `group${state.group === id ? ' is-active' : ''}`,
        type: 'button',
        'data-focusable': true,
        onclick: () => {
          state.group = id;
          drawGroups();
          loadChannels();
        },
      },
      h('span', { text: label }),
      count !== undefined ? h('small', { text: String(count) }) : null,
    );
  }

  async function drawGroups() {
    if (state.source === 'free') {
      mount(
        groupsBox,
        groupButton('favs', '★ Favoritos'),
        groupButton('moga', '◆ Canales MOGA', catalog.channels.length),
        h('div', { class: 'group-title', text: 'Países' }),
        catalog.countries.map((c) => groupButton(`pais:${c.code}`, c.name)),
        h('div', { class: 'group-title', text: 'Categorías' }),
        catalog.categories.map((c) => groupButton(`cat:${c.code}`, c.name)),
      );
      return;
    }
    const { items } = await api.groups(state.source, 'live');
    mount(
      groupsBox,
      groupButton('', 'Todos'),
      items.map((g) => groupButton(g.name, g.name, g.count)),
    );
  }

  function channelRow(item, index) {
    const active = state.selected?.key === item.key;
    return h(
      'button',
      {
        class: `channel${active ? ' is-active' : ''}`,
        type: 'button',
        role: 'option',
        'aria-selected': String(active),
        'data-focusable': true,
        'data-key': item.key,
        onclick: () => select(item),
        ondblclick: fullscreen,
        onkeydown: (e) => {
          if (e.key === 'Enter' && state.selected?.key === item.key) {
            e.preventDefault();
            fullscreen();
          }
        },
      },
      h('span', { class: 'channel__num', text: String(index + 1) }),
      logo(item.name, item.logo),
      h('span', { class: 'channel__info' }, h('strong', { text: item.name }), tags(item)),
    );
  }

  function visibleItems() {
    if (state.source !== 'free') return state.items; // la búsqueda la hace el servidor
    const q = normalize(search.value);
    return q ? state.items.filter((c) => normalize(`${c.name} ${c.category || ''}`).includes(q)) : state.items;
  }

  function drawChannels() {
    const items = visibleItems();
    const rows = items.slice(0, state.source === 'free' ? state.limit : items.length).map(channelRow);
    const more =
      (state.source === 'free' && items.length > state.limit) || (state.source !== 'free' && state.items.length < state.total)
        ? h('button', {
            class: 'btn btn--block',
            type: 'button',
            text: 'Cargar más canales',
            onclick: () => {
              if (state.source === 'free') {
                state.limit += PAGE;
                drawChannels();
              } else loadChannels({ append: true });
            },
          })
        : null;
    mount(channelsBox, items.length ? [rows, more] : emptyState('No hay canales aquí.'));
  }

  async function loadChannels({ append = false, refresh = 0 } = {}) {
    const myRequest = ++state.requestId;
    if (!append && !refresh) {
      state.limit = PAGE;
      mount(channelsBox, loading());
      counter.textContent = '';
    }
    showAllLabel.hidden = !(state.source === 'free' && /^(pais|cat):/.test(state.group));
    try {
      if (state.source !== 'free') {
        const data = await api.channels(state.source, {
          type: 'live',
          group: state.group,
          q: search.value,
          offset: append ? state.items.length : 0,
          limit: PAGE,
        });
        if (myRequest !== state.requestId) return;
        state.items = append ? state.items.concat(data.items) : data.items;
        state.total = data.total;
        counter.textContent = `${data.total} canales`;
      } else if (state.group === 'moga') {
        state.items = catalog.channels;
        counter.textContent = `${state.items.length} canales`;
      } else if (state.group === 'favs') {
        const favs = await store.loadFavorites();
        if (myRequest !== state.requestId) return;
        state.items = favs.filter((f) => !/^(movie|ia):/.test(f.key));
        counter.textContent = `${state.items.length} favoritos`;
      } else {
        const [kind, code] = state.group.split(':');
        const data = await api.publicChannels(kind, code, { all: state.showAll });
        if (myRequest !== state.requestId) return;
        state.items = data.items;
        const { ok, pending, dead } = data.stats;
        counter.textContent =
          `${ok} verificados` + (pending ? ` · verificando ${pending}…` : '') + (dead ? ` · ${dead} sin señal` : '');
        // Mientras el servidor verifica, la lista se actualiza sola.
        if (pending && refresh < 10) {
          setTimeout(() => {
            if (myRequest === state.requestId && channelsBox.isConnected) loadChannels({ refresh: refresh + 1 });
          }, 12000);
        }
      }
      drawChannels();
    } catch (err) {
      if (myRequest === state.requestId) mount(channelsBox, emptyState(`No se pudieron cargar los canales: ${err.message}`));
    }
  }

  function renderFav() {
    const fav = state.selected && store.favorites.has(state.selected.key);
    favBtn.textContent = fav ? '★ En favoritos' : '☆ Favorito';
    favBtn.disabled = !state.selected;
  }

  function select(item) {
    state.selected = item;
    channelsBox.querySelectorAll('.channel').forEach((row) => {
      const on = row.dataset.key === item.key;
      row.classList.toggle('is-active', on);
      row.setAttribute('aria-selected', String(on));
    });
    titleEl.textContent = item.name;
    subEl.textContent = [item.category, item.quality].filter(Boolean).join(' · ');
    renderFav();
    preview.play(item);
  }

  /** Cambia al canal anterior/siguiente de la lista (como el control remoto). */
  function zap(step) {
    const items = visibleItems();
    if (!items.length) return;
    const index = state.selected ? items.findIndex((i) => i.key === state.selected.key) : -1;
    const next = items[(index + step + items.length) % items.length];
    select(next);
    channelsBox.querySelector(`[data-key="${CSS.escape(next.key)}"]`)?.scrollIntoView({ block: 'nearest' });
  }

  favBtn.addEventListener('click', async () => {
    if (!state.selected) return;
    try {
      const added = await store.toggleFavorite(state.selected.key);
      toast(added ? 'Agregado a favoritos' : 'Quitado de favoritos', 'ok', 2000);
      renderFav();
    } catch (err) {
      toast(err.message, 'error');
    }
  });
  sourceSelect.addEventListener('change', () => {
    state.source = sourceSelect.value;
    state.group = state.source === 'free' ? 'pais:co' : '';
    search.value = '';
    drawGroups();
    loadChannels();
  });
  showAllBox.addEventListener('change', () => {
    state.showAll = showAllBox.checked;
    loadChannels();
  });
  search.addEventListener(
    'input',
    debounce(() => (state.source === 'free' ? ((state.limit = PAGE), drawChannels()) : loadChannels()), 250),
  );
  const root = h('div', { class: 'live' });
  root.addEventListener('keydown', (e) => {
    if (e.key === 'PageDown' || e.key === 'ChannelDown') {
      e.preventDefault();
      zap(1);
    } else if (e.key === 'PageUp' || e.key === 'ChannelUp') {
      e.preventDefault();
      zap(-1);
    }
  });

  mount(
    root,
    h('section', { class: 'live__col live__col--groups' }, h('div', { class: 'live__head' }, sourceSelect), groupsBox),
    h(
      'section',
      { class: 'live__col' },
      h('div', { class: 'live__head' }, search, counter, showAllLabel),
      channelsBox,
    ),
    h(
      'section',
      { class: 'live__preview' },
      h('div', { class: 'preview' }, video, overlay),
      h(
        'div',
        { class: 'preview__info' },
        h('div', {}, titleEl, subEl),
        h(
          'div',
          { class: 'toolbar' },
          h('button', { class: 'btn', type: 'button', text: '◀ Anterior', onclick: () => zap(-1) }),
          h('button', { class: 'btn', type: 'button', text: 'Siguiente ▶', onclick: () => zap(1) }),
          h('button', { class: 'btn btn--primary', type: 'button', text: '⛶ Pantalla completa', onclick: fullscreen }),
          favBtn,
        ),
        h('p', {
          class: 'live__hint',
          text: 'Clic en un canal para verlo aquí · doble clic o Enter para pantalla completa · Re Pág / Av Pág para cambiar de canal.',
        }),
      ),
    ),
  );
  mount(view, root);

  await drawGroups();
  await loadChannels();
}
