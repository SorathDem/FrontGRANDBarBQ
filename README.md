# GranBar BQD · Panel de administración web

Frontend web independiente para administrar el restaurante usando el backend de
la app móvil (`AppMovilBackend`). Está construido con **React 19 + Vite +
TypeScript** y conserva las funciones del panel anterior:

- **Productos:** listar, buscar, crear, editar y eliminar; alertas de stock bajo.
- **Caja:** órdenes por fecha, totales por método de pago, crear factura manual,
  editar/cobrar, imprimir factura, reimprimir comanda y eliminar.
- **Cierre de caja:** historial de cierres, cierre del día y reportes PDF diario
  y mensual.
- **Sesión:** login con código de caja/administrador, rutas protegidas y cambio
  de servidor en runtime.

## Requisitos

- Node.js `22.12+` (el proyecto incluye `.node-version` para Render).
- npm `10+`.

## Cómo ejecutarlo

```powershell
cd AppMovilAdminWeb
npm install
npm run dev
```

Abre <http://localhost:5500> y entra con el código de caja o administrador
configurado en la base de datos.

El servidor de desarrollo usa el puerto `5500` a propósito: el backend ya permite
CORS desde `http://localhost:5500` y `http://127.0.0.1:5500`. Si cambias el
puerto, agrega el nuevo origen a `FRONTEND_ORIGINS` en el backend.

### Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con HMR en el puerto 5500 |
| `npm run build` | Verifica TypeScript y genera el sitio en `dist/` |
| `npm run preview` | Sirve localmente el build de `dist/` |
| `npm run lint` | Ejecuta ESLint sobre el código TypeScript/React |

## Backend

La URL del backend se guarda en `localStorage` y se puede cambiar sin rebuild
desde el botón **Servidor**. Por defecto usa:

```
https://granbar-bq.onrender.com
```

Ese es el backend que ya consume la app móvil y tiene los datos reales. Las
opciones precargadas son:

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

## Desplegar en Render

El proyecto se despliega como **Static Site** con build de Vite. El repositorio
incluye `render.yaml` en la raíz.

### Blueprint

1. En Render: **New > Blueprint**.
2. Conecta este repositorio y la rama `main`.
3. Render detecta `render.yaml` y crea el Static Site con:
   - **Build Command:** `npm ci && npm run build`
   - **Publish Directory:** `dist`
4. Espera el deploy y abre la URL `https://<servicio>.onrender.com`.

Con el nombre incluido en `render.yaml`, la URL sería
`https://granbar-admin-web.onrender.com` si está disponible. Si el nombre ya
está ocupado, cambia `name` en `render.yaml` antes de crear el Blueprint.

También puedes crearlo manualmente con **New > Static Site**:

| Campo | Valor |
| --- | --- |
| Branch | `main` |
| Build Command | `npm ci && npm run build` |
| Publish Directory | `dist` |
| Rewrite Rule | `/*` → `/index.html` |

La regla de rewrite es necesaria porque React Router usa rutas como
`/productos`, `/caja` y `/cierre`. El `render.yaml` ya la incluye.

### Variables del backend

Después de crear el sitio, agrega su URL a `FRONTEND_ORIGINS` en el servicio del
backend y vuelve a desplegar el backend:

```env
MONGO_DB=restaurante
FRONTEND_ORIGINS=https://mi-panel.onrender.com,http://localhost:5500,http://127.0.0.1:5500
```

`FRONTEND_ORIGINS` acepta varios orígenes separados por comas. Sin este paso, el
navegador bloqueará las peticiones al backend por CORS.

> El backend desplegado debe incluir el código que lee `FRONTEND_ORIGINS`. Si
> usas una versión anterior, actualiza el backend antes de probar el panel.

Si quieres otro backend por defecto, cambia `DEFAULT_API_BASE` en
`src/config/api.ts` antes de desplegar; también puedes cambiarlo en runtime desde
el botón **Servidor**.

## Estructura

```
AppMovilAdminWeb/
├── index.html                  # Entrada de Vite
├── public/
│   ├── favicon.svg
│   └── robots.txt
├── src/
│   ├── main.tsx                # Bootstrap de React
│   ├── App.tsx                 # Rutas y guards
│   ├── auth/                   # Sesión, login y rutas protegidas
│   ├── components/             # Layout, modales, alertas, tarjetas
│   ├── config/api.ts           # URL del backend y presets
│   ├── features/               # Formularios de productos y caja
│   ├── hooks/                  # Hooks compartidos (alertas)
│   ├── lib/                    # API, formato, sesión, estados
│   ├── pages/                  # Login, productos, caja, cierre, 404
│   ├── styles/styles.css       # Sistema visual responsive
│   └── types.ts                # Tipos de la API
├── render.yaml                 # Blueprint de Render (Static Site)
├── .node-version
├── .gitignore
├── eslint.config.js
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Rutas

| Ruta | Pantalla |
| --- | --- |
| `/login` | Ingreso con código de caja/administrador |
| `/productos` | Catálogo y stock |
| `/caja` | Órdenes, facturas y cierre del día |
| `/cierre` | Historial y reportes PDF |

Las URLs antiguas (`/index.html`, `/admin.html`, `/caja.html` y
`/cierre_caja.html`) redirigen a las rutas nuevas.

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
- La versión estática anterior quedó reemplazada por React. El historial de Git
  conserva esos archivos si necesitas consultarlos.
