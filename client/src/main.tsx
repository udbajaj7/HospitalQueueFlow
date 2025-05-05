import React, { Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Create a fallback UI that will show when there's an error
const ErrorFallback = ({ error }: { error: Error }) => {
  console.error("Application error:", error);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-4 bg-white rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-red-600">Something went wrong</h2>
        <p className="text-gray-700">The application encountered an error. Please try refreshing the page.</p>
        <pre className="p-4 mt-4 bg-gray-100 rounded text-sm overflow-auto">
          {error.message}
        </pre>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
};

// Create an error boundary wrapper component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error!} />;
    }
    return this.props.children;
  }
}

// Create a loading component
const LoadingFallback = () => (
  <div className="min-h-screen flex flex-col items-center justify-center">
    <div className="loading-spinner mb-4"></div>
    <h2 className="text-xl font-medium text-gray-700">Loading RGCIRC Queue Management System...</h2>
  </div>
);

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <Suspense fallback={<LoadingFallback />}>
      <App />
    </Suspense>
  </ErrorBoundary>
);
