import { Buffer } from "buffer";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";

// Polyfill Buffer for browser environment
if (typeof window !== "undefined") {
  window.Buffer = Buffer;
  window.global = window.global || window;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
