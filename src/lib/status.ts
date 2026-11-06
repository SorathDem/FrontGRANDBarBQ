export type BadgeTone = 'success' | 'warning' | 'info' | 'danger' | 'neutral';

export interface StatusInfo {
  label: string;
  tone: BadgeTone;
}

const STATUS_MAP: Record<string, StatusInfo> = {
  pending_print: { label: 'En cola de impresión', tone: 'warning' },
  printing: { label: 'Imprimiendo…', tone: 'info' },
  printed: { label: 'Comanda impresa', tone: 'success' },
  pending_ticket: { label: 'Factura en cola', tone: 'warning' },
  ticket_printed: { label: 'Factura impresa', tone: 'success' },
  completed: { label: 'Completada', tone: 'neutral' },
  error: { label: 'Error de impresión', tone: 'danger' },
};

export function statusInfo(status: unknown): StatusInfo {
  const value = String(status || '');
  return STATUS_MAP[value] || { label: value || 'Sin estado', tone: 'neutral' };
}
