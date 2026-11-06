import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

export default function NotFoundPage() {
  const { isAuthenticated } = useAuth();
  const home = isAuthenticated ? '/productos' : '/login';

  return (
    <main className="page" style={{ maxWidth: 680, paddingTop: 72 }}>
      <section className="card card-pad" style={{ textAlign: 'center' }}>
        <div
          style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}
        >
          <div
            className="brand-mark"
            style={{ width: 56, height: 56, fontSize: 18 }}
          >
            GB
          </div>
        </div>
        <p className="eyebrow">Error 404</p>
        <h1
          style={{
            margin: '0 0 8px',
            fontSize: 'clamp(28px, 6vw, 38px)',
            letterSpacing: '-0.03em',
          }}
        >
          Página no encontrada
        </h1>
        <p className="subtle">La dirección no existe o cambió de lugar.</p>
        <p style={{ margin: '24px 0 0' }}>
          <Link className="btn btn-primary" to={home}>
            Volver al inicio
          </Link>
        </p>
      </section>
    </main>
  );
}
