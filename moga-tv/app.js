const STORAGE_KEY = "moga-tv-state";
const INVITE_CODE = "MOGA-BETA";

const legalDemoContent = [
  {
    id: "bbb-live",
    title: "MOGA Cinema Demo",
    type: "Canal",
    category: "Peliculas",
    country: "Global",
    language: "Sin dialogo",
    sourceType: "HLS autorizado",
    sourceUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    poster:
      "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=900&q=80",
    hero:
      "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1800&q=80",
    description:
      "Canal demo con una fuente publica de prueba. Sirve para validar el reproductor, favoritos e historial mientras agregas fuentes autorizadas."
  },
  {
    id: "sports-studio",
    title: "Zona Deportes Demo",
    type: "Canal",
    category: "Deportes",
    country: "Global",
    language: "Espanol",
    sourceType: "Demo",
    sourceUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    poster:
      "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=900&q=80",
    hero:
      "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1800&q=80",
    description:
      "Espacio preparado para eventos, resumenes y canales deportivos con licencia. Las fuentes premium deben agregarse solo con permiso."
  },
  {
    id: "anime-room",
    title: "Anime Room",
    type: "Coleccion",
    category: "Anime",
    country: "Japon",
    language: "Multidioma",
    sourceType: "Catalogo",
    sourceUrl: "",
    poster:
      "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?auto=format&fit=crop&w=900&q=80",
    hero:
      "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?auto=format&fit=crop&w=1800&q=80",
    description:
      "Categoria lista para organizar anime legal, trailers, enlaces oficiales y contenido propio."
  },
  {
    id: "news-global",
    title: "Noticias Global",
    type: "Canal",
    category: "Noticias",
    country: "Internacional",
    language: "Espanol",
    sourceType: "Enlace oficial",
    sourceUrl: "",
    poster:
      "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=900&q=80",
    hero:
      "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1800&q=80",
    description:
      "Plantilla para canales informativos publicos, oficiales o embebibles segun los permisos del proveedor."
  },
  {
    id: "kids-safe",
    title: "MOGA Kids",
    type: "Coleccion",
    category: "Infantil",
    country: "Global",
    language: "Espanol",
    sourceType: "Curado",
    sourceUrl: "",
    poster:
      "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=900&q=80",
    hero:
      "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=1800&q=80",
    description:
      "Area infantil con control de contenido. Se puede conectar a listas curadas, canales publicos y material propio."
  },
  {
    id: "music-live",
    title: "Music Live",
    type: "Canal",
    category: "Musica",
    country: "Global",
    language: "Multidioma",
    sourceType: "Demo",
    sourceUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    poster:
      "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80",
    hero:
      "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1800&q=80",
    description:
      "Canal preparado para conciertos, clips autorizados, radios visuales o contenido musical con derechos claros."
  },
  {
    id: "docs-world",
    title: "Documentales Mundo",
    type: "Coleccion",
    category: "Documentales",
    country: "Global",
    language: "Espanol",
    sourceType: "Catalogo",
    sourceUrl: "",
    poster:
      "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=900&q=80",
    hero:
      "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1800&q=80",
    description:
      "Seccion para documentales propios, publicos, educativos o acuerdos con proveedores legales."
  },
  {
    id: "colombia-tv",
    title: "Colombia TV",
    type: "Categoria",
    category: "Colombia",
    country: "Colombia",
    language: "Espanol",
    sourceType: "Curado",
    sourceUrl: "",
    poster:
      "https://images.unsplash.com/photo-1534996858221-380b92700493?auto=format&fit=crop&w=900&q=80",
    hero:
      "https://images.unsplash.com/photo-1534996858221-380b92700493?auto=format&fit=crop&w=1800&q=80",
    description:
      "Area para canales colombianos publicos, regionales o privados cuando exista autorizacion de uso."
  },
  {
    id: "big-buck-bunny",
    title: "Big Buck Bunny",
    type: "Pelicula",
    category: "Peliculas",
    country: "Global",
    language: "Sin dialogo",
    sourceType: "Pelicula abierta demo",
    sourceUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    poster:
      "https://images.unsplash.com/photo-1616530940355-351fabd9524b?auto=format&fit=crop&w=900&q=80",
    hero:
      "https://images.unsplash.com/photo-1616530940355-351fabd9524b?auto=format&fit=crop&w=1800&q=80",
    description:
      "Pelicula/demo de video usada para validar VOD, continuar viendo y reproduccion HLS."
  },
  {
    id: "sintel-demo",
    title: "Sintel Demo",
    type: "Pelicula",
    category: "Peliculas",
    country: "Global",
    language: "Multidioma",
    sourceType: "Pelicula abierta demo",
    sourceUrl: "https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8",
    poster:
      "https://images.unsplash.com/photo-1535016120720-40c646be5580?auto=format&fit=crop&w=900&q=80",
    hero:
      "https://images.unsplash.com/photo-1535016120720-40c646be5580?auto=format&fit=crop&w=1800&q=80",
    description:
      "Entrada VOD legal/demo para probar reproduccion adaptativa en MOGA TV."
  },
  {
    id: "tears-steel-demo",
    title: "Tears of Steel Demo",
    type: "Pelicula",
    category: "Peliculas",
    country: "Global",
    language: "Ingles",
    sourceType: "Pelicula abierta demo",
    sourceUrl: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
    poster:
      "https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?auto=format&fit=crop&w=900&q=80",
    hero:
      "https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?auto=format&fit=crop&w=1800&q=80",
    description:
      "Demo cinematografica para validar peliculas y pruebas de streaming."
  }
];

