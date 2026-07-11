import { Component } from 'react';
import type { CSSProperties, ErrorInfo, ReactNode } from 'react';

export interface ErrorBoundaryProps {
  readonly children: ReactNode;
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
}

// Deliberately self-contained inline styles, not a CSS module: if the app is broken enough to land
// here, its own stylesheet pipeline may be part of what failed - the fallback must not depend on
// anything else loading correctly. Colors match the app's page background/text tokens by value.
// No Figma design exists for an error state (flagged in the Production Readiness Audit, C3) - this
// is the audit-approved minimal fallback, not invented product UI.
const containerStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 16,
  background: '#121212',
  color: '#faf9f5',
  fontFamily: 'system-ui, sans-serif',
  textAlign: 'center',
  padding: 24,
};

const buttonStyle: CSSProperties = {
  padding: '12px 32px',
  borderRadius: 99999,
  border: 'none',
  background: '#ffffff',
  color: '#141413',
  fontSize: 16,
  fontWeight: 500,
  cursor: 'pointer',
};

// Class component by necessity, not preference - componentDidCatch/getDerivedStateFromError have no
// hook equivalent. The one Error Boundary in the app, wrapping the whole tree from App.tsx: any
// uncaught render/effect throw becomes this recoverable screen instead of a permanent white page.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled error reached the app boundary', error, info.componentStack);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div style={containerStyle} role="alert">
          <p style={{ margin: 0, fontSize: 18 }}>Something went wrong</p>
          <button type="button" style={buttonStyle} onClick={this.handleReload}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
