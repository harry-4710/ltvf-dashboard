import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  message: string
  stack: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '', stack: '' }

  static getDerivedStateFromError(err: Error): State {
    return {
      hasError: true,
      message: err.message || 'An unexpected error occurred.',
      stack: err.stack || '',
    }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary] caught:', error, info)
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '', stack: '' })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex flex-col items-center justify-center h-screen gap-6 p-8 bg-gray-50">
        <div className="flex flex-col items-center gap-4 max-w-lg text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle size={32} className="text-red-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">Something went wrong</h2>
            <p className="text-sm text-gray-500">
              The dashboard encountered an unexpected error. Your data has not been lost.
            </p>
          </div>
          <div className="w-full bg-red-50 border border-red-200 rounded-lg p-3 text-left">
            <p className="text-xs font-mono text-red-700 break-all">{this.state.message}</p>
          </div>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition"
          >
            <RefreshCw size={15} />
            Try Again
          </button>
          <p className="text-xs text-gray-400">
            If this error persists, try refreshing the page or clearing your browser cache.
          </p>
        </div>
      </div>
    )
  }
}