const navItems = [
  ["Inicio", "Inicio", "home"],
  ["Listas M3U", "Listas", "playlist"],
  ["TV en vivo", "Canal", "live"],
  ["Deportes", "Deportes", "score"],
  ["Peliculas", "Peliculas", "film"],
  ["Series", "Series", "series"],
  ["Anime", "Anime", "spark"],
  ["Infantil", "Infantil", "kids"],
  ["Noticias", "Noticias", "news"],
  ["Musica", "Musica", "music"],
  ["Documentales", "Documentales", "doc"],
  ["Colombia", "Colombia", "flag"],
  ["Internacional", "Internacional", "world"],
  ["Favoritos", "Favoritos", "star"],
  ["Continuar viendo", "Continuar", "clock"],
  ["Perfiles", "Perfiles", "user"],
  ["Admin", "Admin", "shield"]
];

const defaultState = {
  session: null,
  users: [],
  profiles: {},
  activeProfile: null,
  favorites: {},
  history: {},
  sources: [],
  activeSource: null,
  activeListCategory: "Todos",
  content: legalDemoContent,
  page: "Inicio",
  query: "",
  theme: "dark",
  language: "es",
  importTab: "m3u"
};

let state = loadState();
let activePlayer = null;
let mobileMenuOpen = false;
let profileMenuOpen = false;

const publicPlaylists = [
  {
    name: "TV publica mundial",
    url: "https://iptv-org.github.io/iptv/index.m3u"
  },
  {
    name: "Noticias",
    url: "https://iptv-org.github.io/iptv/categories/news.m3u"
  },
  {
    name: "Deportes abiertos",
    url: "https://iptv-org.github.io/iptv/categories/sports.m3u"
  },
  {
    name: "Colombia",
    url: "https://iptv-org.github.io/iptv/countries/co.m3u"
  },
  {
    name: "Estados Unidos",
    url: "https://iptv-org.github.io/iptv/countries/us.m3u"
  },
  {
    name: "Espana",
    url: "https://iptv-org.github.io/iptv/countries/es.m3u"
  },
  {
    name: "Mexico",
    url: "https://iptv-org.github.io/iptv/countries/mx.m3u"
  }
];

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(defaultState);
  try {
    const parsed = JSON.parse(saved);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      content: mergeContent(parsed.content || [])
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function mergeContent(savedContent) {
  const map = new Map(legalDemoContent.map((item) => [item.id, item]));
  savedContent.forEach((item) => map.set(item.id, item));
  return Array.from(map.values());
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    const compact = {
      ...state,
      content: state.content.slice(0, 900)
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(compact));
    state = compact;
    alert("La lista era muy grande para guardarse completa en este navegador. Se conservaron los primeros 900 items.");
  }
}

function setState(patch) {
  state = { ...state, ...patch };
  saveState();
  render();
}

function currentUser() {
  return state.users.find((user) => user.email === state.session);
}

function profileKey() {
  return state.activeProfile || state.session || "guest";
}

