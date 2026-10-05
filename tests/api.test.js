import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient, startApp, startFakeIptv } from './helpers.js';

let app;
let iptv;

before(async () => {
  app = await startApp();
  iptv = await startFakeIptv();
});

after(async () => {
  await app.stop();
  await iptv.stop();
});

const credentials = { email: 'ana@example.com', name: 'Ana', password: 'clave-segura-1' };

describe('autenticación', () => {
  test('registro valida datos', async () => {
    const c = createClient(app.base);
    const weak = await c.post('/api/auth/register', { ...credentials, password: 'corta' });
    assert.equal(weak.status, 400);
    const badEmail = await c.post('/api/auth/register', { ...credentials, email: 'no-es-correo' });
    assert.equal(badEmail.status, 400);
  });

  test('registro crea sesión con cookie segura', async () => {
    const c = createClient(app.base);
    const res = await c.post('/api/auth/register', credentials);
    assert.equal(res.status, 201);
    assert.equal(res.data.user.email, credentials.email);
    assert.equal(res.data.user.password_hash, undefined);
    const cookie = res.headers.get('set-cookie');
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Strict/);
    const me = await c.get('/api/auth/me');
    assert.equal(me.data.user.name, 'Ana');
  });

  test('no permite correos duplicados', async () => {
    const res = await createClient(app.base).post('/api/auth/register', { ...credentials, email: 'ANA@example.com' });
    assert.equal(res.status, 409);
  });

  test('login incorrecto da mensaje genérico', async () => {
    const c = createClient(app.base);
    const wrong = await c.post('/api/auth/login', { email: credentials.email, password: 'mala-clave-99' });
    const unknown = await c.post('/api/auth/login', { email: 'nadie@example.com', password: 'mala-clave-99' });
    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.equal(wrong.data.error.message, unknown.data.error.message);
  });

  test('rutas privadas exigen sesión', async () => {
    const res = await createClient(app.base).get('/api/catalog');
    assert.equal(res.status, 401);
  });

  test('bloquea peticiones de otro origen (CSRF)', async () => {
    const c = createClient(app.base);
    await c.post('/api/auth/login', { email: credentials.email, password: credentials.password });
    const res = await c.post('/api/auth/logout', {}, { origin: 'https://sitio-malo.com' });
    assert.equal(res.status, 403);
    const noOrigin = await c.post('/api/auth/logout', {}, { origin: '' });
    assert.equal(noOrigin.status, 403);
  });

  test('logout invalida la sesión', async () => {
    const c = createClient(app.base);
    await c.post('/api/auth/login', { email: credentials.email, password: credentials.password });
    assert.equal((await c.post('/api/auth/logout')).status, 204);
    const res = await fetch(`${app.base}/api/catalog`, { headers: { cookie: c.cookie } });
    assert.equal(res.status, 401);
  });

  test('bloquea la cuenta tras varios intentos fallidos', async () => {
    const c = createClient(app.base);
    const email = 'bloqueo@example.com';
    await c.post('/api/auth/register', { ...credentials, email });
    for (let i = 0; i < 5; i += 1) await c.post('/api/auth/login', { email, password: 'incorrecta-123' });
    const res = await c.post('/api/auth/login', { email, password: credentials.password });
    assert.equal(res.status, 429);
  });
});

