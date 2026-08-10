import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import "./features/restaurant-legacy/styles/restaurant-legacy.css";
import "./features/platform/styles/platform.css";

const root = document.getElementById("root");
if (!root) throw new Error("Application root not found");

createRoot(root).render(<StrictMode><App /></StrictMode>);
