import {
  createMenuInputSchema,
  createVenueInputSchema,
  createVenueMenuInputSchema,
  drinkInfoRequestSchema,
  drinkInputSchema,
  feedbackInputSchema,
  globalMatchRequestSchema,
  saveToVibeBarInputSchema,
  importScannedMenuInputSchema,
  menuItemInputSchema,
  menuViewEventSchema,
  menuPhotoScanInputSchema,
  menuPhotoScanResultSchema,
  menuUrlScanInputSchema,
  prepareDrinkPhotoInputSchema,
  runtimeConfigSchema,
  updateVenueMenuInputSchema,
  updateVenueProfileInputSchema,
  venueDashboardRangeSchema,
  venueErrorSchema,
  venueLoginInputSchema,
  venuePreferencesSchema,
  updateAvailabilityInputSchema,
  updateMenuInputSchema,
  updateMerchantInputSchema,
  type AuthConfig,
  type VenueError,
  type VenueMatchResult,
} from "@vibetail/contracts";
import type { MenuPhotoScanProvider } from "@vibetail/model-providers";
import {
  ManagementServiceError,
  VenueManagementServiceError,
  VenueRepositoryUnavailableError,
  VenueServiceError,
  type DefaultVenueService,
  type ManagementService,
  type VenueManagementService,
} from "@vibetail/venue-core";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import { ZodError } from "zod";

export interface WebAppOptions {
  venueService: DefaultVenueService;
  managementService: ManagementService;
  venueManagementService: VenueManagementService;
  authConfig: AuthConfig;
  menuPhotoScanProvider?: MenuPhotoScanProvider;
  checkReadiness?: () => Promise<Array<{ name: string; ready: boolean; detail: string }>>;
  testFrontend?: boolean;
}

