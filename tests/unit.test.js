import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseM3U, safeImageUrl } from '../src/utils/m3u-parser.js';
import { detectFormat } from '../src/utils/media-format.js';
import { isPrivateAddress, parseExternalUrl } from '../src/security/ssrf.js';
import { createSealer } from '../src/security/crypto.js';
import { hashPassword, verifyPassword } from '../src/security/password.js';
import { itemKeySchema } from '../src/validators/schemas.js';

test('parseM3U lee nombre, grupo, logo y tipo', () => {
  const list = parseM3U(
    [
      '#EXTM3U',
      '#EXTINF:-1 tvg-name="X" tvg-logo="https://l/a.png" group-title="Noticias, Mundo",France 24',
      'https://s/live.m3u8',
      '#EXTINF:-1 group-title="Cine",Película',
      'http://s/movie/u/p/1.mkv',
      '#EXTINF:-1,Sin URL válida',
      'javascript:alert(1)',
    ].join('\n'),
  );
  assert.equal(list.length, 2);
  assert.deepEqual(list[0], {
    name: 'France 24',
    logo: 'https://l/a.png',
    group: 'Noticias, Mundo',
    mediaType: 'live',
    url: 'https://s/live.m3u8',
  });
  assert.equal(list[1].mediaType, 'movie');
});

test('safeImageUrl descarta esquemas peligrosos', () => {
  assert.equal(safeImageUrl('javascript:alert(1)'), null);
  assert.equal(safeImageUrl('data:image/svg+xml,<svg>'), null);
  assert.equal(safeImageUrl('https://x/y.png'), 'https://x/y.png');
});

test('detectFormat elige el motor correcto', () => {
  assert.equal(detectFormat('https://a/b/index.m3u8'), 'hls');
  assert.equal(detectFormat('http://a/get.php?username=u&output=m3u8'), 'hls');
  assert.equal(detectFormat('http://a/live/u/p/12.ts'), 'mpegts');
  assert.equal(detectFormat('http://a/live/u/p/12'), 'mpegts');
  assert.equal(detectFormat('http://a/movie/u/p/1.mp4'), 'native');
});

test('isPrivateAddress bloquea redes internas', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '192.168.1.1', '172.20.0.1', '169.254.169.254', '::1', 'fd00::1', '::ffff:10.0.0.1', '0.0.0.0']) {
    assert.equal(isPrivateAddress(ip), true, ip);
  }
  for (const ip of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111']) {
    assert.equal(isPrivateAddress(ip), false, ip);
  }
});

test('parseExternalUrl rechaza esquemas y credenciales embebidas', () => {
  assert.throws(() => parseExternalUrl('file:///etc/passwd'));
  assert.throws(() => parseExternalUrl('ftp://x/y'));
  assert.throws(() => parseExternalUrl('http://user:pass@x/'));
  assert.equal(parseExternalUrl('https://x.com/a').hostname, 'x.com');
});

test('sealer cifra, descifra y detecta manipulación', () => {
  const sealer = createSealer('s'.repeat(40));
  const token = sealer.seal({ a: 1 });
  assert.deepEqual(sealer.open(token), { a: 1 });
  const tampered = token.slice(0, -2) + (token.endsWith('A') ? 'BB' : 'AA');
  assert.equal(sealer.open(tampered), null);
  assert.equal(createSealer('otra-clave-otra-clave-otra-clave-xx').open(token), null);
});

test('hashPassword usa scrypt con sal y verifica', async () => {
  const hash = await hashPassword('clave-segura-123');
  assert.match(hash, /^scrypt\$/);
  assert.notEqual(hash, await hashPassword('clave-segura-123'));
  assert.equal(await verifyPassword('clave-segura-123', hash), true);
  assert.equal(await verifyPassword('otra', hash), false);
});

test('claves de contenido válidas e inválidas', () => {
  for (const key of ['free:dw-es', 'movie:sintel', 'public:pais:co:12', 'public:cat:sports:0', 'ch:42']) {
    assert.equal(itemKeySchema.safeParse(key).success, true, key);
  }
  for (const key of ['public:co:1', 'public:otro:co:1', '<script>', 'ch:abc', 'public:cat:../x:1']) {
    assert.equal(itemKeySchema.safeParse(key).success, false, key);
  }
});
