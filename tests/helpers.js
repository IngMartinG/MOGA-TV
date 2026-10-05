import http from 'node:http';
import { loadConfig } from '../src/config/env.js';
import { createApp } from '../src/app.js';
import { createLogger } from '../src/infrastructure/logger.js';

export function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`));
  });
}

/** Levanta la app con base de datos en memoria. */
export async function startApp(overrides = {}) {
  const config = loadConfig({
    DB_PATH: ':memory:',
    APP_SECRET: 'test-secret-test-secret-test-secret-1234',
    ALLOW_PRIVATE_NETWORKS: 'true',
    ...overrides,
  });
  const { app, close } = createApp(config, { logger: createLogger({ silent: true }) });
  const server = http.createServer(app);
  const base = await listen(server);
  return {
    base,
    async stop() {
      await new Promise((r) => server.close(r));
      close();
    },
  };
}

/** Cliente HTTP de prueba que guarda la cookie de sesión como un navegador. */
export function createClient(base) {
  let cookie = '';
  async function call(method, path, body, headers = {}) {
    const res = await fetch(base + path, {
      method,
      redirect: 'manual',
      headers: {
        origin: base,
        ...(cookie ? { cookie } : {}),
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    const type = res.headers.get('content-type') || '';
    const data = type.includes('json') ? await res.json() : await res.text();
    return { status: res.status, data, headers: res.headers };
  }
  return {
    get: (p, h) => call('GET', p, undefined, h),
    post: (p, b, h) => call('POST', p, b ?? {}, h),
    put: (p, h) => call('PUT', p, undefined, h),
    patch: (p, b) => call('PATCH', p, b),
    del: (p, b) => call('DELETE', p, b),
    get cookie() {
      return cookie;
    },
  };
}

/** Servidor IPTV falso: M3U, API Xtream, HLS y segmentos. */
export async function startFakeIptv() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    const base = `http://${req.headers.host}`;
    // Panel "estricto": sin player_api y solo acepta user-agent de navegador (como algunos Magma/Xuper).
    if (url.pathname.startsWith('/strict/')) {
      const browser = String(req.headers['user-agent'] || '').startsWith('Mozilla/');
      if (url.pathname === '/strict/player_api.php') {
        res.statusCode = 400;
        return res.end('Bad Request');
      }
      if (!browser) {
        res.statusCode = 403;
        return res.end('Forbidden');
      }
      if (url.pathname === '/strict/get.php') {
        if (url.searchParams.get('password') !== 'clave') {
          res.statusCode = 401;
          return res.end();
        }
        res.setHeader('content-type', 'audio/x-mpegurl');
        return res.end(
          ['#EXTM3U', '#EXTINF:-1 group-title="Deportes",Deportes Estricto', `${base}/strict/live/u/clave/10.m3u8`].join('\n'),
        );
      }
      if (url.pathname === '/strict/live/u/clave/10.m3u8') {
        res.setHeader('content-type', 'application/vnd.apple.mpegurl');
        return res.end('#EXTM3U\n#EXTINF:4,\nseg.ts\n');
      }
      if (url.pathname.endsWith('.ts')) {
        res.setHeader('content-type', 'video/mp2t');
        return res.end(Buffer.from('STRICT-TS'));
      }
    }
    if (url.pathname === '/list.m3u') {
      res.setHeader('content-type', 'audio/x-mpegurl');
      return res.end(
        [
          '#EXTM3U',
          '#EXTINF:-1 tvg-logo="javascript:alert(1)" group-title="Noticias",Canal <img src=x onerror=alert(1)>',
          `${base}/hls/master.m3u8`,
          '#EXTINF:-1 tvg-logo="https://logo.example/a.png" group-title="Deportes",Deportes HD',
          `${base}/live/u/p/77.ts`,
          '#EXTINF:-1 group-title="Cine",Pelicula Uno',
          `${base}/movie/u/p/5.mp4`,
          '#EXTINF:-1,Malicioso',
          'file:///etc/passwd',
        ].join('\n'),
      );
    }
    if (url.pathname === '/player_api.php') {
      res.setHeader('content-type', 'application/json');
      if (url.searchParams.get('password') !== 'clave') return res.end(JSON.stringify({ user_info: { auth: 0 } }));
      const action = url.searchParams.get('action');
      if (!action) return res.end(JSON.stringify({ user_info: { auth: 1, status: 'Active' } }));
      if (action === 'get_live_categories') return res.end(JSON.stringify([{ category_id: '1', category_name: 'Colombia' }]));
      if (action === 'get_live_streams')
        return res.end(JSON.stringify([{ stream_id: 10, name: 'Caracol', category_id: '1', stream_icon: '' }]));
      if (action === 'get_vod_categories') return res.end(JSON.stringify([]));
      if (action === 'get_vod_streams')
        return res.end(JSON.stringify([{ stream_id: 20, name: 'Peli', container_extension: 'mkv' }]));
    }
    if (url.pathname === '/hls/master.m3u8') {
      res.setHeader('content-type', 'application/vnd.apple.mpegurl');
      return res.end('#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="key.bin"\n#EXTINF:4,\nseg1.ts\n#EXTINF:4,\n/abs/seg2.ts\n');
    }
    if (url.pathname.endsWith('.ts') || url.pathname.endsWith('.bin')) {
      res.setHeader('content-type', 'video/mp2t');
      return res.end(Buffer.from('FAKE-TS-DATA'));
    }
    if (url.pathname === '/html') {
      res.setHeader('content-type', 'text/html');
      return res.end('<script>alert(1)</script>');
    }
    res.statusCode = 404;
    res.end();
  });
  const base = await listen(server);
  return { base, stop: () => new Promise((r) => server.close(r)) };
}
