import { debounce, h, mount } from '../core/dom.js';
import { api } from '../core/api.js';
import { normalize } from '../core/text.js';
import { store } from '../core/store.js';
import { emptyState, loading, mediaCard } from '../ui/cards.js';

const PAGE = 120;
const DEFAULT = { kind: 'pais', code: 'co' };

/** Qué lista mostrar según la URL: #/tv?pais=co, #/tv?cat=sports o #/tv?moga=1. */
function selection(query, catalog) {
  if (query.get('moga')) return { kind: 'moga' };
  const cat = query.get('cat');
  if (cat && catalog.categories.some((c) => c.code === cat)) return { kind: 'cat', code: cat };
  const pais = query.get('pais');
  if (pais && catalog.countries.some((c) => c.code === pais)) return { kind: 'pais', code: pais };
  return DEFAULT;
}

function chipRow(label, items, isActive, hrefFor) {
  return h(
    'div',
    { class: 'section' },
    h('small', { class: 'muted', text: label }),
    h(
      'div',
      { class: 'chips' },
      items.map((item) => h('a', { class: `chip${isActive(item) ? ' is-active' : ''}`, href: hrefFor(item), text: item.name })),
    ),
  );
}

export async function renderTv(view, { query }) {
  const catalog = await store.loadCatalog();
  const sel = selection(query, catalog);

  const results = h('div', { class: 'section' });
  const statusLine = h('small', { class: 'muted' });
  const showAll = h('input', { type: 'checkbox' });
  showAll.addEventListener('change', () => loadPublic());
  const search = h('input', { type: 'search', placeholder: 'Buscar canal…', 'aria-label': 'Buscar canal' });
  let items = [];

  function draw() {
    const q = normalize(search.value);
    const visible = q ? items.filter((c) => normalize(`${c.name} ${c.category || ''}`).includes(q)) : items;
    let shown = PAGE;
    const grid = h('div', { class: 'grid' });
    const more = h('button', { class: 'btn', type: 'button', text: 'Cargar más' });
    const paint = () => {
      grid.replaceChildren(...visible.slice(0, shown).map((c) => mediaCard(c)));
      more.hidden = visible.length <= shown;
    };
    more.addEventListener('click', () => {
      shown += PAGE;
      paint();
    });
    paint();
    mount(
      results,
      h('small', { class: 'muted', text: `${visible.length} canales` }),
      visible.length ? grid : emptyState('No hay canales que coincidan con la búsqueda.'),
      more,
    );
  }
  search.addEventListener('input', debounce(draw, 200));

  mount(
    view,
    h(
      'div',
      { class: 'page' },
      h(
        'div',
        { class: 'page__head' },
        h('div', {}, h('h1', { text: 'TV en vivo' }), h('p', { class: 'muted', text: 'Miles de canales abiertos por categoría y por país.' })),
      ),
      chipRow(
        'Categorías',
        [{ code: 'moga', name: '★ Canales MOGA' }, ...catalog.categories],
        (c) => (c.code === 'moga' ? sel.kind === 'moga' : sel.kind === 'cat' && sel.code === c.code),
        (c) => (c.code === 'moga' ? '#/tv?moga=1' : `#/tv?cat=${c.code}`),
      ),
      chipRow(
        'Países',
        catalog.countries,
        (c) => sel.kind === 'pais' && sel.code === c.code,
        (c) => `#/tv?pais=${c.code}`,
      ),
      h(
        'div',
        { class: 'toolbar' },
        search,
        sel.kind !== 'moga' ? h('label', { class: 'check' }, showAll, 'Mostrar también los que no tienen señal') : null,
      ),
      sel.kind !== 'moga'
        ? h(
            'div',
            { class: 'notice' },
            'Canales abiertos de la API de iptv-org. MOGA TV comprueba cada canal y muestra primero los que funcionan (✓ Verificado). ',
            statusLine,
          )
        : null,
      results,
    ),
  );

  if (sel.kind === 'moga') {
    items = catalog.channels;
    draw();
    return;
  }
  mount(results, loading());
  await loadPublic();

  /**
   * Carga la lista pública. Mientras el servidor sigue verificando canales,
   * se vuelve a pedir cada 12 s para que aparezcan los nuevos verificados.
   */
  async function loadPublic(refreshes = 0) {
    let data;
    try {
      data = await api.publicChannels(sel.kind, sel.code, { all: showAll.checked });
    } catch (err) {
      mount(results, emptyState(`No se pudo cargar la lista: ${err.message}`));
      return;
    }
    if (!results.isConnected && refreshes > 0) return; // el usuario ya cambió de pantalla
    items = data.items;
    const { ok, pending, dead } = data.stats;
    statusLine.textContent =
      `${ok} verificados` +
      (pending ? ` · verificando ${pending}…` : '') +
      (dead ? ` · ${dead} sin señal ${showAll.checked ? '(mostrados al final)' : '(ocultos)'}` : '');
    draw();
    if (pending && refreshes < 10) setTimeout(() => results.isConnected && loadPublic(refreshes + 1), 12000);
  }
}
