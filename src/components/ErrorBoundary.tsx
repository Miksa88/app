// ErrorBoundary — root + per-route error fallback
// Spec: design-system/MASTER.md §2.7 (ErrorBoundary)
// Sentry hook placeholder — u WS-3 dodati @sentry/react kad backend zakači

import { logger } from "@/lib/logger";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, Home, RotateCw } from "lucide-react";
import { captureError } from "@/lib/sentry";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    captureError(error, { componentStack: errorInfo.componentStack });
    logger.error("[ErrorBoundary]", error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          role="alert"
          className="min-h-screen bg-background-secondary flex flex-col items-center justify-center px-8 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-destructive/15 flex items-center justify-center mb-4">
            <AlertTriangle size={28} className="text-destructive" aria-hidden="true" />
          </div>
          <h1 className="text-title-2 text-foreground mb-2">Nešto je krenulo po zlu</h1>
          <p className="text-subhead text-muted-foreground max-w-sm mb-6">
            Izvini, došlo je do neočekivane greške. Pokušaj ponovo ili se vrati na početak.
          </p>
          {/* Uvek prikaži error message (i u production) — korisnik može da nam pokaže */}
          {this.state.error && (
            <pre className="bg-muted text-caption-1 p-3 rounded-xl max-w-sm text-left overflow-auto mb-6 text-destructive whitespace-pre-wrap break-words">
              {this.state.error.message}
              {import.meta.env.DEV && this.state.error.stack && `\n\n${this.state.error.stack.slice(0, 500)}`}
            </pre>
          )}
          <div className="flex gap-3">
            <button
              onClick={this.reset}
              className="flex items-center gap-2 gradient-primary text-primary-foreground px-5 py-3 rounded-xl font-semibold min-h-11 shadow-fab"
            >
              <RotateCw size={16} aria-hidden="true" />
              Pokušaj ponovo
            </button>
            <button
              onClick={() => (window.location.href = "/")}
              className="flex items-center gap-2 bg-card text-foreground px-5 py-3 rounded-xl font-semibold min-h-11 card-shadow"
            >
              <Home size={16} aria-hidden="true" />
              Početna
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
