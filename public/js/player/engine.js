import { api } from '../core/api.js';

const START_TIMEOUT_MS = 20000;
const STALL_RECONNECT_MS = 25000;

/** Orden de motores a intentar según el formato que detectó el servidor. */
function strategiesFor(format) {
  if (format === 'mpegts') return ['mpegts', 'hls'];
  if (format === 'native') return ['native', 'hls'];
  return ['hls', 'mpegts'];
}

function describeHlsError(data) {
  if (data.response?.code === 403 || data.response?.code === 502) return 'La fuente rechazó la conexión o está caída.';
  if (data.response?.code === 410) return 'El enlace caducó.';
  if (data.type === 'networkError') return 'No se pudo descargar la señal (caída, bloqueada por país o sin permiso).';
  if (data.type === 'mediaError') return 'El formato de video no es compatible con este navegador.';
  return 'No se pudo reproducir la señal.';
}

/** Informa al servidor si un canal público arrancó, para mejorar la verificación. */
function report(key, ok) {
  if (String(key).startsWith('pub:')) api.reportPlay(key, ok).catch(() => {});
}

/**
 * Reproduce contenidos de MOGA TV en un <video>: pide el enlace al servidor,
 * prueba hls.js / mpegts.js / video nativo, se recupera de cortes y reconecta.
 * Se usa en la ventana del reproductor y en la vista previa de TV en vivo.
 */
export class VideoSession {
  constructor({ video, overlay, status, onStarted, onInfo }) {
    this.video = video;
    this.overlay = overlay;
    this.status = status;
    this.onStarted = onStarted || (() => {});
    this.onInfo = onInfo || (() => {});
    this.item = null;
    this.engine = null;
    this.session = 0;
    this.started = false;
    this.retries = 0;
    this.watchBuffering();
  }

  setStatus(text, isError = false) {
    this.overlay.hidden = false;
    this.overlay.classList.toggle('is-error', isError);
    this.status.textContent = text;
  }

  destroyEngine() {
    const engine = this.engine;
    if (!engine) return;
    this.engine = null;
    // Se difiere: si se destruye dentro de un evento del propio motor, éste falla.
    setTimeout(() => {
      try {
        engine.destroy();
      } catch {
        /* ya destruido */
      }
    }, 0);
  }

  resetVideo() {
    this.video.pause();
    this.video.removeAttribute('src');
    this.video.load();
  }

  /** Detiene todo y deja el video vacío. */
  stop() {
    this.session += 1;
    this.item = null;
    this.started = false;
    this.destroyEngine();
    this.resetVideo();
  }

  play(item, { keepRetries = false } = {}) {
    this.item = item;
    if (!keepRetries) this.retries = 0;
    return this.start(item);
  }

  async start(item) {
    const mySession = ++this.session;
    this.started = false;
    this.destroyEngine();
    this.resetVideo();
    this.setStatus('Conectando…');

    let playback;
    try {
      playback = await api.play(item.key);
    } catch (err) {
      if (mySession === this.session) this.setStatus(err.message, true);
      return;
    }
    if (mySession !== this.session) return;
    this.onInfo(playback);

    let lastError = 'No se pudo reproducir.';
    for (const engine of strategiesFor(playback.format)) {
      if (mySession !== this.session) return;
      try {
        await this.attempt(engine, playback.src, playback.live !== false, mySession);
        if (mySession === this.session) {
          this.overlay.hidden = true;
          this.started = true;
          // Tras un minuto estable, se recuperan los reintentos para futuros cortes.
          setTimeout(() => {
            if (mySession === this.session) this.retries = 0;
          }, 60000);
          report(item.key, true);
          this.onStarted(item);
        }
        return;
      } catch (err) {
        lastError = err.message;
        this.destroyEngine();
        this.resetVideo();
      }
    }
    if (mySession === this.session) {
      report(item.key, false);
      this.setStatus(
        `${lastError} Puede que el canal esté caído, bloqueado para tu país o use un códec que el navegador no soporta (HEVC/AC3).`,
        true,
      );
    }
  }

