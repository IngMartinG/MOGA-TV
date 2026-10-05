const MAX_ENTRIES = 150000;
const MAX_TEXT = 300;

/** Normaliza texto para búsqueda: minúsculas, sin tildes. */
export function normalizeSearch(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function cleanText(text, max = MAX_TEXT) {
  return String(text || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** Acepta solo logos http(s); cualquier otro esquema (javascript:, data:) se descarta. */
export function safeImageUrl(raw) {
  if (!raw) return null;
  try {
    const url = new URL(String(raw).trim());
    return ['http:', 'https:'].includes(url.protocol) && url.href.length <= 1024 ? url.href : null;
  } catch {
    return null;
  }
}

export function guessMediaType(url) {
  const path = (() => {
    try {
      return new URL(url).pathname.toLowerCase();
    } catch {
      return String(url).toLowerCase();
    }
  })();
  if (path.includes('/series/')) return 'series';
  if (path.includes('/movie/') || /\.(mp4|mkv|avi|mov|m4v|webm)$/.test(path)) return 'movie';
  return 'live';
}

function readAttributes(line) {
  const attrs = {};
  const re = /([a-zA-Z0-9_-]+)="([^"]*)"/g;
  let m;
  while ((m = re.exec(line))) attrs[m[1].toLowerCase()] = m[2];
  return attrs;
}

/** El nombre es lo que va después de la última coma fuera de comillas. */
function readTitle(line) {
  let inQuotes = false;
  let lastComma = -1;
  for (let i = 0; i < line.length; i += 1) {
    if (line[i] === '"') inQuotes = !inQuotes;
    else if (line[i] === ',' && !inQuotes) lastComma = i;
  }
  return lastComma === -1 ? '' : line.slice(lastComma + 1);
}

/**
 * Convierte una lista M3U/M3U8 (formato IPTV) en entradas normalizadas.
 * Solo acepta URLs de stream http(s).
 */
export function parseM3U(text, baseUrl) {
  const entries = [];
  let pending = null;
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('#EXTINF')) {
      const attrs = readAttributes(line);
      pending = {
        name: cleanText(readTitle(line) || attrs['tvg-name']),
        logo: safeImageUrl(attrs['tvg-logo']),
        group: cleanText(attrs['group-title'], 120),
      };
      continue;
    }
    if (line.startsWith('#EXTGRP:') && pending && !pending.group) {
      pending.group = cleanText(line.slice(8), 120);
      continue;
    }
    if (line.startsWith('#')) continue;

    let url;
    try {
      url = new URL(line, baseUrl);
    } catch {
      pending = null;
      continue;
    }
    if (!['http:', 'https:'].includes(url.protocol)) {
      pending = null;
      continue;
    }
    const info = pending || { name: '', logo: null, group: '' };
    const mediaType = guessMediaType(url.href);
    entries.push({
      name: info.name || cleanText(decodeURIComponent(url.pathname.split('/').pop() || 'Canal')),
      logo: info.logo,
      group: info.group || (mediaType === 'live' ? 'Sin categoría' : 'Películas'),
      mediaType,
      url: url.href,
    });
    pending = null;
    if (entries.length >= MAX_ENTRIES) break;
  }
  return entries;
}
