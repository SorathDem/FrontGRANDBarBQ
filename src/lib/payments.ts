export const PAYMENT_METHODS = [
  'efectivo',
  'tarjeta',
  'transferencia',
  'nequi',
  'daviplata',
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
};

export function normalizePaymentMethod(value: unknown): PaymentMethod {
  const method = String(value || '').toLowerCase();
  return PAYMENT_METHODS.includes(method as PaymentMethod)
    ? (method as PaymentMethod)
    : 'efectivo';
}
