import {
  apiFetch,
  closeDialog,
  escapeHtml,
  hideAlert,
  money,
  mountNav,
  openDialog,
  requireAuth,
  showAlert,
} from './ui.js';

requireAuth();
mountNav('productos');

const body = document.getElementById('productBody');
const empty = document.getElementById('empty');
const emptyText = document.getElementById('emptyText');
const search = document.getElementById('search');
const lowStockBox = document.getElementById('lowStock');
const pageAlert = document.getElementById('pageAlert');
const productCount = document.getElementById('productCount');
const refreshBtn = document.getElementById('refreshBtn');

const dialog = document.getElementById('productDialog');
const form = document.getElementById('productForm');
const dialogTitle = document.getElementById('productDialogTitle');
const dialogSubtitle = document.getElementById('productDialogSubtitle');
const nameInput = document.getElementById('pName');
const categoryInput = document.getElementById('pCategory');
const priceInput = document.getElementById('pPrice');
const stockInput = document.getElementById('pStock');
const formError = document.getElementById('productError');
const saveBtn = document.getElementById('saveProductBtn');

let products = [];
let editing = null;
let loadToken = 0;

function stockClass(stock) {
  if (typeof stock !== 'number') return 'stock-muted';
  if (stock <= 5) return 'stock-danger';
  if (stock <= 10) return 'stock-warning';
  return 'stock-ok';
}

function stockLabel(stock) {
  return typeof stock === 'number' ? `${stock} und.` : 'Sin dato';
}

