import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { StatusBadge } from '../components/StatusBadge';
import { SummaryCard } from '../components/SummaryCard';
import { CloseResultDialog } from '../features/caja/CloseResultDialog';
import { InvoiceDialog } from '../features/caja/InvoiceDialog';
import { useAlert } from '../hooks/useAlert';
import { apiFetch, getErrorMessage, wasAborted } from '../lib/api';
import {
  formatHora,
  isISODate,
  money,
  shiftDate,
  todayISO,
} from '../lib/format';
import {
  PAYMENT_LABELS,
  PAYMENT_METHODS,
} from '../lib/payments';
import type { PaymentMethod } from '../lib/payments';
import type { CloseCajaResponse, Order, Product } from '../types';

type InvoiceState =
  | { mode: 'create' }
  | { mode: 'edit'; order: Order };

function methodTotals(orders: Order[]): Record<PaymentMethod, number> {
  const totals = Object.fromEntries(
    PAYMENT_METHODS.map((method) => [method, 0])
  ) as Record<PaymentMethod, number>;

  orders.forEach((order) => {
    const method = String(order.metodoPago || 'efectivo').toLowerCase();
    if (method in totals) {
      totals[method as PaymentMethod] += Number(order.total) || 0;
    }
  });

  return totals;
}

async function fetchProducts(signal?: AbortSignal): Promise<Product[]> {
  const data = await apiFetch<Product[] | { productos?: Product[] }>(
    '/api/productos',
    { signal }
  );
  return Array.isArray(data) ? data : data?.productos ?? [];
}

async function fetchOrders(
  date: string,
  signal?: AbortSignal
): Promise<Order[]> {
  const data = await apiFetch<Order[]>(
    `/api/ordenes/por-fecha/${encodeURIComponent(date)}`,
    { signal }
  );
  return Array.isArray(data) ? data : [];
}

