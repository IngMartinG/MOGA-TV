export function normalize(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function formatDate(ms) {
  return new Date(ms).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' });
}

/** Resume un user-agent en algo legible: "Chrome en Windows". */
export function describeDevice(ua = '') {
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Chrome\//.test(ua)
        ? 'Chrome'
        : /Firefox\//.test(ua)
          ? 'Firefox'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'Navegador';
  const os = /Android/.test(ua)
    ? 'Android'
    : /iPhone|iPad/.test(ua)
      ? 'iOS'
      : /Windows/.test(ua)
        ? 'Windows'
        : /Mac OS/.test(ua)
          ? 'macOS'
          : /Tizen|Web0S|SMART-TV|SmartTV/i.test(ua)
            ? 'Smart TV'
            : /Linux/.test(ua)
              ? 'Linux'
              : 'dispositivo';
  return `${browser} en ${os}`;
}
