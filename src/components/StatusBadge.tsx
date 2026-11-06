import { statusInfo } from '../lib/status';

export function StatusBadge({ status }: { status?: string }) {
  const info = statusInfo(status);
  return <span className={`badge badge-${info.tone}`}>{info.label}</span>;
}
