import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="my-6 p-6 bg-neutral-900 border border-amber-500/30 rounded-2xl text-white shadow-xl max-w-4xl mx-auto space-y-4 animate-fade-in">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
                  Section Safe Boundary
                </span>
                <span className="text-[10px] font-mono text-neutral-400">SMC Pro Resiliency Engine</span>
              </div>
              <h3 className="font-serif text-xl font-bold text-white">
                {this.props.fallbackTitle || "Something went wrong in this section"}
              </h3>
              <p className="text-xs text-neutral-300 leading-relaxed">
                An unexpected component error occurred within this module. The rest of SMC Pro Studio remains fully functional.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={this.handleReset}
              className="bg-gold hover:bg-amber-400 text-neutral-950 px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reload This Section</span>
            </button>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-3.5 py-2 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Full App Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
              className="text-xs font-mono text-neutral-400 hover:text-neutral-200 ml-auto flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>{this.state.showDetails ? "Hide Error Logs" : "View Error Logs"}</span>
              {this.state.showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {this.state.showDetails && (
            <div className="pt-2 space-y-2 border-t border-neutral-800/60 text-xs font-mono">
              {this.state.error && (
                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-rose-300 overflow-x-auto whitespace-pre-wrap text-[11px]">
                  <strong>Error:</strong> {this.state.error.toString()}
                </div>
              )}
              {this.state.errorInfo?.componentStack && (
                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-400 overflow-x-auto text-[10px] max-h-48 custom-scrollbar">
                  <strong>Component Stack:</strong>
                  <pre className="mt-1 whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
