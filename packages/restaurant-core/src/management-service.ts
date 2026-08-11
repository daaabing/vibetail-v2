import {
  createMenuInputSchema,
  managedMerchantSchema,
  menuItemInputSchema,
  updateAvailabilityInputSchema,
  updateMenuInputSchema,
  updateMerchantInputSchema,
  type CreateMenuInput,
  type ManagedMenu,
  type ManagedMerchant,
  type MenuItemInput,
  type RestaurantError,
  type UpdateAvailabilityInput,
  type UpdateMenuInput,
  type UpdateMerchantInput,
} from "@vibetail/contracts";
import type { ManagementRepository, StoredRestaurant } from "./types.js";

export class ManagementServiceError extends Error {
  override readonly name = "ManagementServiceError";

  constructor(
    readonly detail: RestaurantError,
    readonly httpStatus: number,
  ) {
    super(detail.message);
  }
}

export interface ManagementService {
  getManagedMerchant(token: string): Promise<ManagedMerchant>;
  updateMerchant(token: string, input: UpdateMerchantInput): Promise<ManagedMerchant>;
  listMenus(token: string): Promise<ManagedMenu[]>;
  createMenu(token: string, input: CreateMenuInput): Promise<ManagedMerchant>;
  updateMenu(token: string, menuId: string, input: UpdateMenuInput): Promise<ManagedMerchant>;
  publishMenu(token: string, menuId: string): Promise<ManagedMerchant>;
  createMenuItem(token: string, menuId: string, input: MenuItemInput): Promise<ManagedMerchant>;
  updateMenuItem(token: string, menuItemId: string, input: MenuItemInput): Promise<ManagedMerchant>;
  updateMenuItemAvailability(
    token: string,
    menuItemId: string,
    input: UpdateAvailabilityInput,
  ): Promise<ManagedMerchant>;
}

/** Keeps public Supabase reads available when the privileged management key is not configured. */
export class UnavailableManagementService implements ManagementService {
  async getManagedMerchant(token: string): Promise<ManagedMerchant> {
    void token;
    return managementUnavailable();
  }

  async updateMerchant(token: string, input: UpdateMerchantInput): Promise<ManagedMerchant> {
    void token;
    void input;
    return managementUnavailable();
  }

  async listMenus(token: string): Promise<ManagedMenu[]> {
    void token;
    return managementUnavailable();
  }

  async createMenu(token: string, input: CreateMenuInput): Promise<ManagedMerchant> {
    void token;
    void input;
    return managementUnavailable();
  }

  async updateMenu(token: string, menuId: string, input: UpdateMenuInput): Promise<ManagedMerchant> {
    void token;
    void menuId;
    void input;
    return managementUnavailable();
  }

  async publishMenu(token: string, menuId: string): Promise<ManagedMerchant> {
    void token;
    void menuId;
    return managementUnavailable();
  }

  async createMenuItem(token: string, menuId: string, input: MenuItemInput): Promise<ManagedMerchant> {
    void token;
    void menuId;
    void input;
    return managementUnavailable();
  }

  async updateMenuItem(token: string, menuItemId: string, input: MenuItemInput): Promise<ManagedMerchant> {
    void token;
    void menuItemId;
    void input;
    return managementUnavailable();
  }

  async updateMenuItemAvailability(
    token: string,
    menuItemId: string,
    input: UpdateAvailabilityInput,
  ): Promise<ManagedMerchant> {
    void token;
    void menuItemId;
    void input;
    return managementUnavailable();
  }
}

export class DefaultManagementService implements ManagementService {
  constructor(private readonly repository: ManagementRepository) {}

  async getManagedMerchant(token: string): Promise<ManagedMerchant> {
    const merchantId = await this.authorize(token);
    return this.readMerchant(merchantId);
  }

  async updateMerchant(token: string, input: UpdateMerchantInput): Promise<ManagedMerchant> {
    const merchantId = await this.authorize(token);
    await this.mutate(() => this.repository.updateMerchant(merchantId, updateMerchantInputSchema.parse(input)));
    return this.readMerchant(merchantId);
  }

  async listMenus(token: string): Promise<ManagedMenu[]> {
    return (await this.getManagedMerchant(token)).menus;
  }

