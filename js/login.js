import { apiUrl, getApiBase, setApiBase } from './config.js';

const form = document.getElementById('loginForm');
const codeInput = document.getElementById('code');
const errorBox = document.getElementById('loginError');
const loginBtn = document.getElementById('loginBtn');
const serverBtn = document.getElementById('serverBtn');
const serverLabel = document.getElementById('serverLabel');

function refreshServerLabel() {
  if (serverLabel) {
    serverLabel.textContent = getApiBase().replace(/^https?:\/\//, '');
  }
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove('hidden');
}

function hideError() {
  errorBox.classList.add('hidden');
  errorBox.textContent = '';
}

refreshServerLabel();

// Si ya hay una sesión de administración, no mostrar el login.
const existingToken = localStorage.getItem('token');
const existingRole = localStorage.getItem('role');
if (existingToken && (existingRole === 'caja' || existingRole === 'admin')) {
  window.location.replace('admin.html');
} else if (existingToken || existingRole) {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
}

serverBtn?.addEventListener('click', () => {
  const value = window.prompt(
    'URL del backend (ej. https://granbar-bq.onrender.com o http://localhost:4000):',
    getApiBase()
  );
  if (value === null) return;
  setApiBase(value);
  refreshServerLabel();
  hideError();
});

codeInput?.addEventListener('input', hideError);

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideError();

  const code = codeInput.value.trim();
  if (!code) {
    showError('Escribe tu código de acceso.');
    codeInput.focus();
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = 'Ingresando…';

  try {
    const response = await fetch(apiUrl('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.message || data.error || 'Código inválido. Intenta de nuevo.'
      );
    }

    if (data.role !== 'caja' && data.role !== 'admin') {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      throw new Error(
        'Esta web es solo para administración. Si eres mesero, usa la app móvil.'
      );
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('role', data.role);
    window.location.replace('admin.html');
  } catch (error) {
    showError(error?.message || 'No se pudo iniciar sesión.');
    loginBtn.disabled = false;
    loginBtn.textContent = 'Entrar al panel';
  }
});
