import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { PublicOnly, RequireAuth } from './auth/routeGuards';
import { useAuth } from './auth/useAuth';
import { AppLayout } from './components/AppLayout';
import { PageFallback } from './components/PageFallback';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const CajaPage = lazy(() => import('./pages/CajaPage'));
const CierrePage = lazy(() => import('./pages/CierrePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function RootRedirect() {
  const { isAuthenticated } = useAuth();
  return (
    <Navigate to={isAuthenticated ? '/productos' : '/login'} replace />
  );
}

function LegacyCajaRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/caja${search}`} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<RootRedirect />} />

          <Route element={<PublicOnly />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route path="/productos" element={<ProductsPage />} />
              <Route path="/caja" element={<CajaPage />} />
              <Route path="/cierre" element={<CierrePage />} />
            </Route>
          </Route>

          {/* Compatibilidad con las URLs de la versión estática anterior. */}
          <Route path="/index.html" element={<Navigate to="/login" replace />} />
          <Route
            path="/admin.html"
            element={<Navigate to="/productos" replace />}
          />
          <Route path="/caja.html" element={<LegacyCajaRedirect />} />
          <Route
            path="/cierre_caja.html"
            element={<Navigate to="/cierre" replace />}
          />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
