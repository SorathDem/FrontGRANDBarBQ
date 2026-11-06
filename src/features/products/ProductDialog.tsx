import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { Alert } from '../../components/Alert';
import { Modal } from '../../components/Modal';
import { apiFetch, getErrorMessage } from '../../lib/api';
import type { Product } from '../../types';

interface ProductDialogProps {
  product: Product | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}

export function ProductDialog({
  product,
  onClose,
  onSaved,
}: ProductDialogProps) {
  const [name, setName] = useState(() => product?.name ?? '');
  const [category, setCategory] = useState(() => product?.category ?? '');
  const [price, setPrice] = useState(() =>
    product ? String(product.price ?? '') : ''
  );
  const [stock, setStock] = useState(() =>
    typeof product?.stock === 'number' ? String(product.stock) : ''
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const formId = useId();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;

    setError('');

    const trimmedName = name.trim();
    const numericPrice = Number(price);
    const numericStock = stock.trim() === '' ? 0 : Number(stock);

    if (!trimmedName) {
      setError('El nombre es obligatorio.');
      return;
    }
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      setError('El precio debe ser un número mayor o igual a cero.');
      return;
    }
    if (!Number.isFinite(numericStock) || numericStock < 0) {
      setError('El stock debe ser un número mayor o igual a cero.');
      return;
    }

    const payload = {
      name: trimmedName,
      price: numericPrice,
      stock: numericStock,
      category: category.trim(),
    };

    setSaving(true);
    try {
      if (product) {
        await apiFetch(`/api/productos/${product._id}`, {
          method: 'PUT',
          body: payload,
        });
      } else {
        await apiFetch('/api/productos', {
          method: 'POST',
          body: payload,
        });
      }

      setSaving(false);
      onSaved(
        product
          ? 'Producto actualizado correctamente.'
          : 'Producto creado correctamente.'
      );
    } catch (saveError) {
      setSaving(false);
      setError(getErrorMessage(saveError, 'No se pudo guardar el producto.'));
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={product ? 'Editar producto' : 'Nuevo producto'}
      subtitle={
        product
          ? 'Actualiza los datos del catálogo.'
          : 'Completa los datos para agregarlo al catálogo.'
      }
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
              : product
                ? 'Guardar cambios'
                : 'Crear producto'}
          </button>
        </>
      }
    >
      <form id={formId} className="modal-body" onSubmit={handleSubmit}>
        <div className="grid-2">
          <label className="field">
            <span>Nombre</span>
            <input
              className="input"
              type="text"
              placeholder="Ej. Hamburguesa clásica"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              autoFocus
            />
          </label>
          <label className="field">
            <span>Categoría</span>
            <input
              className="input"
              type="text"
              placeholder="Ej. Comidas"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Precio</span>
            <input
              className="input"
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Stock</span>
            <input
              className="input"
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={stock}
              onChange={(event) => setStock(event.target.value)}
            />
          </label>
        </div>

        <Alert message={error} className="form-error" />
      </form>
    </Modal>
  );
}
