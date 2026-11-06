import { useId, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Alert } from '../../components/Alert';
import { Modal } from '../../components/Modal';
import { apiFetch, getErrorMessage } from '../../lib/api';
import { dateOnly, isISODate, money } from '../../lib/format';
import {
  normalizePaymentMethod,
  PAYMENT_LABELS,
  PAYMENT_METHODS,
} from '../../lib/payments';
import type { PaymentMethod } from '../../lib/payments';
import type {
  CreateOrderResponse,
  Order,
  OrderItem,
  Product,
} from '../../types';

interface DraftItem {
  key: string;
  productId?: string;
  tipo?: string;
  nombre: string;
  cantidad: number;
  precio: number;
  recomendaciones: string;
}

interface InvoiceDialogProps {
  mode: 'create' | 'edit';
  order: Order | null;
  currentDate: string;
  products: Product[];
  onClose: () => void;
  onSaved: (message: string) => void;
  onOrdersChanged: () => void;
}

let itemSequence = 0;

function createItemKey(): string {
  itemSequence += 1;
  return `item-${Date.now()}-${itemSequence}`;
}

function draftFromOrder(order: Order | null): DraftItem[] {
  return (order?.items ?? []).map((item) => ({
    key: createItemKey(),
    productId: item.productId,
    tipo: item.tipo,
    nombre: item.nombre || '',
    cantidad: Number(item.cantidad) || 1,
    precio: Number(item.precio) || 0,
    recomendaciones: item.recomendaciones || '',
  }));
}

function numericInputValue(value: number): string | number {
  return value === 0 ? '' : value;
}

