# MOGA TV

Aplicación web para ver **TV en vivo y películas**: canales gratuitos incluidos, TV pública por país y las **listas IPTV propias de cada usuario** (M3U o Xtream Codes). Cada usuario tiene su cuenta, y sus listas y favoritos quedan separados.

Funciona en PC, celular y Smart TV (navegación con las flechas del control remoto), y se puede instalar como aplicación (PWA).

---

## Cómo ejecutarla (Windows, Mac o Linux)

Requisito: **Node.js 22.13 o superior** (versión LTS de https://nodejs.org).

```bash
npm install
npm start
```

Abre **http://localhost:3000**, crea tu cuenta y listo.

- Para usarla desde el celular o la TV en tu misma red, crea un archivo `.env` (copia de `.env.example`) con `HOST=0.0.0.0` y `PUBLIC_ORIGIN=http://IP-DE-TU-PC:3000`.
- `npm test` ejecuta las pruebas automáticas.
- `npm run dev` reinicia el servidor solo cada vez que cambias el código.

Ya **no hace falta XAMPP ni PHP**.

---

## Estructura del proyecto (por capas)

```
src/
├── server.js            Arranque del servidor
├── app.js               Raíz de composición: conecta todas las capas
├── config/              Variables de entorno (.env)
├── routes/              Rutas HTTP de la API (/api/...)
├── controllers/         Reciben la petición, validan y responden
├── validators/          Esquemas de validación de datos (zod)
├── services/            Lógica de negocio (auth, listas, catálogo, video, favoritos)
├── repositories/        Acceso a la base de datos (SQL)
├── db/                  Conexión SQLite y migraciones
├── security/            Contraseñas, cifrado, protección SSRF
├── middlewares/         Sesión, cabeceras de seguridad, CSRF, límites, errores
├── infrastructure/      Cliente HTTP saliente seguro y logger
├── data/                Catálogo incluido (canales y películas libres)
└── utils/               Parser M3U, detección de formato, errores

public/                  Frontend (sin frameworks, sin compilación)
├── index.html
├── css/                 base · layout · components
└── js/
    ├── main.js          Arranque y rutas de la app
    ├── core/            API, router, estado, utilidades DOM, navegación TV
    ├── player/          Reproductor (hls.js · mpegts.js · nativo)
    ├── ui/              Tarjetas, avisos
    └── views/           Pantallas: inicio, TV, películas, listas, favoritos, cuenta

tests/                   Pruebas unitarias y de API (node:test)
```

Flujo de una petición: **ruta → controlador → servicio → repositorio → base de datos**.

---

## Seguridad

| Riesgo | Cómo se protege |
|---|---|
| Robo de contraseñas | Hash **scrypt** con sal (parámetros OWASP). Nunca se guardan en texto plano. |
| Fuerza bruta | Límite de intentos por IP y **bloqueo de cuenta 15 min** tras 5 fallos. Mensajes genéricos (no revela qué correos existen). |
| Robo de sesión | Cookie `HttpOnly` + `SameSite=Strict` + `Secure` en producción. El token se guarda **hasheado** en la base de datos. Ver y cerrar sesiones de otros dispositivos. |
| CSRF | Toda petición que modifica datos exige el `Origin` propio y JSON. |
| XSS (nombres de canal maliciosos en listas) | El frontend nunca usa `innerHTML` con datos externos; **CSP estricta** (`script-src 'self'`, sin scripts en línea ni CDNs externos). Los logos solo aceptan `http(s)`. |
| Credenciales IPTV del usuario | Se guardan **cifradas (AES-256-GCM)** en el servidor y **nunca llegan al navegador**. |
| Exposición de URLs de video | El navegador solo recibe **tokens cifrados con caducidad**, atados a su usuario. No es un proxy abierto. |
| SSRF (usar el servidor para atacar la red interna) | Se bloquean IPs privadas, localhost y metadatos de la nube, validando en cada redirección y en el momento de conectar (anti DNS-rebinding). |
| Contenido externo ejecutándose en el dominio | El proxy fuerza tipos de contenido de video y `CSP: sandbox`. |
| Datos inválidos | Validación de todas las entradas con zod; límites de tamaño en peticiones y listas. |

Además: cabeceras de seguridad con helmet (HSTS en producción, `nosniff`, `frame-ancestors 'none'`, `no-referrer`), consultas SQL parametrizadas, logs sin credenciales, y el usuario puede eliminar su cuenta y todos sus datos.

---

## Publicar en internet

**No uses Vercel ni Netlify**: no sirven para transmitir video continuo ni para guardar la base de datos. Usa un servicio que ejecute Node de forma continua:

- **Railway**, **Render** o **Fly.io** (con volumen persistente para `/app/data`), o
- un **VPS** (DigitalOcean, Hetzner, Contabo…) con Docker:

```bash
docker build -t moga-tv .
docker run -d -p 3000:3000 -v moga-data:/app/data \
  -e APP_SECRET="$(npm run -s secret)" \
  -e PUBLIC_ORIGIN=https://tu-dominio.com -e TRUST_PROXY=1 moga-tv
```

En producción es obligatorio: **HTTPS** (Caddy, Nginx + Let's Encrypt, o el del proveedor), `NODE_ENV=production` y un `APP_SECRET` propio guardado en un lugar seguro.

---

## Límites conocidos

- **Códecs**: el navegador reproduce H.264/AAC (y VP9). Canales en **HEVC/H.265** o con audio **AC3** pueden no verse en el navegador (sí en VLC). No se puede arreglar sin recodificar en el servidor.
- **DRM**: Netflix, DAZN, Win Sports+, etc. usan DRM; ninguna app web puede reproducirlos sin licencia oficial.
- **Canales gratuitos**: sus URLs cambian con el tiempo y algunos se bloquean según el país.
- **Ancho de banda**: todo el video pasa por tu servidor (por seguridad). Cada espectador consume en el servidor lo mismo que en su casa (~2–8 Mbps en HD).
- **Series de Xtream**: todavía no se importan (solo TV en vivo y películas).

## Si algo no carga

Ejecuta `npm run diagnostico -- servidor usuario contraseña` (los datos de tu propia cuenta Xtream; son opcionales). Prueba la conexión a las listas públicas, a los canales gratuitos y a tu cuenta por todas las vías (player_api, get.php y varios user-agents) sin mostrar tu usuario ni tu contraseña. Mientras usas la app, la terminal de `npm start` también muestra qué servidor falló y con qué código.

## Aviso legal

MOGA TV es un **reproductor**: no aloja ni vende canales. Cada usuario es responsable de las listas que agrega. Para **cobrar** por la app con canales de terceros necesitas los derechos de transmisión de esos canales; sin ellos solo puedes monetizar con contenido propio, libre o licenciado.