describe('listas, reproducción y proxy', () => {
  let c;
  let playlistId;

  before(async () => {
    c = createClient(app.base);
    await c.post('/api/auth/register', { ...credentials, email: 'listas@example.com' });
  });

  test('agrega una lista M3U y la separa por tipo', async () => {
    const res = await c.post('/api/playlists', { kind: 'm3u', name: 'Prueba', url: `${iptv.base}/list.m3u` });
    assert.equal(res.status, 201, JSON.stringify(res.data));
    assert.equal(res.data.playlist.live_count, 2);
    assert.equal(res.data.playlist.movie_count, 1);
    assert.equal(JSON.stringify(res.data).includes('source_enc'), false);
    playlistId = res.data.playlist.id;
  });

  test('los canales no exponen URLs y los nombres llegan como texto', async () => {
    const res = await c.get(`/api/playlists/${playlistId}/channels?type=live`);
    assert.equal(res.data.total, 2);
    const raw = JSON.stringify(res.data);
    assert.equal(raw.includes(iptv.base), false, 'no debe exponer la URL del stream');
    assert.equal(res.data.items[0].logo, null, 'logo javascript: descartado');
    const groups = await c.get(`/api/playlists/${playlistId}/groups?type=live`);
    assert.deepEqual(groups.data.items.map((g) => g.name), ['Noticias', 'Deportes']);
    const search = await c.get(`/api/playlists/${playlistId}/channels?type=live&q=deportes`);
    assert.equal(search.data.total, 1);
  });

  test('reproduce HLS a través del proxy reescribiendo segmentos y claves', async () => {
    const { data: list } = await c.get(`/api/playlists/${playlistId}/channels?type=live&q=canal`);
    const play = await c.get(`/api/play/ch:${list.items[0].id}`);
    assert.equal(play.data.format, 'hls');
    assert.match(play.data.src, /^\/api\/stream\//);

    const manifest = await c.get(play.data.src);
    assert.equal(manifest.status, 200);
    assert.match(manifest.headers.get('content-type'), /mpegurl/);
    assert.equal(manifest.data.includes(iptv.base), false);
    const lines = manifest.data.split('\n').filter((l) => l.startsWith('/api/stream/'));
    assert.equal(lines.length, 2);
    assert.match(manifest.data, /URI="\/api\/stream\//);

    const segment = await c.get(lines[0]);
    assert.equal(segment.status, 200);
    assert.equal(segment.data, 'FAKE-TS-DATA');
    assert.match(segment.headers.get('content-security-policy'), /sandbox/);
  });

  test('un token de video no sirve para otro usuario', async () => {
    const { data: list } = await c.get(`/api/playlists/${playlistId}/channels?type=live`);
    const play = await c.get(`/api/play/ch:${list.items[1].id}`);
    assert.equal(play.data.format, 'mpegts');
    const other = createClient(app.base);
    await other.post('/api/auth/register', { ...credentials, email: 'otro@example.com' });
    assert.equal((await other.get(play.data.src)).status, 403);
    assert.equal((await other.get(`/api/play/ch:${list.items[1].id}`)).status, 404);
    assert.equal((await other.get(`/api/playlists/${playlistId}/channels`)).status, 404);
  });

  test('tokens manipulados son rechazados', async () => {
    assert.equal((await c.get('/api/stream/abc123')).status, 404);
  });

  test('agrega cuenta Xtream y rechaza credenciales malas', async () => {
    const bad = await c.post('/api/playlists', { kind: 'xtream', server: iptv.base, username: 'u', password: 'mala' });
    assert.equal(bad.status, 400);
    const ok = await c.post('/api/playlists', { kind: 'xtream', server: iptv.base, username: 'u', password: 'clave' });
    assert.equal(ok.status, 201, JSON.stringify(ok.data));
    assert.equal(ok.data.playlist.live_count, 1);
    assert.equal(ok.data.playlist.movie_count, 1);
    assert.equal(JSON.stringify(ok.data).includes('clave'), false, 'no devuelve la contraseña');
  });

  test('favoritos usan datos del servidor', async () => {
    assert.equal((await c.put('/api/favorites/free:france24-es')).status, 204);
    assert.equal((await c.put('/api/favorites/free:no-existe')).status, 404);
    assert.equal((await c.put('/api/favorites/<script>')).status, 400);
    const favs = await c.get('/api/favorites');
    assert.equal(favs.data.items[0].name, 'France 24 Español');
  });

  test('eliminar lista borra sus canales', async () => {
    assert.equal((await c.del(`/api/playlists/${playlistId}`)).status, 204);
    assert.equal((await c.get(`/api/playlists/${playlistId}/channels`)).status, 404);
  });
});

describe('protección SSRF', () => {
  let strict;
  before(async () => {
    strict = await startApp({ ALLOW_PRIVATE_NETWORKS: 'false' });
  });
  after(() => strict.stop());

  test('no permite cargar listas desde la red interna', async () => {
    const c = createClient(strict.base);
    await c.post('/api/auth/register', credentials);
    for (const url of [`${iptv.base}/list.m3u`, 'http://169.254.169.254/latest/meta-data', 'http://localhost:22/', 'file:///etc/passwd']) {
      const res = await c.post('/api/playlists', { kind: 'm3u', url });
      assert.equal(res.status, 400, url);
    }
  });
});

describe('cabeceras de seguridad', () => {
  test('la página principal envía CSP estricta', async () => {
    const res = await fetch(app.base + '/');
    const csp = res.headers.get('content-security-policy');
    assert.match(csp, /script-src 'self'/);
    assert.match(csp, /frame-ancestors 'none'/);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-powered-by'), null);
  });
});
