import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { getApiBase } from '../config/api';
import { ServerSettingsModal } from './ServerSettingsModal';

export function AppLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [serverOpen, setServerOpen] = useState(false);
  const [apiBase] = useState(() => getApiBase());

  const serverLabel = apiBase.replace(/^https?:\/\//, '');

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <header className="topbar">
        <Link className="brand" to="/productos" aria-label="Ir a productos">
          <span className="brand-mark">GB</span>
          <span className="brand-text">
            GranBar <small>Admin</small>
          </span>
        </Link>

        <nav className="nav-links" aria-label="Secciones">
          <NavLink
            to="/productos"
            className={({ isActive }) => (isActive ? 'active' : undefined)}
          >
            Productos
          </NavLink>
          <NavLink
            to="/caja"
            className={({ isActive }) => (isActive ? 'active' : undefined)}
          >
            Caja
          </NavLink>
          <NavLink
            to="/cierre"
            className={({ isActive }) => (isActive ? 'active' : undefined)}
          >
            Cierre caja
          </NavLink>
        </nav>

        <div className="nav-actions">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            title="Cambiar la URL del backend"
            onClick={() => setServerOpen(true)}
          >
            Servidor: <strong id="serverLabel">{serverLabel}</strong>
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleLogout}
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="page">
        <Outlet />
      </main>

      {serverOpen ? (
        <ServerSettingsModal
          onClose={() => setServerOpen(false)}
          onSaved={() => window.location.reload()}
        />
      ) : null}
    </>
  );
}
