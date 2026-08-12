import type { ModelMatchSelection, RestaurantPreferences } from "@vibetail/contracts";

export interface ModelMenuCandidate {
  id: string;
  name: string;
  description: string | null;
  ingredients: readonly string[];
  flavorTags: readonly string[];
  moodTags: readonly string[];
  alcoholic: boolean;
}

export interface RestaurantModelRequest {
  merchantId: string;
  menuId: string;
  preferences: RestaurantPreferences;
  allowedItems: readonly ModelMenuCandidate[];
  locale: "en" | "zh";
  traceId: string;
  timeoutMs: number;
}

export interface ModelInvocationMetadata {
  provider: string;
  model: string;
  attempt: number;
  durationMs: number;
}

export interface ModelProviderResult {
  selection: ModelMatchSelection;
  metadata: ModelInvocationMetadata;
}

export interface ModelProvider {
  readonly id: string;
  selectRestaurantItem(request: RestaurantModelRequest): Promise<ModelProviderResult>;
}

// Providers select only an allowlisted ID and explanation. They never return
// canonical menu facts and cannot make an unavailable item eligible.

export * from "./deterministic.js";
export * from "./openai.js";
export * from "./openrouter.js";
