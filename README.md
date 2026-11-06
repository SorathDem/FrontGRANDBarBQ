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

> El backend incluido ya permite CORS desde `http://localhost:5500` y
> `http://127.0.0.1:5500`. Si usas otro backend, agrega el origen en
> `FRONTEND_ORIGINS`.

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

### Desplegar en Render

Este frontend está preparado para desplegarse como **Static Site** en Render.
No tiene build ni variables de entorno de compilación: Render publica los
archivos tal como están.

El repositorio incluye `render.yaml` en la raíz. Si el repositorio es
`AppMovilAdminWeb` (recomendado), puedes crear el sitio como Blueprint:

1. En Render: **New > Blueprint**.
2. Conecta este repositorio y la rama `main`.
3. Render detecta `render.yaml` y crea el Static Site.
4. Espera el deploy y abre la URL `https://<servicio>.onrender.com`.

Con el nombre incluido en `render.yaml`, la URL sería
`https://granbar-admin-web.onrender.com` si está disponible. Si el nombre ya
está ocupado, cambia `name` en `render.yaml` antes de crear el Blueprint.

También puedes crearlo manualmente con **New > Static Site**:

| Campo | Valor |
| --- | --- |
| Branch | `main` |
| Build Command | *(vacío)* |
| Publish Directory | `.` |

Si `AppMovilAdminWeb` está dentro de un monorepo, configura
**Root Directory** = `AppMovilAdminWeb`, **Build Command** vacío y
**Publish Directory** = `.`. Si usas un `render.yaml` en la raíz del monorepo,
cambia `staticPublishPath` a `./AppMovilAdminWeb` o define
`rootDir: AppMovilAdminWeb`.

#### Variables del backend

Después de crear el sitio, agrega su URL a `FRONTEND_ORIGINS` en el servicio
del backend y vuelve a desplegar el backend:

```env
MONGO_DB=restaurante
FRONTEND_ORIGINS=https://mi-panel.onrender.com,http://localhost:5500,http://127.0.0.1:5500
```

`FRONTEND_ORIGINS` acepta varios orígenes separados por comas. Sin este paso,
el navegador bloqueará las peticiones al backend por CORS.

> El backend desplegado debe incluir el código que lee `FRONTEND_ORIGINS`. Si
> usas una versión anterior, actualiza el backend antes de probar el panel.

El frontend usa `https://granbar-bq.onrender.com` por defecto. Si quieres otro
backend por defecto, cambia `DEFAULT_API_BASE` en `js/config.js` antes de
desplegar; también puedes cambiarlo en runtime desde el botón **Servidor**.

#### Headers y archivos de despliegue

`render.yaml` aplica `Cache-Control: no-cache` y cabeceras de seguridad
(`X-Content-Type-Options`, `X-Frame-Options`, etc.). También se incluyen
`favicon.svg`, `robots.txt` y `404.html`.

La URL de Render usa HTTPS automáticamente. No necesitas configurar un dominio
personalizado para probar; puedes agregarlo después desde **Settings > Custom
Domains**.

## Estructura

```
AppMovilAdminWeb/
├── index.html              # Login
├── admin.html              # Productos
├── caja.html               # Caja / facturas / cierre
├── cierre_caja.html        # Historial y reportes
├── 404.html                # Página de error
├── favicon.svg
├── robots.txt
├── render.yaml             # Blueprint de Render (Static Site)
├── .gitignore
├── README.md
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
