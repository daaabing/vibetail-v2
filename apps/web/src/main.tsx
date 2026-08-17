import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import { SketchDefs } from "./features/draw/Sketch.js";
import "./features/platform/styles/design-system.css";
import "./features/platform/styles/platform.css";

const root = document.getElementById("root");
if (!root) throw new Error("Application root not found");

createRoot(root).render(<StrictMode><SketchDefs /><App /></StrictMode>);