export default function CajaPage() {
  const today = todayISO();
  const [searchParams, setSearchParams] = useSearchParams();
  const dateParam = searchParams.get('fecha');
  const currentDate = isISODate(dateParam) ? dateParam : today;

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [invoice, setInvoice] = useState<InvoiceState | null>(null);
  const [closing, setClosing] = useState(false);
  const [closeResult, setCloseResult] = useState<{
    total: number;
    orders: number;
  } | null>(null);
  const { alert, show, clear } = useAlert();

  useEffect(() => {
    const controller = new AbortController();

    fetchProducts(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setProducts(data);
      })
      .catch((error) => {
        if (controller.signal.aborted || wasAborted(error)) return;
        setProducts([]);
      });

    return () => controller.abort();
  }, []);

  const refreshOrders = useCallback(
    async ({ silent = true }: { silent?: boolean } = {}) => {
      try {
        const data = await fetchOrders(currentDate);
        setOrders(data);
      } catch (error) {
        if (wasAborted(error)) return;
        if (silent) return;
        setOrders([]);
        show(
          getErrorMessage(error, 'No se pudieron cargar las órdenes del día.'),
          'error'
        );
      }
    },
    [currentDate, show]
  );

  useEffect(() => {
    const controller = new AbortController();

    fetchOrders(currentDate, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setOrders(data);
      })
      .catch((error) => {
        if (controller.signal.aborted || wasAborted(error)) return;
        setOrders([]);
        show(
          getErrorMessage(error, 'No se pudieron cargar las órdenes del día.'),
          'error'
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [currentDate, refreshKey, show]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (closing) return;
      if (document.querySelector('dialog[open]')) return;
      void refreshOrders();
    }, 15000);

    return () => window.clearInterval(interval);
  }, [refreshOrders, closing]);

  const setFecha = useCallback(
    (value: string) => {
      if (!isISODate(value)) return;

      clear();
      setLoading(true);
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.set('fecha', value);
          return next;
        },
        { replace: true }
      );
      // Si se elige la misma fecha (por ejemplo "Hoy" cuando ya es hoy),
      // la URL no cambia y el efecto no se dispararía. Este contador fuerza
      // la recarga sin dejar la tabla bloqueada en "Cargando…".
      setRefreshKey((current) => current + 1);
    },
    [clear, setSearchParams]
  );

  const handleRefresh = () => {
    clear();
    setLoading(true);
    setRefreshKey((value) => value + 1);
  };

  const summary = useMemo(() => {
    const total = orders.reduce(
      (sum, order) => sum + (Number(order.total) || 0),
      0
    );
    const average = orders.length ? Math.round(total / orders.length) : 0;
    const comandas = orders.filter((order) =>
      ['pending_print', 'printing', 'printed'].includes(String(order.status))
    ).length;
    const facturas = orders.filter((order) =>
      ['pending_ticket', 'ticket_printed'].includes(String(order.status))
    ).length;
    const totals = methodTotals(orders);

    return { total, average, comandas, facturas, totals };
  }, [orders]);

  const ensureProducts = useCallback(async () => {
    if (products.length > 0) return;
    try {
      setProducts(await fetchProducts());
    } catch {
      setProducts([]);
    }
  }, [products.length]);

  const openCreate = async () => {
    await ensureProducts();
    setInvoice({ mode: 'create' });
  };

  const openEdit = async (order: Order) => {
    await ensureProducts();
    setInvoice({ mode: 'edit', order });
  };

  const handleInvoiceSaved = (message: string) => {
    setInvoice(null);
    show(message, 'success', 8000);
    void refreshOrders();
  };

  const handleOrdersChanged = () => {
    void refreshOrders();
  };

  const imprimirFactura = async (order: Order) => {
    if (
      !window.confirm(
        `¿Enviar la factura de la mesa ${order.mesa || 'N/A'} a la impresora?`
      )
    ) {
      return;
    }

    try {
      await apiFetch(`/api/ordenes/${order._id}/imprimir-factura`, {
        method: 'PATCH',
      });
      show('Factura enviada a impresión.', 'success', 6000);
      void refreshOrders();
    } catch (error) {
      show(
        getErrorMessage(error, 'No se pudo imprimir la factura.'),
        'error'
      );
    }
  };

  const reimprimirComanda = async (order: Order) => {
    if (
      !window.confirm(
        `¿Reimprimir la comanda de la mesa ${order.mesa || 'N/A'}?`
      )
    ) {
      return;
    }

    try {
      await apiFetch(`/api/ordenes/${order._id}`, {
        method: 'PUT',
        body: { status: 'pending_print', errorMsg: '' },
      });
      show(
        'Comanda enviada de nuevo a la cola de impresión.',
        'success',
        6000
      );
      void refreshOrders();
    } catch (error) {
      show(
        getErrorMessage(error, 'No se pudo reimprimir la comanda.'),
        'error'
      );
    }
  };

  const eliminarOrden = async (order: Order) => {
    if (
      !window.confirm(
        `¿Eliminar la orden de la mesa ${order.mesa || 'N/A'} por ${money(
          order.total
        )}? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    try {
      await apiFetch(`/api/ordenes/${order._id}`, { method: 'DELETE' });
      show('Orden eliminada correctamente.', 'success', 6000);
      void refreshOrders();
    } catch (error) {
      show(getErrorMessage(error, 'No se pudo eliminar la orden.'), 'error');
    }
  };

  const cerrarCaja = async () => {
    if (orders.length === 0) {
      show(
        'No hay órdenes registradas para la fecha seleccionada.',
        'warn',
        6000
      );
      return;
    }

    const total = orders.reduce(
      (sum, order) => sum + (Number(order.total) || 0),
      0
    );

    if (
      !window.confirm(
        `¿Cerrar la caja de ${currentDate}?\n\nSe guardarán ${
          orders.length
        } orden(es) y un total de ${money(total)}.`
      )
    ) {
      return;
    }

    setClosing(true);
    try {
      const data = await apiFetch<CloseCajaResponse>(
        '/api/ordenes/cerrar-caja',
        {
          method: 'POST',
          body: { fecha: currentDate },
        }
      );

      const caja = data?.caja ?? {};
      setCloseResult({
        total: Number(caja.totalDia ?? total),
        orders: Number(caja.cantidadOrdenes ?? orders.length),
      });
      show('Caja cerrada correctamente.', 'success', 6000);
    } catch (error) {
      show(getErrorMessage(error, 'No se pudo cerrar la caja.'), 'error');
    } finally {
      setClosing(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Operación</p>
          <h1>Caja</h1>
          <p className="subtle">Órdenes, facturas, cobros y cierre del día.</p>
        </div>
        <div className="page-actions">
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => void openCreate()}
          >
            ＋ Nueva factura
          </button>
          <button
            className="btn btn-danger"
            type="button"
            onClick={() => void cerrarCaja()}
            disabled={closing}
          >
            {closing ? 'Cerrando…' : 'Cerrar caja'}
          </button>
        </div>
      </div>

      <Alert message={alert?.message} tone={alert?.tone} />

      <section className="card date-toolbar" aria-label="Fecha de trabajo">
        <button
          className="btn btn-ghost"
          type="button"
          title="Día anterior"
          onClick={() => setFecha(shiftDate(currentDate, -1))}
        >
          ◀
        </button>
        <input
          className="input"
          type="date"
          aria-label="Fecha"
          value={currentDate}
          onChange={(event) => setFecha(event.target.value)}
        />
        <button
          className="btn btn-ghost"
          type="button"
          title="Día siguiente"
          onClick={() => setFecha(shiftDate(currentDate, 1))}
        >
          ▶
        </button>
        <button
          className="btn btn-ghost"
          type="button"
          onClick={() => setFecha(todayISO())}
        >
          Hoy
        </button>
        <button
          className="btn btn-ghost"
          type="button"
          onClick={handleRefresh}
        >
          Actualizar
        </button>
        <span className="subtle" style={{ marginLeft: 'auto' }}>
          {currentDate === today ? 'Hoy' : 'Consultando histórico'}
        </span>
      </section>

      <div className="summary-grid" aria-live="polite">
        <SummaryCard
          label="Total del día"
          value={money(summary.total)}
          caption={`${orders.length} orden(es)`}
          primary
        />
        <SummaryCard
          label="Promedio"
          value={money(summary.average)}
          caption="por orden"
        />
        <SummaryCard
          label="Comandas"
          value={summary.comandas}
          caption="en cola o impresas"
        />
        <SummaryCard
          label="Facturas"
          value={summary.facturas}
          caption="solicitadas o impresas"
        />
      </div>

      <div
        className="method-breakdown"
        aria-label="Totales por método de pago"
      >
        {PAYMENT_METHODS.map((method) => (
          <div className="method-item" key={method}>
            <span>{PAYMENT_LABELS[method]}</span>
            <strong>{money(summary.totals[method])}</strong>
          </div>
        ))}
      </div>

      <section className="card table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mesa</th>
                <th>Hora</th>
                <th>Método</th>
                <th>Productos</th>
                <th>Total</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7}>
                    <span className="loading">
                      <span className="spinner" /> Cargando órdenes…
                    </span>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order._id}>
                    <td>
                      <span className="cell-title">
                        Mesa {order.mesa || 'N/A'}
                      </span>
                      <span className="cell-sub">
                        #{String(order._id).slice(-6)}
                      </span>
                    </td>
                    <td>{formatHora(order.createdAt)}</td>
                    <td style={{ textTransform: 'capitalize' }}>
                      {order.metodoPago || 'efectivo'}
                    </td>
                    <td>
                      <div className="order-items">
                        {order.items?.length ? (
                          order.items.map((item, index) => (
                            <div
                              className="order-line"
                              key={`${order._id}-${index}`}
                            >
                              {item.cantidad}× {item.nombre}
                              {item.recomendaciones ? (
                                <span className="order-note">
                                  {' '}
                                  · {item.recomendaciones}
                                </span>
                              ) : null}
                            </div>
                          ))
                        ) : (
                          <span className="cell-sub">Sin productos</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <strong>{money(order.total)}</strong>
                    </td>
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button
                          className="btn btn-accent btn-sm"
                          type="button"
                          onClick={() => void imprimirFactura(order)}
                        >
                          Factura
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          type="button"
                          onClick={() => void reimprimirComanda(order)}
                        >
                          Comanda
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          type="button"
                          onClick={() => void openEdit(order)}
                        >
                          Cobrar / editar
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          type="button"
                          onClick={() => void eliminarOrden(order)}
                        >
                          Borrar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && orders.length === 0 ? (
          <div className="empty">
            <strong>Sin órdenes</strong>
            <span>
              No hay órdenes registradas para la fecha seleccionada.
            </span>
          </div>
        ) : null}
      </section>

      {invoice ? (
        <InvoiceDialog
          mode={invoice.mode}
          order={invoice.mode === 'edit' ? invoice.order : null}
          currentDate={currentDate}
          products={products}
          onClose={() => setInvoice(null)}
          onSaved={handleInvoiceSaved}
          onOrdersChanged={handleOrdersChanged}
        />
      ) : null}

      <CloseResultDialog
        result={closeResult}
        onClose={() => setCloseResult(null)}
      />
    </>
  );
}
