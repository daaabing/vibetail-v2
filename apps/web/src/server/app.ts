import {
  createMenuInputSchema,
  globalMatchRequestSchema,
  menuItemInputSchema,
  restaurantErrorSchema,
  restaurantPreferencesSchema,
  updateAvailabilityInputSchema,
  updateMenuInputSchema,
  updateMerchantInputSchema,
  type RestaurantError,
} from "@vibetail/contracts";
import {
  ManagementServiceError,
  RestaurantRepositoryUnavailableError,
  RestaurantServiceError,
  type DefaultRestaurantService,
  type ManagementService,
} from "@vibetail/restaurant-core";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { ZodError } from "zod";

export interface WebAppOptions {
  restaurantService: DefaultRestaurantService;
  managementService: ManagementService;
  dataSource: "fixture" | "supabase";
  checkReadiness?: () => Promise<Array<{ name: string; ready: boolean; detail: string }>>;
  testFrontend?: boolean;
}

export function createWebApp(options: WebAppOptions): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "32kb" }));

  app.get("/health", (_request, response) => {
    response.json({ status: "ok", service: "web", timestamp: new Date().toISOString() });
  });

  app.get(
    "/ready",
    asyncRoute(async (_request, response) => {
      const checks = options.checkReadiness
        ? await options.checkReadiness()
        : [{ name: "restaurant_repository", ready: true, detail: options.dataSource }];
      const ready = checks.every((check) => check.ready);
      response.status(ready ? 200 : 503).json({
        status: ready ? "ready" : "not_ready",
        service: "web",
        checks,
        timestamp: new Date().toISOString(),
      });
    }),
  );

  app.get(
    "/v1/restaurants",
    asyncRoute(async (_request, response) => {
      response.json(await options.restaurantService.listActiveRestaurants());
    }),
  );

  app.get(
    "/v1/restaurants/:merchantSlug",
    asyncRoute(async (request, response) => {
      response.json(await options.restaurantService.getRestaurant(request.params.merchantSlug ?? ""));
    }),
  );

  app.post(
    "/v1/matches/global",
    asyncRoute(async (request, response) => {
      const { preferences } = globalMatchRequestSchema.parse(request.body);
      response.json(await options.restaurantService.matchGlobalItem(preferences));
    }),
  );

  app.get(
    "/v1/restaurants/:merchantSlug/menus/:menuSlug",
    asyncRoute(async (request, response) => {
      const menu = await options.restaurantService.getPublishedRestaurantMenu(
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
    "/v1/restaurants/:merchantSlug/menus/:menuSlug/match",
    asyncRoute(async (request, response) => {
      const rawPreferences = isRecord(request.body) && "preferences" in request.body
        ? request.body.preferences
        : request.body;
      const preferences = restaurantPreferencesSchema.parse(rawPreferences);
      const result = await options.restaurantService.matchRestaurantItem({
        merchantSlug: request.params.merchantSlug ?? "",
        menuSlug: request.params.menuSlug ?? "",
        preferences,
      });
      response.json(result);
    }),
  );

  app.use("/v1", (_request, response) => {
    response.status(404).json({
      code: "MENU_NOT_FOUND",
      message: "API route not found.",
      retryable: false,
    } satisfies RestaurantError);
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

function mapError(error: unknown): { status: number; body: RestaurantError } {
  if (error instanceof RestaurantServiceError) {
    return { status: error.httpStatus, body: restaurantErrorSchema.parse(error.detail) };
  }
  if (error instanceof ManagementServiceError) {
    return { status: error.httpStatus, body: restaurantErrorSchema.parse(error.detail) };
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
  if (error instanceof RestaurantRepositoryUnavailableError) {
    return {
      status: 503,
      body: {
        code: "INTERNAL_ERROR",
        message: "Restaurant data is temporarily unavailable.",
        retryable: true,
      },
    };
  }
  return {
    status: 500,
    body: { code: "INTERNAL_ERROR", message: "Unexpected server error.", retryable: true },
  };
}

function readBearerToken(request: Request): string {
  const authorization = request.header("authorization") ?? "";
  const match = authorization.match(/^Bearer (.+)$/i);
  return match?.[1] ?? "";
}

function logServerError(request: Request, error: RestaurantError): void {
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "error",
      service: "web",
      event: "restaurant_request_failed",
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
