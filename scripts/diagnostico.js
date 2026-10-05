/**
 * Diagnóstico de conexión de MOGA TV. Prueba desde tu PC:
 *   - acceso a internet y a las listas públicas,
 *   - un canal gratuito (HLS),
 *   - opcionalmente tu cuenta Xtream (todas las vías) y un canal de ella.
 *
 * Uso:
 *   npm run diagnostico
 *   npm run diagnostico -- <servidor> <usuario> <contraseña>
 *
 * Nunca imprime usuario, contraseña ni rutas completas: solo servidores y códigos.
 */
import { createHttpClient, USER_AGENTS } from '../src/infrastructure/http-client.js';
import { loadXtreamAccount } from '../src/services/xtream.client.js';
import { FREE_CHANNELS } from '../src/data/catalog.js';
import { buildIndex } from '../src/services/iptvorg.service.js';
import { sourceHeaders } from '../src/services/stream.service.js';

const client = createHttpClient({ timeoutMs: 15000 });
const [server, username, password] = process.argv.slice(2);

const host = (url) => {
  try {
    return new URL(url).host;
  } catch {
    return '?';
  }
};

function line(ok, label, detail = '') {
  console.log(`${ok ? '  ✔' : '  ✘'} ${label}${detail ? ` — ${detail}` : ''}`);
}

/** Pide una URL y, si es HLS, también su primer segmento. */
async function probeStream(label, url, userAgent) {
  const started = Date.now();
  try {
    const headers = typeof userAgent === 'object' ? userAgent : userAgent ? { 'user-agent': userAgent } : {};
    const res = await client.request(url, { headers });
    const type = String(res.headers['content-type'] || '?');
    const ms = Date.now() - started;
    if (res.statusCode >= 400) {
      res.resume();
      return line(false, label, `HTTP ${res.statusCode} desde ${host(res.finalUrl)} (${ms} ms)`);
    }
    if (/mpegurl/i.test(type) || /\.m3u8?$/i.test(new URL(res.finalUrl).pathname)) {
      let text = '';
      for await (const chunk of res) {
        text += chunk;
        if (text.length > 512 * 1024) break;
      }
      res.destroy();
      const uris = text.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#'));
      line(true, label, `lista HLS con ${uris.length} entradas (${ms} ms)`);
      if (uris[0]) await probeStream(`${label} → primer elemento`, new URL(uris[0], res.finalUrl).href, userAgent);
      return;
    }
    // Para video continuo (TS) se leen ~2 s de datos para medir velocidad.
    let bytes = 0;
    const until = Date.now() + 2000;
    for await (const chunk of res) {
      bytes += chunk.length;
      if (Date.now() > until || bytes > 8 * 1024 * 1024) break;
    }
    res.destroy();
    const secs = (Date.now() - started) / 1000;
    line(true, label, `${type}, ${(bytes / 1024).toFixed(0)} KB en ${secs.toFixed(1)} s (~${((bytes * 8) / secs / 1e6).toFixed(1)} Mbps)`);
  } catch (err) {
    line(false, label, err.message);
  }
}

console.log('\nMOGA TV · diagnóstico\n');

console.log('1) API de iptv-org');
let colombia = [];
try {
  const base = 'https://iptv-org.github.io/api';
  const big = { maxBytes: 80 * 1024 * 1024 };
  const [channels, streams, logos, blocklist] = await Promise.all(
    ['channels', 'streams', 'logos', 'blocklist'].map((f) => client.getJson(`${base}/${f}.json`, big)),
  );
  const index = buildIndex({ channels, streams, logos, blocklist });
  colombia = index.streams.filter((s) => s.country === 'CO');
  line(true, 'API iptv-org', `${channels.length} canales, ${index.streams.length} streams utilizables, ${colombia.length} de Colombia`);
} catch (err) {
  line(false, 'API iptv-org', err.message);
}
for (const s of colombia.slice(0, 5)) {
  const extra = [s.referrer && 'Referer', s.userAgent && 'User-Agent'].filter(Boolean).join(' + ');
  await probeStream(`${s.name}${extra ? ` (con ${extra})` : ''}`, s.url, sourceHeaders(s));
}

console.log('\n2) Canales gratuitos');
for (const ch of FREE_CHANNELS.slice(0, 4)) await probeStream(ch.name, ch.url);

if (server && username && password) {
  console.log('\n3) Cuenta Xtream');
  const base = (/^https?:\/\//i.test(server) ? server : `http://${server}`).replace(/\/+$/, '');
  console.log(`   Servidor: ${host(base)}`);
  try {
    const { entries, userAgent, via } = await loadXtreamAccount(
      client,
      { server: base, username, password },
      { onAttempt: (a) => line(a.ok, a.label, a.ok ? `${a.count} entradas` : a.reason) },
    );
    const live = entries.filter((e) => e.mediaType === 'live');
    line(true, `Lista cargada por ${via}`, `${live.length} canales, ${entries.length - live.length} películas`);
    console.log('\n4) Canales de la cuenta');
    for (const e of live.slice(0, 3)) await probeStream(e.name, e.url, userAgent);
    if (live[0] && /\.m3u8$/.test(live[0].url)) {
      await probeStream(`${live[0].name} (formato TS)`, live[0].url.replace(/\.m3u8$/, '.ts'), userAgent);
    }
  } catch (err) {
    line(false, 'Cuenta Xtream', err.message);
  }
} else {
  console.log('\n(Para probar tu cuenta: npm run diagnostico -- servidor usuario contraseña)');
}

console.log(`\nUser-agents probados: ${Object.keys(USER_AGENTS).join(', ')}`);
console.log('Copia todo este texto y envíalo si necesitas ayuda (no contiene tu usuario ni contraseña).\n');
client.close();
