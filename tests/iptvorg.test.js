import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient, startApp, startFakeIptv } from './helpers.js';
import { buildIndex } from '../src/services/iptvorg.service.js';

let app;
let iptv;
let c;

before(async () => {
  iptv = await startFakeIptv();
  app = await startApp({ IPTVORG_API_BASE: `${iptv.base}/api`, ARCHIVE_BASE: `${iptv.base}/archive` });
  c = createClient(app.base);
  await c.post('/api/auth/register', { email: 'pub@example.com', name: 'Pub', password: 'clave-segura-1' });
});

after(async () => {
  await app.stop();
  await iptv.stop();
});

/** Espera a que la verificación en segundo plano termine. */
async function waitVerified(path) {
  for (let i = 0; i < 50; i += 1) {
    const res = await c.get(path);
    if (res.data.stats?.pending === 0) return res;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('La verificación no terminó a tiempo');
}

describe('API iptv-org', () => {
  test('el índice descarta canales para adultos, bloqueados, cerrados y streams sin canal', () => {
    const { streams } = buildIndex({
      channels: [
        { id: 'A', name: 'A', country: 'CO', categories: ['news'] },
        { id: 'X', name: 'X', is_nsfw: true },
        { id: 'B', name: 'B' },
        { id: 'C', name: 'C', closed: '2020-01-01' },
      ],
      streams: [
        { channel: 'A', url: 'https://a/1.m3u8', quality: '720p' },
        { channel: 'A', url: 'https://a/2.m3u8', quality: '1080p' },
        { channel: 'X', url: 'https://x/1.m3u8' },
        { channel: 'B', url: 'https://b/1.m3u8' },
        { channel: 'C', url: 'https://c/1.m3u8' },
        { channel: null, url: 'https://n/1.m3u8' },
        { channel: 'A', url: 'ftp://a/3' },
      ],
      logos: [{ channel: 'A', feed: null, in_use: true, url: 'https://logo/a.png' }],
      blocklist: [{ channel: 'B' }],
    });
    assert.deepEqual(
      streams.map((s) => s.name),
      ['A', 'A (1080p)'],
    );
    assert.equal(streams[0].logo, 'https://logo/a.png');
    assert.match(streams[0].id, /^[a-f0-9]{16}$/);
  });

  test('lista de Colombia: verifica, oculta los caídos y muestra los que funcionan primero', async () => {
    const first = await c.get('/api/catalog/public/pais/co');
    assert.equal(first.status, 200, JSON.stringify(first.data));
    assert.equal(first.data.items.length, 3);

    const verified = await waitVerified('/api/catalog/public/pais/co');
    assert.deepEqual(verified.data.stats, { ok: 2, pending: 0, dead: 1 });
    assert.deepEqual(
      verified.data.items.map((i) => [i.name, i.status]),
      [
        ['Canal Bueno', 'ok'],
        ['Canal Con Referer', 'ok'],
      ],
    );
    assert.equal(verified.data.items[0].quality, '720p');
    assert.equal(verified.data.items[1].logo, null, 'logo javascript: descartado');
    assert.equal(JSON.stringify(verified.data).includes(iptv.base), false, 'no expone URLs');

    const all = await c.get('/api/catalog/public/pais/co?todos=1');
    assert.equal(all.data.items.at(-1).status, 'dead');
  });

  test('reproduce un canal que exige Referer y User-Agent enviando esas cabeceras', async () => {
    const { data } = await c.get('/api/catalog/public/cat/sports');
    const ref = data.items.find((i) => i.name === 'Canal Con Referer');
    const play = await c.get(`/api/play/${ref.key}`);
    assert.equal(play.status, 200);
    const manifest = await c.get(play.data.src);
    assert.equal(manifest.status, 200, 'la fuente exige Referer/Origin/User-Agent');
    const segment = manifest.data.split('\n').find((l) => l.startsWith('/api/stream/'));
    assert.equal((await c.get(segment)).data, 'PUB-TS', 'los segmentos heredan las cabeceras');
  });

  test('solo acepta reportes de canales que el usuario abrió', async () => {
    const all = await c.get('/api/catalog/public/pais/co?todos=1');
    const dead = all.data.items.find((i) => i.status === 'dead');

    await c.post(`/api/play/${dead.key}/result`, { ok: true });
    let after = await c.get('/api/catalog/public/pais/co?todos=1');
    assert.equal(after.data.items.find((i) => i.key === dead.key).status, 'dead', 'sin play previo no cuenta');

    await c.get(`/api/play/${dead.key}`);
    assert.equal((await c.post(`/api/play/${dead.key}/result`, { ok: true })).status, 204);
    after = await c.get('/api/catalog/public/pais/co?todos=1');
    assert.equal(after.data.items.find((i) => i.key === dead.key).status, 'ok');

    assert.equal((await c.post(`/api/play/${dead.key}/result`, { ok: 'si' })).status, 400);
  });

  test('favoritos con canales públicos', async () => {
    const { data } = await c.get('/api/catalog/public/pais/co');
    assert.equal((await c.put(`/api/favorites/${data.items[0].key}`)).status, 204);
    const favs = await c.get('/api/favorites');
    assert.equal(favs.data.items[0].name, 'Canal Bueno');
    assert.equal(favs.data.items[0].logo, 'https://logo.example/bueno.png');
  });

  test('rechaza listas que no existen', async () => {
    assert.equal((await c.get('/api/catalog/public/pais/zz')).status, 404);
    assert.equal((await c.get('/api/catalog/public/otro/co')).status, 400);
  });
});

describe('Películas de Internet Archive', () => {
  test('lista una categoría con portada y descarta identificadores raros', async () => {
    const res = await c.get('/api/movies/archive/terror');
    assert.equal(res.status, 200, JSON.stringify(res.data));
    assert.equal(res.data.items.length, 1);
    const [movie] = res.data.items;
    assert.equal(movie.key, 'ia:NightOfTheLivingDead');
    assert.equal(movie.year, 1968);
    assert.equal(movie.description, 'Clásico de terror', 'sin HTML');
    assert.match(movie.logo, /services\/img\/NightOfTheLivingDead$/);
    assert.equal((await c.get('/api/movies/archive/noexiste')).status, 404);
  });

  test('si advancedsearch falla, usa la API scrape de respaldo', async () => {
    const res = await c.get('/api/movies/archive/western');
    assert.equal(res.status, 200, JSON.stringify(res.data));
    assert.deepEqual(res.data.items.map((m) => m.name), ['Western de Respaldo']);
  });

  test('reproduce el mejor MP4 (no el tráiler) con soporte de saltos (Range)', async () => {
    const play = await c.get('/api/play/ia:NightOfTheLivingDead');
    assert.equal(play.status, 200, JSON.stringify(play.data));
    assert.equal(play.data.format, 'native');
    assert.equal(play.data.live, false);
    const full = await c.get(play.data.src);
    assert.equal(full.data, 'MP4-MOVIE!');
    const part = await c.get(play.data.src, { range: 'bytes=0-3' });
    assert.equal(part.status, 206);
    assert.equal(part.headers.get('content-range'), 'bytes 0-3/10');
  });

  test('películas como favoritos', async () => {
    assert.equal((await c.put('/api/favorites/ia:NightOfTheLivingDead')).status, 204);
    const favs = await c.get('/api/favorites');
    assert.ok(favs.data.items.some((f) => f.name === 'Night of the Living Dead'));
  });
});
