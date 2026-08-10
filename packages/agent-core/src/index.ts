import type { AgentApprovalRequest, AgentRun, AgentRunEvent, AgentRunStatus } from "@vibetail/contracts";

export interface AgentRunStore {
  create(run: AgentRun): Promise<void>;
  get(runId: string): Promise<AgentRun | null>;
  compareAndSetStatus(runId: string, from: AgentRunStatus, to: AgentRunStatus): Promise<boolean>;
  appendEvent(event: AgentRunEvent): Promise<void>;
  saveCheckpoint(runId: string, checkpoint: Record<string, unknown>): Promise<void>;
  recordApproval(request: AgentApprovalRequest): Promise<"created" | "already_recorded">;
}

export interface AgentWakeSignal {
  agentRunId: string;
  approvalVersion: number;
  idempotencyKey: string;
  traceId: string;
}

// State-machine execution is intentionally deferred. Durable compare-and-set,
// checkpoint, and idempotency ports prevent an in-memory workflow design.
