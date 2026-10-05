import { debounce, h, mount } from '../core/dom.js';
import { api } from '../core/api.js';
import { normalize } from '../core/text.js';
import { store } from '../core/store.js';
import { emptyState, loading, mediaCard } from '../ui/cards.js';

const PAGE = 120;

export async function renderTv(view, { query }) {
  const catalog = await store.loadCatalog();
  const country = catalog.countries.some((c) => c.code === query.get('pais')) ? query.get('pais') : '';

  const results = h('div', { class: 'section' });
  const search = h('input', { type: 'search', placeholder: 'Buscar canal…', 'aria-label': 'Buscar canal' });
  let items = [];

  const chips = h(
    'div',
    { class: 'chips', role: 'tablist' },
    h('a', { class: `chip${country ? '' : ' is-active'}`, href: '#/tv', text: 'Canales MOGA' }),
    catalog.countries.map((c) =>
      h('a', { class: `chip${country === c.code ? ' is-active' : ''}`, href: `#/tv?pais=${c.code}`, text: c.name }),
    ),
  );

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
        h('div', {}, h('h1', { text: 'TV en vivo' }), h('p', { class: 'muted', text: 'Canales gratuitos y TV pública abierta por país.' })),
      ),
      chips,
      h('div', { class: 'toolbar' }, search),
      country
        ? h('div', {
            class: 'notice',
            text: 'Lista pública comunitaria (iptv-org). Algunos canales pueden estar caídos o bloqueados según tu país.',
          })
        : null,
      results,
    ),
  );

  if (!country) {
    items = catalog.channels;
    draw();
    return;
  }
  mount(results, loading());
  try {
    items = (await api.publicChannels(country)).items;
    draw();
  } catch (err) {
    mount(results, emptyState(`No se pudo cargar la lista pública: ${err.message}`));
  }
}
