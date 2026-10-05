import { store } from '../core/store.js';
import { toast } from '../ui/toast.js';
import { VideoSession } from './engine.js';

/** Ventana del reproductor a pantalla completa (películas, favoritos, listas). */
let videoSession = null;
let current = null; // { item, returnFocus }
const listeners = new Set();

const $ = (id) => document.getElementById(id);

function renderFavButton() {
  const isFav = current && store.favorites.has(current.item.key);
  $('player-fav').textContent = isFav ? '★ En favoritos' : '☆ Favorito';
  $('player-fav').setAttribute('aria-pressed', String(Boolean(isFav)));
}

/** Otras vistas (la vista previa de TV) se pausan cuando se abre la ventana. */
export function onPlayerOpen(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function openPlayer(item) {
  listeners.forEach((fn) => fn());
  current = { item, returnFocus: document.activeElement };
  $('player-title').textContent = item.name;
  $('player-subtitle').textContent = item.category || '';
  renderFavButton();
  $('player').hidden = false;
  document.body.style.overflow = 'hidden';
  $('player-close').focus();
  videoSession.play(item);
}

export function closePlayer() {
  if (!current) return;
  videoSession.stop();
  $('player').hidden = true;
  document.body.style.overflow = '';
  const { returnFocus } = current;
  current = null;
  returnFocus?.focus?.();
}

export function initPlayer() {
  videoSession = new VideoSession({
    video: $('player-video'),
    overlay: $('player-overlay'),
    status: $('player-status'),
    onInfo: (playback) => {
      if (playback.subtitle && current && !current.item.category) $('player-subtitle').textContent = playback.subtitle;
    },
  });
  $('player-close').addEventListener('click', closePlayer);
  $('player').addEventListener('click', (e) => {
    if (e.target === $('player')) closePlayer();
  });
  document.addEventListener('keydown', (e) => {
    if (!current) return;
    if (e.key === 'Escape' || e.key === 'BrowserBack' || (e.key === 'Backspace' && !(e.target instanceof HTMLInputElement))) {
      e.preventDefault();
      closePlayer();
    }
  });
  $('player-fav').addEventListener('click', async () => {
    if (!current) return;
    try {
      const added = await store.toggleFavorite(current.item.key);
      toast(added ? 'Agregado a favoritos' : 'Quitado de favoritos', 'ok', 2000);
      renderFavButton();
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}
