import { debounce, formData, h, mount } from '../core/dom.js';
import { api } from '../core/api.js';
import { formatDate } from '../core/text.js';
import { navigate } from '../core/router.js';
import { emptyState, loading, mediaCard } from '../ui/cards.js';
import { toast } from '../ui/toast.js';

/* ───────────── Administración de listas ───────────── */

function addForm(onAdded) {
  let kind = 'xtream';
  const error = h('p', { class: 'form-error', role: 'alert' });
  const submit = h('button', { class: 'btn btn--primary', type: 'submit', text: 'Agregar lista' });

  const xtreamFields = h(
    'div',
    { class: 'form-row' },
    h('label', {}, 'Servidor', h('input', { name: 'server', placeholder: 'http://servidor.com:8080', autocomplete: 'off', maxlength: 255 })),
    h('label', {}, 'Usuario', h('input', { name: 'username', autocomplete: 'off', maxlength: 128 })),
    h('label', {}, 'Contraseña', h('input', { name: 'password', type: 'password', autocomplete: 'new-password', maxlength: 128 })),
  );
  const m3uFields = h(
    'label',
    { hidden: true },
    'URL de la lista M3U',
    h('input', { name: 'url', type: 'url', placeholder: 'https://…/lista.m3u', autocomplete: 'off', maxlength: 4096 }),
  );

  const tabs = h('div', { class: 'tabs', role: 'tablist' });
  for (const [value, label] of [
    ['xtream', 'Xtream Codes (usuario y clave)'],
    ['m3u', 'URL M3U'],
  ]) {
    tabs.append(
      h('button', {
        class: `tab${value === kind ? ' is-active' : ''}`,
        type: 'button',
        role: 'tab',
        text: label,
        onclick: (e) => {
          kind = value;
          tabs.querySelectorAll('.tab').forEach((t) => t.classList.toggle('is-active', t === e.currentTarget));
          xtreamFields.hidden = kind !== 'xtream';
          m3uFields.hidden = kind !== 'm3u';
        },
      }),
    );
  }

  const form = h(
    'form',
    { class: 'form', novalidate: true },
    tabs,
    h('label', {}, 'Nombre (opcional)', h('input', { name: 'name', placeholder: 'Mi lista', maxlength: 60 })),
    xtreamFields,
    m3uFields,
    h('p', { class: 'hint', text: 'Tus credenciales se guardan cifradas en el servidor y nunca se muestran en el navegador.' }),
    submit,
    error,
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = formData(form);
    const payload =
      kind === 'xtream'
        ? { kind, name: data.name, server: data.server, username: data.username, password: data.password }
        : { kind, name: data.name, url: data.url };
    error.textContent = '';
    submit.disabled = true;
    submit.textContent = 'Cargando canales… (puede tardar)';
    try {
      const { playlist } = await api.addPlaylist(payload);
      form.reset();
      toast(`Lista "${playlist.name}" agregada: ${playlist.live_count} canales y ${playlist.movie_count} películas.`, 'ok');
      onAdded();
    } catch (err) {
      error.textContent = err.message;
    } finally {
      submit.disabled = false;
      submit.textContent = 'Agregar lista';
    }
  });
  return form;
}

function playlistItem(p, reload) {
  const busy = (btn, text) => {
    btn.disabled = true;
    btn.textContent = text;
  };
  const refresh = h('button', { class: 'btn btn--small', type: 'button', text: 'Actualizar' });
  refresh.addEventListener('click', async () => {
    busy(refresh, 'Actualizando…');
    try {
      await api.refreshPlaylist(p.id);
      toast('Lista actualizada', 'ok');
    } catch (err) {
      toast(err.message, 'error');
    }
    reload();
  });

  return h(
    'div',
    { class: 'list-item' },
    h(
      'div',
      {},
      h('strong', { text: p.name }),
      h('small', { class: 'muted', text: `${p.source_label} · ${p.live_count} canales · ${p.movie_count} películas` }),
      h('small', { class: 'muted', text: p.refreshed_at ? `Actualizada: ${formatDate(p.refreshed_at)}` : 'Sin actualizar' }),
      p.last_error ? h('small', { class: 'error-text', text: `Último error: ${p.last_error}` }) : null,
    ),
    h(
      'div',
      { class: 'list-item__actions' },
      h('a', { class: 'btn btn--small btn--primary', href: `#/listas/${p.id}`, text: 'Abrir' }),
      refresh,
      h('button', {
        class: 'btn btn--small',
        type: 'button',
        text: 'Renombrar',
        onclick: async () => {
          const name = prompt('Nuevo nombre de la lista:', p.name)?.trim();
          if (!name) return;
          try {
            await api.renamePlaylist(p.id, name);
            reload();
          } catch (err) {
            toast(err.message, 'error');
          }
        },
      }),
      h('button', {
        class: 'btn btn--small btn--danger',
        type: 'button',
        text: 'Eliminar',
        onclick: async () => {
          if (!confirm(`¿Eliminar la lista "${p.name}"? Se borran sus canales y credenciales.`)) return;
          try {
            await api.deletePlaylist(p.id);
            toast('Lista eliminada', 'ok');
            reload();
          } catch (err) {
            toast(err.message, 'error');
          }
        },
      }),
    ),
  );
}

