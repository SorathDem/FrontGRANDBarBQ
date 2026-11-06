import { useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { Alert } from '../components/Alert';
import { ServerSettingsModal } from '../components/ServerSettingsModal';
import { getApiBase } from '../config/api';
import { getErrorMessage } from '../lib/api';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [serverOpen, setServerOpen] = useState(false);
  const [apiBase, setApiBase] = useState(() => getApiBase());

  const from = (location.state as { from?: string } | null)?.from;
  const serverLabel = apiBase.replace(/^https?:\/\//, '');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setError('Escribe tu código de acceso.');
      return;
    }

    setSubmitting(true);
    try {
      await login(trimmedCode);
      navigate(from || '/productos', { replace: true });
    } catch (loginError) {
      setError(
        getErrorMessage(loginError, 'No se pudo iniciar sesión. Intenta de nuevo.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-wrap">
        <div className="login-hero">
          <div className="brand-mark big">GB</div>
          <h1>GranBar BQD</h1>
          <p>
            Panel de administración para productos, caja, facturas y cierres del
            restaurante.
          </p>
          <ul>
            <li>Gestiona el catálogo y el stock</li>
            <li>Cobra, edita e imprime facturas</li>
            <li>Cierra la caja y descarga reportes PDF</li>
          </ul>
        </div>

        <div className="login-card">
          <h2>Ingresar</h2>
          <p>Usa tu código de acceso de caja o administración.</p>

          <form autoComplete="on" onSubmit={handleSubmit}>
            <label className="field">
              <span>Código de acceso</span>
              <input
                className="input"
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="••••"
                value={code}
                onChange={(event) => {
                  setCode(event.target.value);
                  if (error) setError('');
                }}
                required
                autoFocus
              />
            </label>

            <Alert message={error} />

            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Ingresando…' : 'Entrar al panel'}
            </button>
          </form>

          <div className="login-footer">
            <span>Servidor</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setServerOpen(true)}
            >
              <strong>{serverLabel}</strong>
            </button>
          </div>
        </div>
      </section>

      {serverOpen ? (
        <ServerSettingsModal
          onClose={() => setServerOpen(false)}
          onSaved={setApiBase}
          reloadHint={false}
        />
      ) : null}
    </main>
  );
}
