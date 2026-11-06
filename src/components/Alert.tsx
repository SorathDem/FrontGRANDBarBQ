import type { AlertTone } from '../hooks/useAlert';

interface AlertProps {
  message?: string | null;
  tone?: AlertTone;
  className?: string;
  role?: 'alert' | 'status';
}

export function Alert({
  message,
  tone = 'error',
  className = '',
  role,
}: AlertProps) {
  if (!message) return null;

  return (
    <div
      className={`alert ${tone} ${className}`.trim()}
      role={role ?? (tone === 'error' ? 'alert' : 'status')}
    >
      {message}
    </div>
  );
}
