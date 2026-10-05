# MOGA TV - Plan de producto y arquitectura

## Decision principal

MOGA TV empezara como una PWA: una web app instalable que funciona en celular, computador, tablets, navegadores de Smart TV, Android TV y TV Box. Despues, cuando la version web este validada, se podra empaquetar como app Android/Android TV.

## Stack recomendado

- Frontend: React + Vite + TypeScript.
- Estilo: Tailwind CSS o CSS modular con tema oscuro/claro.
- Hosting: Cloudflare Pages.
- Base de datos y autenticacion: Supabase.
- Reproductor: HLS.js para streams HLS autorizados.
- Seguridad: HTTPS, Supabase Row Level Security, roles de usuario/admin, validacion de fuentes y panel protegido.

## Modelo legal de contenido

MOGA TV no debe depender de fuentes no autorizadas, listas piratas o retransmision de canales pagos sin licencia. La plataforma debe aceptar:

- Canales publicos o gratuitos con permiso de uso.
- Canales FAST o AVOD que permitan integracion.
- Listas M3U legales del propietario o proveedor autorizado.
- Contenido propio del administrador.
- Enlaces externos oficiales cuando no se permita reproducir dentro de la app.
- Integraciones futuras con Plex, Jellyfin o bibliotecas personales.

## Secciones iniciales

- Inicio.
- TV en vivo.
- Deportes.
- Peliculas.
- Series.
- Anime.
- Infantil.
- Noticias.
- Musica.
- Documentales.
- Colombia.
- Internacional.
- Favoritos.
- Continuar viendo.
- Tendencias.
- Busqueda.
- Perfiles.
- Cuenta.
- Panel admin.

## Usuarios

Recomendacion inicial: registro por invitacion o codigo.

Motivo: evita abuso, bots, cuentas falsas y problemas si la app todavia esta en beta. Mas adelante se puede activar registro publico con protecciones.

## Monetizacion

Opciones legales recomendadas:

- Plan gratuito con anuncios.
- Plan premium sin anuncios.
- Plan familiar con varios perfiles.
- Afiliados a servicios legales de streaming.
- Patrocinios de secciones.
- Publicidad display no invasiva.
- Donaciones o membresias.
- Venta de plantillas/white-label para negocios que quieran una app similar.
- Comisiones por promover contenido, eventos o servicios autorizados.

No recomendado:

- Cobrar acceso a canales pagos o estrenos sin licencia.
- Usar fuentes no verificadas como base del negocio.
- Monetizar una app con contenido que pueda violar derechos de autor.

## Primer MVP

El MVP debe incluir:

- Login y registro con codigo de invitacion.
- Home visual estilo plataforma premium.
- Catalogo con datos reales legales o demo verificable.
- Reproductor para fuentes autorizadas.
- Favoritos.
- Historial.
- Continuar viendo.
- Busqueda.
- Filtros por categoria, pais e idioma.
- Panel admin para crear canales/contenidos.
- Temas oscuro y claro.
- Idioma base espanol, preparado para multiidioma.

## Riesgo principal

El mayor riesgo no es tecnico: es de licencias. La app puede ser excelente, pero para generar dinero de forma estable debe evitar contenido no autorizado. Si una fuente M3U no tiene permiso claro, debe tratarse como no apta para produccion hasta verificarla.