export function InvoiceDialog({
  mode,
  order,
  currentDate,
  products,
  onClose,
  onSaved,
  onOrdersChanged,
}: InvoiceDialogProps) {
  const [formMode, setFormMode] = useState<'create' | 'edit'>(mode);
  const [orderId, setOrderId] = useState<string | null>(order?._id ?? null);
  const [mesa, setMesa] = useState(order?.mesa ?? '');
  const [fecha, setFecha] = useState(
    order?.fecha ? dateOnly(order.fecha) : currentDate
  );
  const [metodo, setMetodo] = useState<PaymentMethod>(
    normalizePaymentMethod(order?.metodoPago)
  );
  const [items, setItems] = useState<DraftItem[]>(() => draftFromOrder(order));
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const formId = useId();

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;

    return products.filter(
      (product) =>
        String(product.name || '').toLowerCase().includes(query) ||
        String(product.category || '').toLowerCase().includes(query)
    );
  }, [products, search]);

  const total = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + (Number(item.cantidad) || 0) * (Number(item.precio) || 0),
        0
      ),
    [items]
  );

  const updateItem = (key: string, patch: Partial<DraftItem>) => {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item))
    );
  };

  const removeItem = (key: string) => {
    setItems((current) => current.filter((item) => item.key !== key));
  };

  const addProduct = (product: Product) => {
    setItems((current) => {
      const existing = current.find(
        (item) => item.productId && item.productId === product._id
      );

      if (existing) {
        return current.map((item) =>
          item.key === existing.key
            ? { ...item, cantidad: (Number(item.cantidad) || 0) + 1 }
            : item
        );
      }

      return [
        ...current,
        {
          key: createItemKey(),
          productId: product._id,
          tipo: product.category || '',
          nombre: product.name || 'Producto',
          cantidad: 1,
          precio: Number(product.price) || 0,
          recomendaciones: '',
        },
      ];
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;

    setError('');
    const trimmedMesa = mesa.trim();

    if (!trimmedMesa) {
      setError('Escribe la mesa de la orden.');
      return;
    }

    if (!isISODate(fecha)) {
      setError('La fecha debe ser válida (AAAA-MM-DD).');
      return;
    }

    const cleanItems = items
      .map((item) => ({
        productId: item.productId,
        tipo: item.tipo,
        nombre: String(item.nombre || '').trim(),
        cantidad: Number(item.cantidad) || 0,
        precio: Number(item.precio) || 0,
        recomendaciones: String(item.recomendaciones || '').trim(),
      }))
      .filter(
        (item) => item.nombre && item.cantidad > 0 && item.precio >= 0
      );

    if (cleanItems.length === 0) {
      setError('Agrega al menos un producto con cantidad mayor a cero.');
      return;
    }

    const orderTotal = cleanItems.reduce(
      (sum, item) => sum + item.cantidad * item.precio,
      0
    );

    const itemsForPut = cleanItems.map((item) => ({
      productId: item.productId,
      tipo: item.tipo,
      nombre: item.nombre,
      cantidad: item.cantidad,
      precio: item.precio,
      recomendaciones: item.recomendaciones,
    }));

    const itemsForPost: OrderItem[] = cleanItems.map((item) => ({
      _id: item.productId,
      productId: item.productId,
      tipo: item.tipo,
      nombre: item.nombre,
      cantidad: item.cantidad,
      precio: item.precio,
      recomendaciones: item.recomendaciones,
    }));

    setSaving(true);
    let createdId: string | null = null;

    try {
      let stockAlerts: Array<{ nombre?: string }> | undefined;

      if (formMode === 'create') {
        const created = await apiFetch<CreateOrderResponse>('/api/ordenes', {
          method: 'POST',
          body: {
            mesa: trimmedMesa,
            metodoPago: metodo,
            items: itemsForPost,
          },
        });

        createdId = created?.orden?._id || created?._id || null;
        stockAlerts = created?.alertasStockBajo;

        if (!createdId) {
          throw new Error('El servidor no devolvió la orden creada.');
        }

        await apiFetch(`/api/ordenes/${createdId}`, {
          method: 'PUT',
          body: {
            mesa: trimmedMesa,
            fecha,
            metodoPago: metodo,
            items: itemsForPut,
            total: orderTotal,
          },
        });
      } else {
        if (!orderId) {
          throw new Error('No se encontró la orden que se va a editar.');
        }

        await apiFetch(`/api/ordenes/${orderId}`, {
          method: 'PUT',
          body: {
            mesa: trimmedMesa,
            fecha,
            metodoPago: metodo,
            items: itemsForPut,
            total: orderTotal,
          },
        });
      }

      const baseMessage =
        formMode === 'edit'
          ? 'Orden actualizada correctamente.'
          : 'Factura creada correctamente.';
      const alertMessage =
        Array.isArray(stockAlerts) && stockAlerts.length
          ? ` Stock bajo: ${stockAlerts
              .map((alert) => alert.nombre)
              .filter(Boolean)
              .join(', ')}.`
          : '';

      onSaved(`${baseMessage}${alertMessage}`);
    } catch (saveError) {
      if (createdId) {
        // La orden ya existe: pasamos el formulario a edición para que un
        // segundo intento actualice esa orden en vez de duplicarla.
        setFormMode('edit');
        setOrderId(createdId);
        setError(
          `La orden se creó, pero no se pudo fijar la fecha o el método de pago: ${getErrorMessage(
            saveError,
            'error desconocido'
          )}. Corrige los datos y vuelve a guardar para actualizarla.`
        );
        onOrdersChanged();
      } else {
        setError(getErrorMessage(saveError, 'No se pudo guardar la orden.'));
      }
    } finally {
      setSaving(false);
    }
  };

  const subtitle =
    formMode === 'edit'
      ? orderId
        ? `Mesa ${mesa || 'N/A'} · #${String(orderId).slice(-6)}`
        : 'Actualiza los datos de la orden.'
      : 'Registra una venta manual y asigna fecha, mesa y método de pago.';

  return (
    <Modal
      open
      onClose={onClose}
      title={formMode === 'edit' ? 'Editar / cobrar orden' : 'Nueva factura'}
      subtitle={subtitle}
      wide
      footer={
        <>
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            type="submit"
            form={formId}
            disabled={saving}
          >
            {saving
              ? 'Guardando…'
              : formMode === 'edit'
                ? 'Guardar cambios'
                : 'Crear factura'}
          </button>
        </>
      }
    >
      <form id={formId} className="modal-body" onSubmit={handleSubmit}>
        <div className="grid-3">
          <label className="field">
            <span>Mesa</span>
            <input
              className="input"
              type="text"
              placeholder="Ej. 4"
              value={mesa}
              onChange={(event) => setMesa(event.target.value)}
              required
              autoFocus
            />
          </label>
          <label className="field">
            <span>Fecha</span>
            <input
              className="input"
              type="date"
              value={fecha}
              onChange={(event) => setFecha(event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Método de pago</span>
            <select
              className="input"
              value={metodo}
              onChange={(event) =>
                setMetodo(normalizePaymentMethod(event.target.value))
              }
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {PAYMENT_LABELS[method]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="items-head">
          <h3>Productos de la orden</h3>
          <span>{items.length} ítem(s)</span>
        </div>

        <div className="items-editor">
          {items.length === 0 ? (
            <div className="empty-items">
              Agrega productos desde el catálogo de abajo.
            </div>
          ) : (
            items.map((item) => {
              const subtotal =
                (Number(item.cantidad) || 0) * (Number(item.precio) || 0);

              return (
                <div className="item-editor" key={item.key}>
                  <input
                    className="item-name"
                    type="text"
                    value={item.nombre}
                    placeholder="Producto"
                    aria-label="Producto"
                    onChange={(event) =>
                      updateItem(item.key, { nombre: event.target.value })
                    }
                  />
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={numericInputValue(item.cantidad)}
                    aria-label="Cantidad"
                    onChange={(event) =>
                      updateItem(item.key, {
                        cantidad: Number(event.target.value) || 0,
                      })
                    }
                  />
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={numericInputValue(item.precio)}
                    aria-label="Precio"
                    onChange={(event) =>
                      updateItem(item.key, {
                        precio: Number(event.target.value) || 0,
                      })
                    }
                  />
                  <input
                    className="item-notes"
                    type="text"
                    value={item.recomendaciones}
                    placeholder="Notas / recomendaciones"
                    aria-label="Notas o recomendaciones"
                    onChange={(event) =>
                      updateItem(item.key, {
                        recomendaciones: event.target.value,
                      })
                    }
                  />
                  <span className="item-subtotal">{money(subtotal)}</span>
                  <button
                    className="item-remove"
                    type="button"
                    aria-label="Quitar producto"
                    onClick={() => removeItem(item.key)}
                  >
                    ✕
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="catalog-box">
          <label className="field">
            <span>Agregar producto</span>
            <input
              className="input"
              type="search"
              placeholder="Buscar por nombre o categoría…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <div className="catalog-list">
            {products.length === 0 ? (
              <span className="subtle">
                No se pudieron cargar productos. Revisa el catálogo o la
                conexión.
              </span>
            ) : filteredProducts.length === 0 ? (
              <span className="subtle">
                No hay productos que coincidan con la búsqueda.
              </span>
            ) : (
              filteredProducts.map((product) => {
                const stock =
                  typeof product.stock === 'number'
                    ? ` · ${product.stock} und.`
                    : '';

                return (
                  <button
                    className="catalog-item"
                    type="button"
                    key={product._id}
                    onClick={() => addProduct(product)}
                  >
                    <strong>{product.name}</strong>
                    <small>
                      {money(product.price)}
                      {stock}
                    </small>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="order-total">
          <span>Total</span>
          <strong>{money(total)}</strong>
        </div>

        <Alert message={error} />
      </form>
    </Modal>
  );
}
