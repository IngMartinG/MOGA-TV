import { $, h, initials, mount } from './core/dom.js';
import { api, setUnauthorizedHandler } from './core/api.js';
import { store } from './core/store.js';
import { onRouteChange, resolve, route, setNotFound, startRouter } from './core/router.js';
import { initTvNavigation } from './core/tv-nav.js';
import { closePlayer, initPlayer } from './player/player.js';
import { emptyState, loading } from './ui/cards.js';
import { toast } from './ui/toast.js';
import { initAuthScreen, showAuth } from './views/auth.js';
import { renderHome } from './views/home.js';
import { renderTv } from './views/tv.js';
import { renderMovies } from './views/movies.js';
import { renderPlaylistDetail, renderPlaylists } from './views/playlists.js';
import { renderFavorites } from './views/favorites.js';
import { renderAccount } from './views/account.js';

const view = $('#view');
let routerStarted = false;
let renderId = 0;

/** Envuelve cada vista: muestra "cargando", captura errores e ignora respuestas viejas. */
function page(render) {
  return async (ctx) => {
    const myRender = ++renderId;
    const target = h('div');
    mount(view, loading());
    try {
      await render(target, ctx);
      if (myRender === renderId) {
        mount(view, ...target.childNodes);
        view.focus({ preventScroll: true });
        window.scrollTo(0, 0);
      }
    } catch (err) {
      if (myRender === renderId && err.status !== 401) {
        mount(view, h('div', { class: 'page' }, emptyState(err.message)));
      }
    }
  };
}

function setUser(user) {
  store.user = user;
  $('#user-name').textContent = user.name;
  $('#user-email').textContent = user.email;
  $('#user-avatar').textContent = initials(user.name).slice(0, 2);
}

async function logout({ skipRequest = false } = {}) {
  closePlayer();
  if (!skipRequest) await api.logout().catch(() => {});
  store.reset();
  const { registrationOpen } = await api.me().catch(() => ({ registrationOpen: true }));
  showAuth({ registrationOpen });
}

function enterApp(user) {
  setUser(user);
  $('#auth').hidden = true;
  $('#app').hidden = false;
  if (!routerStarted) {
    routerStarted = true;
    startRouter();
  } else {
    resolve();
  }
}

route('/', page(renderHome));
route('/tv', page(renderTv));
route('/peliculas', page(renderMovies));
route('/listas', page(renderPlaylists));
route('/listas/:id', page(renderPlaylistDetail));
route('/favoritos', page(renderFavorites));
route('/cuenta', page((target) => renderAccount(target, { onLogout: logout, onUserChange: setUser })));
setNotFound(page((target) => mount(target, h('div', { class: 'page' }, emptyState('Página no encontrada.', h('a', { class: 'btn', href: '#/', text: 'Ir al inicio' }))))));

onRouteChange((pattern) => {
  const section = pattern.split('/')[1] || 'home';
  document.querySelectorAll('[data-nav]').forEach((a) => {
    const active = a.dataset.nav === section;
    a.classList.toggle('is-active', active);
    if (active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
});

setUnauthorizedHandler(() => {
  toast('Tu sesión terminó. Vuelve a iniciar sesión.', 'error');
  logout({ skipRequest: true });
});

async function boot() {
  initPlayer();
  initTvNavigation();
  initAuthScreen({ onAuthenticated: enterApp });
  try {
    const { user, registrationOpen } = await api.me();
    if (user) enterApp(user);
    else showAuth({ registrationOpen });
  } catch (err) {
    showAuth();
    $('#auth-error').textContent = err.message;
  } finally {
    $('#boot').hidden = true;
  }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

boot();