function getInitials(value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function icon(name) {
  const icons = {
    home: "⌂",
    live: "▶",
    score: "▦",
    film: "▣",
    series: "▤",
    spark: "✦",
    kids: "●",
    news: "≡",
    music: "♪",
    doc: "□",
    flag: "◆",
    world: "◎",
    star: "★",
    clock: "◴",
    user: "◉",
    shield: "▰",
    playlist: "≣"
  };
  return icons[name] || "•";
}

function render() {
  document.documentElement.dataset.theme = state.theme;
  const app = document.querySelector("#app");
  app.className = "app";
  app.innerHTML = state.session ? renderShell() : renderAuth();
  bindEvents();
}

function renderAuth() {
  return `
    <section class="auth-shell">
      <div class="brand-panel">
        <span class="brand-mark">M</span>
        <h1>MOGA TV</h1>
        <p>Tu plataforma instalable para organizar canales, peliculas, anime, deportes y contenido autorizado con una experiencia premium.</p>
      </div>
      <form class="auth-card" data-auth-form>
        <h2>Acceso beta</h2>
        <p>Usa invitacion para crear cuenta. Codigo demo: <strong>${INVITE_CODE}</strong></p>
        <div class="field">
          <label for="name">Nombre</label>
          <input id="name" name="name" autocomplete="name" placeholder="Tu nombre" required />
        </div>
        <div class="field">
          <label for="email">Correo</label>
          <input id="email" name="email" type="email" autocomplete="email" placeholder="correo@ejemplo.com" required />
        </div>
        <div class="field">
          <label for="invite">Codigo de invitacion</label>
          <input id="invite" name="invite" placeholder="MOGA-BETA" required />
        </div>
        <button class="primary" type="submit">Entrar a MOGA TV</button>
        <div class="hint">Esta version guarda datos localmente para probar el producto. El siguiente paso es conectar Supabase para usuarios reales en internet.</div>
      </form>
    </section>
  `;
}

function renderTopbar() {
  const user = currentUser();
  return `
    <header class="topbar">
      <button class="icon-button menu-button" title="Abrir menu">☰</button>
      <div class="search">
        <span>⌕</span>
        <input data-search value="${escapeAttr(state.query)}" placeholder="Buscar canales, deportes, anime, paises..." />
      </div>
      <button class="secondary" data-theme-toggle>${state.theme === "dark" ? "Modo claro" : "Modo oscuro"}</button>
      <div class="profile-menu">
        <button class="profile-trigger" data-profile-menu title="Menu de perfil">
          <span class="avatar">${getInitials(user?.name || "MOGA")}</span>
          <span>${state.activeProfile || "Perfil"}</span>
        </button>
        ${
          profileMenuOpen
            ? `<div class="profile-dropdown">
                <button data-page="Listas">Agregar lista M3U</button>
                <button data-page="Perfiles">Perfiles</button>
                <button data-page="Admin">Panel admin</button>
                <button data-logout>Salir</button>
              </div>`
            : ""
        }
      </div>
    </header>
  `;
}

function renderShell() {
  const user = currentUser();
  return `
    <div class="shell">
      <aside class="sidebar ${mobileMenuOpen ? "open" : ""}">
        <div class="logo-row">
          <div class="logo"><span class="logo-icon">M</span><span>MOGA TV</span></div>
          <button class="icon-button menu-close" title="Cerrar menu">×</button>
        </div>
        <nav class="nav">
          ${navItems
            .map(
              ([label, page, iconName]) => `
                <button class="${state.page === page ? "active" : ""}" data-page="${page}">
                  <span>${icon(iconName)}</span><span>${label}</span>
                </button>
              `
            )
            .join("")}
        </nav>
        <div class="user-box">
          <div class="user-row">
            <span class="avatar">${getInitials(user?.name || "MOGA")}</span>
            <div>
              <strong>${user?.name || "Usuario"}</strong>
              <span>${state.activeProfile || "Perfil principal"}</span>
            </div>
          </div>
          <div class="install-tip">Instalable como app desde el navegador compatible.</div>
        </div>
      </aside>
      <main class="main">
        ${renderTopbar()}
        ${renderPage()}
      </main>
    </div>
  `;
}

function renderPage() {
  if (state.page === "Admin") return renderAdmin();
  if (state.page === "Listas") return renderLists();
  if (state.page === "Fuente") return renderSourcePage();
  if (state.page === "Perfiles") return renderProfiles();
  if (state.page === "Continuar") return renderContinue();
  if (state.page === "Favoritos") return renderFavorites();
  return renderCatalog();
}

function renderCatalog() {
  const hero = state.content[0];
  const visible = filterContent();
  return `
    <section class="hero" style="--hero-image: url('${hero.hero}')">
      <div class="hero-content">
        <span class="eyebrow">PWA legal y lista para escalar</span>
        <h1>${hero.title}</h1>
        <p>${hero.description}</p>
        <div class="player-actions">
          <button class="secondary" data-open="${hero.id}">Reproducir demo</button>
          <button class="ghost" data-page="Listas">Agregar lista M3U</button>
          <button class="ghost" data-page="Admin">Panel admin</button>
        </div>
      </div>
    </section>
    <section class="content">
      <div class="notice">
        MOGA TV puede mostrar canales y peliculas con fuentes autorizadas. Las listas o canales sin permiso claro deben verificarse antes de publicarlos o monetizarlos.
      </div>
      ${renderFilters()}
      ${state.query || state.page !== "Inicio" ? renderGrid("Resultados", visible) : renderRails()}
    </section>
  `;
}

function renderFilters() {
  const categories = ["Todos", ...new Set(state.content.map((item) => item.category))];
  return `
    <div class="filters">
      ${categories
        .map(
          (category) => `
            <button class="chip ${state.page === category || (category === "Todos" && state.page === "Inicio") ? "active" : ""}"
              data-page="${category === "Todos" ? "Inicio" : category}">
              ${category}
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function renderRails() {
  const rails = [
    ["Destacados", state.content],
    ["Deportes", state.content.filter((item) => item.category === "Deportes")],
    ["Peliculas y series", state.content.filter((item) => ["Peliculas", "Series"].includes(item.category))],
    ["Anime e infantil", state.content.filter((item) => ["Anime", "Infantil"].includes(item.category))],
    ["Internacional", state.content.filter((item) => ["Internacional", "Noticias", "Documentales"].includes(item.category))]
  ];
  return `<div class="rails">${rails.map(([title, items]) => renderRail(title, items)).join("")}</div>`;
}

function renderRail(title, items) {
  if (!items.length) return "";
  return `
    <section class="rail">
      <div class="title-row"><h2>${title}</h2><span class="pill">${items.length} items</span></div>
      <div class="cards">${items.map(renderCard).join("")}</div>
    </section>
  `;
}

function renderGrid(title, items) {
  return `
    <section>
      <div class="title-row"><h2>${title}</h2><span class="pill">${items.length} items</span></div>
      ${items.length ? `<div class="grid">${items.map(renderCard).join("")}</div>` : `<div class="empty">No hay contenido en esta vista todavia.</div>`}
    </section>
  `;
}

function renderCard(item) {
  const isFav = (state.favorites[profileKey()] || []).includes(item.id);
  return `
    <article class="card" style="--poster: url('${item.poster}')">
      <button class="fav ${isFav ? "active" : ""}" data-favorite="${item.id}" title="Favorito">★</button>
      <button data-open="${item.id}">
        <div class="card-body">
          <h3>${item.title}</h3>
          <div class="content-meta">
            <span class="pill">${item.category}</span>
            <span class="pill">${item.country}</span>
            ${item.sourceName ? `<span class="pill">${item.sourceName}</span>` : ""}
            <span class="pill">${item.sourceType}</span>
          </div>
        </div>
      </button>
    </article>
  `;
}

function renderPlayer(item) {
  const urls = encodeURIComponent(JSON.stringify(playbackUrls(item)));
  const firstUrl = playbackUrls(item)[0] || "";
  return `
    <section class="content">
      <div class="player-layout">
        <div>
          <div class="player">
            ${
              playbackUrls(item).length
                ? `<video controls autoplay playsinline data-video-urls="${escapeAttr(urls)}"></video><div class="player-status" data-player-status>Preparando reproduccion...</div>`
                : `<div class="empty">Este item no tiene fuente reproducible. Agrega una URL autorizada desde Admin.</div>`
            }
          </div>
          <div class="player-actions">
            <button class="secondary" data-favorite="${item.id}">★ Favorito</button>
            <button class="ghost" data-page="Inicio">Volver</button>
            ${firstUrl ? `<a class="link-button" href="${escapeAttr(firstUrl)}" target="_blank" rel="noreferrer">Abrir fuente</a>` : ""}
          </div>
        </div>
        <aside class="details">
          <span class="eyebrow">${item.type} · ${item.sourceType}</span>
          <h1>${item.title}</h1>
          <p>${item.description}</p>
          <div class="content-meta">
            <span class="pill">${item.category}</span>
            <span class="pill">${item.country}</span>
            <span class="pill">${item.language}</span>
            ${item.sourceName ? `<span class="pill">${item.sourceName}</span>` : ""}
          </div>
          ${
            firstUrl
              ? `<div class="debug-box"><strong>Diagnostico</strong><span data-debug-url>${escapeAttr(firstUrl)}</span></div>`
              : ""
          }
        </aside>
      </div>
    </section>
  `;
}

function playbackUrls(item) {
  const urls = [];
  if (Array.isArray(item.playbackUrls)) urls.push(...item.playbackUrls);
  if (item.sourceUrl) urls.push(item.sourceUrl);
  if (item.sourceUrl && item.sourceUrl.includes("/live/")) {
    urls.push(item.sourceUrl.replace(/\.m3u8($|\?)/, ".ts$1"));
    urls.push(item.sourceUrl.replace(/\.m3u8($|\?)/, "$1"));
  }
  return Array.from(new Set(urls.filter(Boolean)));
}

function renderFavorites() {
  const ids = state.favorites[profileKey()] || [];
  const items = state.content.filter((item) => ids.includes(item.id));
  return `<section class="content">${renderGrid("Favoritos", items)}</section>`;
}

function renderContinue() {
  const items = (state.history[profileKey()] || [])
    .map((entry) => state.content.find((item) => item.id === entry.id))
    .filter(Boolean);
  return `<section class="content">${renderGrid("Continuar viendo", items)}</section>`;
}

function renderProfiles() {
  const userProfiles = state.profiles[state.session] || ["Principal"];
  return `
    <section class="content">
      <div class="title-row"><h2>Perfiles</h2><span class="pill">${userProfiles.length} perfiles</span></div>
      <div class="profile-grid">
        ${userProfiles
          .map(
            (profile) => `
              <button class="profile-card" data-profile="${profile}">
                <span class="avatar">${getInitials(profile)}</span>
                <strong>${profile}</strong>
              </button>
            `
          )
          .join("")}
      </div>
      <form class="panel" data-profile-form style="margin-top:18px">
        <h2>Crear perfil</h2>
        <div class="field">
          <label for="profileName">Nombre del perfil</label>
          <input id="profileName" name="profileName" placeholder="Familia, Kids, Deportes..." required />
        </div>
        <button class="primary" type="submit">Agregar perfil</button>
      </form>
    </section>
  `;
}

function renderLists() {
  return `
    <section class="content">
      <div class="title-row">
        <h2>Mis listas y servidores</h2>
        <span class="pill">${state.sources.length} fuentes</span>
      </div>
      <div class="notice">
        Cada lista queda separada como una biblioteca propia. Entra a una fuente para ver solo sus canales, peliculas, categorias y busqueda interna.
      </div>
      ${renderSourceLibrary()}
      <div class="tabs">
        <button class="tab ${state.importTab === "m3u" ? "active" : ""}" data-import-tab="m3u">M3U</button>
        <button class="tab ${state.importTab === "xtream" ? "active" : ""}" data-import-tab="xtream">Xtream / Magma</button>
      </div>
      ${
        state.importTab === "xtream"
          ? renderXtreamImport()
          : renderM3uImport()
      }
    </section>
  `;
}

function renderSourceLibrary() {
  if (!state.sources.length) {
    return `<div class="empty">Todavia no hay listas importadas. Carga una M3U publica o un servidor autorizado abajo.</div>`;
  }
  return `
    <div class="source-grid">
      ${state.sources
        .map((source) => {
          const items = state.content.filter((item) => item.sourceId === source.id);
          const categories = new Set(items.map((item) => item.category));
          return `
            <button class="source-card" data-source-filter="${source.id}">
              <span class="eyebrow">${source.type}</span>
              <strong>${source.name}</strong>
              <span>${items.length || source.count} items · ${categories.size} categorias</span>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderSourcePage() {
  const source = state.sources.find((entry) => entry.id === state.activeSource);
  if (!source) {
    return `<section class="content"><div class="empty">No encontre esa lista. Vuelve a Mis listas.</div></section>`;
  }
  const allItems = state.content.filter((item) => item.sourceId === source.id);
  const categories = ["Todos", ...new Set(allItems.map((item) => item.category))];
  const query = normalize(state.query);
  const filtered = allItems.filter((item) => {
    const byCategory = state.activeListCategory === "Todos" || item.category === state.activeListCategory;
    const haystack = normalize(`${item.title} ${item.category} ${item.country} ${item.language}`);
    return byCategory && (!query || haystack.includes(query));
  });
  return `
    <section class="content">
      <div class="source-head">
        <div>
          <span class="eyebrow">${source.type}</span>
          <h1>${source.name}</h1>
          <p>${allItems.length} items importados. Vista separada por lista/servidor.</p>
        </div>
        <div class="player-actions">
          <button class="secondary" data-page="Listas">Mis listas</button>
          <button class="ghost" data-page="Inicio">Inicio</button>
        </div>
      </div>
      <div class="filters">
        ${categories
          .map(
            (category) => `
              <button class="chip ${state.activeListCategory === category ? "active" : ""}" data-source-category="${category}">
                ${category}
              </button>
            `
          )
          .join("")}
      </div>
      ${renderGrid(state.activeListCategory === "Todos" ? "Todos los canales" : state.activeListCategory, filtered)}
    </section>
  `;
}

function renderM3uImport() {
  return `
    <div class="panel-grid">
      <form class="panel" data-m3u-form>
        <h2>Cargar M3U</h2>
        <div class="field">
          <label>Nombre de la lista</label>
          <input name="name" value="Mi lista M3U" required />
        </div>
        <div class="field">
          <label>URL M3U autorizada</label>
          <input name="url" placeholder="https://proveedor-autorizado.com/lista.m3u" required />
        </div>
        <button class="primary" type="submit">Cargar canales</button>
        <div class="hint">Si usas XAMPP, el endpoint PHP ayuda a evitar bloqueos CORS y deja la importacion mas estable.</div>
      </form>
      <div class="panel">
        <h2>Listas publicas rapidas</h2>
        <div class="admin-list">
          ${publicPlaylists
            .map(
              (playlist) => `
                <div class="admin-list-item">
                  <div>
                    <strong>${playlist.name}</strong>
                    <div class="hint">Fuente: iptv-org, streams publicos recopilados por la comunidad</div>
                  </div>
                  <button class="ghost" data-public-playlist="${playlist.url}" data-public-name="${playlist.name}">Cargar</button>
                </div>
              `
            )
            .join("")}
        </div>
      </div>
    </div>
  `;
}

function renderXtreamImport() {
  return `
    <form class="panel" data-xtream-form>
      <h2>Xtream / Magma</h2>
      <div class="panel-grid">
        <div>
          <div class="field">
            <label>Servidor</label>
            <input name="server" placeholder="https://servidor-autorizado.com:puerto" required />
          </div>
          <div class="field">
            <label>Usuario</label>
            <input name="username" autocomplete="off" required />
          </div>
          <div class="field">
            <label>Contrasena</label>
            <input name="password" type="password" autocomplete="off" required />
          </div>
          <button class="primary" type="submit">Cargar canales</button>
        </div>
        <div class="notice">
          Este modulo acepta proveedores legales compatibles con Xtream Codes. Las credenciales se usan desde tu navegador hacia tu XAMPP local y se guardan solo como canales importados, no como contrasenas.
        </div>
      </div>
    </form>
  `;
}

function renderAdmin() {
  return `
    <section class="content">
      <div class="notice">
        Panel de administracion MVP. Agrega solo fuentes propias, publicas o autorizadas. Cuando conectemos Supabase, este panel quedara protegido por rol admin.
      </div>
      <div class="panel-grid">
        <form class="panel" data-content-form>
          <h2>Agregar canal o contenido</h2>
          <div class="field"><label>Titulo</label><input name="title" required /></div>
          <div class="field">
            <label>Categoria</label>
            <select name="category">
              ${["Canal", "Deportes", "Peliculas", "Series", "Anime", "Infantil", "Noticias", "Musica", "Documentales", "Colombia", "Internacional"].map((c) => `<option>${c}</option>`).join("")}
            </select>
          </div>
          <div class="field"><label>Pais</label><input name="country" placeholder="Colombia, Global..." required /></div>
          <div class="field"><label>Idioma</label><input name="language" placeholder="Espanol, Ingles..." required /></div>
          <div class="field"><label>URL autorizada HLS/MP4</label><input name="sourceUrl" placeholder="https://..." /></div>
          <div class="field"><label>Imagen poster</label><input name="poster" placeholder="https://..." /></div>
          <div class="field"><label>Descripcion</label><textarea name="description" required></textarea></div>
          <button class="primary" type="submit">Guardar contenido</button>
        </form>
        <div class="panel">
          <h2>Contenido actual</h2>
          <div class="admin-list">
            ${state.content
              .map(
                (item) => `
                  <div class="admin-list-item">
                    <div>
                      <strong>${item.title}</strong>
                      <div class="hint">${item.category} · ${item.country} · ${item.sourceType}</div>
                    </div>
                    <button class="ghost" data-open="${item.id}">Ver</button>
                  </div>
                `
              )
              .join("")}
          </div>
        </div>
      </div>
    </section>
  `;
}

function filterContent() {
  const query = normalize(state.query);
  return state.content.filter((item) => {
    const matchesPage =
      state.page === "Inicio" ||
      state.page === item.category ||
      state.page === item.type ||
      (state.page === "Internacional" && item.country !== "Colombia");
    const haystack = normalize(
      `${item.title} ${item.category} ${item.country} ${item.language} ${item.description}`
    );
    return matchesPage && (!query || haystack.includes(query));
  });
}

function normalize(value) {
  return String(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function escapeAttr(value) {
  return String(value || "").replaceAll('"', "&quot;");
}

function bindEvents() {
  document.querySelector("[data-auth-form]")?.addEventListener("submit", handleAuth);
  document.querySelector("[data-search]")?.addEventListener("input", (event) => {
    state.query = event.target.value;
    saveState();
    render();
  });
  document.querySelector("[data-theme-toggle]")?.addEventListener("click", () => {
    setState({ theme: state.theme === "dark" ? "light" : "dark" });
  });
  document.querySelector("[data-profile-menu]")?.addEventListener("click", () => {
    profileMenuOpen = !profileMenuOpen;
    render();
  });
  document.querySelector("[data-logout]")?.addEventListener("click", () => {
    setState({ session: null, activeProfile: null, page: "Inicio" });
  });
  document.querySelector(".menu-button")?.addEventListener("click", () => {
    mobileMenuOpen = true;
    render();
  });
  document.querySelector(".menu-close")?.addEventListener("click", () => {
    mobileMenuOpen = false;
    render();
  });
  document.querySelectorAll("[data-page]").forEach((button) =>
    button.addEventListener("click", () => {
      mobileMenuOpen = false;
      profileMenuOpen = false;
      setState({ page: button.dataset.page, query: state.query });
    })
  );
  document.querySelectorAll("[data-import-tab]").forEach((button) =>
    button.addEventListener("click", () => setState({ importTab: button.dataset.importTab }))
  );
  document.querySelector("[data-m3u-form]")?.addEventListener("submit", handleM3uImport);
  document.querySelectorAll("[data-public-playlist]").forEach((button) =>
    button.addEventListener("click", () =>
      importM3u(button.dataset.publicPlaylist, button.dataset.publicName)
    )
  );
  document.querySelector("[data-xtream-form]")?.addEventListener("submit", handleXtreamImport);
  document.querySelectorAll("[data-source-filter]").forEach((button) =>
    button.addEventListener("click", () => {
      const sourceId = button.dataset.sourceFilter;
      setState({ page: "Fuente", activeSource: sourceId, activeListCategory: "Todos", query: "" });
    })
  );
  document.querySelectorAll("[data-source-category]").forEach((button) =>
    button.addEventListener("click", () => {
      setState({ activeListCategory: button.dataset.sourceCategory, query: state.query });
    })
  );
  document.querySelectorAll("[data-open]").forEach((button) =>
    button.addEventListener("click", () => openItem(button.dataset.open))
  );
  document.querySelectorAll("[data-favorite]").forEach((button) =>
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleFavorite(button.dataset.favorite);
    })
  );
  document.querySelector("[data-profile-form]")?.addEventListener("submit", handleProfile);
  document.querySelectorAll("[data-profile]").forEach((button) =>
    button.addEventListener("click", () => setState({ activeProfile: button.dataset.profile }))
  );
  document.querySelector("[data-content-form]")?.addEventListener("submit", handleContent);
  initializeVideo();
}

function handleAuth(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const invite = String(form.get("invite") || "").trim().toUpperCase();
  if (invite !== INVITE_CODE) {
    alert("Codigo de invitacion incorrecto. Usa MOGA-BETA para esta demo.");
    return;
  }
  const email = String(form.get("email") || "").trim().toLowerCase();
  const name = String(form.get("name") || "").trim();
  const users = state.users.some((user) => user.email === email)
    ? state.users
    : [...state.users, { email, name, role: state.users.length ? "user" : "admin" }];
  const profiles = { ...state.profiles, [email]: state.profiles[email] || ["Principal"] };
  setState({ users, profiles, session: email, activeProfile: "Principal" });
}

function handleProfile(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const profileName = String(form.get("profileName") || "").trim();
  if (!profileName) return;
  const current = state.profiles[state.session] || ["Principal"];
  const profiles = {
    ...state.profiles,
    [state.session]: Array.from(new Set([...current, profileName]))
  };
  setState({ profiles, activeProfile: profileName });
}

async function handleM3uImport(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const name = String(form.get("name") || "Lista M3U").trim();
  const url = String(form.get("url") || "").trim();
  await importM3u(url, name);
}

async function importM3u(url, name) {
  if (!url) return;
  try {
    setLoadingMessage(`Cargando ${name}...`);
    const text = await fetchPlaylistText(url);
    const items = parseM3u(text, name, url);
    if (!items.length) {
      alert("No se encontraron canales validos en la lista.");
      render();
      return;
    }
    addImportedItems(items, {
      name,
      type: "M3U",
      url,
      count: items.length
    });
  } catch (error) {
    alert(error.message || "No se pudo cargar la lista.");
    render();
  }
}

async function fetchPlaylistText(url) {
  const apiUrl = `./api/fetch_playlist.php?url=${encodeURIComponent(url)}`;
  try {
    const apiResponse = await fetch(apiUrl);
    if (apiResponse.ok) {
      const payload = await apiResponse.json();
      if (payload.ok && payload.body) return payload.body;
    }
  } catch {
    // If PHP is not running, try direct fetch for hosts that allow CORS.
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error("La fuente no respondio correctamente.");
  return response.text();
}

function parseM3u(text, sourceName, sourceUrl) {
  const lines = text.split(/\r?\n/);
  const items = [];
  let current = null;
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (trimmed.startsWith("#EXTINF")) {
      const title = trimmed.split(",").slice(1).join(",").trim() || "Canal sin nombre";
      current = {
        title: attr(trimmed, "tvg-name") || title,
        logo: attr(trimmed, "tvg-logo"),
        group: attr(trimmed, "group-title") || "TV en vivo",
        country: attr(trimmed, "tvg-country") || "Global",
        language: attr(trimmed, "tvg-language") || "Multidioma"
      };
      return;
    }
    if (!trimmed.startsWith("#") && current) {
      const resolvedUrl = resolvePlaylistUrl(sourceUrl, trimmed);
      items.push({
        id: `m3u-${hash(`${sourceName}-${current.title}-${resolvedUrl}`)}`,
        title: current.title,
        type: "Canal",
        category: normalizeCategory(current.group),
        country: current.country,
        language: current.language,
        sourceType: "M3U autorizado",
        sourceUrl: resolvedUrl,
        poster: current.logo || categoryPoster(current.group),
        hero: current.logo || categoryPoster(current.group),
        sourceName,
        importUrl: sourceUrl,
        description: `Canal importado desde ${sourceName}. Reproduce solo si tienes permiso para usar esta fuente.`
      });
      current = null;
    }
  });
  return items.slice(0, 1200);
}

function resolvePlaylistUrl(baseUrl, path) {
  if (/^https?:\/\//i.test(path)) return path;
  try {
    return new URL(path, baseUrl).toString();
  } catch {
    return path;
  }
}

function attr(line, name) {
  const match = line.match(new RegExp(`${name}="([^"]*)"`, "i"));
  return match ? match[1].trim() : "";
}

async function handleXtreamImport(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const server = String(form.get("server") || "").trim();
  const username = String(form.get("username") || "").trim();
  const password = String(form.get("password") || "").trim();
  if (!server || !username || !password) return;
  try {
    setLoadingMessage("Cargando servidor Xtream...");
    const response = await fetch("./api/xtream.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ server, username, password })
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || "Servidor no disponible.");
    const playlistUrl = `${normalizeServerUrl(server)}/get.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&type=m3u_plus&output=m3u8`;
    let playlistItems = [];
    try {
      const text = await fetchPlaylistText(playlistUrl);
      playlistItems = parseM3u(text, hostName(server), playlistUrl);
    } catch {
      playlistItems = [];
    }
    const items = mergeImported(parseXtream(payload, server, username, password), playlistItems);
    if (!items.length) {
      alert("El servidor respondio, pero no devolvio canales o peliculas.");
      render();
      return;
    }
    addImportedItems(items, {
      name: hostName(server),
      type: "Xtream",
      url: server,
      count: items.length
    });
  } catch (error) {
    alert(error.message || "No se pudo cargar Xtream.");
    render();
  }
}

function normalizeServerUrl(server) {
  const value = String(server || "").trim();
  return (value.startsWith("http") ? value : `http://${value}`).replace(/\/+$/, "");
}

function mergeImported(primary, secondary) {
  const map = new Map();
  secondary.forEach((item) => map.set(normalize(item.title), item));
  primary.forEach((item) => {
    const key = normalize(item.title);
    const playlistItem = map.get(key);
    map.set(key, playlistItem ? { ...item, sourceUrl: playlistItem.sourceUrl, playbackUrls: [playlistItem.sourceUrl, ...(item.playbackUrls || [])] } : item);
  });
  return Array.from(map.values());
}

function parseXtream(payload, server, username, password) {
  const liveCategories = mapCategories(payload.liveCategories);
  const vodCategories = mapCategories(payload.vodCategories);
  const seriesCategories = mapCategories(payload.seriesCategories);
  const cleanServer = normalizeServerUrl(server);
  const live = (payload.live || []).map((item) => ({
    id: `xt-live-${hash(`${cleanServer}-${item.stream_id}`)}`,
    title: item.name || "Canal",
    type: "Canal",
    category: normalizeCategory(liveCategories[item.category_id] || "TV en vivo"),
    country: "Global",
    language: "Multidioma",
    sourceType: "Xtream autorizado",
    sourceUrl: `${cleanServer}/live/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${item.stream_id}.m3u8`,
    playbackUrls: [
      `${cleanServer}/live/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${item.stream_id}.m3u8`,
      `${cleanServer}/live/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${item.stream_id}.ts`,
      `${cleanServer}/live/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${item.stream_id}`
    ],
    poster: item.stream_icon || categoryPoster("Canal"),
    hero: item.stream_icon || categoryPoster("Canal"),
    sourceName: hostName(server),
    description: `Canal cargado desde ${hostName(server)}.`
  }));
  const vod = (payload.vod || []).map((item) => ({
    id: `xt-vod-${hash(`${cleanServer}-${item.stream_id}`)}`,
    title: item.name || "Pelicula",
    type: "Pelicula",
    category: normalizeCategory(vodCategories[item.category_id] || "Peliculas"),
    country: "Global",
    language: "Multidioma",
    sourceType: "Xtream VOD autorizado",
    sourceUrl: `${cleanServer}/movie/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${item.stream_id}.${item.container_extension || "mp4"}`,
    playbackUrls: [
      `${cleanServer}/movie/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${item.stream_id}.${item.container_extension || "mp4"}`
    ],
    poster: item.stream_icon || categoryPoster("Peliculas"),
    hero: item.stream_icon || categoryPoster("Peliculas"),
    sourceName: hostName(server),
    description: `Pelicula cargada desde ${hostName(server)}.`
  }));
  const series = (payload.series || []).map((item) => ({
    id: `xt-series-${hash(`${cleanServer}-${item.series_id}`)}`,
    title: item.name || "Serie",
    type: "Serie",
    category: normalizeCategory(seriesCategories[item.category_id] || "Series"),
    country: "Global",
    language: "Multidioma",
    sourceType: "Xtream serie autorizada",
    sourceUrl: "",
    poster: item.cover || categoryPoster("Series"),
    hero: item.cover || categoryPoster("Series"),
    sourceName: hostName(server),
    description: item.plot || `Serie cargada desde ${hostName(server)}.`
  }));
  return [...live, ...vod, ...series].slice(0, 1200);
}

function mapCategories(categories) {
  return (categories || []).reduce((map, category) => {
    map[category.category_id] = category.category_name;
    return map;
  }, {});
}

function addImportedItems(items, source) {
  const sourceId = `source-${hash(`${source.type}-${source.url}-${Date.now()}`)}`;
  const tagged = items.map((item) => ({ ...item, sourceId, sourceName: source.name }));
  const existing = new Map(state.content.map((item) => [item.id, item]));
  tagged.forEach((item) => existing.set(item.id, item));
  const sources = [
    { ...source, id: sourceId, createdAt: new Date().toISOString() },
    ...state.sources
  ];
  setState({
    content: Array.from(existing.values()),
    sources,
    page: "Fuente",
    activeSource: sourceId,
    activeListCategory: "Todos",
    query: ""
  });
}

function normalizeCategory(value) {
  const text = String(value || "TV en vivo").trim();
  const lower = normalize(text);
  if (lower.includes("sport") || lower.includes("deporte")) return "Deportes";
  if (lower.includes("movie") || lower.includes("pelicula") || lower.includes("cine")) return "Peliculas";
  if (lower.includes("series")) return "Series";
  if (lower.includes("anime")) return "Anime";
  if (lower.includes("kids") || lower.includes("infantil")) return "Infantil";
  if (lower.includes("news") || lower.includes("noticia")) return "Noticias";
  if (lower.includes("music") || lower.includes("musica")) return "Musica";
  if (lower.includes("document")) return "Documentales";
  return text.slice(0, 32);
}

function categoryPoster(category) {
  const key = normalize(category);
  if (key.includes("sport") || key.includes("deporte")) return "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=900&q=80";
  if (key.includes("music") || key.includes("musica")) return "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80";
  if (key.includes("news") || key.includes("noticia")) return "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=900&q=80";
  if (key.includes("kids") || key.includes("infantil")) return "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=900&q=80";
  if (key.includes("movie") || key.includes("pelicula") || key.includes("cine")) return "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=900&q=80";
  return "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&w=900&q=80";
}

function hostName(value) {
  try {
    return new URL(value.startsWith("http") ? value : `http://${value}`).host;
  } catch {
    return value;
  }
}

function hash(value) {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result << 5) - result + value.charCodeAt(index);
    result |= 0;
  }
  return Math.abs(result).toString(36);
}

function setLoadingMessage(message) {
  document.querySelector(".content")?.insertAdjacentHTML(
    "afterbegin",
    `<div class="notice" data-loading>${message}</div>`
  );
}

function handleContent(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const title = String(form.get("title") || "").trim();
  const sourceUrl = String(form.get("sourceUrl") || "").trim();
  const poster =
    String(form.get("poster") || "").trim() ||
    "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&w=900&q=80";
  const item = {
    id: `custom-${Date.now()}`,
    title,
    type: "Canal",
    category: String(form.get("category") || "Canal"),
    country: String(form.get("country") || "Global"),
    language: String(form.get("language") || "Espanol"),
    sourceType: sourceUrl ? "Pendiente de verificar" : "Catalogo",
    sourceUrl,
    poster,
    hero: poster,
    description: String(form.get("description") || "").trim()
  };
  setState({ content: [item, ...state.content], page: "Admin" });
}

function openItem(id) {
  const item = state.content.find((entry) => entry.id === id);
  if (!item) return;
  const key = profileKey();
  const current = state.history[key] || [];
  const history = {
    ...state.history,
    [key]: [{ id, watchedAt: new Date().toISOString() }, ...current.filter((entry) => entry.id !== id)].slice(0, 30)
  };
  state.history = history;
  saveState();
  document.querySelector(".main").innerHTML = `
    ${renderTopbar()}
    ${renderPlayer(item)}
  `;
  bindEvents();
}

function toggleFavorite(id) {
  const key = profileKey();
  const current = state.favorites[key] || [];
  const next = current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id];
  setState({ favorites: { ...state.favorites, [key]: next } });
}

