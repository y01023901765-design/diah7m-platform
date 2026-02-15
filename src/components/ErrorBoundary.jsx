import { Component } from 'react';
import T from '../theme';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('DIAH-7M Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: T.bg0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          textAlign: 'center',
          color: T.text,
          fontFamily: "'Pretendard', sans-serif",
        }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>🛰️</div>
          <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>System Error</div>
          <div style={{ fontSize: 15, color: T.textMid, maxWidth: 400, lineHeight: 1.7, marginBottom: 24 }}>
            An unexpected error occurred. Please reload the page.
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 32px',
              borderRadius: 10,
              border: 'none',
              background: T.accent,
              color: T.bg0,
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
          {process.env.NODE_ENV !== 'production' && this.state.error && (
            <pre style={{
              marginTop: 24,
              padding: 16,
              background: T.bg2,
              borderRadius: 8,
              fontSize: 12,
              color: T.danger,
              maxWidth: 500,
              overflow: 'auto',
              textAlign: 'left',
            }}>
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
