import {
  deleteDrinkResultSchema,
  drinkInfoSuggestionSchema,
  drinkUsageSchema,
  importScannedMenuResultSchema,
  menuPhotoScanResultSchema,
  prepareDrinkPhotoResultSchema,
  venueAdminMenuSchema,
  venueDashboardStatsSchema,
  venueDrinkSchema,
  venueLoginResultSchema,
  venueQrSchema,
  venueSessionInfoSchema,
  type CreateVenueInput,
  type CreateVenueMenuInput,
  type DeleteDrinkResult,
  type DrinkInfoRequestInput,
  type DrinkInfoSuggestion,
  type DrinkInput,
  type DrinkUsage,
  type ImportScannedMenuInput,
  type ImportScannedMenuResult,
  type MenuPhotoScanInput,
  type MenuPhotoScanResult,
  type MenuUrlScanInput,
  type PrepareDrinkPhotoInput,
  type PrepareDrinkPhotoResult,
  type UpdateVenueMenuInput,
  type UpdateVenueProfileInput,
  type VenueAdminMenu,
  type VenueDashboardRange,
  type VenueDashboardStats,
  type VenueDrink,
  type VenueLoginInput,
  type VenueLoginResult,
  type VenueManagementClient,
  type VenueQr,
  type VenueSessionInfo,
} from "@vibetail/contracts";
import { z } from "zod";
import { parseResponse } from "./http-venue-client.js";

export class HttpVenueManagementClient implements VenueManagementClient {
  constructor(private readonly token: string | null = null, private readonly baseUrl = "") {}

  login(input: VenueLoginInput): Promise<VenueLoginResult> {
    return this.call("POST", "/v1/venue/session", input, venueLoginResultSchema.parse);
  }

  getSession(): Promise<VenueSessionInfo> {
    return this.call("GET", "/v1/venue/session", undefined, venueSessionInfoSchema.parse);
  }

  async logout(): Promise<void> {
    await this.call("DELETE", "/v1/venue/session", undefined, () => undefined);
  }

  createVenue(input: CreateVenueInput): Promise<VenueSessionInfo> {
    return this.call("POST", "/v1/venue", input, venueSessionInfoSchema.parse);
  }

  updateVenueProfile(input: UpdateVenueProfileInput): Promise<VenueSessionInfo> {
    return this.call("PATCH", "/v1/venue", input, venueSessionInfoSchema.parse);
  }

  getDashboard(range: VenueDashboardRange): Promise<VenueDashboardStats> {
    return this.call("GET", `/v1/venue/dashboard?range=${range}`, undefined, venueDashboardStatsSchema.parse);
  }

  getQr(): Promise<VenueQr> {
    return this.call("GET", "/v1/venue/qr", undefined, venueQrSchema.parse);
  }

  listDrinks(): Promise<VenueDrink[]> {
    return this.call("GET", "/v1/venue/drinks", undefined, z.array(venueDrinkSchema).parse);
  }

  createDrink(input: DrinkInput): Promise<VenueDrink> {
    return this.call("POST", "/v1/venue/drinks", input, venueDrinkSchema.parse);
  }

  updateDrink(drinkId: string, input: DrinkInput): Promise<VenueDrink> {
    return this.call("PATCH", `/v1/venue/drinks/${encodeURIComponent(drinkId)}`, input, venueDrinkSchema.parse);
  }

  getDrinkUsage(drinkId: string): Promise<DrinkUsage> {
    return this.call("GET", `/v1/venue/drinks/${encodeURIComponent(drinkId)}/usage`, undefined, drinkUsageSchema.parse);
  }

  deleteDrink(drinkId: string): Promise<DeleteDrinkResult> {
    return this.call("DELETE", `/v1/venue/drinks/${encodeURIComponent(drinkId)}`, undefined, deleteDrinkResultSchema.parse);
  }

  suggestDrinkInfo(input: DrinkInfoRequestInput): Promise<DrinkInfoSuggestion> {
    return this.call("POST", "/v1/venue/drinks/suggest", input, drinkInfoSuggestionSchema.parse);
  }

  scanMenuPhoto(input: MenuPhotoScanInput): Promise<MenuPhotoScanResult> {
    return this.call("POST", "/v1/venue/menus/scan-photo", input, menuPhotoScanResultSchema.parse);
  }

  scanMenuUrl(input: MenuUrlScanInput): Promise<MenuPhotoScanResult> {
    return this.call("POST", "/v1/venue/menus/scan-url", input, menuPhotoScanResultSchema.parse);
  }

  importScannedMenu(input: ImportScannedMenuInput): Promise<ImportScannedMenuResult> {
    return this.call("POST", "/v1/venue/menus/import-scan", input, importScannedMenuResultSchema.parse);
  }

  prepareDrinkPhoto(input: PrepareDrinkPhotoInput): Promise<PrepareDrinkPhotoResult> {
    return this.call("POST", "/v1/venue/drinks/photo", input, prepareDrinkPhotoResultSchema.parse);
  }

  listMenus(): Promise<VenueAdminMenu[]> {
    return this.call("GET", "/v1/venue/menus", undefined, z.array(venueAdminMenuSchema).parse);
  }

  createMenu(input: CreateVenueMenuInput): Promise<VenueAdminMenu> {
    return this.call("POST", "/v1/venue/menus", input, venueAdminMenuSchema.parse);
  }

  updateMenu(menuId: string, input: UpdateVenueMenuInput): Promise<VenueAdminMenu> {
    return this.call("PATCH", `/v1/venue/menus/${encodeURIComponent(menuId)}`, input, venueAdminMenuSchema.parse);
  }

  async deleteMenu(menuId: string): Promise<void> {
    await this.call("DELETE", `/v1/venue/menus/${encodeURIComponent(menuId)}`, undefined, () => undefined);
  }

  publishMenu(menuId: string): Promise<VenueAdminMenu[]> {
    return this.call("POST", `/v1/venue/menus/${encodeURIComponent(menuId)}/publish`, undefined, z.array(venueAdminMenuSchema).parse);
  }

  private async call<T>(method: string, path: string, body: unknown, parse: (input: unknown) => T): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return parseResponse(response, parse);
  }
}
