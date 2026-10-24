import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import { App } from "./App";

// Design tokens first, then chat UI styles, then demo chrome.
import "@/runtime/tokens.css";
import "@openuidev/react-ui/styles/index.css";
import "./demo.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
