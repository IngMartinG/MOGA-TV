# MOGA TV — Contexto completo para continuar en otro chat

## ¿Qué es esto?
Plataforma de streaming tipo Xuper/Magma construida desde cero.
Proyecto personal del usuario para uso propio y posible monetización.

## Stack actual
- **Frontend:** HTML + CSS + JavaScript puro (sin frameworks)
- **Reproductor:** HLS.js (carga streams .m3u8)
- **Servidor local:** Node.js (server.js) — actúa como proxy CORS para listas HTTP
- **Hosting objetivo:** Vercel (gratis) para publicar en internet
- **BD objetivo:** Supabase (gratis) para auth y datos de usuarios

## Archivos del proyecto
```
MOGATV/
├── server.js       ← Proxy Node.js. Corre con: node server.js
├── index.html      ← Toda la app (HTML+CSS+JS en un solo archivo)
└── INSTRUCCIONES.txt
```

## Cómo correrlo ahora mismo
1. Instalar Node.js desde nodejs.org
2. Abrir terminal en la carpeta MOGATV
3. Ejecutar: node server.js
4. Abrir navegador en: http://localhost:3000

## Lista IPTV del usuario
- **Tipo:** Xtream Codes / Magma Player
- **Servidor:** tv.m3uts.xyz
- **Usuario:** m
- **Contraseña:** m
- **URL generada:** http://tv.m3uts.xyz/get.php?username=m&password=m&type=m3u_plus&output=ts

## Canales gratuitos HTTPS ya integrados (funcionan sin lista)
| Canal | Stream URL |
|-------|-----------|
| France 24 ES | https://static.france24.com/live/F24_ES_HI_HLS/live_web.m3u8 |
| France 24 EN | https://static.france24.com/live/F24_EN_HI_HLS/live_web.m3u8 |
| DW Español | https://dwamdstream102.akamaized.net/hls/live/2015530/dwstream102/index.m3u8 |
| DW English | https://dwamdstream104.akamaized.net/hls/live/2015531/dwstream104/index.m3u8 |
| RT Español | https://rt-esp.rttv.com/live/rtesp/playlist.m3u8 |
| RT English | https://rt-news.rttv.com/live/rtnews/playlist.m3u8 |
| NHK World | https://nhkwlive-ojp.akamaized.net/hls/live/2003459/nhkwlive-ojp-en/index.m3u8 |
| CGTN Español | https://news.cgtn.com/resource/live/spanish/cgtn-spanish.m3u8 |
| TVE Internacional | https://ztnr.rtve.es/ztnr/1688877.m3u8 |
| Antena 3 ES | https://live-edge01.antena3.com/live/hls/a3live_live/live.m3u8 |
| Señal Colombia | https://cdn.rtvcplay.co/as-rtvc-live-hls/senalcolombia/_definst_/senalcolombia.stream/playlist.m3u8 |
| Telemedellín | https://19023.live.streamtheworld.com/TELEMEDELLINHLS/livestream/chunklist_w1780380636.m3u8 |
| PBS Kids | https://pbskids-id3.akamaized.net/hls/live/696662/PBSKIDS/master.m3u8 |

## Decisiones de arquitectura tomadas
- **NO usar proxies CORS públicos** (corsproxy.io, allorigins, etc.) — los bloquea el antivirus y son inestables
- **SÍ usar servidor Node.js local** — proxy propio, sin dependencias externas, sin falsos positivos
- **NO usar React/Vue** — el usuario quiere algo simple que funcione sin build tools
- **SÍ usar HLS.js** desde CDN (jsdelivr) — maneja streams .m3u8 en todos los navegadores
- **Listas M3U separadas por pestañas** — cada lista tiene su propia sección, no se mezclan

## Funcionalidades implementadas
- [x] Login / Registro (simulado, localStorage)
- [x] Canales gratuitos reales con streams HTTPS
- [x] Reproductor HLS completo con controles
- [x] Carga de listas M3U via Xtream Codes (usuario/contraseña) o URL directa
- [x] Listas M3U separadas en pestañas propias
- [x] Secciones: Inicio, TV en Vivo, Deportes, Películas, Mis Listas, Anime, Infantil, Noticias, Favoritos, Búsqueda, Perfil, Configuración, Panel Admin
- [x] Catálogo de 30 películas estrenos 2025
- [x] Favoritos con persistencia en localStorage
- [x] Barra inferior mobile
- [x] Diseño oscuro cinematográfico (Bebas Neue + DM Sans, accent #e63946)

## Pendiente (próximos pasos)
- [ ] Subir a Vercel para acceso desde cualquier dispositivo
- [ ] Conectar Supabase para auth real y datos de usuarios
- [ ] Verificar streams gratuitos (algunos pueden cambiar)
- [ ] Agregar más canales gratuitos HTTPS
- [ ] Sistema de monetización (freemium + anuncios)
- [ ] PWA manifest para instalar en Android/Smart TV

## Monetización planeada
1. Plan gratuito con anuncios
2. Plan premium sin anuncios ($3-8 USD/mes)
3. Paquetes por país/región
4. Afiliados (VPN, otros servicios)

## Cómo continuar en otro chat
Copia este archivo y pégaselo a Claude al inicio del chat con:
"Continúa el desarrollo de MOGA TV. Aquí está el contexto:"
[pegar este archivo]

Luego adjunta server.js e index.html para que pueda editarlos directamente.

