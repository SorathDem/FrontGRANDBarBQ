// Configuración del frontend de administración.
// La URL se guarda en localStorage para poder cambiar de backend sin rebuild.

const STORAGE_KEY = 'granbar_admin_api_base';

// Por defecto apuntamos al backend que usa la app móvil y que tiene los datos
// reales del restaurante. Se puede cambiar desde el botón "Servidor".
export const DEFAULT_API_BASE = 'https://granbar-bq.onrender.com';

export const API_PRESETS = [
  {
    value: DEFAULT_API_BASE,
    label: 'Backend de la app móvil (datos reales)',
  },
  {
    value: 'https://granbarbqd.onrender.com',
    label: 'AppMovilBackend en Render',
  },
  {
    value: 'http://localhost:4000',
    label: 'AppMovilBackend local',
  },
] as const;

export function normalizeBase(value: string | null | undefined): string {
  let base = String(value || '').trim();
  if (!base) return DEFAULT_API_BASE;
  if (!/^https?:\/\//i.test(base)) {
    const isLocal = /^(localhost|127\.0\.0\.1)(:|\/|$)/i.test(base);
    base = `${isLocal ? 'http' : 'https'}://${base}`;
  }
  return base.replace(/\/+$/, '');
}

export function getApiBase(): string {
  try {
    return normalizeBase(localStorage.getItem(STORAGE_KEY) || DEFAULT_API_BASE);
  } catch {
    return DEFAULT_API_BASE;
  }
}

export function setApiBase(value: string | null | undefined): string {
  const base = normalizeBase(value);
  try {
    localStorage.setItem(STORAGE_KEY, base);
  } catch {
    // Si localStorage está bloqueado, al menos se usa durante esta página.
  }
  return base;
}

export function apiUrl(path: string): string {
  const clean = String(path || '').startsWith('/') ? path : `/${path}`;
  return `${getApiBase()}${clean}`;
}

export function reportDiarioUrl(fecha: string): string {
  return apiUrl(`/api/cajas/reporte/diario?fecha=${encodeURIComponent(fecha)}`);
}

export function reportMensualUrl(year: string | number, month: string | number): string {
  const y = String(year);
  const m = String(month).padStart(2, '0');
  return apiUrl(
    `/api/cajas/reporte/mensual?year=${encodeURIComponent(y)}&month=${encodeURIComponent(m)}`
  );
}
