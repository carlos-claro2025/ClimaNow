import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('Erro não tratado na interface:', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <main className="app-shell">
        <section className="card" role="alert">
          <div className="eyebrow">Erro inesperado</div>
          <h1 className="title">Algo deu errado</h1>
          <p style={{ color: 'var(--muted)', marginTop: 8 }}>
            Não foi possível exibir esta página. Recarregue para tentar novamente.
          </p>
          <p className="error">{String(error?.message || error)}</p>
          <button className="chip" type="button" onClick={() => window.location.reload()}>
            Recarregar
          </button>
        </section>
      </main>
    );
  }
}