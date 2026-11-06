export function money(value: unknown): string {
  const number = Math.round(Number(value) || 0);
  const sign = number < 0 ? '-' : '';
  return `${sign}$${Math.abs(number).toLocaleString('es-CO')}`;
}

export function todayISO(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isISODate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T12:00:00`);
  return !Number.isNaN(parsed.getTime()) && todayISO(parsed) === value;
}

export function dateOnly(value: unknown): string {
  return String(value || '').split('T')[0];
}

export function formatDate(value: unknown): string {
  if (!value) return '';
  const iso = dateOnly(value);
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function formatHora(value: unknown): string {
  if (!value) return '--:--';

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '--:--';

  return date.toLocaleTimeString('es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function shiftDate(iso: string, delta: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + delta);
  return todayISO(date);
}
