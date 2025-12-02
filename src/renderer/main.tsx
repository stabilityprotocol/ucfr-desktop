import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initBrowserMock } from "./mockBrowserAPI";

// Initialize browser mock if window.ucfr is not available (browser mode)
initBrowserMock();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
