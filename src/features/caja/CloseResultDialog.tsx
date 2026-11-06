import { Link } from 'react-router-dom';
import { Modal } from '../../components/Modal';
import { SummaryCard } from '../../components/SummaryCard';
import { money } from '../../lib/format';

interface CloseResultDialogProps {
  result: { total: number; orders: number } | null;
  onClose: () => void;
}

export function CloseResultDialog({ result, onClose }: CloseResultDialogProps) {
  return (
    <Modal
      open={result !== null}
      onClose={onClose}
      title="Caja cerrada"
      subtitle="El cierre quedó guardado en el historial."
      footer={
        <>
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            Cerrar
          </button>
          <Link className="btn btn-primary" to="/cierre" onClick={onClose}>
            Ver cierre
          </Link>
        </>
      }
    >
      <div className="modal-body">
        <div className="summary-grid">
          <SummaryCard
            label="Total del día"
            value={money(result?.total ?? 0)}
            primary
          />
          <SummaryCard label="Órdenes" value={result?.orders ?? 0} />
        </div>
        <p className="subtle">
          Puedes consultar el historial y descargar los reportes PDF desde{' '}
          <strong>Cierre caja</strong>.
        </p>
      </div>
    </Modal>
  );
}
