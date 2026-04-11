import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = {
  children: ReactNode
}

type State = {
  hasError: boolean
  message: string
}

class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    message: '',
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message || 'Something unexpected happened while rendering the app.',
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App render failure', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main
          style={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            padding: '24px',
          }}
        >
          <section
            style={{
              maxWidth: '720px',
              width: '100%',
              border: '1px solid var(--border)',
              borderRadius: '24px',
              padding: '28px',
              background: 'var(--panel)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <p style={{ margin: 0, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.16em', fontSize: '0.76rem' }}>
              Rendering error
            </p>
            <h1 style={{ margin: '12px 0', fontSize: '2rem' }}>The interface hit an unexpected problem.</h1>
            <p style={{ margin: 0, color: 'var(--muted)' }}>
              Instead of showing a blank page, the app is now surfacing the error here.
            </p>
            <pre
              style={{
                marginTop: '18px',
                padding: '16px',
                borderRadius: '14px',
                background: 'var(--surface-muted)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              }}
            >
              {this.state.message}
            </pre>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
