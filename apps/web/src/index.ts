export * from "./env.js";
export * from "./health.js";

import { parseWebEnv } from "./env.js";

// Importing the application composition root validates configuration before
// the HTTP runtime starts accepting traffic.
export const webEnv = parseWebEnv(process.env);
