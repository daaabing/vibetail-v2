import type { DrinkInfoSuggestion, ModelMatchSelection, VenuePreferences } from "@vibetail/contracts";

export interface ModelMenuCandidate {
  id: string;
  name: string;
  description: string | null;
  ingredients: readonly string[];
  flavorTags: readonly string[];
  moodTags: readonly string[];
  alcoholic: boolean;
  baseSpirit: string | null;
  section: string | null;
  allergens: readonly string[];
  recommendationPriority: number;
}

export interface VenueModelRequest {
  merchantId: string;
  menuId: string;
  preferences: VenuePreferences;
  allowedItems: readonly ModelMenuCandidate[];
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
  selectVenueItem(request: VenueModelRequest): Promise<ModelProviderResult>;
}

export interface DrinkInfoModelRequest {
  name: string;
  description: string | null;
  ingredients: readonly string[];
  traceId: string;
  timeoutMs: number;
}

export interface DrinkInfoResult {
  suggestion: DrinkInfoSuggestion;
  metadata: ModelInvocationMetadata;
}

// Authoring-time assist only: suggestions are drafts the venue reviews and can
// edit before saving. They never bypass the venue-owned drink record.
export interface DrinkInfoProvider {
  readonly id: string;
  suggestDrinkInfo(request: DrinkInfoModelRequest): Promise<DrinkInfoResult>;
}

// Providers select only an allowlisted ID and explanation. They never return
// canonical menu facts and cannot make an unavailable item eligible.

export * from "./deterministic.js";
export * from "./venue-prompt.js";
export * from "./openai.js";
export * from "./openrouter.js";
export * from "./menu-photo.js";
export * from "./drink-photo.js";
export * from "./sam2-drink-photo.js";
export * from "./openrouter-drink-photo.js";
export * from "./replicate-drink-photo.js";
export * from "./replicate-sam2-drink-photo.js";
