import { USER_AGENTS } from '../infrastructure/http-client.js';
import { cleanText, parseM3U, safeImageUrl } from '../utils/m3u-parser.js';
import { AppError } from '../utils/errors.js';

/**
 * Carga una cuenta Xtream Codes probando varias vías, porque cada panel
 * (Xtream UI, XUI, Magma, Xuper...) acepta cosas distintas:
 *   1. player_api.php con distintos user-agents (trae categorías y películas)
 *   2. get.php (lista M3U) en formato HLS y luego TS
 * Devuelve las entradas y el user-agent que funcionó, para reutilizarlo al reproducir.
 */
export async function loadXtreamAccount(httpClient, { server, username, password, userAgent }, opts = {}) {
  const { maxBytes = 60 * 1024 * 1024, onAttempt = () => {} } = opts;
  const user = encodeURIComponent(username);
  const pass = encodeURIComponent(password);
  const api = `${server}/player_api.php?username=${user}&password=${pass}`;

  const agents = [...new Set([userAgent, USER_AGENTS.vlc, USER_AGENTS.browser, USER_AGENTS.smarters].filter(Boolean))];
  const attempts = [
    ...agents.map((ua) => ({ label: `player_api (${uaName(ua)})`, ua, run: () => viaPlayerApi(ua) })),
    ...agents.slice(0, 2).flatMap((ua) => [
      { label: `get.php m3u8 (${uaName(ua)})`, ua, run: () => viaGetPhp(ua, 'm3u8') },
      { label: `get.php ts (${uaName(ua)})`, ua, run: () => viaGetPhp(ua, 'ts') },
    ]),
  ];

  async function viaPlayerApi(ua) {
    const headers = { 'user-agent': ua };
    const info = await httpClient.getJson(api, { maxBytes: 1024 * 1024, headers });
    if (!info?.user_info) throw new AppError(502, 'respuesta sin user_info');
    if (Number(info.user_info.auth) !== 1) {
      const err = new AppError(400, 'El servidor Xtream rechazó el usuario o la contraseña.');
      err.final = true;
      throw err;
    }
    const status = String(info.user_info.status || 'active').toLowerCase();
    if (status !== 'active') {
      const err = new AppError(400, `La cuenta Xtream no está activa (estado: ${cleanText(info.user_info.status, 40)}).`);
      err.final = true;
      throw err;
    }
    const action = (name) => `${api}&action=${name}`;
    const big = { maxBytes, headers };
    const [liveCats, live, vodCats, vod] = await Promise.all([
      httpClient.getJson(action('get_live_categories'), big).catch(() => []),
      httpClient.getJson(action('get_live_streams'), big),
      httpClient.getJson(action('get_vod_categories'), big).catch(() => []),
      httpClient.getJson(action('get_vod_streams'), big).catch(() => []),
    ]);
    const liveCat = categoryNames(liveCats);
    const vodCat = categoryNames(vodCats);
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

  async function viaGetPhp(ua, output) {
    const url = `${server}/get.php?username=${user}&password=${pass}&type=m3u_plus&output=${output}`;
    const { text, finalUrl } = await httpClient.getText(url, { maxBytes, headers: { 'user-agent': ua } });
    if (!/#EXTM3U|#EXTINF/i.test(text.slice(0, 4096))) throw new AppError(502, 'no devolvió una lista M3U');
    return parseM3U(text, finalUrl);
  }

  const failures = [];
  for (const attempt of attempts) {
    try {
      const entries = await attempt.run();
      onAttempt({ label: attempt.label, ok: true, count: entries.length });
      if (!entries.length) {
        failures.push(`${attempt.label}: lista vacía`);
        continue;
      }
      return { entries, userAgent: attempt.ua, via: attempt.label };
    } catch (err) {
      const reason = err.upstreamStatus ? `HTTP ${err.upstreamStatus}` : shortReason(err);
      onAttempt({ label: attempt.label, ok: false, reason });
      if (err.final) throw err;
      failures.push(`${attempt.label}: ${reason}`);
      // Si ni siquiera hay conexión con el servidor, no tiene sentido seguir probando.
      if (err.network) break;
    }
  }
  throw new AppError(
    502,
    `El servidor no entregó la lista por ninguna vía. Intentos → ${failures.join(' · ')}. ` +
      'Revisa servidor (con puerto si tiene, ej. http://servidor:8080), usuario, contraseña y que la cuenta esté activa.',
  );
}

function categoryNames(list) {
  const map = new Map();
  for (const c of Array.isArray(list) ? list : []) map.set(String(c.category_id), cleanText(c.category_name, 120));
  return (id) => map.get(String(id)) || 'Sin categoría';
}

function uaName(ua) {
  if (ua === USER_AGENTS.vlc) return 'VLC';
  if (ua === USER_AGENTS.browser) return 'navegador';
  if (ua === USER_AGENTS.smarters) return 'Smarters';
  return 'personalizado';
}

function shortReason(err) {
  return String(err?.message || 'error').replace(/\.$/, '').slice(0, 120);
}
