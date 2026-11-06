interface SummaryCardProps {
  label: string;
  value: string | number;
  caption?: string;
  primary?: boolean;
}

export function SummaryCard({
  label,
  value,
  caption,
  primary = false,
}: SummaryCardProps) {
  return (
    <div className={`summary-card${primary ? ' primary' : ''}`}>
      <div className="summary-label">{label}</div>
      <div className="summary-value">{value}</div>
      {caption ? <div className="summary-caption">{caption}</div> : null}
    </div>
  );
}
