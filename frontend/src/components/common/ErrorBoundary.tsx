import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ShieldAlert, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallbackTitle?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught component error:', error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-white space-y-3 text-center my-4">
          <div className="inline-flex p-3 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20 mb-1">
            <ShieldAlert size={24} />
          </div>
          <h3 className="font-extrabold text-base text-slate-100">
            {this.props.fallbackTitle || 'Component Encountered a Display Issue'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto font-mono">
            {this.state.error?.message || 'An unexpected rendering fallback occurred.'}
          </p>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-md inline-flex items-center gap-1.5 transition-all"
          >
            <RefreshCw size={14} /> Reload Component View
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
