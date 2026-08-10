export * from "./env.js";

import { parseAgentWorkerEnv } from "./env.js";

// Importing the worker composition root validates provider configuration
// before any run can be claimed.
export const agentWorkerEnv = parseAgentWorkerEnv(process.env);
