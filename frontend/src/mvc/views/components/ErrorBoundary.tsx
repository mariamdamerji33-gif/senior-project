import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from './ui/Button'

type Props = { children: ReactNode }

type State = { hasError: boolean; message: string | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: null }

  static getDerivedStateFromError(err: Error): Partial<State> {
    return { hasError: true, message: err.message || 'Something went wrong.' }
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error('App error:', err, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundaryInner">
            <h1 className="error-boundaryTitle">Something went wrong</h1>
            <p className="error-boundaryText">
              The page could not finish loading. Please return to the dashboard and try again.
            </p>
            {this.state.message ? (
              <p className="error-boundaryText error-boundaryDetail">Technical detail: {this.state.message}</p>
            ) : null}
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                this.setState({ hasError: false, message: null })
                window.location.assign('/dashboard')
              }}
            >
              Back to dashboard
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