function initializeVideo() {
  const video = document.querySelector("[data-video-urls]");
  if (!video) return;
  let urls = [];
  try {
    urls = JSON.parse(decodeURIComponent(video.dataset.videoUrls || "[]"));
  } catch {
    urls = [];
  }
  if (!urls.length) return;
  if (activePlayer) {
    activePlayer.destroy();
    activePlayer = null;
  }
  tryVideoUrl(video, urls, 0);
}

function tryVideoUrl(video, urls, index) {
  if (index >= urls.length) {
    const status = document.querySelector("[data-player-status]");
    if (status) {
      status.textContent =
        "No se pudo reproducir este canal. Puede estar caido, no entregar HLS compatible, requerir otra salida del proveedor o bloquear reproduccion web.";
      status.classList.add("error");
    }
    return;
  }

  const rawUrl = urls[index];
  const debug = document.querySelector("[data-debug-url]");
  if (debug) debug.textContent = rawUrl;
  const src = shouldProxy(rawUrl) ? proxyUrl(rawUrl) : rawUrl;
  const status = document.querySelector("[data-player-status]");
  if (status) status.textContent = `Probando fuente ${index + 1} de ${urls.length}...`;

  if (activePlayer) {
    activePlayer.destroy();
    activePlayer = null;
  }

  const isHls = /\.m3u8($|\?)/i.test(rawUrl) || rawUrl.includes("output=m3u8");
  if (isHls && window.Hls?.isSupported()) {
    activePlayer = new window.Hls({
      enableWorker: true,
      lowLatencyMode: true,
      xhrSetup(xhr) {
        xhr.withCredentials = false;
      }
    });
    activePlayer.loadSource(src);
    activePlayer.attachMedia(video);
    activePlayer.on(window.Hls.Events.MANIFEST_PARSED, () => {
      if (status) status.textContent = "Reproduciendo.";
      video.play().catch(() => {});
    });
    activePlayer.on(window.Hls.Events.ERROR, (_, data) => {
      if (data?.fatal) tryVideoUrl(video, urls, index + 1);
    });
    return;
  }

  if (isHls && video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = src;
  } else {
    video.src = src;
  }
  video.onerror = () => tryVideoUrl(video, urls, index + 1);
  video.oncanplay = () => {
    if (status) status.textContent = "Reproduciendo.";
    video.play().catch(() => {});
  };
}

function shouldProxy(url) {
  try {
    const target = new URL(url, window.location.href);
    return target.origin !== window.location.origin && window.location.pathname.includes("/moga-tv/");
  } catch {
    return false;
  }
}

function proxyUrl(url) {
  return `./api/stream.php?url=${encodeURIComponent(url)}`;
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

render();
