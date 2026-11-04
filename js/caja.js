import {
  apiFetch,
  closeDialog,
  escapeHtml,
  formatHora,
  hideAlert,
  isISODate,
  money,
  mountNav,
  openDialog,
  requireAuth,
  showAlert,
  statusBadge,
  todayISO,
} from './ui.js';

requireAuth();
mountNav('caja');

const $ = (id) => document.getElementById(id);

const fechaInput = $('fecha');
const fechaHint = $('fechaHint');
const ordersBody = $('ordersBody');
const empty = $('empty');
const summary = $('summary');
const methodBreakdown = $('methodBreakdown');
const pageAlert = $('pageAlert');

const newInvoiceBtn = $('newInvoiceBtn');
const closeCajaBtn = $('closeCajaBtn');
const prevDay = $('prevDay');
const nextDay = $('nextDay');
const todayBtn = $('todayBtn');
const refreshBtn = $('refreshBtn');

const orderDialog = $('orderDialog');
const orderForm = $('orderForm');
const orderDialogTitle = $('orderDialogTitle');
const orderDialogSubtitle = $('orderDialogSubtitle');
const ofMesa = $('ofMesa');
const ofFecha = $('ofFecha');
const ofMetodo = $('ofMetodo');
const ofSearch = $('ofSearch');
const ofCatalog = $('ofCatalog');
const ofItems = $('ofItems');
const ofCount = $('ofCount');
const ofTotal = $('ofTotal');
const ofError = $('ofError');
const ofSave = $('ofSave');

const closeResultDialog = $('closeResultDialog');
const closeTotal = $('closeTotal');
const closeOrders = $('closeOrders');

const METHODS = ['efectivo', 'tarjeta', 'transferencia', 'nequi', 'daviplata'];
const METHOD_LABELS = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
};

let orders = [];
let products = [];
let currentDate = todayISO();
let loadToken = 0;
let formState = null;
let saving = false;
let pageAlertTimer = null;

function newKey(prefix = 'item') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function shiftDate(iso, delta) {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + delta);
  return todayISO(date);
}

function flashPageAlert(message, type = 'success', timeout = 6000) {
  showAlert(pageAlert, message, type);
  window.clearTimeout(pageAlertTimer);
  pageAlertTimer = window.setTimeout(() => hideAlert(pageAlert), timeout);
}

function updateFechaHint() {
  fechaHint.textContent =
    currentDate === todayISO() ? 'Hoy' : 'Consultando histórico';
}

function setFecha(value) {
  if (!isISODate(value)) {
    fechaInput.value = currentDate;
    return;
  }

  currentDate = value;
  fechaInput.value = value;
  updateFechaHint();

  try {
    const url = new URL(window.location.href);
    url.searchParams.set('fecha', value);
    window.history.replaceState(null, '', url);
  } catch {
    // Si el navegador no permite history (por ejemplo file://), no es crítico.
  }

  load();
}

function totalesPorMetodo(lista) {
  const totals = Object.fromEntries(METHODS.map((method) => [method, 0]));

  lista.forEach((order) => {
    const method = String(order.metodoPago || 'efectivo').toLowerCase();
    if (totals[method] !== undefined) {
      totals[method] += Number(order.total) || 0;
    }
  });

  return totals;
}

function renderSummary() {
  const total = orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
  const promedio = orders.length ? Math.round(total / orders.length) : 0;
  const comandas = orders.filter((order) =>
    ['pending_print', 'printing', 'printed'].includes(String(order.status))
  ).length;
  const facturas = orders.filter((order) =>
    ['pending_ticket', 'ticket_printed'].includes(String(order.status))
  ).length;

  summary.innerHTML = `
    <div class="summary-card primary">
      <div class="summary-label">Total del día</div>
      <div class="summary-value">${money(total)}</div>
      <div class="summary-caption">${orders.length} orden(es)</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Promedio</div>
      <div class="summary-value">${money(promedio)}</div>
      <div class="summary-caption">por orden</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Comandas</div>
      <div class="summary-value">${comandas}</div>
      <div class="summary-caption">en cola o impresas</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Facturas</div>
      <div class="summary-value">${facturas}</div>
      <div class="summary-caption">solicitadas o impresas</div>
    </div>
  `;

  const totals = totalesPorMetodo(orders);
  methodBreakdown.innerHTML = METHODS.map(
    (method) => `
      <div class="method-item">
        <span>${METHOD_LABELS[method]}</span>
        <strong>${money(totals[method])}</strong>
      </div>
    `
  ).join('');
}

