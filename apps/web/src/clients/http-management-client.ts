import {
  managedMerchantSchema,
  managedMenuSchema,
  type CreateMenuInput,
  type ManagedMenu,
  type ManagedMerchant,
  type ManagementClient,
  type MenuItemInput,
  type UpdateAvailabilityInput,
  type UpdateMenuInput,
  type UpdateMerchantInput,
} from "@vibetail/contracts";
import { z } from "zod";
import { parseResponse } from "./http-restaurant-client.js";

export class HttpManagementClient implements ManagementClient {
  constructor(private readonly token: string, private readonly baseUrl = "") {}
  getManagedMerchant(): Promise<ManagedMerchant> { return this.call("GET", "/v1/management/merchant", undefined, managedMerchantSchema.parse); }
  listMenus(): Promise<ManagedMenu[]> { return this.call("GET", "/v1/management/menus", undefined, z.array(managedMenuSchema).parse); }
  updateMerchant(input: UpdateMerchantInput): Promise<ManagedMerchant> { return this.call("PATCH", "/v1/management/merchant", input, managedMerchantSchema.parse); }
  createMenu(input: CreateMenuInput): Promise<ManagedMerchant> { return this.call("POST", "/v1/management/menus", input, managedMerchantSchema.parse); }
  updateMenu(menuId: string, input: UpdateMenuInput): Promise<ManagedMerchant> { return this.call("PATCH", `/v1/management/menus/${menuId}`, input, managedMerchantSchema.parse); }
  publishMenu(menuId: string): Promise<ManagedMerchant> { return this.call("POST", `/v1/management/menus/${menuId}/publish`, undefined, managedMerchantSchema.parse); }
  createMenuItem(menuId: string, input: MenuItemInput): Promise<ManagedMerchant> { return this.call("POST", `/v1/management/menus/${menuId}/items`, input, managedMerchantSchema.parse); }
  updateMenuItem(itemId: string, input: MenuItemInput): Promise<ManagedMerchant> { return this.call("PATCH", `/v1/management/items/${itemId}`, input, managedMerchantSchema.parse); }
  updateMenuItemAvailability(itemId: string, input: UpdateAvailabilityInput): Promise<ManagedMerchant> { return this.call("PATCH", `/v1/management/items/${itemId}/availability`, input, managedMerchantSchema.parse); }

  private async call<T>(method: string, path: string, body: unknown, parse: (input: unknown) => T): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: { authorization: `Bearer ${this.token}`, ...(body === undefined ? {} : { "content-type": "application/json" }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return parseResponse(response, parse);
  }
}
