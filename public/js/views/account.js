import { formData, h, mount } from '../core/dom.js';
import { api } from '../core/api.js';
import { describeDevice, formatDate } from '../core/text.js';
import { store } from '../core/store.js';
import { toast } from '../ui/toast.js';

function formWith(fields, buttonText, onSubmit, { danger = false } = {}) {
  const error = h('p', { class: 'form-error', role: 'alert' });
  const button = h('button', { class: `btn ${danger ? 'btn--danger' : 'btn--primary'}`, type: 'submit', text: buttonText });
  const form = h('form', { class: 'form', novalidate: true }, fields, button, error);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    error.textContent = '';
    button.disabled = true;
    try {
      await onSubmit(formData(form), form);
    } catch (err) {
      error.textContent = err.message;
    } finally {
      button.disabled = false;
    }
  });
  return form;
}

export async function renderAccount(view, { onLogout, onUserChange }) {
  const sessionsBox = h('div', { class: 'list' });
  const loadSessions = async () => {
    const { sessions } = await api.sessions();
    mount(
      sessionsBox,
      sessions.map((s) =>
        h(
          'div',
          { class: 'list-item' },
          h(
            'div',
            {},
            h('strong', { text: `${describeDevice(s.userAgent)}${s.current ? ' · este dispositivo' : ''}` }),
            h('small', { class: 'muted', text: `Último uso: ${formatDate(s.lastSeen)} · Inicio: ${formatDate(s.createdAt)}` }),
          ),
        ),
      ),
    );
  };

  mount(
    view,
    h(
      'div',
      { class: 'page' },
      h('div', { class: 'page__head' }, h('div', {}, h('h1', { text: 'Mi cuenta' }), h('p', { class: 'muted', text: store.user.email }))),

      h(
        'section',
        { class: 'panel' },
        h('h2', { text: 'Perfil' }),
        formWith(
          h('label', {}, 'Nombre', h('input', { name: 'name', value: store.user.name, maxlength: 60, required: true })),
          'Guardar',
          async (data) => {
            const { user } = await api.updateProfile({ name: data.name });
            onUserChange(user);
            toast('Perfil actualizado', 'ok');
          },
        ),
      ),

      h(
        'section',
        { class: 'panel' },
        h('h2', { text: 'Cambiar contraseña' }),
        h('p', { class: 'muted', text: 'Al cambiarla se cierran tus sesiones en otros dispositivos.' }),
        formWith(
          h(
            'div',
            { class: 'form-row' },
            h('label', {}, 'Contraseña actual', h('input', { name: 'currentPassword', type: 'password', autocomplete: 'current-password' })),
            h('label', {}, 'Nueva contraseña', h('input', { name: 'newPassword', type: 'password', autocomplete: 'new-password', minlength: 10 })),
          ),
          'Cambiar contraseña',
          async (data, form) => {
            await api.changePassword(data);
            form.reset();
            toast('Contraseña actualizada', 'ok');
            loadSessions();
          },
        ),
      ),

      h(
        'section',
        { class: 'panel' },
        h('h2', { text: 'Sesiones activas' }),
        sessionsBox,
        h(
          'div',
          { class: 'toolbar' },
          h('button', {
            class: 'btn',
            type: 'button',
            text: 'Cerrar las demás sesiones',
            onclick: async () => {
              await api.logoutOthers();
              toast('Sesiones cerradas', 'ok');
              loadSessions();
            },
          }),
          h('button', { class: 'btn btn--primary', type: 'button', text: 'Cerrar sesión', onclick: onLogout }),
        ),
      ),

      h(
        'section',
        { class: 'panel' },
        h('h2', { text: 'Eliminar cuenta' }),
        h('p', { class: 'muted', text: 'Borra para siempre tu cuenta, tus listas (con sus credenciales) y tus favoritos.' }),
        formWith(
          h('label', {}, 'Confirma con tu contraseña', h('input', { name: 'password', type: 'password', autocomplete: 'current-password' })),
          'Eliminar mi cuenta',
          async (data) => {
            if (!confirm('Esta acción no se puede deshacer. ¿Eliminar tu cuenta?')) return;
            await api.deleteAccount({ password: data.password });
            toast('Cuenta eliminada', 'ok');
            onLogout({ skipRequest: true });
          },
          { danger: true },
        ),
      ),
    ),
  );
  await loadSessions();
}