export function createWebApp(options: WebAppOptions): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "12mb" }));

  app.get("/health", (_request, response) => {
    response.json({ status: "ok", service: "web", timestamp: new Date().toISOString() });
  });

  app.get(
    "/ready",
    asyncRoute(async (_request, response) => {
      const checks = options.checkReadiness
        ? await options.checkReadiness()
        : [{ name: "venue_repository", ready: true, detail: "supabase" }];
      const ready = checks.every((check) => check.ready);
      response.status(ready ? 200 : 503).json({
        status: ready ? "ready" : "not_ready",
        service: "web",
        checks,
        timestamp: new Date().toISOString(),
      });
    }),
  );

  // Runtime config keeps a single build deployable across environments; it is
  // publishable-only by construction (see authConfigSchema).
  app.get("/v1/config", (_request, response) => {
    response.json(runtimeConfigSchema.parse({ auth: options.authConfig }));
  });

  app.get(
    "/v1/venues",
    asyncRoute(async (_request, response) => {
      response.json(await options.venueService.listActiveVenues());
    }),
  );

  app.get(
    "/v1/venues/:merchantSlug",
    asyncRoute(async (request, response) => {
      response.json(await options.venueService.getVenue(request.params.merchantSlug ?? ""));
    }),
  );

  app.post(
    "/v1/menu/scan-photo",
    asyncRoute(async (request, response) => {
      const provider = options.menuPhotoScanProvider;
      if (!provider) throw mediaUnavailable("Menu photo scanning is not configured on this server.");
      const input = menuPhotoScanInputSchema.parse(request.body);
      const scan = await provider.scanMenuPhoto({
        image: { bytes: decodeBase64(input.imageBase64), contentType: input.imageContentType },
        ...(input.fileName ? { fileName: input.fileName } : {}),
        traceId: randomUUID(),
        timeoutMs: 45_000,
      });
      response.json(menuPhotoScanResultSchema.parse({ ...scan, provider: provider.id }));
    }),
  );

  app.post(
    "/v1/matches/global",
    asyncRoute(async (request, response) => {
      const { preferences } = globalMatchRequestSchema.parse(request.body);
      const result = await options.venueService.matchGlobalItem(preferences);
      response.json(await withMatchId(options.venueManagementService, result, request));
    }),
  );

  // Public replay of a shared result card. IDs are unguessable uuids and the
  // guest's own words are never stored, so no auth is required to view one.
  app.get(
    "/v1/matches/:matchId",
    asyncRoute(async (request, response) => {
      response.json(await options.venueManagementService.getSharedMatch(request.params.matchId ?? ""));
    }),
  );

  app.post(
    "/v1/vibe-bar",
    asyncRoute(async (request, response) => {
      const { matchId } = saveToVibeBarInputSchema.parse(request.body);
      const outcome = await options.venueManagementService.saveToVibeBar(readBearerToken(request), matchId);
      response.status(outcome.status === "created" ? 201 : 200).json(outcome);
    }),
  );

  app.get(
    "/v1/vibe-bar",
    asyncRoute(async (request, response) => {
      response.json(await options.venueManagementService.listVibeBar(readBearerToken(request)));
    }),
  );

  app.get(
    "/v1/venues/:merchantSlug/current-menu",
    asyncRoute(async (request, response) => {
      const merchantSlug = request.params.merchantSlug ?? "";
      const entry = await options.venueService.getVenue(merchantSlug);
      const currentMenu = entry.menus[0];
      if (!currentMenu) {
        throw new VenueServiceError(
          { code: "NO_PUBLISHED_MENU", message: "This venue has no published menu right now.", retryable: false },
          404,
        );
      }
      response.json(await options.venueService.getPublishedVenueMenu(merchantSlug, currentMenu.slug));
    }),
  );

  app.get(
    "/v1/venues/:merchantSlug/menus/:menuSlug",
    asyncRoute(async (request, response) => {
      const menu = await options.venueService.getPublishedVenueMenu(
        request.params.merchantSlug ?? "",
        request.params.menuSlug ?? "",
      );
      response.json(menu);
    }),
  );

  app.get(
    "/v1/management/merchant",
    asyncRoute(async (request, response) => {
      response.json(await options.managementService.getManagedMerchant(readBearerToken(request)));
    }),
  );

  app.patch(
    "/v1/management/merchant",
    asyncRoute(async (request, response) => {
      response.json(await options.managementService.updateMerchant(
        readBearerToken(request), updateMerchantInputSchema.parse(request.body),
      ));
    }),
  );

  app.get(
    "/v1/management/menus",
    asyncRoute(async (request, response) => {
      response.json(await options.managementService.listMenus(readBearerToken(request)));
    }),
  );

  app.post(
    "/v1/management/menus",
    asyncRoute(async (request, response) => {
      response.status(201).json(await options.managementService.createMenu(
        readBearerToken(request), createMenuInputSchema.parse(request.body),
      ));
    }),
  );

  app.patch(
    "/v1/management/menus/:menuId",
    asyncRoute(async (request, response) => {
      response.json(await options.managementService.updateMenu(
        readBearerToken(request), request.params.menuId ?? "", updateMenuInputSchema.parse(request.body),
      ));
    }),
  );

  app.post(
    "/v1/management/menus/:menuId/publish",
    asyncRoute(async (request, response) => {
      response.json(await options.managementService.publishMenu(
        readBearerToken(request), request.params.menuId ?? "",
      ));
    }),
  );

  app.post(
    "/v1/management/menus/:menuId/items",
    asyncRoute(async (request, response) => {
      response.status(201).json(await options.managementService.createMenuItem(
        readBearerToken(request), request.params.menuId ?? "", menuItemInputSchema.parse(request.body),
      ));
    }),
  );

  app.patch(
    "/v1/management/items/:menuItemId",
    asyncRoute(async (request, response) => {
      response.json(await options.managementService.updateMenuItem(
        readBearerToken(request), request.params.menuItemId ?? "", menuItemInputSchema.parse(request.body),
      ));
    }),
  );

  app.patch(
    "/v1/management/items/:menuItemId/availability",
    asyncRoute(async (request, response) => {
      response.json(await options.managementService.updateMenuItemAvailability(
        readBearerToken(request), request.params.menuItemId ?? "", updateAvailabilityInputSchema.parse(request.body),
      ));
    }),
  );

  app.post(
    "/v1/venues/:merchantSlug/menus/:menuSlug/match",
    asyncRoute(async (request, response) => {
      const rawPreferences = isRecord(request.body) && "preferences" in request.body
        ? request.body.preferences
        : request.body;
      const preferences = venuePreferencesSchema.parse(rawPreferences);
      const result = await options.venueService.matchVenueItem({
        merchantSlug: request.params.merchantSlug ?? "",
        menuSlug: request.params.menuSlug ?? "",
        preferences,
      });
      response.json(await withMatchId(options.venueManagementService, result, request));
    }),
  );

  const venueManagement = options.venueManagementService;

  app.post(
    "/v1/venue/session",
    asyncRoute(async (request, response) => {
      const { name } = venueLoginInputSchema.parse(request.body);
      response.status(201).json(await venueManagement.login(name));
    }),
  );

  app.get(
    "/v1/venue/session",
    asyncRoute(async (request, response) => {
      response.json(await venueManagement.getSession(readBearerToken(request)));
    }),
  );

  app.delete(
    "/v1/venue/session",
    asyncRoute(async (request, response) => {
      await venueManagement.logout(readBearerToken(request));
      response.status(204).end();
    }),
  );

  app.post(
    "/v1/venue",
    asyncRoute(async (request, response) => {
      response.status(201).json(await venueManagement.createVenue(
        readBearerToken(request), createVenueInputSchema.parse(request.body),
      ));
    }),
  );

  app.patch(
    "/v1/venue",
    asyncRoute(async (request, response) => {
      response.json(await venueManagement.updateVenueProfile(
        readBearerToken(request), updateVenueProfileInputSchema.parse(request.body),
      ));
    }),
  );

  app.get(
    "/v1/venue/dashboard",
    asyncRoute(async (request, response) => {
      const range = venueDashboardRangeSchema.parse(request.query.range ?? "today");
      response.json(await venueManagement.getDashboard(readBearerToken(request), range));
    }),
  );

  app.get(
    "/v1/venue/qr",
    asyncRoute(async (request, response) => {
      response.json(await venueManagement.getQr(readBearerToken(request)));
    }),
  );

  app.get(
    "/v1/venue/drinks",
    asyncRoute(async (request, response) => {
      response.json(await venueManagement.listDrinks(readBearerToken(request)));
    }),
  );

  app.post(
    "/v1/venue/drinks",
    asyncRoute(async (request, response) => {
      response.status(201).json(await venueManagement.createDrink(
        readBearerToken(request), drinkInputSchema.parse(request.body),
      ));
    }),
  );

  app.post(
    "/v1/venue/drinks/suggest",
    asyncRoute(async (request, response) => {
      response.json(await venueManagement.suggestDrinkInfo(
        readBearerToken(request), drinkInfoRequestSchema.parse(request.body),
      ));
    }),
  );

  app.post(
    "/v1/venue/drinks/photo",
    asyncRoute(async (request, response) => {
      response.json(await venueManagement.prepareDrinkPhoto(
        readBearerToken(request), prepareDrinkPhotoInputSchema.parse(request.body),
      ));
    }),
  );

  app.patch(
    "/v1/venue/drinks/:drinkId",
    asyncRoute(async (request, response) => {
      response.json(await venueManagement.updateDrink(
        readBearerToken(request), request.params.drinkId ?? "", drinkInputSchema.parse(request.body),
      ));
    }),
  );

  app.get(
    "/v1/venue/drinks/:drinkId/usage",
    asyncRoute(async (request, response) => {
      response.json(await venueManagement.getDrinkUsage(
        readBearerToken(request), request.params.drinkId ?? "",
      ));
    }),
  );

  app.delete(
    "/v1/venue/drinks/:drinkId",
    asyncRoute(async (request, response) => {
      response.json(await venueManagement.deleteDrink(
        readBearerToken(request), request.params.drinkId ?? "",
      ));
    }),
  );

  app.get(
    "/v1/venue/menus",
    asyncRoute(async (request, response) => {
      response.json(await venueManagement.listMenus(readBearerToken(request)));
    }),
  );

  app.post(
    "/v1/venue/menus/scan-photo",
    asyncRoute(async (request, response) => {
      response.json(await venueManagement.scanMenuPhoto(
        readBearerToken(request), menuPhotoScanInputSchema.parse(request.body),
      ));
    }),
  );

  app.post(
    "/v1/venue/menus/scan-url",
    asyncRoute(async (request, response) => {
      response.json(await venueManagement.scanMenuUrl(
        readBearerToken(request), menuUrlScanInputSchema.parse(request.body),
      ));
    }),
  );

  app.post(
    "/v1/venue/menus/import-scan",
    asyncRoute(async (request, response) => {
      response.status(201).json(await venueManagement.importScannedMenu(
        readBearerToken(request), importScannedMenuInputSchema.parse(request.body),
      ));
    }),
  );

  app.post(
    "/v1/venue/menus",
    asyncRoute(async (request, response) => {
      response.status(201).json(await venueManagement.createMenu(
        readBearerToken(request), createVenueMenuInputSchema.parse(request.body),
      ));
    }),
  );

  app.patch(
    "/v1/venue/menus/:menuId",
    asyncRoute(async (request, response) => {
      response.json(await venueManagement.updateMenu(
        readBearerToken(request), request.params.menuId ?? "", updateVenueMenuInputSchema.parse(request.body),
      ));
    }),
  );

  app.delete(
    "/v1/venue/menus/:menuId",
    asyncRoute(async (request, response) => {
      await venueManagement.deleteMenu(readBearerToken(request), request.params.menuId ?? "");
      response.status(204).end();
    }),
  );

  app.post(
    "/v1/venue/menus/:menuId/publish",
    asyncRoute(async (request, response) => {
      response.json(await venueManagement.publishMenu(
        readBearerToken(request), request.params.menuId ?? "",
      ));
    }),
  );

  app.post(
    "/v1/events/menu-views",
    asyncRoute(async (request, response) => {
      // Always 204: consumer beacons must never surface analytics failures.
      const parsed = menuViewEventSchema.safeParse(request.body);
      if (parsed.success) await venueManagement.recordMenuView(parsed.data);
      response.status(204).end();
    }),
  );

  app.post(
    "/v1/matches/:matchId/feedback",
    asyncRoute(async (request, response) => {
      response.status(201).json(await venueManagement.submitFeedback(
        request.params.matchId ?? "",
        feedbackInputSchema.parse(request.body),
        await venueManagement.resolveAccountId(readBearerToken(request)),
      ));
    }),
  );

  app.use("/v1", (_request, response) => {
    response.status(404).json({
      code: "MENU_NOT_FOUND",
      message: "API route not found.",
      retryable: false,
    } satisfies VenueError);
  });

  if (options.testFrontend) {
    app.get("*", (_request, response) => {
      response.type("html").send('<!doctype html><html><body><div id="root"></div></body></html>');
    });
  }

  app.use((error: unknown, request: Request, response: Response, _next: NextFunction) => {
    void _next;
    const mapped = mapError(error);
    logServerError(request, mapped.body);
    response.status(mapped.status).json(mapped.body);
  });

  return app;
}

