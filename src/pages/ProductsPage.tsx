import { useEffect, useMemo, useState } from 'react';
import { Alert } from '../components/Alert';
import { apiFetch, getErrorMessage, wasAborted } from '../lib/api';
import { money } from '../lib/format';
import { useAlert } from '../hooks/useAlert';
import { ProductDialog } from '../features/products/ProductDialog';
import type { Product } from '../types';

function stockClass(stock: number | undefined): string {
  if (typeof stock !== 'number') return 'stock-muted';
  if (stock <= 5) return 'stock-danger';
  if (stock <= 10) return 'stock-warning';
  return 'stock-ok';
}

function stockLabel(stock: number | undefined): string {
  return typeof stock === 'number' ? `${stock} und.` : 'Sin dato';
}

function rowClass(stock: number | undefined): string {
  if (typeof stock !== 'number') return '';
  if (stock <= 5) return 'row-danger';
  if (stock <= 10) return 'row-warning';
  return '';
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const { alert, show, clear } = useAlert();

  useEffect(() => {
    const controller = new AbortController();

    apiFetch<Product[] | { productos?: Product[] }>('/api/productos', {
      signal: controller.signal,
    })
      .then((data) => {
        if (controller.signal.aborted) return;
        setProducts(Array.isArray(data) ? data : data?.productos ?? []);
      })
      .catch((error) => {
        if (controller.signal.aborted || wasAborted(error)) return;
        setProducts([]);
        show(
          getErrorMessage(error, 'No se pudieron cargar los productos.'),
          'error'
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [refreshKey, show]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;

    return products.filter(
      (product) =>
        String(product.name || '').toLowerCase().includes(query) ||
        String(product.category || '').toLowerCase().includes(query)
    );
  }, [products, search]);

  const lowStock = useMemo(
    () =>
      products.filter(
        (product) => typeof product.stock === 'number' && product.stock <= 5
      ),
    [products]
  );

  const lowStockMessage = useMemo(() => {
    if (lowStock.length === 0) return '';

    const names = lowStock
      .slice(0, 6)
      .map((product) => `${product.name} (${product.stock})`)
      .join(' · ');
    const rest =
      lowStock.length > 6 ? ` · y ${lowStock.length - 6} más` : '';
    return `⚠️ ${lowStock.length} producto(s) con stock bajo: ${names}${rest}`;
  }, [lowStock]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  const handleSaved = (message: string) => {
    closeDialog();
    setLoading(true);
    setRefreshKey((value) => value + 1);
    show(message, 'success');
  };

  const handleRefresh = () => {
    clear();
    setLoading(true);
    setRefreshKey((value) => value + 1);
  };

  const handleDelete = async (product: Product) => {
    const confirmed = window.confirm(
      `¿Eliminar "${product.name}"? Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    try {
      await apiFetch(`/api/productos/${product._id}`, { method: 'DELETE' });
      setLoading(true);
      setRefreshKey((value) => value + 1);
      show('Producto eliminado correctamente.', 'success');
    } catch (error) {
      show(
        getErrorMessage(error, 'No se pudo eliminar el producto.'),
        'error'
      );
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Panel de administración</p>
          <h1>Productos</h1>
          <p className="subtle">
            {loading
              ? 'Cargando catálogo…'
              : `${filtered.length} de ${products.length} producto(s)`}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" type="button" onClick={openCreate}>
            ＋ Nuevo producto
          </button>
        </div>
      </div>

      <Alert message={alert?.message} tone={alert?.tone} />
      <Alert message={lowStockMessage} tone="warn" />

      <div className="toolbar">
        <input
          className="input"
          type="search"
          placeholder="Buscar por nombre o categoría…"
          aria-label="Buscar productos"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button
          className="btn btn-ghost"
          type="button"
          onClick={handleRefresh}
        >
          Actualizar
        </button>
      </div>

      <section className="card table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Stock</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5}>
                    <span className="loading">
                      <span className="spinner" /> Cargando productos…
                    </span>
                  </td>
                </tr>
              ) : (
                filtered.map((product) => (
                  <tr key={product._id} className={rowClass(product.stock)}>
                    <td>
                      <span className="cell-title">{product.name}</span>
                      <span className="cell-sub">
                        #{String(product._id).slice(-6)}
                      </span>
                    </td>
                    <td>{product.category || '—'}</td>
                    <td>
                      <strong>{money(product.price)}</strong>
                    </td>
                    <td>
                      <span className={`stock-pill ${stockClass(product.stock)}`}>
                        {stockLabel(product.stock)}
                      </span>
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button
                          className="btn btn-ghost btn-sm"
                          type="button"
                          onClick={() => openEdit(product)}
                        >
                          Editar
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          type="button"
                          onClick={() => handleDelete(product)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length === 0 ? (
          <div className="empty">
            <strong>Sin productos</strong>
            <span>
              {products.length
                ? 'No hay coincidencias para tu búsqueda.'
                : 'Agrega el primer producto del catálogo.'}
            </span>
          </div>
        ) : null}
      </section>

      {dialogOpen ? (
        <ProductDialog
          product={editing}
          onClose={closeDialog}
          onSaved={handleSaved}
        />
      ) : null}
    </>
  );
}
