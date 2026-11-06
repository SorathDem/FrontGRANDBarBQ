import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { SummaryCard } from '../components/SummaryCard';
import { reportDiarioUrl, reportMensualUrl } from '../config/api';
import { useAlert } from '../hooks/useAlert';
import { apiFetch, getErrorMessage, wasAborted } from '../lib/api';
import {
  dateOnly,
  formatDate,
  isISODate,
  money,
  todayISO,
} from '../lib/format';
import type { Cierre } from '../types';

export default function CierrePage() {
  const today = todayISO();
  const [cierres, setCierres] = useState<Cierre[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [fechaDiaria, setFechaDiaria] = useState(today);
  const [mesMensual, setMesMensual] = useState(today.slice(0, 7));
  const { alert, show, clear } = useAlert();

  useEffect(() => {
    const controller = new AbortController();

    apiFetch<Cierre[] | { cajas?: Cierre[] }>('/api/cajas', {
      signal: controller.signal,
    })
      .then((data) => {
        if (controller.signal.aborted) return;
        const list = Array.isArray(data) ? data : data?.cajas ?? [];
        setCierres(
          [...list].sort((a, b) =>
            String(b.fecha || '').localeCompare(String(a.fecha || ''))
          )
        );
      })
      .catch((error) => {
        if (controller.signal.aborted || wasAborted(error)) return;
        setCierres([]);
        show(
          getErrorMessage(error, 'No se pudieron cargar los cierres de caja.'),
          'error'
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [refreshKey, show]);

  const handleRefresh = () => {
    clear();
    setLoading(true);
    setRefreshKey((value) => value + 1);
  };

  const totals = useMemo(() => {
    const total = cierres.reduce(
      (sum, cierre) => sum + (Number(cierre.totalDia) || 0),
      0
    );
    const orders = cierres.reduce(
      (sum, cierre) => sum + (Number(cierre.cantidadOrdenes) || 0),
      0
    );
    const average = cierres.length ? Math.round(total / cierres.length) : 0;
    return { total, orders, average };
  }, [cierres]);

  const openDailyReport = () => {
    if (!isISODate(fechaDiaria)) {
      show('Selecciona una fecha válida para el reporte diario.', 'error');
      return;
    }
    window.open(reportDiarioUrl(fechaDiaria), '_blank', 'noopener,noreferrer');
  };

  const openMonthlyReport = () => {
    if (!/^\d{4}-\d{2}$/.test(mesMensual)) {
      show('Selecciona un mes válido para el reporte mensual.', 'error');
      return;
    }

    const [year, month] = mesMensual.split('-');
    window.open(
      reportMensualUrl(year, month),
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Historial y reportes</p>
          <h1>Cierre de caja</h1>
          <p className="subtle">
            Consulta los cierres guardados y descarga los PDF.
          </p>
        </div>
        <div className="page-actions">
          <button
            className="btn btn-ghost"
            type="button"
            onClick={handleRefresh}
          >
            Actualizar
          </button>
        </div>
      </div>

      <Alert message={alert?.message} tone={alert?.tone} />

      <div className="summary-grid" aria-live="polite">
        <SummaryCard
          label="Total histórico"
          value={money(totals.total)}
          caption={`${cierres.length} cierre(s)`}
          primary
        />
        <SummaryCard
          label="Cierres"
          value={cierres.length}
          caption="días cerrados"
        />
        <SummaryCard
          label="Órdenes"
          value={totals.orders}
          caption="en cierres guardados"
        />
        <SummaryCard
          label="Promedio"
          value={money(totals.average)}
          caption="por cierre"
        />
      </div>

      <section className="report-grid" aria-label="Reportes PDF">
        <div className="report-card">
          <h3>Reporte diario</h3>
          <p>Órdenes, totales por método de pago y detalle del día.</p>
          <div className="report-row">
            <input
              className="input"
              type="date"
              aria-label="Fecha del reporte diario"
              value={fechaDiaria}
              onChange={(event) => setFechaDiaria(event.target.value)}
            />
            <button
              className="btn btn-primary"
              type="button"
              onClick={openDailyReport}
            >
              Abrir PDF
            </button>
          </div>
        </div>

        <div className="report-card">
          <h3>Reporte mensual</h3>
          <p>Resumen del mes con los días que tuvieron ventas.</p>
          <div className="report-row">
            <input
              className="input"
              type="month"
              aria-label="Mes del reporte mensual"
              value={mesMensual}
              onChange={(event) => setMesMensual(event.target.value)}
            />
            <button
              className="btn btn-primary"
              type="button"
              onClick={openMonthlyReport}
            >
              Abrir PDF
            </button>
          </div>
        </div>
      </section>

      <div className="items-head" style={{ marginTop: 22 }}>
        <h3>Cierres guardados</h3>
        <span>{cierres.length} cierre(s)</span>
      </div>

      <section className="card table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Órdenes</th>
                <th>Total del día</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4}>
                    <span className="loading">
                      <span className="spinner" /> Cargando cierres…
                    </span>
                  </td>
                </tr>
              ) : (
                cierres.map((cierre, index) => {
                  const fecha = dateOnly(cierre.fecha);
                  return (
                    <tr key={`${cierre._id || fecha}-${index}`}>
                      <td>
                        <span className="cell-title">{formatDate(fecha)}</span>
                        <span className="cell-sub">{fecha}</span>
                      </td>
                      <td>{Number(cierre.cantidadOrdenes) || 0}</td>
                      <td>
                        <strong>{money(cierre.totalDia)}</strong>
                      </td>
                      <td>
                        <div className="actions-cell">
                          <Link
                            className="btn btn-ghost btn-sm"
                            to={`/caja?fecha=${encodeURIComponent(fecha)}`}
                          >
                            Ver órdenes
                          </Link>
                          <button
                            className="btn btn-accent btn-sm"
                            type="button"
                            onClick={() => {
                              if (!isISODate(fecha)) return;
                              window.open(
                                reportDiarioUrl(fecha),
                                '_blank',
                                'noopener,noreferrer'
                              );
                            }}
                          >
                            PDF del día
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && cierres.length === 0 ? (
          <div className="empty">
            <strong>Sin cierres</strong>
            <span>
              Cuando cierres la caja desde la sección Caja, el cierre aparecerá
              aquí.
            </span>
          </div>
        ) : null}
      </section>
    </>
  );
}
