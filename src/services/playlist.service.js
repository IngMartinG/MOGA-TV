import { normalizeSearch, parseM3U } from '../utils/m3u-parser.js';
import { USER_AGENTS } from '../infrastructure/http-client.js';
import { loadXtreamAccount } from './xtream.client.js';
import { parseExternalUrl } from '../security/ssrf.js';
import { AppError, notFound } from '../utils/errors.js';

const MEDIA_TYPES = ['live', 'movie', 'series'];

/**
 * Listas del usuario (M3U o Xtream Codes). Las credenciales y URLs se guardan
 * cifradas y nunca se devuelven al navegador.
 */
export function createPlaylistService({ playlists, httpClient, sealer, config, playbackFor }) {
  function normalizeXtreamServer(raw) {
    const value = String(raw).trim().replace(/\/+$/, '');
    const withScheme = /^https?:\/\//i.test(value) ? value : `http://${value}`;
    const url = parseExternalUrl(withScheme);
    return `${url.protocol}//${url.host}${url.pathname.replace(/\/+$/, '')}`;
  }

  /** Etiqueta visible de la fuente, sin usuario ni contraseña. */
  function labelFor(source) {
    if (source.kind === 'xtream') return `Xtream · ${new URL(source.server).host}`;
    return `M3U · ${new URL(source.url).host}`;
  }

  async function loadM3U({ url, userAgent }) {
    const failures = [];
    for (const ua of [...new Set([userAgent, USER_AGENTS.vlc, USER_AGENTS.browser].filter(Boolean))]) {
      try {
        const { text, finalUrl } = await httpClient.getText(url, { maxBytes: config.maxPlaylistBytes, headers: { 'user-agent': ua } });
        if (!/#EXTM3U|#EXTINF/i.test(text.slice(0, 4096))) {
          throw new AppError(400, 'La URL no devolvió una lista M3U válida.');
        }
        return { entries: parseM3U(text, finalUrl), userAgent: ua };
      } catch (err) {
        if (!err.upstreamStatus) throw err;
        failures.push(`HTTP ${err.upstreamStatus}`);
      }
    }
    throw new AppError(502, `El servidor de la lista respondió con error (${failures.join(', ')}).`);
  }

  /** Descarga la lista y recuerda el user-agent que aceptó el servidor. */
  async function fetchEntries(source) {
    const result =
      source.kind === 'xtream'
        ? await loadXtreamAccount(httpClient, source, { maxBytes: config.maxPlaylistBytes })
        : await loadM3U(source);
    if (!result.entries.length) throw new AppError(400, 'La lista respondió pero no trae canales reproducibles.');
    source.userAgent = result.userAgent;
    return result.entries;
  }

  function storeEntries(playlistId, entries) {
    return playlists.replaceChannels(
      playlistId,
      entries.map((e) => ({
        name: e.name,
        searchName: normalizeSearch(e.name),
        logo: e.logo,
        group: e.group || 'Sin categoría',
        mediaType: MEDIA_TYPES.includes(e.mediaType) ? e.mediaType : 'live',
        urlEnc: sealer.seal(e.url),
      })),
    );
  }

  async function add(userId, input) {
    if (playlists.countForUser(userId) >= config.maxPlaylistsPerUser) {
      throw new AppError(400, `Puedes tener máximo ${config.maxPlaylistsPerUser} listas.`);
    }
    const source =
      input.kind === 'xtream'
        ? {
            kind: 'xtream',
            server: normalizeXtreamServer(input.server),
            username: input.username,
            password: input.password,
          }
        : { kind: 'm3u', url: parseExternalUrl(input.url).href };

    // Primero se valida que la lista funcione; solo entonces se guarda.
    const entries = await fetchEntries(source);
    const id = playlists.create({
      userId,
      name: input.name || new URL(source.kind === 'xtream' ? source.server : source.url).host,
      kind: source.kind,
      sourceEnc: sealer.seal(source),
      sourceLabel: labelFor(source),
    });
    storeEntries(id, entries);
    return playlists.findForUser(id, userId);
  }

  async function refresh(userId, playlistId) {
    const row = playlists.findSecretForUser(playlistId, userId);
    if (!row) throw notFound('Lista no encontrada.');
    const source = sealer.open(row.source_enc);
    if (!source) throw new AppError(500, 'No se pudieron leer los datos de la lista. Vuelve a agregarla.');
    try {
      storeEntries(playlistId, await fetchEntries(source));
      playlists.updateSource(playlistId, sealer.seal(source));
    } catch (err) {
      playlists.setError(playlistId, err.expose ? err.message : 'Error al actualizar.');
      throw err;
    }
    return playlists.findForUser(playlistId, userId);
  }

  function requireOwned(userId, playlistId) {
    const row = playlists.findForUser(playlistId, userId);
    if (!row) throw notFound('Lista no encontrada.');
    return row;
  }

  return {
    list: (userId) => playlists.listForUser(userId),
    add,
    refresh,
    rename(userId, playlistId, name) {
      requireOwned(userId, playlistId);
      playlists.rename(playlistId, userId, name);
      return playlists.findForUser(playlistId, userId);
    },
    remove(userId, playlistId) {
      if (!playlists.remove(playlistId, userId)) throw notFound('Lista no encontrada.');
    },
    groups(userId, playlistId, mediaType) {
      requireOwned(userId, playlistId);
      return playlists.groups(playlistId, mediaType);
    },
    channels(userId, playlistId, { mediaType, group, q, offset, limit }) {
      requireOwned(userId, playlistId);
      const { total, items } = playlists.searchChannels({
        playlistId,
        mediaType,
        group,
        query: normalizeSearch(q),
        offset,
        limit,
      });
      return {
        total,
        items: items.map((c) => ({
          key: `ch:${c.id}`,
          id: c.id,
          name: c.name,
          logo: c.logo,
          category: c.group_title,
          mediaType: c.media_type,
        })),
      };
    },
    /** Devuelve datos de reproducción para un canal propio del usuario. */
    playChannel(userId, channelId) {
      const channel = playlists.findChannelForUser(channelId, userId);
      if (!channel) throw notFound('Canal no encontrado.');
      const url = sealer.open(channel.url_enc);
      if (!url) throw new AppError(500, 'No se pudo leer el canal. Actualiza la lista.');
      const source = sealer.open(channel.source_enc);
      return {
        ...playbackFor(userId, url, { userAgent: source?.userAgent }),
        title: channel.name,
        subtitle: channel.playlist_name,
        live: channel.media_type === 'live',
      };
    },
    channelInfo(userId, channelId) {
      const channel = playlists.findChannelForUser(channelId, userId);
      if (!channel) throw notFound('Canal no encontrado.');
      return { title: channel.name, logo: channel.logo, subtitle: channel.playlist_name };
    },
  };
}
