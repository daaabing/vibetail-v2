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

const forbiddenLogFieldSet = new Set<string>(FORBIDDEN_LOG_FIELDS);

export class JsonConsoleTelemetrySink implements TelemetrySink {
  log(event: StructuredLogEvent): void {
    assertSafeFields(event.fields);
    console.log(JSON.stringify(event));
  }

  increment(metric: string, value: number, labels: Record<string, string> = {}): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: "info",
      service: "web",
      traceId: "metric",
      event: "metric_incremented",
      fields: { metric, value, ...labels },
    });
  }

  duration(metric: string, durationMs: number, labels: Record<string, string> = {}): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: "info",
      service: "web",
      traceId: "metric",
      event: "metric_duration_recorded",
      durationMs,
      fields: { metric, ...labels },
    });
  }
}

function assertSafeFields(fields: StructuredLogEvent["fields"]): void {
  if (!fields) return;
  for (const key of Object.keys(fields)) {
    if (forbiddenLogFieldSet.has(key)) {
      throw new Error(`Forbidden telemetry field: ${key}`);
    }
  }
}