function renderOrders() {
  ordersBody.innerHTML = orders
    .map((order) => {
      const items = (order.items || [])
        .map(
          (item) => `
            <div class="order-line">
              ${escapeHtml(item.cantidad)}× ${escapeHtml(item.nombre)}
              ${
                item.recomendaciones
                  ? `<span class="order-note">· ${escapeHtml(
                      item.recomendaciones
                    )}</span>`
                  : ''
              }
            </div>
          `
        )
        .join('');

      const id = escapeHtml(order._id);

      return `
        <tr>
          <td>
            <span class="cell-title">Mesa ${escapeHtml(order.mesa || 'N/A')}</span>
            <span class="cell-sub">#${escapeHtml(String(order._id).slice(-6))}</span>
          </td>
          <td>${formatHora(order.createdAt)}</td>
          <td style="text-transform: capitalize">${escapeHtml(
            order.metodoPago || 'efectivo'
          )}</td>
          <td><div class="order-items">${
            items || '<span class="cell-sub">Sin productos</span>'
          }</div></td>
          <td><strong>${money(order.total)}</strong></td>
          <td>${statusBadge(order.status)}</td>
          <td>
            <div class="actions-cell">
              <button class="btn btn-accent btn-sm" type="button" data-action="invoice" data-id="${id}">
                Factura
              </button>
              <button class="btn btn-ghost btn-sm" type="button" data-action="comanda" data-id="${id}">
                Comanda
              </button>
              <button class="btn btn-ghost btn-sm" type="button" data-action="edit" data-id="${id}">
                Cobrar / editar
              </button>
              <button class="btn btn-danger btn-sm" type="button" data-action="delete" data-id="${id}">
                Borrar
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');

  empty.classList.toggle('hidden', orders.length !== 0);
}

function render() {
  renderSummary();
  renderOrders();
}

async function load({ silent = false } = {}) {
  const token = ++loadToken;

  if (!silent) {
    hideAlert(pageAlert);
    ordersBody.innerHTML = `<tr><td colspan="7"><span class="loading"><span class="spinner"></span> Cargando órdenes…</span></td></tr>`;
    empty.classList.add('hidden');
  }

  try {
    const data = await apiFetch(
      `/api/ordenes/por-fecha/${encodeURIComponent(currentDate)}`
    );
    if (token !== loadToken) return;
    orders = Array.isArray(data) ? data : [];
    render();
  } catch (error) {
    if (token !== loadToken) return;
    if (silent) return;
    orders = [];
    render();
    showAlert(
      pageAlert,
      error?.message || 'No se pudieron cargar las órdenes del día.'
    );
  }
}

async function loadProducts() {
  try {
    const data = await apiFetch('/api/productos');
    products = Array.isArray(data) ? data : data?.productos || [];
  } catch {
    products = [];
  }

  if (orderDialog.open) renderCatalog();
}

/* ============================
   Acciones sobre órdenes
   ============================ */

async function imprimirFactura(order) {
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
    flashPageAlert('Factura enviada a impresión.');
    await load({ silent: true });
  } catch (error) {
    showAlert(pageAlert, error?.message || 'No se pudo imprimir la factura.');
  }
}

async function reimprimirComanda(order) {
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
      body: JSON.stringify({ status: 'pending_print', errorMsg: '' }),
    });
    flashPageAlert('Comanda enviada de nuevo a la cola de impresión.');
    await load({ silent: true });
  } catch (error) {
    showAlert(pageAlert, error?.message || 'No se pudo reimprimir la comanda.');
  }
}

async function eliminarOrden(order) {
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
    flashPageAlert('Orden eliminada correctamente.');
    await load({ silent: true });
  } catch (error) {
    showAlert(pageAlert, error?.message || 'No se pudo eliminar la orden.');
  }
}

ordersBody.addEventListener('click', (event) => {
  const button = event.target.closest?.('button[data-action]');
  if (!button) return;

  const order = orders.find((item) => item._id === button.dataset.id);
  if (!order) return;

  const action = button.dataset.action;
  if (action === 'invoice') imprimirFactura(order);
  if (action === 'comanda') reimprimirComanda(order);
  if (action === 'edit') openEdit(order);
  if (action === 'delete') eliminarOrden(order);
});

/* ============================
   Formulario de factura / orden
   ============================ */

function renderCatalog() {
  const query = ofSearch.value.trim().toLowerCase();
  const filtered = products.filter((product) => {
    if (!query) return true;
    return (
      String(product.name || '').toLowerCase().includes(query) ||
      String(product.category || '').toLowerCase().includes(query)
    );
  });

  if (products.length === 0) {
    ofCatalog.innerHTML =
      '<span class="subtle">No se pudieron cargar productos. Revisa el catálogo o la conexión.</span>';
    return;
  }

  if (filtered.length === 0) {
    ofCatalog.innerHTML =
      '<span class="subtle">No hay productos que coincidan con la búsqueda.</span>';
    return;
  }

  ofCatalog.innerHTML = filtered
    .map((product) => {
      const stock =
        typeof product.stock === 'number' ? ` · ${product.stock} und.` : '';
      return `
        <button class="catalog-item" type="button" data-product-id="${escapeHtml(
          product._id
        )}">
          <strong>${escapeHtml(product.name)}</strong>
          <small>${money(product.price)}${escapeHtml(stock)}</small>
        </button>
      `;
    })
    .join('');
}

function itemRow(item) {
  const subtotal = (Number(item.cantidad) || 0) * (Number(item.precio) || 0);

  return `
    <div class="item-editor" data-key="${escapeHtml(item.key)}">
      <input
        class="item-name"
        data-field="nombre"
        value="${escapeHtml(item.nombre)}"
        placeholder="Producto"
      />
      <input
        data-field="cantidad"
        type="number"
        min="1"
        step="1"
        value="${escapeHtml(item.cantidad)}"
        aria-label="Cantidad"
      />
      <input
        data-field="precio"
        type="number"
        min="0"
        step="1"
        value="${escapeHtml(item.precio)}"
        aria-label="Precio"
      />
      <input
        class="item-notes"
        data-field="recomendaciones"
        value="${escapeHtml(item.recomendaciones || '')}"
        placeholder="Notas / recomendaciones"
      />
      <span class="item-subtotal">${money(subtotal)}</span>
      <button class="item-remove" type="button" data-remove aria-label="Quitar producto">
        ✕
      </button>
    </div>
  `;
}

function updateTotal() {
  if (!formState) return;
  const total = formState.items.reduce(
    (sum, item) =>
      sum + (Number(item.cantidad) || 0) * (Number(item.precio) || 0),
    0
  );
  ofTotal.textContent = money(total);
}

function renderForm() {
  if (!formState) return;

  ofMesa.value = formState.mesa;
  ofFecha.value = formState.fecha;
  ofMetodo.value = formState.metodo;

  ofCount.textContent = `${formState.items.length} ítem(s)`;
  ofItems.innerHTML = formState.items.length
    ? formState.items.map(itemRow).join('')
    : '<div class="empty-items">Agrega productos desde el catálogo de abajo.</div>';

  ofSave.textContent =
    formState.mode === 'edit' ? 'Guardar cambios' : 'Crear factura';

  updateTotal();
  renderCatalog();
}

function addProductToOrder(product) {
  if (!formState) return;

  const productId = product._id;
  const existing = formState.items.find(
    (item) => item.productId && item.productId === productId
  );

  if (existing) {
    existing.cantidad = (Number(existing.cantidad) || 0) + 1;
  } else {
    formState.items.push({
      key: newKey('item'),
      productId,
      tipo: product.category || '',
      nombre: product.name || 'Producto',
      cantidad: 1,
      precio: Number(product.price) || 0,
      recomendaciones: '',
    });
  }

  renderForm();
}

async function openCreate() {
  if (products.length === 0) await loadProducts();

  formState = {
    mode: 'create',
    orderId: null,
    mesa: '',
    fecha: currentDate,
    metodo: 'efectivo',
    items: [],
  };

  orderDialogTitle.textContent = 'Nueva factura';
  orderDialogSubtitle.textContent =
    'Registra una venta manual y asigna fecha, mesa y método de pago.';
  ofSearch.value = '';
  hideAlert(ofError);
  renderForm();
  openDialog(orderDialog);
  ofMesa.focus();
}

async function openEdit(order) {
  if (products.length === 0) await loadProducts();

  formState = {
    mode: 'edit',
    orderId: order._id,
    mesa: order.mesa || '',
    fecha: String(order.fecha || currentDate).split('T')[0],
    metodo: String(order.metodoPago || 'efectivo').toLowerCase(),
    items: (order.items || []).map((item) => ({
      key: newKey('item'),
      productId: item.productId,
      tipo: item.tipo,
      nombre: item.nombre || '',
      cantidad: Number(item.cantidad) || 1,
      precio: Number(item.precio) || 0,
      recomendaciones: item.recomendaciones || '',
    })),
  };

  orderDialogTitle.textContent = 'Editar / cobrar orden';
  orderDialogSubtitle.textContent = `Mesa ${order.mesa || 'N/A'} · #${String(
    order._id
  ).slice(-6)}`;
  ofSearch.value = '';
  hideAlert(ofError);
  renderForm();
  openDialog(orderDialog);
  ofMesa.focus();
}

function closeOrderForm() {
  closeDialog(orderDialog);
  formState = null;
  saving = false;
  hideAlert(ofError);
}

ofItems.addEventListener('input', (event) => {
  if (!formState) return;

  const row = event.target.closest?.('.item-editor');
  if (!row) return;

  const item = formState.items.find((entry) => entry.key === row.dataset.key);
  if (!item) return;

  const field = event.target.dataset.field;
  if (!field) return;

  if (field === 'cantidad' || field === 'precio') {
    item[field] = Number(event.target.value) || 0;
  } else {
    item[field] = event.target.value;
  }

  const subtotal = row.querySelector('.item-subtotal');
  if (subtotal) {
    subtotal.textContent = money(
      (Number(item.cantidad) || 0) * (Number(item.precio) || 0)
    );
  }

  updateTotal();
});

ofItems.addEventListener('click', (event) => {
  const remove = event.target.closest?.('[data-remove]');
  if (!remove || !formState) return;

  const row = remove.closest('.item-editor');
  if (!row) return;

  formState.items = formState.items.filter(
    (item) => item.key !== row.dataset.key
  );
  renderForm();
});

ofCatalog.addEventListener('click', (event) => {
  const button = event.target.closest?.('button[data-product-id]');
  if (!button) return;

  const product = products.find(
    (item) => item._id === button.dataset.productId
  );
  if (product) addProductToOrder(product);
});

ofSearch.addEventListener('input', renderCatalog);

async function saveOrder(event) {
  event.preventDefault();
  if (!formState || saving) return;

  hideAlert(ofError);

  const mesa = ofMesa.value.trim();
  const fecha = ofFecha.value;
  const metodo = ofMetodo.value;

  if (!mesa) {
    showAlert(ofError, 'Escribe la mesa de la orden.');
    ofMesa.focus();
    return;
  }

  if (!isISODate(fecha)) {
    showAlert(ofError, 'La fecha debe ser válida (AAAA-MM-DD).');
    ofFecha.focus();
    return;
  }

  const cleanItems = formState.items
    .map((item) => ({
      productId: item.productId,
      tipo: item.tipo,
      nombre: String(item.nombre || '').trim(),
      cantidad: Number(item.cantidad) || 0,
      precio: Number(item.precio) || 0,
      recomendaciones: String(item.recomendaciones || '').trim(),
    }))
    .filter((item) => item.nombre && item.cantidad > 0 && item.precio >= 0);

  if (cleanItems.length === 0) {
    showAlert(ofError, 'Agrega al menos un producto con cantidad mayor a cero.');
    return;
  }

  const total = cleanItems.reduce(
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

  const itemsForPost = cleanItems.map((item) => ({
    _id: item.productId,
    productId: item.productId,
    tipo: item.tipo,
    nombre: item.nombre,
    cantidad: item.cantidad,
    precio: item.precio,
    recomendaciones: item.recomendaciones,
  }));

  const mode = formState.mode;
  const orderId = formState.orderId;

  saving = true;
  ofSave.disabled = true;
  ofSave.textContent = 'Guardando…';

  let createdId = null;
  let stockAlerts = null;

  try {
    if (mode === 'create') {
      const created = await apiFetch('/api/ordenes', {
        method: 'POST',
        body: JSON.stringify({ mesa, metodoPago: metodo, items: itemsForPost }),
      });

      createdId = created?.orden?._id || created?._id;
      stockAlerts = created?.alertasStockBajo;
      if (!createdId) {
        throw new Error('El servidor no devolvió la orden creada.');
      }

      await apiFetch(`/api/ordenes/${createdId}`, {
        method: 'PUT',
        body: JSON.stringify({
          mesa,
          fecha,
          metodoPago: metodo,
          items: itemsForPut,
          total,
        }),
      });
    } else {
      await apiFetch(`/api/ordenes/${orderId}`, {
        method: 'PUT',
        body: JSON.stringify({
          mesa,
          fecha,
          metodoPago: metodo,
          items: itemsForPut,
          total,
        }),
      });
    }

    closeOrderForm();
    await load({ silent: true });

    const baseMessage =
      mode === 'edit'
        ? 'Orden actualizada correctamente.'
        : 'Factura creada correctamente.';
    const alertMessage =
      Array.isArray(stockAlerts) && stockAlerts.length
        ? ` Stock bajo: ${stockAlerts
            .map((alert) => alert.nombre)
            .join(', ')}.`
        : '';

    flashPageAlert(`${baseMessage}${alertMessage}`, 'success', 8000);
  } catch (error) {
    if (createdId) {
      // La orden ya existe: pasamos el formulario a edición para que un
      // segundo intento actualice esa orden en vez de duplicarla.
      if (formState) {
        formState.mode = 'edit';
        formState.orderId = createdId;
      }
      if (orderDialogTitle) orderDialogTitle.textContent = 'Editar / cobrar orden';
      if (orderDialogSubtitle) {
        orderDialogSubtitle.textContent = `Orden creada · #${String(
          createdId
        ).slice(-6)}`;
      }

      showAlert(
        ofError,
        `La orden se creó, pero no se pudo fijar la fecha o el método de pago: ${
          error?.message || 'error desconocido'
        }. Corrige los datos y vuelve a guardar para actualizarla.`
      );
      await load({ silent: true });
    } else {
      showAlert(ofError, error?.message || 'No se pudo guardar la orden.');
    }
  } finally {
    saving = false;
    if (ofSave) {
      ofSave.disabled = false;
      ofSave.textContent =
        formState?.mode === 'edit' ? 'Guardar cambios' : 'Crear factura';
    }
  }
}

orderForm.addEventListener('submit', saveOrder);
newInvoiceBtn.addEventListener('click', openCreate);

orderDialog.querySelectorAll('[data-close]').forEach((button) => {
  button.addEventListener('click', closeOrderForm);
});

orderDialog.addEventListener('click', (event) => {
  if (event.target === orderDialog) closeOrderForm();
});

/* ============================
   Cierre de caja
   ============================ */

async function cerrarCaja() {
  if (orders.length === 0) {
    flashPageAlert(
      'No hay órdenes registradas para la fecha seleccionada.',
      'warn'
    );
    return;
  }

  const total = orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);

  if (
    !window.confirm(
      `¿Cerrar la caja de ${currentDate}?\n\nSe guardarán ${orders.length} orden(es) y un total de ${money(
        total
      )}.`
    )
  ) {
    return;
  }

  closeCajaBtn.disabled = true;
  closeCajaBtn.textContent = 'Cerrando…';

  try {
    const data = await apiFetch('/api/ordenes/cerrar-caja', {
      method: 'POST',
      body: JSON.stringify({ fecha: currentDate }),
    });

    const caja = data?.caja || {};
    closeTotal.textContent = money(caja.totalDia ?? total);
    closeOrders.textContent = String(caja.cantidadOrdenes ?? orders.length);
    openDialog(closeResultDialog);
    flashPageAlert('Caja cerrada correctamente.', 'success');
  } catch (error) {
    showAlert(pageAlert, error?.message || 'No se pudo cerrar la caja.');
  } finally {
    closeCajaBtn.disabled = false;
    closeCajaBtn.textContent = 'Cerrar caja';
  }
}

closeCajaBtn.addEventListener('click', cerrarCaja);

closeResultDialog.querySelectorAll('[data-close]').forEach((button) => {
  button.addEventListener('click', () => closeDialog(closeResultDialog));
});

closeResultDialog.addEventListener('click', (event) => {
  if (event.target === closeResultDialog) closeDialog(closeResultDialog);
});

/* ============================
   Fecha, actualización y arranque
   ============================ */

fechaInput.addEventListener('change', () => setFecha(fechaInput.value));
prevDay.addEventListener('click', () => setFecha(shiftDate(currentDate, -1)));
nextDay.addEventListener('click', () => setFecha(shiftDate(currentDate, 1)));
todayBtn.addEventListener('click', () => setFecha(todayISO()));
refreshBtn.addEventListener('click', () => load());

const params = new URLSearchParams(window.location.search);
const fechaUrl = params.get('fecha');
currentDate = isISODate(fechaUrl) ? fechaUrl : todayISO();
fechaInput.value = currentDate;
updateFechaHint();

load();
loadProducts();

// Auto-refresco suave: no interrumpe si hay un modal abierto o se está guardando.
window.setInterval(() => {
  if (saving) return;
  if (document.querySelector('dialog[open]')) return;
  load({ silent: true });
}, 15000);