function asyncRoute(
  handler: (request: Request, response: Response) => Promise<void>,
): (request: Request, response: Response, next: NextFunction) => void {
  return (request, response, next) => {
    void handler(request, response).catch(next);
  };
}

// Analytics writes are best-effort: a failed record must never fail the match.
async function withMatchId(
  service: VenueManagementService,
  result: VenueMatchResult,
  request: Request,
): Promise<VenueMatchResult> {
  try {
    // Consumer sign-in is optional, so an unusable token just means anonymous.
    const accountId = await service.resolveAccountId(readBearerToken(request));
    const matchId = await service.recordMatch(result, accountId);
    return matchId ? { ...result, matchId } : result;
  } catch {
    return result;
  }
}

function mapError(error: unknown): { status: number; body: VenueError } {
  if (error instanceof VenueServiceError) {
    return { status: error.httpStatus, body: venueErrorSchema.parse(error.detail) };
  }
  if (error instanceof ManagementServiceError) {
    return { status: error.httpStatus, body: venueErrorSchema.parse(error.detail) };
  }
  if (error instanceof VenueManagementServiceError) {
    return { status: error.httpStatus, body: venueErrorSchema.parse(error.detail) };
  }
  if (error instanceof ZodError) {
    return {
      status: 400,
      body: {
        code: "INVALID_REQUEST",
        message: error.issues[0]?.message ?? "Invalid request.",
        retryable: false,
      },
    };
  }
  if (error instanceof VenueRepositoryUnavailableError) {
    return {
      status: 503,
      body: {
        code: "INTERNAL_ERROR",
        message: "Venue data is temporarily unavailable.",
        retryable: true,
      },
    };
  }
  return {
    status: 500,
    body: { code: "INTERNAL_ERROR", message: "Unexpected server error.", retryable: true },
  };
}

function mediaUnavailable(message: string): VenueManagementServiceError {
  return new VenueManagementServiceError(
    { code: "MATCH_PROVIDER_UNAVAILABLE", message, retryable: true },
    503,
  );
}

function decodeBase64(value: string): Uint8Array {
  const bytes = Uint8Array.from(Buffer.from(value, "base64"));
  if (bytes.length === 0 || bytes.length > 8_000_000) {
    throw new VenueManagementServiceError(
      { code: "INVALID_REQUEST", message: "Upload a PNG, JPEG, or WebP image under 8 MB.", retryable: false },
      400,
    );
  }
  return bytes;
}

function readBearerToken(request: Request): string {
  const authorization = request.header("authorization") ?? "";
  const match = authorization.match(/^Bearer (.+)$/i);
  return match?.[1] ?? "";
}

function logServerError(request: Request, error: VenueError): void {
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "error",
      service: "web",
      event: "venue_request_failed",
      method: request.method,
      path: request.path,
      error_code: error.code,
      trace_id: error.traceId ?? null,
    }),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
