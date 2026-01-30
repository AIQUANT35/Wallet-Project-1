import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Toast notification system
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Global CSS
import "./styles.css";

const root = ReactDOM.createRoot(document.getElementById("root"));

// Render App and Toast system
root.render(
  <>
    <App />
    {/* Toast messages will appear top-right automatically */}
    <ToastContainer position="top-right" autoClose={3000} />
  </>
);
