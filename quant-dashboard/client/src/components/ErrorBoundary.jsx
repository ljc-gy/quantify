import { Component } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faRotate } from '@fortawesome/free-solid-svg-icons';

/**
 * Catches rendering errors in child tree and shows a fallback UI
 * with a retry button, instead of a blank white screen.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: 40,
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          }}
        >
          <FontAwesomeIcon
            icon={faExclamationTriangle}
            style={{ fontSize: 48, color: '#f59e0b', filter: 'drop-shadow(0 0 20px rgba(245,158,11,0.4))' }}
          />
          <h2 style={{ fontSize: 18, fontWeight: 'bold', color: '#e2e8f0', margin: 0 }}>
            页面渲染异常
          </h2>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, maxWidth: 480, textAlign: 'center' }}>
            {this.state.error?.message || '未知错误'}
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '8px 20px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              background: 'linear-gradient(135deg, rgba(59,130,246,0.6), rgba(139,92,246,0.6))',
              boxShadow: '0 0 12px rgba(139,92,246,0.3)',
            }}
          >
            <FontAwesomeIcon icon={faRotate} style={{ marginRight: 6 }} />
            重试
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
