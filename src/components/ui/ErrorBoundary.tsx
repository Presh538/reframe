'use client'

/**
 * ErrorBoundary — catches unhandled render errors in the editor and shows a
 * recoverable fallback instead of a blank page.
 *
 * React Error Boundaries must be class components (as of React 19).
 * https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
 */

import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  /** Optional custom fallback; defaults to a styled reset card. */
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  message:  string
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred'
    return { hasError: true, message }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    // Log to console in development; wire to your error-reporting service in production.
    if (process.env.NODE_ENV !== 'production') {
      console.error('[ErrorBoundary]', error, info.componentStack)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            background: '#f5f5f5',
            fontFamily: 'var(--font-geist-sans), sans-serif',
          }}
        >
          {/* Icon */}
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#e5e5e5" strokeWidth="1.5" />
            <path
              d="M12 8v4M12 16h.01"
              stroke="#AFAFAF"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <div style={{ textAlign: 'center', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#222', lineHeight: '22px' }}>
              Something went wrong
            </p>
            <p style={{ margin: 0, fontSize: 13, color: '#888', lineHeight: '18px' }}>
              {this.state.message}
            </p>
          </div>

          <button
            onClick={this.handleReset}
            style={{
              marginTop: 4,
              background: '#3f37c9',
              color: 'white',
              border: 'none',
              borderRadius: 74,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