  async createMenu(token: string, input: CreateMenuInput): Promise<ManagedMerchant> {
    const merchantId = await this.authorize(token);
    await this.mutate(() => this.repository.createMenu(merchantId, createMenuInputSchema.parse(input)));
    return this.readMerchant(merchantId);
  }

  async updateMenu(token: string, menuId: string, input: UpdateMenuInput): Promise<ManagedMerchant> {
    const merchantId = await this.authorize(token);
    await this.mutate(() => this.repository.updateMenu(merchantId, menuId, updateMenuInputSchema.parse(input)));
    return this.readMerchant(merchantId);
  }

  async publishMenu(token: string, menuId: string): Promise<ManagedMerchant> {
    const merchantId = await this.authorize(token);
    await this.mutate(() => this.repository.publishMenu(merchantId, menuId));
    return this.readMerchant(merchantId);
  }

  async createMenuItem(token: string, menuId: string, input: MenuItemInput): Promise<ManagedMerchant> {
    const merchantId = await this.authorize(token);
    await this.mutate(() => this.repository.createMenuItem(merchantId, menuId, menuItemInputSchema.parse(input)));
    return this.readMerchant(merchantId);
  }

  async updateMenuItem(token: string, menuItemId: string, input: MenuItemInput): Promise<ManagedMerchant> {
    const merchantId = await this.authorize(token);
    await this.mutate(() => this.repository.updateMenuItem(merchantId, menuItemId, menuItemInputSchema.parse(input)));
    return this.readMerchant(merchantId);
  }

  async updateMenuItemAvailability(
    token: string,
    menuItemId: string,
    input: UpdateAvailabilityInput,
  ): Promise<ManagedMerchant> {
    const merchantId = await this.authorize(token);
    await this.mutate(() => this.repository.updateMenuItemAvailability(
      merchantId,
      menuItemId,
      updateAvailabilityInputSchema.parse(input),
    ));
    return this.readMerchant(merchantId);
  }

  private async authorize(token: string): Promise<string> {
    if (token.length < 16) throw unauthorized();
    const merchantId = await this.repository.verifyManagementToken(token);
    if (!merchantId) throw unauthorized();
    return merchantId;
  }

  private async readMerchant(merchantId: string): Promise<ManagedMerchant> {
    const merchant = await this.repository.getManagedMerchant(merchantId);
    if (!merchant) throw forbidden();
    return toManagedMerchant(merchant);
  }

  private async mutate(operation: () => Promise<unknown>): Promise<void> {
    try {
      await operation();
    } catch (error) {
      if (error instanceof Error && error.message.includes("already exists")) {
        throw new ManagementServiceError(
          { code: "CONFLICT", message: "That slug is already in use.", retryable: false },
          409,
        );
      }
      if (error instanceof Error && error.message.includes("active item")) {
        throw new ManagementServiceError(
          { code: "CONFLICT", message: "A menu needs at least one active item before publishing.", retryable: false },
          409,
        );
      }
      throw forbidden();
    }
  }
}

function toManagedMerchant(merchant: StoredRestaurant): ManagedMerchant {
  return managedMerchantSchema.parse({
    id: merchant.id,
    slug: merchant.slug,
    name: merchant.name,
    shortIntro: merchant.shortIntro,
    logoUrl: merchant.logoUrl,
    coverImageUrl: merchant.coverImageUrl,
    isActive: merchant.isActive,
    menus: merchant.menus.map((menu) => ({
      id: menu.id,
      slug: menu.slug,
      name: menu.name,
      status: menu.status,
      publishedVersionId: menu.publishedVersionId,
      shortIntro: menu.shortIntro,
      coverImageUrl: menu.coverImageUrl,
      items: menu.items.map((item) => ({ ...item, menuId: menu.id })),
    })),
  });
}

function unauthorized(): ManagementServiceError {
  return new ManagementServiceError(
    { code: "UNAUTHORIZED", message: "Invalid or revoked management link.", retryable: false },
    401,
  );
}

function forbidden(): ManagementServiceError {
  return new ManagementServiceError(
    { code: "FORBIDDEN", message: "This management action is not allowed.", retryable: false },
    403,
  );
}

function managementUnavailable(): never {
  throw new ManagementServiceError(
    {
      code: "INTERNAL_ERROR",
      message: "Management is unavailable until the server-only Supabase service-role key is configured.",
      retryable: false,
    },
    503,
  );
}
