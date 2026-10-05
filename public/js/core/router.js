/** Enrutador por hash (#/ruta?param=valor). Funciona sin configurar el servidor. */
const routes = [];
let notFound = null;
let onChange = () => {};

export function route(pattern, handler) {
  const keys = [];
  const regex = new RegExp(
    `^${pattern.replace(/:([a-z]+)/g, (_, key) => {
      keys.push(key);
      return '([^/]+)';
    })}$`,
  );
  routes.push({ regex, keys, handler, pattern });
}

export function setNotFound(handler) {
  notFound = handler;
}

export function onRouteChange(fn) {
  onChange = fn;
}

export function navigate(path) {
  location.hash = `#${path}`;
}

export function current() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, search = ''] = raw.split('?');
  return { path, query: new URLSearchParams(search) };
}

export function resolve() {
  const { path, query } = current();
  for (const r of routes) {
    const match = path.match(r.regex);
    if (!match) continue;
    const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(match[i + 1])]));
    onChange(r.pattern);
    return r.handler({ params, query });
  }
  return notFound?.({ params: {}, query });
}

export function startRouter() {
  window.addEventListener('hashchange', resolve);
  return resolve();
}
