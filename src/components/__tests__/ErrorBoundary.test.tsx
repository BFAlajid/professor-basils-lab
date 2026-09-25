import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ErrorBoundary from "../ErrorBoundary";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A component that throws on render to trigger the ErrorBoundary. */
function ThrowingChild({ message }: { message: string }): React.ReactElement {
  throw new Error(message);
}

/** Suppress React's noisy error boundary console output during tests. */
function suppressConsoleError(fn: () => void) {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  fn();
  spy.mockRestore();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ErrorBoundary", () => {
  it("renders children normally when no error occurs", () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">All good</div>
      </ErrorBoundary>
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("All good")).toBeInTheDocument();
  });

  it("shows fallback UI when a child throws", () => {
    suppressConsoleError(() => {
      render(
        <ErrorBoundary>
          <ThrowingChild message="Test crash" />
        </ErrorBoundary>
      );
    });

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("displays the custom fallbackLabel when provided", () => {
    suppressConsoleError(() => {
      render(
        <ErrorBoundary fallbackLabel="Battle module failed to load">
          <ThrowingChild message="module error" />
        </ErrorBoundary>
      );
    });

    expect(screen.getByText("Battle module failed to load")).toBeInTheDocument();
  });

  it("does not display fallbackLabel when not provided", () => {
    suppressConsoleError(() => {
      render(
        <ErrorBoundary>
          <ThrowingChild message="module error" />
        </ErrorBoundary>
      );
    });

    // The error heading should be present, but no extra label paragraph
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.queryByText("Battle module failed to load")).not.toBeInTheDocument();
  });

  it("recovers when Try Again button is clicked", () => {
    let shouldThrow = true;

    function ConditionalChild() {
      if (shouldThrow) {
        throw new Error("conditional crash");
      }
      return <div data-testid="recovered">Recovered</div>;
    }

    suppressConsoleError(() => {
      render(
        <ErrorBoundary>
          <ConditionalChild />
        </ErrorBoundary>
      );
    });

    // Should show fallback
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    // Fix the condition so re-render succeeds
    shouldThrow = false;

    // Click Try Again
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    // Should now show recovered content
    expect(screen.getByTestId("recovered")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  it("shows error message in development mode", () => {
    // NODE_ENV is 'test' by default in vitest, which !== 'development'
    // We need to temporarily override it
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    suppressConsoleError(() => {
      render(
        <ErrorBoundary>
          <ThrowingChild message="Detailed error info" />
        </ErrorBoundary>
      );
    });

    expect(screen.getByText("Detailed error info")).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it("does not show error message in production mode", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    suppressConsoleError(() => {
      render(
        <ErrorBoundary>
          <ThrowingChild message="Secret error details" />
        </ErrorBoundary>
      );
    });

    expect(screen.queryByText("Secret error details")).not.toBeInTheDocument();
    // Fallback heading should still show
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it("renders multiple children without error", () => {
    render(
      <ErrorBoundary>
        <div data-testid="first">First</div>
        <div data-testid="second">Second</div>
      </ErrorBoundary>
    );

    expect(screen.getByTestId("first")).toBeInTheDocument();
    expect(screen.getByTestId("second")).toBeInTheDocument();
  });
});
