import { cleanText, normalizeSearch, parseM3U, safeImageUrl } from '../utils/m3u-parser.js';
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

  async function loadXtream({ server, username, password }) {
    const api = `${server}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
    const info = await httpClient.getJson(api, { maxBytes: 1024 * 1024 });
    if (!info?.user_info || Number(info.user_info.auth) !== 1) {
      throw new AppError(400, 'El servidor Xtream rechazó el usuario o la contraseña.');
    }
    if (info.user_info.status && String(info.user_info.status).toLowerCase() !== 'active') {
      throw new AppError(400, `La cuenta Xtream no está activa (estado: ${cleanText(info.user_info.status, 40)}).`);
    }
    const action = (name) => `${api}&action=${name}`;
    const big = { maxBytes: config.maxPlaylistBytes };
    const [liveCats, live, vodCats, vod] = await Promise.all([
      httpClient.getJson(action('get_live_categories'), big).catch(() => []),
      httpClient.getJson(action('get_live_streams'), big),
      httpClient.getJson(action('get_vod_categories'), big).catch(() => []),
      httpClient.getJson(action('get_vod_streams'), big).catch(() => []),
    ]);
    const catName = (list) => {
      const map = new Map();
      for (const c of Array.isArray(list) ? list : []) map.set(String(c.category_id), cleanText(c.category_name, 120));
      return (id) => map.get(String(id)) || 'Sin categoría';
    };
    const liveCat = catName(liveCats);
    const vodCat = catName(vodCats);
    const user = encodeURIComponent(username);
    const pass = encodeURIComponent(password);
    const entries = [];
    for (const item of Array.isArray(live) ? live : []) {
      const id = Number.parseInt(item.stream_id, 10);
      if (!Number.isFinite(id)) continue;
      entries.push({
        name: cleanText(item.name) || `Canal ${id}`,
        logo: safeImageUrl(item.stream_icon),
        group: liveCat(item.category_id),
        mediaType: 'live',
        url: `${server}/live/${user}/${pass}/${id}.m3u8`,
      });
    }
    for (const item of Array.isArray(vod) ? vod : []) {
      const id = Number.parseInt(item.stream_id, 10);
      if (!Number.isFinite(id)) continue;
      const ext = /^[a-z0-9]{2,5}$/i.test(item.container_extension || '') ? item.container_extension : 'mp4';
      entries.push({
        name: cleanText(item.name) || `Película ${id}`,
        logo: safeImageUrl(item.stream_icon),
        group: vodCat(item.category_id),
        mediaType: 'movie',
        url: `${server}/movie/${user}/${pass}/${id}.${ext}`,
      });
    }
    return entries;
  }

  async function loadM3U({ url }) {
    const { text, finalUrl } = await httpClient.getText(url, { maxBytes: config.maxPlaylistBytes });
    if (!/#EXTM3U|#EXTINF/i.test(text.slice(0, 4096))) {
      throw new AppError(400, 'La URL no devolvió una lista M3U válida.');
    }
    return parseM3U(text, finalUrl);
  }

  async function fetchEntries(source) {
    const entries = source.kind === 'xtream' ? await loadXtream(source) : await loadM3U(source);
    if (!entries.length) throw new AppError(400, 'La lista respondió pero no trae canales reproducibles.');
    return entries;
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
      return {
        ...playbackFor(userId, url),
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
