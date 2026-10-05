import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

loadDotEnv(resolve(ROOT_DIR, '.env'));

/** Carga un archivo .env sencillo (CLAVE=valor) sin dependencias externas. */
function loadDotEnv(file) {
  if (!existsSync(file)) return;
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
}

function bool(value, fallback) {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'si'].includes(String(value).toLowerCase());
}

function int(value, fallback) {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * La clave maestra cifra credenciales IPTV y tokens de stream.
 * En producción es obligatoria; en desarrollo se genera una y se guarda en data/.
 */
function resolveSecret(isProduction, dataDir) {
  const fromEnv = process.env.APP_SECRET;
  if (fromEnv) {
    if (fromEnv.length < 32) throw new Error('APP_SECRET debe tener al menos 32 caracteres.');
    return fromEnv;
  }
  if (isProduction) throw new Error('APP_SECRET es obligatorio en producción. Genera uno con: npm run secret');
  const file = resolve(dataDir, '.app-secret');
  if (existsSync(file)) return readFileSync(file, 'utf8').trim();
  const secret = randomBytes(48).toString('base64url');
  writeFileSync(file, secret, { mode: 0o600 });
  return secret;
}

export function loadConfig(overrides = {}) {
  const env = { ...process.env, ...overrides };
  const isProduction = env.NODE_ENV === 'production';
  const dataDir = resolve(ROOT_DIR, env.DATA_DIR || 'data');
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

  const port = int(env.PORT, 3000);
  return Object.freeze({
    rootDir: ROOT_DIR,
    publicDir: resolve(ROOT_DIR, 'public'),
    dataDir,
    isProduction,
    port,
    host: env.HOST || '127.0.0.1',
    publicOrigin: (env.PUBLIC_ORIGIN || `http://localhost:${port}`).replace(/\/$/, ''),
    trustProxy: int(env.TRUST_PROXY, 0),
    dbPath: env.DB_PATH === ':memory:' ? ':memory:' : resolve(dataDir, env.DB_PATH || 'moga.db'),
    secret: overrides.APP_SECRET || resolveSecret(isProduction, dataDir),
    allowRegistration: bool(env.ALLOW_REGISTRATION, true),
    // Solo para pruebas automatizadas: permite que el proxy llegue a IPs privadas.
    allowPrivateNetworks: bool(env.ALLOW_PRIVATE_NETWORKS, false),
    sessionTtlDays: int(env.SESSION_TTL_DAYS, 7),
    streamTokenTtlMinutes: int(env.STREAM_TOKEN_TTL_MINUTES, 360),
    maxPlaylistBytes: int(env.MAX_PLAYLIST_MB, 60) * 1024 * 1024,
    maxPlaylistsPerUser: int(env.MAX_PLAYLISTS_PER_USER, 10),
    upstreamTimeoutMs: int(env.UPSTREAM_TIMEOUT_MS, 20000),
  });
}
