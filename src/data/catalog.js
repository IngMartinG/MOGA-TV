/**
 * Contenido incluido de fábrica. Solo fuentes gratuitas publicadas por sus propios
 * dueños (canales públicos, emisoras internacionales) u obras de dominio público /
 * licencia abierta. Las URLs pueden cambiar con el tiempo: revísalas periódicamente.
 */
export const FREE_CHANNELS = [
  {
    id: 'moga-test',
    name: 'MOGA Test',
    category: 'Prueba',
    country: 'Global',
    description: 'Señal de prueba para comprobar que el reproductor funciona.',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
  {
    id: 'france24-es',
    name: 'France 24 Español',
    category: 'Noticias',
    country: 'Francia',
    url: 'https://static.france24.com/live/F24_ES_HI_HLS/live_web.m3u8',
  },
  {
    id: 'france24-en',
    name: 'France 24 English',
    category: 'Noticias',
    country: 'Francia',
    url: 'https://static.france24.com/live/F24_EN_HI_HLS/live_web.m3u8',
  },
  {
    id: 'dw-es',
    name: 'DW Español',
    category: 'Noticias',
    country: 'Alemania',
    url: 'https://dwamdstream102.akamaized.net/hls/live/2015530/dwstream102/index.m3u8',
  },
  {
    id: 'dw-en',
    name: 'DW English',
    category: 'Noticias',
    country: 'Alemania',
    url: 'https://dwamdstream104.akamaized.net/hls/live/2015531/dwstream104/index.m3u8',
  },
  {
    id: 'nhk-world',
    name: 'NHK World Japan',
    category: 'Internacional',
    country: 'Japón',
    url: 'https://nhkwlive-ojp.akamaized.net/hls/live/2003459/nhkwlive-ojp-en/index.m3u8',
  },
  {
    id: 'cgtn-es',
    name: 'CGTN Español',
    category: 'Noticias',
    country: 'China',
    url: 'https://news.cgtn.com/resource/live/spanish/cgtn-spanish.m3u8',
  },
  {
    id: 'tve-int',
    name: 'TVE Internacional',
    category: 'Internacional',
    country: 'España',
    url: 'https://ztnr.rtve.es/ztnr/1688877.m3u8',
  },
  {
    id: 'senal-colombia',
    name: 'Señal Colombia',
    category: 'Colombia',
    country: 'Colombia',
    url: 'https://cdn.rtvcplay.co/as-rtvc-live-hls/senalcolombia/_definst_/senalcolombia.stream/playlist.m3u8',
  },
];

export const FREE_MOVIES = [
  {
    id: 'night-living-dead',
    name: 'Night of the Living Dead',
    year: 1968,
    category: 'Terror',
    license: 'Dominio público',
    description: 'Clásico de George A. Romero. Película completa en dominio público.',
    url: 'https://upload.wikimedia.org/wikipedia/commons/b/bb/Night_of_the_Living_Dead_%281968_film%29.webm',
  },
  {
    id: 'big-buck-bunny',
    name: 'Big Buck Bunny',
    year: 2008,
    category: 'Animación',
    license: 'Creative Commons (Blender Foundation)',
    description: 'Cortometraje animado abierto de la Blender Foundation.',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
  {
    id: 'sintel',
    name: 'Sintel',
    year: 2010,
    category: 'Fantasía',
    license: 'Creative Commons (Blender Foundation)',
    description: 'Una joven busca a su dragón perdido. Película abierta de Blender.',
    url: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
  },
  {
    id: 'tears-of-steel',
    name: 'Tears of Steel',
    year: 2012,
    category: 'Ciencia ficción',
    license: 'Creative Commons (Blender Foundation)',
    description: 'Ciencia ficción en Ámsterdam con efectos visuales abiertos.',
    url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
  },
];

/** Países con lista pública en iptv-org (https://github.com/iptv-org/iptv). */
export const PUBLIC_COUNTRIES = [
  { code: 'co', name: 'Colombia' },
  { code: 'mx', name: 'México' },
  { code: 'ar', name: 'Argentina' },
  { code: 'cl', name: 'Chile' },
  { code: 'pe', name: 'Perú' },
  { code: 'ec', name: 'Ecuador' },
  { code: 've', name: 'Venezuela' },
  { code: 'es', name: 'España' },
  { code: 'us', name: 'Estados Unidos' },
  { code: 'br', name: 'Brasil' },
];

export const PUBLIC_LIST_URL = (code) => `https://iptv-org.github.io/iptv/countries/${code}.m3u`;
