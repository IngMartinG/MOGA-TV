/**
 * Decide qué motor usará el navegador:
 *  - hls:    listas .m3u8 (hls.js)
 *  - mpegts: transmisiones MPEG-TS continuas (.ts o Xtream sin extensión) (mpegts.js)
 *  - native: archivos de video (mp4, webm, m4v, mkv) con <video>
 */
export function detectFormat(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return 'hls';
  }
  const path = url.pathname.toLowerCase();
  const output = (url.searchParams.get('output') || url.searchParams.get('extension') || '').toLowerCase();
  if (path.endsWith('.m3u8') || path.endsWith('.m3u') || output === 'm3u8' || output === 'hls') return 'hls';
  if (path.endsWith('.ts') || output === 'ts' || output === 'mpegts') return 'mpegts';
  if (/\.(mp4|m4v|webm|mkv|mov|ogv)$/.test(path)) return 'native';
  // Xtream /live/usuario/clave/123 sin extensión entrega MPEG-TS.
  if (/\/live\/[^/]+\/[^/]+\/\d+$/.test(path)) return 'mpegts';
  return 'hls';
}
