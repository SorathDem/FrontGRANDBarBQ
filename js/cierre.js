import {
  apiFetch,
  escapeHtml,
  formatDate,
  hideAlert,
  isISODate,
  money,
  mountNav,
  requireAuth,
  showAlert,
  todayISO,
} from './ui.js';
import { reportDiarioUrl, reportMensualUrl } from './config.js';

requireAuth();
mountNav('cierre');

const $ = (id) => document.getElementById(id);

const summary = $('summary');
const body = $('cierreBody');
const empty = $('empty');
const cierreCount = $('cierreCount');
const pageAlert = $('pageAlert');
const refreshBtn = $('refreshBtn');
const fechaDiaria = $('fechaDiaria');
const mesMensual = $('mesMensual');
const btnDiario = $('btnDiario');
const btnMensual = $('btnMensual');

let cierres = [];
let loadToken = 0;

function fechaCorta(value) {
  return String(value || '').split('T')[0];
}

function render() {
  const total = cierres.reduce(
    (sum, cierre) => sum + (Number(cierre.totalDia) || 0),
    0
  );
  const ordenes = cierres.reduce(
    (sum, cierre) => sum + (Number(cierre.cantidadOrdenes) || 0),
    0
  );
  const promedio = cierres.length ? Math.round(total / cierres.length) : 0;

  summary.innerHTML = `
    <div class="summary-card primary">
      <div class="summary-label">Total histórico</div>
      <div class="summary-value">${money(total)}</div>
      <div class="summary-caption">${cierres.length} cierre(s)</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Cierres</div>
      <div class="summary-value">${cierres.length}</div>
      <div class="summary-caption">días cerrados</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Órdenes</div>
      <div class="summary-value">${ordenes}</div>
      <div class="summary-caption">en cierres guardados</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Promedio</div>
      <div class="summary-value">${money(promedio)}</div>
      <div class="summary-caption">por cierre</div>
    </div>
  `;

  cierreCount.textContent = `${cierres.length} cierre(s)`;

  body.innerHTML = cierres
    .map((cierre) => {
      const fecha = fechaCorta(cierre.fecha);
      return `
        <tr>
          <td>
            <span class="cell-title">${formatDate(fecha)}</span>
            <span class="cell-sub">${escapeHtml(fecha)}</span>
          </td>
          <td>${Number(cierre.cantidadOrdenes) || 0}</td>
          <td><strong>${money(cierre.totalDia)}</strong></td>
          <td>
            <div class="actions-cell">
              <a class="btn btn-ghost btn-sm" href="caja.html?fecha=${encodeURIComponent(
                fecha
              )}">Ver órdenes</a>
              <button class="btn btn-accent btn-sm" type="button" data-report="${escapeHtml(
                fecha
              )}">PDF del día</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');

  empty.classList.toggle('hidden', cierres.length !== 0);
}

async function load() {
  const token = ++loadToken;
  hideAlert(pageAlert);
  body.innerHTML = `<tr><td colspan="4"><span class="loading"><span class="spinner"></span> Cargando cierres…</span></td></tr>`;
  empty.classList.add('hidden');

  try {
    const data = await apiFetch('/api/cajas');
    if (token !== loadToken) return;
    cierres = Array.isArray(data) ? data : data?.cajas || [];
    cierres.sort((a, b) =>
      String(b.fecha || '').localeCompare(String(a.fecha || ''))
    );
    render();
  } catch (error) {
    if (token !== loadToken) return;
    cierres = [];
    render();
    showAlert(
      pageAlert,
      error?.message || 'No se pudieron cargar los cierres de caja.'
    );
  }
}

function abrirDiario() {
  const fecha = fechaDiaria.value;
  if (!isISODate(fecha)) {
    showAlert(pageAlert, 'Selecciona una fecha válida para el reporte diario.');
    fechaDiaria.focus();
    return;
  }

  window.open(reportDiarioUrl(fecha), '_blank', 'noopener');
}

function abrirMensual() {
  const value = mesMensual.value;
  if (!/^\d{4}-\d{2}$/.test(value)) {
    showAlert(pageAlert, 'Selecciona un mes válido para el reporte mensual.');
    mesMensual.focus();
    return;
  }

  const [year, month] = value.split('-');
  window.open(reportMensualUrl(year, month), '_blank', 'noopener');
}

body.addEventListener('click', (event) => {
  const button = event.target.closest?.('button[data-report]');
  if (!button) return;

  const fecha = button.dataset.report;
  if (!isISODate(fecha)) return;

  window.open(reportDiarioUrl(fecha), '_blank', 'noopener');
});

btnDiario.addEventListener('click', abrirDiario);
btnMensual.addEventListener('click', abrirMensual);
refreshBtn.addEventListener('click', load);

const hoy = todayISO();
fechaDiaria.value = hoy;
mesMensual.value = hoy.slice(0, 7);

load();
