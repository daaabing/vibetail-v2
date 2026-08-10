export type LogLevel = "debug" | "info" | "warn" | "error";

export interface StructuredLogEvent {
  timestamp: string;
  level: LogLevel;
  service: string;
  traceId: string;
  event: string;
  agentRunId?: string;
  provider?: string;
  sandboxSessionId?: string;
  step?: string;
  durationMs?: number;
  errorCode?: string;
  fields?: Record<string, string | number | boolean | null>;
}

export interface TelemetrySink {
  log(event: StructuredLogEvent): void;
  increment(metric: string, value: number, labels?: Record<string, string>): void;
  duration(metric: string, durationMs: number, labels?: Record<string, string>): void;
}

export const FORBIDDEN_LOG_FIELDS = [
  "authorization",
  "cookie",
  "apiKey",
  "serviceRoleKey",
  "sandboxCredential",
  "systemPrompt",
] as const;
