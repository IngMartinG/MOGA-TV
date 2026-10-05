import { api } from '../core/api.js';
import { store } from '../core/store.js';
import { toast } from '../ui/toast.js';

const START_TIMEOUT_MS = 20000;

const els = {
  get root() {
    return document.getElementById('player');
  },
  get video() {
    return document.getElementById('player-video');
  },
  get overlay() {
    return document.getElementById('player-overlay');
  },
  get status() {
    return document.getElementById('player-status');
  },
  get title() {
    return document.getElementById('player-title');
  },
  get subtitle() {
    return document.getElementById('player-subtitle');
  },
  get fav() {
    return document.getElementById('player-fav');
  },
};

let current = null; // { item, engine, session, returnFocus }
let session = 0;

/** Orden de motores a intentar según el formato que detectó el servidor. */
function strategiesFor(format) {
  if (format === 'mpegts') return ['mpegts', 'hls'];
  if (format === 'native') return ['native', 'hls'];
  return ['hls', 'mpegts'];
}

function setStatus(text, isError = false) {
  els.overlay.hidden = false;
  els.overlay.classList.toggle('is-error', isError);
  els.status.textContent = text;
}

function destroyEngine() {
  const engine = current?.engine;
  if (!engine) return;
  current.engine = null;
  // Se difiere: si se destruye dentro de un evento del propio motor, éste falla.
  setTimeout(() => {
    try {
      engine.destroy();
    } catch {
      /* ya destruido */
    }
  }, 0);
}

function resetVideo() {
  const video = els.video;
  video.pause();
  video.removeAttribute('src');
  video.load();
}

/** Intenta reproducir con un motor; resuelve cuando hay imagen o rechaza si falla. */
function attempt(engineName, src, live, mySession) {
  const video = els.video;
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (ok, reason) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('error', onVideoError);
      ok ? resolve() : reject(new Error(reason));
    };
    const onPlaying = () => done(true);
    const onVideoError = () => done(false, 'El navegador no pudo decodificar el video.');
    const timer = setTimeout(() => done(false, 'La señal tardó demasiado en arrancar.'), START_TIMEOUT_MS);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('error', onVideoError);

    const play = () => video.play().catch(() => setStatus('Pulsa ▶ para iniciar la reproducción.'));

    if (engineName === 'hls') {
      if (window.Hls?.isSupported()) {
        const hls = new window.Hls({
          enableWorker: true,
          // Sin modo baja latencia: en canales IPTV causa cortes y recargas constantes.
          lowLatencyMode: false,
          backBufferLength: 30,
          liveSyncDurationCount: 4,
          manifestLoadingMaxRetry: 6,
          levelLoadingMaxRetry: 6,
          fragLoadingMaxRetry: 8,
          manifestLoadingTimeOut: 20000,
          fragLoadingTimeOut: 30000,
        });
        current.engine = hls;
        let networkRecoveries = 0;
        let mediaRecoveries = 0;
        hls.on(window.Hls.Events.MANIFEST_PARSED, play);
        hls.on(window.Hls.Events.FRAG_BUFFERED, () => {
          networkRecoveries = 0;
        });
        hls.on(window.Hls.Events.ERROR, (_e, data) => {
          if (!data.fatal) return;
          // Primero se intenta recuperar sin cortar la reproducción.
          if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR && networkRecoveries < 3 && data.response?.code !== 410) {
            networkRecoveries += 1;
            if (settled) setStatus(`Reconectando… (${networkRecoveries}/3)`);
            setTimeout(() => current?.engine === hls && hls.startLoad(), 1000 * networkRecoveries);
            return;
          }
          if (data.type === window.Hls.ErrorTypes.MEDIA_ERROR && mediaRecoveries < 2) {
            mediaRecoveries += 1;
            hls.recoverMediaError();
            return;
          }
          if (settled && mySession === session) handleMidStreamFailure();
          else done(false, describeHlsError(data));
        });
        hls.loadSource(src);
        hls.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        current.engine = { destroy: resetVideo };
        video.src = src;
        play();
      } else {
        done(false, 'Este navegador no soporta HLS.');
      }
      return;
    }

    if (engineName === 'mpegts') {
      const mpegts = window.mpegts;
      if (!mpegts?.isSupported()) return done(false, 'Este navegador no soporta transmisiones MPEG-TS.');
      const player = mpegts.createPlayer(
        { type: 'mpegts', isLive: live, url: src, withCredentials: true },
        { enableWorker: false, liveBufferLatencyChasing: live, lazyLoad: !live },
      );
      current.engine = {
        destroy() {
          player.pause();
          player.unload();
          player.detachMediaElement();
          player.destroy();
        },
      };
      player.on(mpegts.Events.ERROR, (type, detail) => {
        if (settled && mySession === session) handleMidStreamFailure();
        else done(false, `Error de transmisión (${type}${detail ? `: ${detail}` : ''}).`);
      });
      player.attachMediaElement(video);
      player.load();
      play();
      return;
    }

    current.engine = { destroy: resetVideo };
    video.src = src;
    play();
  });
}

