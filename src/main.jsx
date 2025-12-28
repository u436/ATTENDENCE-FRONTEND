import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { BrowserRouter } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import "./App.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>
);
