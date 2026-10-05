import { $, formData } from '../core/dom.js';
import { api } from '../core/api.js';

/** Conecta los formularios de inicio de sesión y registro. */
export function initAuthScreen({ onAuthenticated }) {
  const error = $('#auth-error');
  const forms = { login: $('#login-form'), register: $('#register-form') };

  document.querySelectorAll('[data-auth-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      const name = tab.dataset.authTab;
      document.querySelectorAll('[data-auth-tab]').forEach((t) => t.classList.toggle('is-active', t === tab));
      forms.login.hidden = name !== 'login';
      forms.register.hidden = name !== 'register';
      error.textContent = '';
    });
  });

  for (const [name, form] of Object.entries(forms)) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      error.textContent = '';
      button.disabled = true;
      try {
        const { user } = await (name === 'login' ? api.login(formData(form)) : api.register(formData(form)));
        form.reset();
        onAuthenticated(user);
      } catch (err) {
        error.textContent = err.message;
      } finally {
        button.disabled = false;
      }
    });
  }
}

export function showAuth({ registrationOpen = true } = {}) {
  $('#app').hidden = true;
  $('#auth').hidden = false;
  document.querySelector('[data-auth-tab="register"]').hidden = !registrationOpen;
  $('#login-form input[name="email"]').focus();
}
