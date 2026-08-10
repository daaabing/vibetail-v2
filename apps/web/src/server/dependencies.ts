import { DeterministicMatchingProvider } from "@vibetail/model-providers";
import {
  DefaultRestaurantService,
  DefaultManagementService,
  FixtureRestaurantRepository,
  SupabaseManagementRepository,
  SupabaseRestaurantRepository,
  type ManagementService,
} from "@vibetail/restaurant-core";
import type { WebServerEnv } from "../env.js";

export interface WebDependencies {
  restaurantService: DefaultRestaurantService;
  managementService: ManagementService;
}

export function createWebDependencies(env: WebServerEnv): WebDependencies {
  if (env.RESTAURANT_REPOSITORY === "fixture") {
    const repository = new FixtureRestaurantRepository();
    const provider = new DeterministicMatchingProvider({ failureMenuIds: repository.fixture.matchingFailureMenuIds });
    return {
      restaurantService: new DefaultRestaurantService(repository, provider),
      managementService: new DefaultManagementService(repository),
    };
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Validated Supabase configuration is unavailable");
  }
  const repository = new SupabaseRestaurantRepository({
    url: env.SUPABASE_URL,
    publishableKey: env.SUPABASE_PUBLISHABLE_KEY,
  });
  const provider = new DeterministicMatchingProvider();
  const managementRepository = new SupabaseManagementRepository({
    url: env.SUPABASE_URL,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  });
  return {
    restaurantService: new DefaultRestaurantService(repository, provider),
    managementService: new DefaultManagementService(managementRepository),
  };
}
