import { z } from "zod";

const timestampSchema = z.string().datetime({ offset: true });
const metadataSchema = z.record(z.string(), z.unknown());

export const agentRunStatusSchema = z.enum([
  "queued",
  "provisioning",
  "running",
  "waiting_for_approval",
  "hibernating",
  "hibernated",
  "resuming",
  "completed",
  "failed",
  "cancelled",
]);
export type AgentRunStatus = z.infer<typeof agentRunStatusSchema>;

export const agentRunSchema = z.object({
  id: z.string().uuid(),
  status: agentRunStatusSchema,
  provider: z.string().min(1).max(100),
  providerSessionId: z.string().min(1).max(500).nullable(),
  currentStep: z.string().min(1).max(200),
  input: metadataSchema,
  result: metadataSchema.nullable(),
  checkpoint: metadataSchema.nullable(),
  approvalRequired: z.boolean(),
  approvalVersion: z.number().int().nonnegative(),
  traceId: z.string().min(1).max(200),
  artifactUrl: z.string().url().nullable(),
  errorCode: z.string().max(100).nullable(),
  errorMessage: z.string().max(2_000).nullable(),
  retryCount: z.number().int().nonnegative(),
  startedAt: timestampSchema.nullable(),
  completedAt: timestampSchema.nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type AgentRun = z.infer<typeof agentRunSchema>;

export const agentRunEventTypeSchema = z.enum([
  "run_created",
  "sandbox_provisioned",
  "step_started",
  "step_completed",
  "approval_requested",
  "approval_recorded",
  "sandbox_hibernated",
  "sandbox_woken",
  "checkpoint_saved",
  "artifact_created",
  "run_completed",
  "run_failed",
  "run_cancelled",
]);
export type AgentRunEventType = z.infer<typeof agentRunEventTypeSchema>;

export const agentRunEventSchema = z.object({
  id: z.string().uuid(),
  agentRunId: z.string().uuid(),
  eventType: agentRunEventTypeSchema,
  payload: metadataSchema,
  idempotencyKey: z.string().min(1).max(200),
  traceId: z.string().min(1).max(200),
  createdAt: timestampSchema,
});
export type AgentRunEvent = z.infer<typeof agentRunEventSchema>;

export const agentApprovalRequestSchema = z.object({
  id: z.string().uuid(),
  agentRunId: z.string().uuid(),
  status: z.enum(["pending", "approved", "rejected", "expired"]),
  action: z.string().min(1).max(200),
  reason: z.string().min(1).max(2_000),
  riskLevel: z.enum(["medium", "high", "critical"]),
  approvalVersion: z.number().int().positive(),
  idempotencyKey: z.string().min(1).max(200),
  requestedAt: timestampSchema,
  decidedAt: timestampSchema.nullable(),
  decidedBy: z.string().max(200).nullable(),
});
export type AgentApprovalRequest = z.infer<typeof agentApprovalRequestSchema>;

export const AGENT_API_V1 = {
  create: "/v1/agent-runs",
  get: "/v1/agent-runs/:id",
  approve: "/v1/agent-runs/:id/approve",
  cancel: "/v1/agent-runs/:id/cancel",
  events: "/v1/agent-runs/:id/events",
} as const;
