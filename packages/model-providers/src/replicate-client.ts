// Keep the gateway URL inside this adapter so domain and UI code stay vendor-neutral.
const replicateApiUrl = "https://api.replicate.com/v1";

export interface ReplicateClientOptions {
  apiToken: string;
  fetchImpl?: typeof fetch;
  pollIntervalMs?: number;
}

export interface ReplicatePrediction {
  status?: string;
  output?: unknown;
  error?: string | null;
  urls?: { get?: string };
}

const terminalStatuses = new Set(["succeeded", "failed", "canceled", "aborted"]);

/**
 * Minimal Replicate HTTP client shared by the drink-photo providers. Inputs
 * are uploaded through the Files API (data URIs are capped far below our 8 MB
 * input limit); predictions run with `Prefer: wait`, polling only if the sync
 * window elapses. Output delivery URLs expire after an hour, so callers must
 * download and store bytes immediately.
 */
export class ReplicateClient {
  private readonly apiToken: string;
  private readonly fetchImpl: typeof fetch;
  private readonly pollIntervalMs: number;

  constructor(options: ReplicateClientOptions) {
    if (!options.apiToken.trim()) throw new Error("Replicate API token is required");
    this.apiToken = options.apiToken;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.pollIntervalMs = options.pollIntervalMs ?? 1_000;
  }

  async uploadFile(bytes: Uint8Array, contentType: string, filename: string, deadline: number): Promise<string> {
    const form = new FormData();
    form.append("content", new Blob([Buffer.from(bytes)], { type: contentType }), filename);
    const response = await this.call("POST", `${replicateApiUrl}/files`, form, deadline);
    const json = (await response.json()) as { urls?: { get?: string } };
    const url = json.urls?.get;
    if (!url) throw new Error("Replicate file upload returned no URL");
    return url;
  }

  /**
   * Runs `owner/name` through the official-models endpoint, or
   * `owner/name:versionhash` through the generic predictions endpoint.
   * Resolves once the prediction has output or a terminal status.
   */
  async runModel(model: string, input: Record<string, unknown>, deadline: number): Promise<ReplicatePrediction> {
    // Leave a slice of the budget for downloading the output afterwards.
    const waitSeconds = Math.min(60, Math.max(1, Math.floor((deadline - Date.now()) / 1000) - 5));
    const versioned = model.includes(":");
    const response = await this.call(
      "POST",
      versioned ? `${replicateApiUrl}/predictions` : `${replicateApiUrl}/models/${model}/predictions`,
      JSON.stringify(versioned ? { version: model.split(":")[1], input } : { input }),
      deadline,
      { Prefer: `wait=${waitSeconds}` },
    );
    let prediction = (await response.json()) as ReplicatePrediction;
    // File outputs land before the status flips, so a populated output means done.
    while (!prediction.output && !terminalStatuses.has(prediction.status ?? "")) {
      if (Date.now() + this.pollIntervalMs >= deadline) throw new Error("Replicate prediction timed out");
      await new Promise((resolve) => setTimeout(resolve, this.pollIntervalMs));
      const pollUrl = prediction.urls?.get;
      if (!pollUrl) throw new Error("Replicate returned no polling URL");
      prediction = (await (await this.call("GET", pollUrl, undefined, deadline)).json()) as ReplicatePrediction;
    }
    if (!prediction.output) {
      throw new Error(`Replicate prediction ${prediction.status ?? "failed"}: ${prediction.error ?? "no output"}`);
    }
    return prediction;
  }

  async download(url: string, deadline: number): Promise<Uint8Array> {
    // Delivery URLs are public and unauthenticated — no Bearer header here.
    const response = await this.fetchImpl(url, { signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())) });
    if (!response.ok) throw new Error(`Replicate output download failed (${response.status})`);
    return new Uint8Array(await response.arrayBuffer());
  }

  private async call(
    method: string,
    url: string,
    body: FormData | string | undefined,
    deadline: number,
    extraHeaders: Record<string, string> = {},
  ): Promise<Response> {
    const headers: Record<string, string> = {
      authorization: `Bearer ${this.apiToken}`,
      ...extraHeaders,
    };
    // FormData must set its own multipart boundary.
    if (typeof body === "string") headers["content-type"] = "application/json";
    const response = await this.fetchImpl(url, {
      method,
      headers,
      body: body ?? null,
      signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())),
    });
    if (!response.ok) {
      let detail = "";
      try {
        const problem = (await response.json()) as { detail?: string; title?: string };
        detail = problem.detail ?? problem.title ?? "";
      } catch {
        // Non-JSON error body; the status code is enough.
      }
      throw new Error(`Replicate request failed (${response.status})${detail ? `: ${detail}` : ""}`);
    }
    return response;
  }
}

export function firstOutputUrl(prediction: ReplicatePrediction): string {
  const output = prediction.output;
  const url = Array.isArray(output) ? output[0] : output;
  if (typeof url !== "string" || !url) throw new Error("Replicate prediction returned no output file");
  return url;
}
