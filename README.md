# GranBar BQD · Panel de administración web

Frontend web independiente para administrar el restaurante usando el backend de
la app móvil (`AppMovilBackend`). No requiere build ni dependencias: son archivos
estáticos HTML, CSS y JavaScript.

Incluye las mismas funciones del panel de administración de la app móvil:

- **Productos:** listar, buscar, crear, editar y eliminar; alertas de stock bajo.
- **Caja:** órdenes por fecha, totales por método de pago, crear factura manual,
  editar/cobrar, imprimir factura, reimprimir comanda y eliminar.
- **Cierre de caja:** historial de cierres, cierre del día y reportes PDF diario
  y mensual.

## Cómo ejecutarlo

No abras `index.html` con doble clic: los módulos y `fetch` necesitan un servidor
HTTP. Desde la carpeta del proyecto:

```powershell
cd AppMovilAdminWeb
py -m http.server 5500
```

También sirve:

```powershell
python -m http.server 5500
```

Abre <http://localhost:5500> y entra con el código de caja o administrador
configurado en la base de datos.

> El backend ya permite CORS desde `http://localhost:5500` y
> `http://127.0.0.1:5500`.

## Backend

El panel guarda la URL del backend en `localStorage`. Por defecto usa:

```
https://granbar-bq.onrender.com
```

Ese es el backend que ya consume la app móvil y tiene los datos reales. Desde el
botón **Servidor** (arriba a la derecha, o en el pie del login) puedes cambiarlo:

| Opción | URL | Uso |
| --- | --- | --- |
| Backend de la app móvil | `https://granbar-bq.onrender.com` | Datos reales (por defecto) |
| AppMovilBackend en Render | `https://granbarbqd.onrender.com` | Requiere que esa instancia apunte a la base real |
| AppMovilBackend local | `http://localhost:4000` | Desarrollo local |

### Backend local

```powershell
cd AppMovilBackend
npm install
npm start
```

El `.env` local debe tener, como mínimo:

```env
MONGO_URI=...
JWT_SECRET=...
MONGO_DB=restaurante
PORT=4000
```

`MONGO_DB` es opcional; si se define, Mongoose usa esa base de datos aunque la
URI apunte a otra. Para ver los mismos datos del restaurante usa
`MONGO_DB=restaurante`.

### Render

Si publicas este frontend en otro dominio, agrega ese origen a `FRONTEND_ORIGINS`
en el servicio del backend (lista separada por comas). Por ejemplo:

```env
FRONTEND_ORIGINS=https://mi-panel.onrender.com
MONGO_DB=restaurante
```

El backend también acepta `http://localhost:5500` y `http://127.0.0.1:5500`
para desarrollo.

## Estructura

```
AppMovilAdminWeb/
├── index.html              # Login
├── admin.html              # Productos
├── caja.html               # Caja / facturas / cierre
├── cierre_caja.html        # Historial y reportes
├── css/styles.css
└── js/
    ├── config.js           # URL del backend y presets
    ├── ui.js               # Sesión, API, formato, navegación, modales
    ├── login.js
    ├── products.js
    ├── caja.js
    └── cierre.js
```

## Endpoints usados

- `POST /api/auth/login`
- `GET/POST/PUT/DELETE /api/productos`
- `GET /api/ordenes/por-fecha/:fecha`
- `POST /api/ordenes` y `PUT /api/ordenes/:id`
- `DELETE /api/ordenes/:id`
- `PATCH /api/ordenes/:id/imprimir-factura`
- `POST /api/ordenes/cerrar-caja`
- `GET /api/cajas`
- `GET /api/cajas/reporte/diario?fecha=YYYY-MM-DD`
- `GET /api/cajas/reporte/mensual?year=YYYY&month=MM`

## Notas

- La creación de facturas usa `POST /api/ordenes` y luego `PUT /api/ordenes/:id`
  porque el POST del backend siempre guarda la fecha de hoy y el método
  `efectivo`; el PUT fija la fecha y el método elegidos.
- Los reportes PDF se abren en una pestaña nueva. Si el navegador bloquea
  ventanas emergentes, permite las ventanas para este sitio.
- El token se guarda en `localStorage`; usa el panel bajo HTTPS en producción.
- Este frontend es independiente y no modifica el frontend existente en
  `RestauranteFire/frontend`.
