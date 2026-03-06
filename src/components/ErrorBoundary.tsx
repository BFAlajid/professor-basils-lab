"use client";

import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackLabel?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    if (process.env.NODE_ENV === "development") {
      console.error("[ErrorBoundary]", error, errorInfo.componentStack);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-8 max-w-md w-full text-center">
            <div
              className="mx-auto mb-4 w-12 h-12 rounded-full bg-[#e8433f]/20 flex items-center justify-center"
            >
              <span className="text-[#e8433f] font-pixel text-lg">!</span>
            </div>
            <h2 className="text-base font-bold text-[#f0f0e8] font-pixel mb-2">
              Something went wrong
            </h2>
            {this.props.fallbackLabel && (
              <p className="text-xs text-[#8b9bb4] font-pixel mb-1">
                {this.props.fallbackLabel}
              </p>
            )}
            {process.env.NODE_ENV === "development" && this.state.error && (
              <p className="text-xs text-[#e8433f] font-pixel mb-4 break-words">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={this.handleReset}
              className="mt-4 rounded-lg bg-[#3a4466] px-6 py-2 text-sm text-[#f0f0e8] font-pixel hover:bg-[#4a5577] transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
