import {
  AlibabaDrinkPhotoProvider,
  DeterministicMatchingProvider,
  DeterministicMenuPhotoScanProvider,
  OpenAIMenuPhotoScanProvider,
  OpenAIModelProvider,
  OpenRouterMenuPhotoScanProvider,
  OpenRouterModelProvider,
  OriginalDrinkPhotoProvider,
  Sam2DrinkPhotoProvider,
  type DrinkInfoProvider,
  type ModelProvider,
} from "@vibetail/model-providers";
import {
  DefaultVenueManagementService,
  DefaultVenueService,
  DefaultManagementService,
  FixtureVenueRepository,
  FixtureVenueMediaStorage,
  SupabaseManagementRepository,
  SupabaseVenueManagementRepository,
  SupabaseVenueRepository,
  SupabaseVenueMediaStorage,
  UnavailableManagementService,
  UnavailableVenueManagementService,
  type ManagementService,
  type VenueManagementService,
} from "@vibetail/venue-core";
import QRCode from "qrcode";
import type { WebServerEnv } from "../env.js";

export interface DependencyReadinessCheck {
  name: string;
  ready: boolean;
  detail: string;
}

export interface WebDependencies {
  venueService: DefaultVenueService;
  managementService: ManagementService;
  venueManagementService: VenueManagementService;
  fixtureVenueMediaStorage?: FixtureVenueMediaStorage;
  checkReadiness(): Promise<DependencyReadinessCheck[]>;
}

function renderQrSvg(text: string): Promise<string> {
  return QRCode.toString(text, { type: "svg", margin: 1, width: 256 });
}

export function createWebDependencies(env: WebServerEnv): WebDependencies {
  if (env.VENUE_REPOSITORY === "fixture") {
    const repository = new FixtureVenueRepository();
    const provider = createModelProvider(env, repository.fixture.matchingFailureMenuIds);
    const mediaStorage = new FixtureVenueMediaStorage(env.APP_URL);
    return {
      venueService: new DefaultVenueService(repository, provider),
      managementService: new DefaultManagementService(repository),
      venueManagementService: new DefaultVenueManagementService(repository, {
        appUrl: env.APP_URL,
        drinkInfoProvider: provider,
        menuPhotoScanProvider: createMenuPhotoScanProvider(env),
        drinkPhotoProvider: createDrinkPhotoProvider(env),
        mediaStorage,
        renderQrSvg,
      }),
      fixtureVenueMediaStorage: mediaStorage,
      checkReadiness: async () => [{
        name: "venue_repository",
        ready: true,
        detail: "fixture loaded",
      }],
    };
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Validated Supabase configuration is unavailable");
  }
  const repository = new SupabaseVenueRepository({
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
  // The venue backend needs the reviewed 0001_venue_mvp.sql migration applied;
  // without the service-role key it fails closed like legacy management.
  const venueManagementService = env.SUPABASE_SERVICE_ROLE_KEY
    ? new DefaultVenueManagementService(
        new SupabaseVenueManagementRepository({
          url: env.SUPABASE_URL,
          serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
        }),
        {
          appUrl: env.APP_URL,
          drinkInfoProvider: provider,
          menuPhotoScanProvider: createMenuPhotoScanProvider(env),
          drinkPhotoProvider: createDrinkPhotoProvider(env),
          mediaStorage: new SupabaseVenueMediaStorage({
            url: env.SUPABASE_URL,
            serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
          }),
          renderQrSvg,
        },
      )
    : new UnavailableVenueManagementService();
  return {
    venueService: new DefaultVenueService(repository, provider),
    managementService,
    venueManagementService,
    checkReadiness: async () => {
      try {
        const scopes = await repository.listPublishedVenueMenus();
        return [{
          name: "venue_repository",
          ready: true,
          detail: `supabase reachable; ${scopes.length} published menu(s) visible`,
        }];
      } catch {
        return [{
          name: "venue_repository",
          ready: false,
          detail: "supabase query failed",
        }];
      }
    },
  };
}

function createMenuPhotoScanProvider(env: WebServerEnv) {
  if (env.MODEL_PROVIDER === "openai") {
    if (!env.MODEL_API_KEY || !env.MODEL_NAME) {
      throw new Error("Validated OpenAI menu scan configuration is unavailable");
    }
    return new OpenAIMenuPhotoScanProvider({ apiKey: env.MODEL_API_KEY, model: env.MODEL_NAME });
  }
  if (env.MODEL_PROVIDER === "openrouter") {
    if (!env.OPENROUTER_API_KEY || !env.MODEL_NAME) {
      throw new Error("Validated OpenRouter menu scan configuration is unavailable");
    }
    return new OpenRouterMenuPhotoScanProvider({
      apiKey: env.OPENROUTER_API_KEY,
      model: env.MODEL_NAME,
      siteUrl: env.APP_URL,
    });
  }
  return new DeterministicMenuPhotoScanProvider();
}

function createDrinkPhotoProvider(env: WebServerEnv) {
  if (env.IMAGE_CUTOUT_PROVIDER === "sam2") {
    return new Sam2DrinkPhotoProvider({
      baseUrl: env.SAM2_CUTOUT_URL ?? "http://127.0.0.1:8091",
      model: env.IMAGE_CUTOUT_MODEL ?? "sam2.1_hiera_small",
    });
  }
  if (env.IMAGE_CUTOUT_PROVIDER === "alibaba") {
    if (!env.DASHSCOPE_API_KEY) throw new Error("DASHSCOPE_API_KEY is required for image cutout");
    return new AlibabaDrinkPhotoProvider({
      apiKey: env.DASHSCOPE_API_KEY,
      ...(env.IMAGE_CUTOUT_MODEL ? { model: env.IMAGE_CUTOUT_MODEL } : {}),
      ...(env.DASHSCOPE_IMAGE_ENDPOINT ? { endpoint: env.DASHSCOPE_IMAGE_ENDPOINT } : {}),
    });
  }
  return new OriginalDrinkPhotoProvider();
}

function createModelProvider(
  env: WebServerEnv,
  deterministicFailureMenuIds: readonly string[] = [],
): ModelProvider & DrinkInfoProvider {
  switch (env.MODEL_PROVIDER) {
    case "deterministic":
      return new DeterministicMatchingProvider({ failureMenuIds: deterministicFailureMenuIds });
    case "openai":
      if (!env.MODEL_API_KEY || !env.MODEL_NAME) {
        throw new Error("Validated OpenAI model configuration is unavailable");
      }
      return new OpenAIModelProvider({ apiKey: env.MODEL_API_KEY, model: env.MODEL_NAME });
    case "openrouter":
      if (!env.OPENROUTER_API_KEY || !env.MODEL_NAME) {
        throw new Error("Validated OpenRouter provider configuration is unavailable");
      }
      return new OpenRouterModelProvider({
        apiKey: env.OPENROUTER_API_KEY,
        model: env.MODEL_NAME,
        siteUrl: env.APP_URL,
      });
    default:
      throw new Error(`MODEL_PROVIDER=${env.MODEL_PROVIDER} is not implemented`);
  }
}