export async function renderPlaylists(view) {
  const listBox = h('div', { class: 'list' }, loading());
  const reload = async () => {
    const { items } = await api.playlists();
    mount(listBox, items.length ? items.map((p) => playlistItem(p, reload)) : emptyState('Aún no tienes listas.'));
  };

  mount(
    view,
    h(
      'div',
      { class: 'page' },
      h('div', { class: 'page__head' }, h('div', {}, h('h1', { text: 'Mis listas' }), h('p', { class: 'muted', text: 'Agrega tus listas IPTV (M3U o Xtream Codes). Cada lista queda separada.' }))),
      h('section', { class: 'panel' }, h('h2', { text: 'Agregar lista' }), addForm(reload)),
      h('section', { class: 'section' }, h('div', { class: 'section__head' }, h('h2', { text: 'Tus listas' })), listBox),
      h('p', {
        class: 'notice',
        text: 'Usa solo listas que tengas derecho a ver. MOGA TV es un reproductor: no aloja ni vende canales de terceros.',
      }),
    ),
  );
  await reload();
}

/* ───────────── Navegador de canales de una lista ───────────── */

const PAGE = 60;

export async function renderPlaylistDetail(view, { params, query }) {
  const id = Number(params.id);
  const { items } = await api.playlists();
  const playlist = items.find((p) => p.id === id);
  if (!playlist) {
    mount(view, h('div', { class: 'page' }, emptyState('Esa lista no existe.', h('a', { class: 'btn', href: '#/listas', text: 'Volver' }))));
    return;
  }

  const state = {
    type: query.get('tipo') === 'movie' && playlist.movie_count ? 'movie' : playlist.live_count ? 'live' : 'movie',
    group: '',
    q: '',
    offset: 0,
  };
  const groupSelect = h('select', { 'aria-label': 'Categoría' });
  const search = h('input', { type: 'search', placeholder: 'Buscar en esta lista…', 'aria-label': 'Buscar' });
  const grid = h('div', { class: 'grid' });
  const info = h('small', { class: 'muted' });
  const more = h('button', { class: 'btn', type: 'button', text: 'Cargar más', hidden: true });

  async function loadGroups() {
    const { items: groups } = await api.groups(id, state.type);
    mount(
      groupSelect,
      h('option', { value: '', text: 'Todas las categorías' }),
      groups.map((g) => h('option', { value: g.name, text: `${g.name} (${g.count})` })),
    );
  }

  let requestId = 0;
  async function loadChannels(append = false) {
    const myRequest = ++requestId;
    if (!append) {
      state.offset = 0;
      mount(grid, loading());
    }
    more.disabled = true;
    try {
      const data = await api.channels(id, { type: state.type, group: state.group, q: state.q, offset: state.offset, limit: PAGE });
      if (myRequest !== requestId) return;
      if (!append) grid.replaceChildren();
      const movie = state.type === 'movie';
      grid.append(...data.items.map((c) => mediaCard({ ...c, live: !movie }, { movie })));
      state.offset += data.items.length;
      info.textContent = `${data.total} resultados`;
      more.hidden = state.offset >= data.total;
      if (!data.total) mount(grid, emptyState('No hay resultados.'));
    } catch (err) {
      mount(grid, emptyState(err.message));
    } finally {
      more.disabled = false;
    }
  }

  const typeTabs = h('div', { class: 'tabs', role: 'tablist' });
  for (const [value, label, count] of [
    ['live', 'TV en vivo', playlist.live_count],
    ['movie', 'Películas', playlist.movie_count],
  ]) {
    if (!count) continue;
    typeTabs.append(
      h('button', {
        class: `tab${state.type === value ? ' is-active' : ''}`,
        type: 'button',
        role: 'tab',
        text: `${label} (${count})`,
        onclick: async (e) => {
          state.type = value;
          state.group = '';
          typeTabs.querySelectorAll('.tab').forEach((t) => t.classList.toggle('is-active', t === e.currentTarget));
          await loadGroups();
          loadChannels();
        },
      }),
    );
  }

  groupSelect.addEventListener('change', () => {
    state.group = groupSelect.value;
    loadChannels();
  });
  search.addEventListener(
    'input',
    debounce(() => {
      state.q = search.value;
      loadChannels();
    }, 300),
  );
  more.addEventListener('click', () => loadChannels(true));

  mount(
    view,
    h(
      'div',
      { class: 'page' },
      h(
        'div',
        { class: 'page__head' },
        h('div', {}, h('h1', { text: playlist.name }), h('p', { class: 'muted', text: playlist.source_label })),
        h('button', { class: 'btn', type: 'button', text: '← Mis listas', onclick: () => navigate('/listas') }),
      ),
      typeTabs,
      h('div', { class: 'toolbar' }, groupSelect, search),
      info,
      grid,
      more,
    ),
  );
  await loadGroups();
  await loadChannels();
}
