import React from "react";

// Simple error boundary for catching render errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can log error info here if needed
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: "#ff3333", padding: 24, textAlign: "center" }}>
          <h2>Something went wrong.</h2>
          <p>{this.state.error?.toString()}</p>
          <p>Please try refreshing the page.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
