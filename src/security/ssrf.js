import { lookup as dnsLookup } from 'node:dns';
import { isIP, BlockList } from 'node:net';
import { AppError } from '../utils/errors.js';

/**
 * Protección SSRF: el proxy de video descarga URLs que vienen de listas de terceros,
 * así que nunca debe poder alcanzar la red interna del servidor (router, base de datos,
 * metadatos de la nube, localhost...).
 */
const blocked = new BlockList();
for (const [net, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
]) {
  blocked.addSubnet(net, prefix, 'ipv4');
}
for (const [net, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['64:ff9b::', 96],
  ['100::', 64],
  ['2001:db8::', 32],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
]) {
  blocked.addSubnet(net, prefix, 'ipv6');
}

export function isPrivateAddress(address) {
  const family = isIP(address);
  if (family === 4) return blocked.check(address, 'ipv4');
  if (family === 6) {
    // IPv4 mapeada en IPv6 (::ffff:10.0.0.1)
    const mapped = address.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return blocked.check(mapped[1], 'ipv4');
    return blocked.check(address, 'ipv6');
  }
  return true;
}

/** Valida forma y esquema de una URL externa. Devuelve un objeto URL. */
export function parseExternalUrl(raw) {
  let url;
  try {
    url = new URL(String(raw).trim());
  } catch {
    throw new AppError(400, 'La URL no es válida.');
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new AppError(400, 'Solo se permiten URLs http o https.');
  if (url.username || url.password) throw new AppError(400, 'La URL no puede incluir usuario:contraseña@.');
  if (!url.hostname) throw new AppError(400, 'La URL no tiene servidor.');
  if (url.href.length > 4096) throw new AppError(400, 'La URL es demasiado larga.');
  return url;
}

/**
 * Node no consulta el DNS cuando el host ya es una IP (http://127.0.0.1), así que
 * esas direcciones se validan aquí antes de conectar.
 */
export function assertPublicLiteralHost(url, { allowPrivateNetworks = false } = {}) {
  if (allowPrivateNetworks) return;
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(host) && isPrivateAddress(host)) {
    throw new AppError(400, 'Esa dirección no está permitida (red privada).');
  }
}

/**
 * lookup para http.request: resuelve el DNS y rechaza IPs privadas en el mismo paso
 * en que se conecta (evita ataques de "DNS rebinding").
 */
export function createSafeLookup({ allowPrivateNetworks = false } = {}) {
  return function safeLookup(hostname, options, callback) {
    dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
      if (err) return callback(err);
      const list = Array.isArray(addresses) ? addresses : [{ address: addresses, family: options.family }];
      const allowed = allowPrivateNetworks ? list : list.filter((a) => !isPrivateAddress(a.address));
      if (!allowed.length) {
        const blockedErr = new Error('Destino bloqueado: dirección de red privada.');
        blockedErr.code = 'EBLOCKEDHOST';
        return callback(blockedErr);
      }
      if (options.all) return callback(null, allowed);
      return callback(null, allowed[0].address, allowed[0].family);
    });
  };
}