function render() {
  const query = search.value.trim().toLowerCase();
  const filtered = products.filter((product) => {
    if (!query) return true;
    return (
      String(product.name || '').toLowerCase().includes(query) ||
      String(product.category || '').toLowerCase().includes(query)
    );
  });

  const lowStock = products.filter(
    (product) => typeof product.stock === 'number' && product.stock <= 5
  );

  if (lowStock.length > 0) {
    const names = lowStock
      .slice(0, 6)
      .map((product) => `${product.name} (${product.stock})`)
      .join(' · ');
    lowStockBox.innerHTML = `<span><strong>⚠️ ${lowStock.length} producto(s) con stock bajo:</strong> ${escapeHtml(
      names
    )}${lowStock.length > 6 ? ` · y ${lowStock.length - 6} más` : ''}</span>`;
    lowStockBox.classList.remove('hidden');
  } else {
    lowStockBox.classList.add('hidden');
    lowStockBox.innerHTML = '';
  }

  productCount.textContent = `${filtered.length} de ${products.length} producto(s)`;

  body.innerHTML = filtered
    .map((product) => {
      const stock = product.stock;
      const rowClass =
        typeof stock === 'number' && stock <= 5
          ? 'row-danger'
          : typeof stock === 'number' && stock <= 10
          ? 'row-warning'
          : '';

      return `
        <tr class="${rowClass}">
          <td>
            <span class="cell-title">${escapeHtml(product.name)}</span>
            <span class="cell-sub">#${escapeHtml(String(product._id).slice(-6))}</span>
          </td>
          <td>${escapeHtml(product.category || '—')}</td>
          <td><strong>${money(product.price)}</strong></td>
          <td>
            <span class="stock-pill ${stockClass(stock)}">${stockLabel(stock)}</span>
          </td>
          <td>
            <div class="actions-cell">
              <button class="btn btn-ghost btn-sm" type="button" data-action="edit" data-id="${escapeHtml(
                product._id
              )}">Editar</button>
              <button class="btn btn-danger btn-sm" type="button" data-action="delete" data-id="${escapeHtml(
                product._id
              )}">Eliminar</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');

  const isEmpty = filtered.length === 0;
  empty.classList.toggle('hidden', !isEmpty);
  emptyText.textContent = products.length
    ? 'No hay coincidencias para tu búsqueda.'
    : 'Agrega el primer producto del catálogo.';
}

async function load() {
  const token = ++loadToken;
  hideAlert(pageAlert);
  body.innerHTML = `<tr><td colspan="5"><span class="loading"><span class="spinner"></span> Cargando productos…</span></td></tr>`;
  empty.classList.add('hidden');

  try {
    const data = await apiFetch('/api/productos');
    if (token !== loadToken) return;
    products = Array.isArray(data) ? data : data?.productos || [];
    render();
  } catch (error) {
    if (token !== loadToken) return;
    products = [];
    render();
    showAlert(pageAlert, error.message || 'No se pudieron cargar los productos.');
  }
}

function openCreate() {
  editing = null;
  dialogTitle.textContent = 'Nuevo producto';
  dialogSubtitle.textContent = 'Completa los datos para agregarlo al catálogo.';
  nameInput.value = '';
  categoryInput.value = '';
  priceInput.value = '';
  stockInput.value = '';
  saveBtn.textContent = 'Crear producto';
  hideAlert(formError);
  openDialog(dialog);
  nameInput.focus();
}

function openEdit(product) {
  editing = product;
  dialogTitle.textContent = 'Editar producto';
  dialogSubtitle.textContent = 'Actualiza los datos del catálogo.';
  nameInput.value = product.name || '';
  categoryInput.value = product.category || '';
  priceInput.value = Number(product.price ?? 0);
  stockInput.value =
    typeof product.stock === 'number' ? String(product.stock) : '';
  saveBtn.textContent = 'Guardar cambios';
  hideAlert(formError);
  openDialog(dialog);
  nameInput.focus();
}

async function saveProduct(event) {
  event.preventDefault();
  hideAlert(formError);

  const name = nameInput.value.trim();
  const price = Number(priceInput.value);
  const stock = stockInput.value.trim() === '' ? 0 : Number(stockInput.value);

  if (!name) {
    showAlert(formError, 'El nombre es obligatorio.');
    nameInput.focus();
    return;
  }
  if (!Number.isFinite(price) || price < 0) {
    showAlert(formError, 'El precio debe ser un número mayor o igual a cero.');
    priceInput.focus();
    return;
  }
  if (!Number.isFinite(stock) || stock < 0) {
    showAlert(formError, 'El stock debe ser un número mayor o igual a cero.');
    stockInput.focus();
    return;
  }

  const payload = {
    name,
    price,
    stock,
    category: categoryInput.value.trim(),
  };

  saveBtn.disabled = true;
  saveBtn.textContent = 'Guardando…';

  try {
    if (editing) {
      await apiFetch(`/api/productos/${editing._id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    } else {
      await apiFetch('/api/productos', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }

    closeDialog(dialog);
    await load();
    showAlert(
      pageAlert,
      editing ? 'Producto actualizado correctamente.' : 'Producto creado correctamente.',
      'success'
    );
  } catch (error) {
    showAlert(formError, error.message || 'No se pudo guardar el producto.');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = editing ? 'Guardar cambios' : 'Crear producto';
  }
}

async function deleteProduct(product) {
  const confirmed = window.confirm(
    `¿Eliminar "${product.name}"? Esta acción no se puede deshacer.`
  );
  if (!confirmed) return;

  try {
    await apiFetch(`/api/productos/${product._id}`, { method: 'DELETE' });
    await load();
    showAlert(pageAlert, 'Producto eliminado correctamente.', 'success');
  } catch (error) {
    showAlert(pageAlert, error.message || 'No se pudo eliminar el producto.');
  }
}

body.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const product = products.find((item) => item._id === button.dataset.id);
  if (!product) return;

  if (button.dataset.action === 'edit') openEdit(product);
  if (button.dataset.action === 'delete') deleteProduct(product);
});

search.addEventListener('input', render);
refreshBtn.addEventListener('click', load);
document.getElementById('addBtn').addEventListener('click', openCreate);
form.addEventListener('submit', saveProduct);

dialog.querySelectorAll('[data-close]').forEach((button) => {
  button.addEventListener('click', () => closeDialog(dialog));
});

dialog.addEventListener('click', (event) => {
  if (event.target === dialog) closeDialog(dialog);
});

load();
