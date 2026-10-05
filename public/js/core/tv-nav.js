/**
 * Navegación con las flechas del control remoto (Smart TV / Android TV / teclado):
 * mueve el foco al elemento más cercano en la dirección pulsada.
 */
const SELECTOR = '[data-focusable], .nav a, .chip, .tab, .btn, input, select';
const DIRS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };

function candidates() {
  const root = document.getElementById('player').hidden ? document : document.getElementById('player');
  return [...root.querySelectorAll(SELECTOR)].filter((el) => {
    if (el.disabled || el.closest('[hidden]')) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
}

function center(rect) {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

export function initTvNavigation() {
  document.addEventListener('keydown', (e) => {
    const dir = DIRS[e.key];
    if (!dir || e.altKey || e.ctrlKey || e.metaKey) return;
    const active = document.activeElement;
    // En campos de texto las flechas izquierda/derecha mueven el cursor.
    if (active instanceof HTMLInputElement && dir[0] !== 0) return;
    if (active instanceof HTMLSelectElement || active instanceof HTMLVideoElement) return;

    const list = candidates();
    if (!list.length) return;
    if (!active || active === document.body || !list.includes(active)) {
      e.preventDefault();
      list[0].focus();
      return;
    }
    const from = center(active.getBoundingClientRect());
    let best = null;
    let bestScore = Infinity;
    for (const el of list) {
      if (el === active) continue;
      const to = center(el.getBoundingClientRect());
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const along = dx * dir[0] + dy * dir[1];
      if (along <= 1) continue;
      const across = Math.abs(dx * dir[1]) + Math.abs(dy * dir[0]);
      const score = along + across * 2;
      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    }
    if (best) {
      e.preventDefault();
      best.focus();
      best.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }
  });
}
