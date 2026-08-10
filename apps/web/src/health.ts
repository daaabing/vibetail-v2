export interface ReadinessCheck {
  name: string;
  ready: boolean;
  detail?: string;
}

export function healthResponse(service = "web"): Response {
  return Response.json({ status: "ok", service, timestamp: new Date().toISOString() });
}

export function readinessResponse(checks: readonly ReadinessCheck[], service = "web"): Response {
  const ready = checks.every((check) => check.ready);
  return Response.json(
    { status: ready ? "ready" : "not_ready", service, checks, timestamp: new Date().toISOString() },
    { status: ready ? 200 : 503 },
  );
}

// Framework route wiring for /health and /ready belongs with the Phase 2 web
// shell. Keeping the response construction here makes the semantics testable.
