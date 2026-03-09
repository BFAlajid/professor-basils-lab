"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class LocalErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("LocalErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="rounded-lg border border-[#e8433f]/30 bg-[#e8433f]/10 p-4 text-center">
          <p className="text-sm text-[#e8433f] font-pixel">Something went wrong</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 text-xs text-[#8b9bb4] hover:text-[#f0f0e8] transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
