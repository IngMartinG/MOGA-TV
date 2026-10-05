/** Cliente de la API. La sesión viaja en una cookie httpOnly; el JS nunca la ve. */
export class ApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let onUnauthorized = () => {};
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

async function request(method, path, body) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'No hay conexión con el servidor.');
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new ApiError(res.status, data?.error?.message || `Error ${res.status}`, data?.error?.code);
    if (res.status === 401 && !path.startsWith('/auth/')) onUnauthorized();
    throw err;
  }
  return data;
}

const enc = encodeURIComponent;

export const api = {
  me: () => request('GET', '/auth/me'),
  login: (data) => request('POST', '/auth/login', data),
  register: (data) => request('POST', '/auth/register', data),
  logout: () => request('POST', '/auth/logout'),

  updateProfile: (data) => request('PATCH', '/account/profile', data),
  changePassword: (data) => request('POST', '/account/password', data),
  sessions: () => request('GET', '/account/sessions'),
  logoutOthers: () => request('POST', '/account/sessions/logout-others'),
  deleteAccount: (data) => request('DELETE', '/account', data),

  catalog: () => request('GET', '/catalog'),
  publicChannels: (country) => request('GET', `/catalog/public/${enc(country)}`),
  play: (key) => request('GET', `/play/${enc(key)}`),

  playlists: () => request('GET', '/playlists'),
  addPlaylist: (data) => request('POST', '/playlists', data),
  refreshPlaylist: (id) => request('POST', `/playlists/${id}/refresh`),
  renamePlaylist: (id, name) => request('PATCH', `/playlists/${id}`, { name }),
  deletePlaylist: (id) => request('DELETE', `/playlists/${id}`),
  groups: (id, type) => request('GET', `/playlists/${id}/groups?type=${enc(type)}`),
  channels: (id, params) => request('GET', `/playlists/${id}/channels?${new URLSearchParams(params)}`),

  favorites: () => request('GET', '/favorites'),
  addFavorite: (key) => request('PUT', `/favorites/${enc(key)}`),
  removeFavorite: (key) => request('DELETE', `/favorites/${enc(key)}`),
};
