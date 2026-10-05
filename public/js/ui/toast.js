import { h } from '../core/dom.js';

export function toast(message, type = 'info', ms = 4000) {
  const el = h('div', { class: `toast toast--${type}`, role: type === 'error' ? 'alert' : 'status', text: message });
  document.getElementById('toasts').append(el);
  setTimeout(() => el.remove(), ms);
}