function describeHlsError(data) {
  if (data.response?.code === 403 || data.response?.code === 502) {
    return 'La fuente rechazó la conexión o está caída.';
  }
  if (data.response?.code === 410) return 'El enlace caducó.';
  if (data.type === 'networkError') return 'No se pudo descargar la señal (caída, bloqueada por país o sin permiso).';
  if (data.type === 'mediaError') return 'El formato de video no es compatible con este navegador.';
  return 'No se pudo reproducir la señal.';
}

/** Informa al servidor si un canal público arrancó, para mejorar la verificación. */
function report(key, ok) {
  if (String(key).startsWith('pub:')) api.reportPlay(key, ok).catch(() => {});
}

let midStreamRetries = 0;
/** Si una señal en vivo se corta después de haber arrancado, se reconecta una vez. */
async function handleMidStreamFailure() {
  if (!current || midStreamRetries >= 2) {
    setStatus('Se perdió la señal. Cierra y vuelve a abrir el canal.', true);
    return;
  }
  midStreamRetries += 1;
  current.started = false;
  setStatus('Reconectando…');
  start(current.item, { keepRetries: true });
}

async function start(item, { keepRetries = false } = {}) {
  const mySession = ++session;
  if (!keepRetries) midStreamRetries = 0;
  destroyEngine();
  resetVideo();
  setStatus('Conectando…');

  let playback;
  try {
    playback = await api.play(item.key);
  } catch (err) {
    if (mySession === session) setStatus(err.message, true);
    return;
  }
  if (mySession !== session) return;
  if (playback.subtitle && !item.category) els.subtitle.textContent = playback.subtitle;

  const strategies = strategiesFor(playback.format);
  let lastError = 'No se pudo reproducir.';
  for (const engine of strategies) {
    if (mySession !== session) return;
    try {
      await attempt(engine, playback.src, playback.live !== false, mySession);
      if (mySession === session) {
        els.overlay.hidden = true;
        current.started = true;
        report(item.key, true);
      }
      return;
    } catch (err) {
      lastError = err.message;
      destroyEngine();
      resetVideo();
    }
  }
  if (mySession === session) {
    report(item.key, false);
    setStatus(
      `${lastError} Puede que el canal esté caído, bloqueado para tu país o use un códec que el navegador no soporta (por ejemplo HEVC/AC3).`,
      true,
    );
  }
}

function renderFavButton() {
  const isFav = current && store.favorites.has(current.item.key);
  els.fav.textContent = isFav ? '★ En favoritos' : '☆ Favorito';
  els.fav.setAttribute('aria-pressed', String(Boolean(isFav)));
}

export function openPlayer(item) {
  const returnFocus = document.activeElement;
  current = { item, engine: null, returnFocus };
  els.title.textContent = item.name;
  els.subtitle.textContent = item.category || '';
  renderFavButton();
  els.root.hidden = false;
  document.body.style.overflow = 'hidden';
  document.getElementById('player-close').focus();
  start(item);
}

export function closePlayer() {
  if (!current) return;
  session += 1;
  destroyEngine();
  resetVideo();
  els.root.hidden = true;
  document.body.style.overflow = '';
  const { returnFocus } = current;
  current = null;
  returnFocus?.focus?.();
}

/** Muestra "Cargando…" si el video se queda esperando datos y lo oculta al reanudar. */
function watchBuffering() {
  const video = els.video;
  let stallTimer = null;
  video.addEventListener('waiting', () => {
    // Solo después de haber arrancado: durante el arranque manda el tiempo límite de cada intento.
    if (!current?.started || els.overlay.classList.contains('is-error')) return;
    clearTimeout(stallTimer);
    stallTimer = setTimeout(() => {
      if (current && video.readyState < 3) setStatus('Cargando señal…');
    }, 1500);
    // Si en 25 s no se recupera, se reconecta pidiendo un enlace nuevo.
    const waitingSession = session;
    setTimeout(() => {
      if (current && waitingSession === session && video.readyState < 3 && !video.paused) handleMidStreamFailure();
    }, 25000);
  });
  video.addEventListener('playing', () => {
    clearTimeout(stallTimer);
    if (!els.overlay.classList.contains('is-error')) els.overlay.hidden = true;
  });
}

export function initPlayer() {
  watchBuffering();
  document.getElementById('player-close').addEventListener('click', closePlayer);
  els.root.addEventListener('click', (e) => {
    if (e.target === els.root) closePlayer();
  });
  document.addEventListener('keydown', (e) => {
    if (!current) return;
    if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'BrowserBack') {
      if (e.key === 'Backspace' && e.target instanceof HTMLInputElement) return;
      e.preventDefault();
      closePlayer();
    }
  });
  els.fav.addEventListener('click', async () => {
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
