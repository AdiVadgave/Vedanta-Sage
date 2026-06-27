import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
  message: string;
}

/** Catches render errors in a page so it shows a message instead of a blank screen. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface the real error in the console for debugging.
    console.error("Page render error:", error, info);
  }

  // Reset error state when the route changes (key prop forces remount).
  render() {
    if (this.state.hasError) {
      return (
        <div className="card border-accent-red/40 p-8">
          <div className="mb-3 flex items-center gap-2 text-accent-red">
            <AlertTriangle className="h-5 w-5" />
            <h2 className="text-lg font-bold">This page hit an error</h2>
          </div>
          <p className="text-sm text-slate-400">
            The page failed to render. Details (also in the browser console):
          </p>
          <pre className="mt-3 overflow-x-auto rounded-xl border border-ink-600/50 bg-ink-900/60 p-4 text-xs text-accent-red">
            {this.state.message}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false, message: "" })}
            className="btn-ghost mt-4"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
