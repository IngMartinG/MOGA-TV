# MOGA TV

MOGA TV es una PWA instalable para organizar contenido legal: canales publicos o autorizados, peliculas propias, colecciones, favoritos, historial, perfiles y panel admin.

## Como probarla en este computador

### Opcion recomendada con XAMPP

1. Abre XAMPP Control Panel.
2. Inicia Apache.
3. Copia esta carpeta a:

```text
C:\xampp\htdocs\moga-tv
```

4. Abre:

```text
http://localhost/moga-tv/
```

### Opcion con Node incluido en Codex

Tambien puedes ejecutar el servidor local:

```powershell
& "C:\Users\Nataly Toscano\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" .\server.mjs
```

Luego entra a `http://localhost:4173`.

Codigo beta de la demo:

```text
MOGA-BETA
```

## Que incluye el MVP

- PWA instalable con manifest y service worker.
- Login demo por invitacion.
- Perfiles por cuenta.
- Catalogo por secciones.
- Busqueda.
- Favoritos por perfil.
- Historial y continuar viendo.
- Reproductor HLS/MP4 preparado para fuentes autorizadas.
- Importador de listas M3U.
- Importador de servidores Xtream/Magma autorizados.
- Endpoint PHP para XAMPP que ayuda con CORS al cargar listas.
- Proxy HLS local para reescribir playlists `.m3u8` y reducir errores de CORS.
- Fallback automatico entre URLs `.m3u8`, `.ts` y ruta base en canales Xtream.
- Listas rapidas publicas de iptv-org.
- Panel admin local para agregar canales o contenido.
- Tema oscuro/claro.

## Siguiente paso profesional

Para publicar MOGA TV de forma real:

1. Crear proyecto en Supabase.
2. Crear tablas `profiles`, `content`, `favorites`, `watch_history`, `invites`.
3. Activar Row Level Security.
4. Reemplazar `localStorage` por Supabase Auth y Supabase Database.
5. Publicar en Cloudflare Pages.
6. Configurar dominio propio cuando ya este validada.

## Nota de contenido

MOGA TV debe usar fuentes propias, publicas o con autorizacion. Si una lista M3U o canal no tiene permiso claro, no debe usarse para publicar ni monetizar la app.

## Si una lista carga pero no reproduce

1. Vuelve a importar la fuente despues de actualizar esta version.
2. Prueba primero un canal de iptv-org para confirmar que el reproductor funciona.
3. Si el proveedor Xtream solo entrega `.ts` directo y no HLS `.m3u8`, algunos navegadores no podran reproducirlo sin una capa adicional de transcodificacion.
4. Si el proveedor limita IP, user-agent, conexiones o geografia, MOGA TV mostrara los canales pero el stream puede fallar.
