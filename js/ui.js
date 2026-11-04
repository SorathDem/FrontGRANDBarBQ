import { apiUrl, getApiBase, setApiBase } from './config.js';

const SESSION_KEYS = ['token', 'role'];

export function clearSession() {
  SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
}

export function logout() {
  clearSession();
  window.location.replace('index.html');
}

/** Verifica que haya una sesión de caja/admin; si no, vuelve al login. */
export function requireAuth() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token || (role !== 'caja' && role !== 'admin')) {
    clearSession();
    window.location.replace('index.html');
    throw new Error('Sesión no válida');
  }

  return { token, role };
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return char;
    }
  });
}

export function money(value) {
  const number = Math.round(Number(value) || 0);
  const sign = number < 0 ? '-' : '';
  return `${sign}$${Math.abs(number).toLocaleString('es-CO')}`;
}

export function todayISO(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isISODate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
  const parsed = new Date(`${value}T12:00:00`);
  return !Number.isNaN(parsed.getTime()) && todayISO(parsed) === value;
}

export function formatDate(value) {
  if (!value) return '';
  const iso = String(value).split('T')[0];
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function formatHora(value) {
  if (!value) return '--:--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString('es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function statusInfo(status) {
  const value = String(status || '');
  const map = {
    pending_print: { label: 'En cola de impresión', tone: 'warning' },
    printing: { label: 'Imprimiendo…', tone: 'info' },
    printed: { label: 'Comanda impresa', tone: 'success' },
    pending_ticket: { label: 'Factura en cola', tone: 'warning' },
    ticket_printed: { label: 'Factura impresa', tone: 'success' },
    completed: { label: 'Completada', tone: 'neutral' },
    error: { label: 'Error de impresión', tone: 'danger' },
  };
  return map[value] || { label: value || 'Sin estado', tone: 'neutral' };
}

export function statusBadge(status) {
  const info = statusInfo(status);
  return `<span class="badge badge-${info.tone}">${escapeHtml(info.label)}</span>`;
}

export function showAlert(element, message, type = 'error') {
  if (!element) return;
  element.className = `alert ${type}`;
  element.textContent = message;
  element.classList.remove('hidden');
}

export function hideAlert(element) {
  if (!element) return;
  element.classList.add('hidden');
  element.textContent = '';
}

export function openDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  } else {
    dialog.setAttribute('open', '');
  }
}

export function closeDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.close === 'function') {
    dialog.close();
  } else {
    dialog.removeAttribute('open');
  }
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const token = localStorage.getItem('token');
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(apiUrl(path), { ...options, headers });
  } catch {
    throw new Error(
      'No se pudo conectar con el servidor. Revisa la URL del backend y tu conexión.'
    );
  }

  const data = await parseResponse(response);

  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
      window.location.replace('index.html');
    }
    const message =
      (data && (data.error || data.message || data.mensaje)) ||
      `Error del servidor (${response.status})`;
    throw new Error(String(message));
  }

  return data;
}

/** Inserta la barra de navegación y deja marcada la sección activa. */
export function mountNav(active) {
  const nav = document.getElementById('app-nav');
  if (!nav) return;

  const baseLabel = getApiBase().replace(/^https?:\/\//, '');

  nav.innerHTML = `
    <a class="brand" href="admin.html" aria-label="Ir a productos">
      <span class="brand-mark">GB</span>
      <span class="brand-text">GranBar <small>Admin</small></span>
    </a>
    <nav class="nav-links" aria-label="Secciones">
      <a href="admin.html" data-nav="productos">Productos</a>
      <a href="caja.html" data-nav="caja">Caja</a>
      <a href="cierre_caja.html" data-nav="cierre">Cierre caja</a>
    </nav>
    <div class="nav-actions">
      <button type="button" class="btn btn-ghost btn-sm" id="serverBtn" title="Cambiar la URL del backend">
        Servidor: <strong id="serverLabel">${escapeHtml(baseLabel)}</strong>
      </button>
      <button type="button" class="btn btn-ghost btn-sm" id="logoutBtn">Cerrar sesión</button>
    </div>
  `;

  nav.querySelectorAll('[data-nav]').forEach((link) => {
    if (link.dataset.nav === active) link.classList.add('active');
  });

  const serverBtn = document.getElementById('serverBtn');
  const serverLabel = document.getElementById('serverLabel');
  const logoutBtn = document.getElementById('logoutBtn');

  serverBtn?.addEventListener('click', () => {
    const current = getApiBase();
    const value = window.prompt(
      'URL del backend (ej. https://granbar-bq.onrender.com o http://localhost:4000):',
      current
    );
    if (value === null) return;
    const next = setApiBase(value);
    if (serverLabel) serverLabel.textContent = next.replace(/^https?:\/\//, '');
    window.location.reload();
  });

  logoutBtn?.addEventListener('click', logout);
}
