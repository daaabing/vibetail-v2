import {
  DeterministicMatchingProvider,
  OpenAIModelProvider,
  type ModelProvider,
} from "@vibetail/model-providers";
import {
  DefaultRestaurantService,
  DefaultManagementService,
  FixtureRestaurantRepository,
  SupabaseManagementRepository,
  SupabaseRestaurantRepository,
  UnavailableManagementService,
  type ManagementService,
} from "@vibetail/restaurant-core";
import type { WebServerEnv } from "../env.js";

export interface DependencyReadinessCheck {
  name: string;
  ready: boolean;
  detail: string;
}

export interface WebDependencies {
  restaurantService: DefaultRestaurantService;
  managementService: ManagementService;
  checkReadiness(): Promise<DependencyReadinessCheck[]>;
}

export function createWebDependencies(env: WebServerEnv): WebDependencies {
  if (env.RESTAURANT_REPOSITORY === "fixture") {
    const repository = new FixtureRestaurantRepository();
    const provider = createModelProvider(env, repository.fixture.matchingFailureMenuIds);
    return {
      restaurantService: new DefaultRestaurantService(repository, provider),
      managementService: new DefaultManagementService(repository),
      checkReadiness: async () => [{
        name: "restaurant_repository",
        ready: true,
        detail: "fixture loaded",
      }],
    };
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Validated Supabase configuration is unavailable");
  }
  const repository = new SupabaseRestaurantRepository({
    url: env.SUPABASE_URL,
    publishableKey: env.SUPABASE_PUBLISHABLE_KEY,
  });
  const provider = createModelProvider(env);
  const managementService = env.SUPABASE_SERVICE_ROLE_KEY
    ? new DefaultManagementService(new SupabaseManagementRepository({
        url: env.SUPABASE_URL,
        serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
      }))
    : new UnavailableManagementService();
  return {
    restaurantService: new DefaultRestaurantService(repository, provider),
    managementService,
    checkReadiness: async () => {
      try {
        const scopes = await repository.listPublishedRestaurantMenus();
        return [{
          name: "restaurant_repository",
          ready: true,
          detail: `supabase reachable; ${scopes.length} published menu(s) visible`,
        }];
      } catch {
        return [{
          name: "restaurant_repository",
          ready: false,
          detail: "supabase query failed",
        }];
      }
    },
  };
}

function createModelProvider(
  env: WebServerEnv,
  deterministicFailureMenuIds: readonly string[] = [],
): ModelProvider {
  switch (env.MODEL_PROVIDER) {
    case "deterministic":
      return new DeterministicMatchingProvider({ failureMenuIds: deterministicFailureMenuIds });
    case "openai":
      if (!env.MODEL_API_KEY || !env.MODEL_NAME) {
        throw new Error("Validated OpenAI model configuration is unavailable");
      }
      return new OpenAIModelProvider({ apiKey: env.MODEL_API_KEY, model: env.MODEL_NAME });
    default:
      throw new Error(`MODEL_PROVIDER=${env.MODEL_PROVIDER} is not implemented`);
  }
}
