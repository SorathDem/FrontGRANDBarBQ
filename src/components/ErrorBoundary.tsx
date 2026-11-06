import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Error no controlado en el panel:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="page" style={{ maxWidth: 680, paddingTop: 72 }}>
          <section className="card card-pad" style={{ textAlign: 'center' }}>
            <div className="brand-mark" style={{ margin: '0 auto 14px' }}>
              GB
            </div>
            <p className="eyebrow">Error inesperado</p>
            <h1 style={{ margin: '0 0 8px', fontSize: 32 }}>
              Algo salió mal
            </h1>
            <p className="subtle">
              Recarga la página para volver al panel. Si el problema continúa,
              revisa la conexión con el backend.
            </p>
            <p style={{ margin: '24px 0 0' }}>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => window.location.reload()}
              >
                Recargar panel
              </button>
            </p>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