  /** Si una señal en vivo se corta después de haber arrancado, se reconecta hasta 2 veces. */
  midStreamFailure() {
    if (!this.item || this.retries >= 2) {
      this.setStatus('Se perdió la señal. Elige el canal de nuevo o prueba otro.', true);
      return;
    }
    this.retries += 1;
    this.setStatus('Reconectando…');
    this.play(this.item, { keepRetries: true });
  }

  /** Intenta reproducir con un motor; resuelve cuando hay imagen o rechaza si falla. */
  attempt(engineName, src, live, mySession) {
    const { video } = this;
    const self = this;
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
      const failAfterStart = () => settled && mySession === self.session;

      const play = () => video.play().catch(() => self.setStatus('Pulsa ▶ para iniciar la reproducción.'));

      if (engineName === 'hls') {
        if (window.Hls?.isSupported()) {
          const hls = new window.Hls({
            enableWorker: true,
            // Sin modo baja latencia: en canales IPTV causa cortes y recargas constantes.
            lowLatencyMode: false,
            backBufferLength: 30,
            // Colchón de video: los cortes breves de la fuente no detienen la imagen.
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
            liveSyncDurationCount: 4,
            liveMaxLatencyDurationCount: 10,
            fragLoadingRetryDelay: 500,
            startLevel: -1,
            capLevelToPlayerSize: true,
            manifestLoadingMaxRetry: 6,
            levelLoadingMaxRetry: 6,
            fragLoadingMaxRetry: 8,
            manifestLoadingTimeOut: 15000,
            fragLoadingTimeOut: 25000,
          });
          self.engine = hls;
          let networkRecoveries = 0;
          let mediaRecoveries = 0;
          hls.on(window.Hls.Events.MANIFEST_PARSED, play);
          let noticeTimer = null;
          hls.on(window.Hls.Events.FRAG_BUFFERED, () => {
            networkRecoveries = 0;
            clearTimeout(noticeTimer);
          });
          hls.on(window.Hls.Events.ERROR, (_e, data) => {
            if (!data.fatal) return;
            if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR && networkRecoveries < 3 && data.response?.code !== 410) {
              networkRecoveries += 1;
              // El aviso solo aparece si la recuperación tarda: los cortes de 1-2 s pasan sin avisar.
              clearTimeout(noticeTimer);
              if (settled) {
                noticeTimer = setTimeout(() => {
                  if (self.engine === hls && self.video.readyState < 3) self.setStatus('Reconectando…');
                }, 3000);
              }
              setTimeout(() => self.engine === hls && hls.startLoad(), 1000 * networkRecoveries);
              return;
            }
            if (data.type === window.Hls.ErrorTypes.MEDIA_ERROR && mediaRecoveries < 2) {
              mediaRecoveries += 1;
              hls.recoverMediaError();
              return;
            }
            if (failAfterStart()) self.midStreamFailure();
            else done(false, describeHlsError(data));
          });
          hls.loadSource(src);
          hls.attachMedia(video);
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          self.engine = { destroy: () => self.resetVideo() };
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
        self.engine = {
          destroy() {
            player.pause();
            player.unload();
            player.detachMediaElement();
            player.destroy();
          },
        };
        player.on(mpegts.Events.ERROR, (type, detail) => {
          if (failAfterStart()) self.midStreamFailure();
          else done(false, `Error de transmisión (${type}${detail ? `: ${detail}` : ''}).`);
        });
        player.attachMediaElement(video);
        player.load();
        play();
        return;
      }

      self.engine = { destroy: () => self.resetVideo() };
      video.src = src;
      play();
    });
  }

  /** Muestra "Cargando…" si el video espera datos; reconecta si no se recupera. */
  watchBuffering() {
    const { video } = this;
    let stallTimer = null;
    video.addEventListener('waiting', () => {
      if (!this.started || this.overlay.classList.contains('is-error')) return;
      clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        if (this.started && video.readyState < 3) this.setStatus('Cargando señal…');
      }, 3000);
      const waitingSession = this.session;
      setTimeout(() => {
        if (waitingSession === this.session && video.readyState < 3 && !video.paused) this.midStreamFailure();
      }, STALL_RECONNECT_MS);
    });
    video.addEventListener('playing', () => {
      clearTimeout(stallTimer);
      if (!this.overlay.classList.contains('is-error')) this.overlay.hidden = true;
    });
  }
}
