import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  createVenueInputSchema,
  createVenueMenuInputSchema,
  deleteDrinkResultSchema,
  drinkInfoRequestSchema,
  drinkInfoSuggestionSchema,
  drinkInputSchema,
  drinkUsageSchema,
  feedbackInputSchema,
  importScannedMenuInputSchema,
  importScannedMenuResultSchema,
  menuPhotoScanInputSchema,
  menuPhotoScanResultSchema,
  menuUrlScanInputSchema,
  menuViewEventSchema,
  prepareDrinkPhotoInputSchema,
  prepareDrinkPhotoResultSchema,
  updateVenueMenuInputSchema,
  venueAdminMenuSchema,
  venueDashboardStatsSchema,
  venueDrinkSchema,
  venueLoginInputSchema,
  venueProfileSchema,
  venueQrSchema,
  venueSessionInfoSchema,
  type CreateVenueInput,
  type CreateVenueMenuInput,
  type DeleteDrinkResult,
  type DrinkInfoRequestInput,
  type DrinkInfoSuggestion,
  type DrinkInput,
  type DrinkUsage,
  type FeedbackInput,
  type FeedbackReceipt,
  type ImportScannedMenuInput,
  type ImportScannedMenuResult,
  type MenuViewEvent,
  type MenuPhotoScanInput,
  type MenuPhotoScanResult,
  type MenuUrlScanInput,
  type PrepareDrinkPhotoInput,
  type PrepareDrinkPhotoResult,
  type UpdateVenueMenuInput,
  type VenueAdminMenu,
  type VenueDashboardRange,
  type VenueDashboardStats,
  type VenueDrink,
  type VenueError,
  type VenueLoginResult,
  type VenueMatchResult,
  type VenueQr,
  type VenueSessionInfo,
  type SavedDrink,
  type SharedMatch,
} from "@vibetail/contracts";
import type { DrinkInfoProvider, DrinkPhotoProvider, MenuPhotoScanProvider } from "@vibetail/model-providers";
import type { IdentityVerifier } from "./identity.js";
import type {
  StoredFeedbackEntry,
  StoredMatchEvent,
  StoredVenueAccount,
  VenueManagementRepository,
} from "./types.js";
import type { VenueMediaStorage } from "./venue-media-storage.js";

const DRINK_INFO_TIMEOUT_MS = 20_000;
const MENU_PHOTO_TIMEOUT_MS = 45_000;
const DASHBOARD_EVENT_LIMIT = 5_000;

export class VenueManagementServiceError extends Error {
  override readonly name = "VenueManagementServiceError";

  constructor(
    readonly detail: VenueError,
    readonly httpStatus: number,
  ) {
    super(detail.message);
  }
}

export interface VenueManagementService {
  login(name: string): Promise<VenueLoginResult>;
  getSession(token: string): Promise<VenueSessionInfo>;
  logout(token: string): Promise<void>;
  /**
   * Best-effort account lookup for public consumer routes, where signing in is
   * optional. Anonymous, invalid, and expired tokens all resolve to null so the
   * guest flow never fails on an auth problem.
   */
  resolveAccountId(token: string): Promise<string | null>;
  /** Shared result card for /r/{matchId}; throws MATCH_NOT_FOUND for unknown or pre-snapshot rows. */
  getSharedMatch(matchId: string): Promise<SharedMatch>;
  saveToVibeBar(token: string, matchId: string): Promise<{ status: "created" | "duplicate" }>;
  listVibeBar(token: string): Promise<SavedDrink[]>;
  createVenue(token: string, input: CreateVenueInput): Promise<VenueSessionInfo>;
  getDashboard(token: string, range: VenueDashboardRange, now?: Date): Promise<VenueDashboardStats>;
  getQr(token: string): Promise<VenueQr>;
  listDrinks(token: string): Promise<VenueDrink[]>;
  createDrink(token: string, input: DrinkInput): Promise<VenueDrink>;
  updateDrink(token: string, drinkId: string, input: DrinkInput): Promise<VenueDrink>;
  getDrinkUsage(token: string, drinkId: string): Promise<DrinkUsage>;
  deleteDrink(token: string, drinkId: string): Promise<DeleteDrinkResult>;
  suggestDrinkInfo(token: string, input: DrinkInfoRequestInput): Promise<DrinkInfoSuggestion>;
  scanMenuPhoto(token: string, input: MenuPhotoScanInput): Promise<MenuPhotoScanResult>;
  scanMenuUrl(token: string, input: MenuUrlScanInput): Promise<MenuPhotoScanResult>;
  importScannedMenu(token: string, input: ImportScannedMenuInput): Promise<ImportScannedMenuResult>;
  prepareDrinkPhoto(token: string, input: PrepareDrinkPhotoInput): Promise<PrepareDrinkPhotoResult>;
  listMenus(token: string): Promise<VenueAdminMenu[]>;
  createMenu(token: string, input: CreateVenueMenuInput): Promise<VenueAdminMenu>;
  updateMenu(token: string, menuId: string, input: UpdateVenueMenuInput): Promise<VenueAdminMenu>;
  deleteMenu(token: string, menuId: string): Promise<void>;
  publishMenu(token: string, menuId: string): Promise<VenueAdminMenu[]>;
  recordMenuView(event: MenuViewEvent): Promise<void>;
  recordMatch(result: VenueMatchResult, accountId?: string | null, originalVibe?: string | null): Promise<string | null>;
  submitFeedback(matchId: string, input: FeedbackInput, accountId?: string | null): Promise<FeedbackReceipt>;
}

export interface VenueManagementServiceOptions {
  appUrl: string;
  /**
   * When set, bearer tokens are provider-issued JWTs and the legacy
   * account-name login is refused. Absent means passwordless local mode.
   */
  identityVerifier?: IdentityVerifier;
  drinkInfoProvider?: DrinkInfoProvider;
  menuPhotoScanProvider?: MenuPhotoScanProvider;
  drinkPhotoProvider?: DrinkPhotoProvider;
  mediaStorage?: VenueMediaStorage;
  renderQrSvg?: (text: string) => Promise<string>;
}

export class DefaultVenueManagementService implements VenueManagementService {
  private readonly appUrl: string;

  constructor(
    private readonly repository: VenueManagementRepository,
    private readonly options: VenueManagementServiceOptions,
  ) {
    this.appUrl = options.appUrl.replace(/\/+$/, "");
  }

  async login(name: string): Promise<VenueLoginResult> {
    if (this.options.identityVerifier) {
      throw new VenueManagementServiceError(
        {
          code: "INVALID_REQUEST",
          message: "This deployment signs in with Google. Use the Google button instead.",
          retryable: false,
        },
        400,
      );
    }
    const displayName = venueLoginInputSchema.parse({ name }).name;
    const normalized = normalizeAccountName(displayName);
    const account = await this.repository.findOrCreateAccount(normalized, displayName);
    const token = randomBytes(32).toString("hex");
    await this.repository.createVenueSession(account.id, sha256Hex(token));
    return { token, session: await this.buildSession(account) };
  }

  async getSession(token: string): Promise<VenueSessionInfo> {
    const account = await this.authorize(token);
    return this.buildSession(account);
  }

  async logout(token: string): Promise<void> {
    // Provider-issued tokens are revoked by the identity provider on the client;
    // there is no server-side session row to retire.
    if (this.options.identityVerifier) return;
    if (token.length < 16) return;
    await this.repository.revokeVenueSession(sha256Hex(token));
  }

  async resolveAccountId(token: string): Promise<string | null> {
    if (!token) return null;
    try {
      const account = await this.authorize(token);
      return account.id;
    } catch {
      return null;
    }
  }

  async getSharedMatch(matchId: string): Promise<SharedMatch> {
    if (!UUID_PATTERN.test(matchId)) throw matchNotFound();
    const snapshot = await this.repository.getMatchSnapshot(matchId);
    if (!snapshot) throw matchNotFound();
    return snapshot;
  }

  async saveToVibeBar(token: string, matchId: string): Promise<{ status: "created" | "duplicate" }> {
    const account = await this.authorize(token);
    if (!UUID_PATTERN.test(matchId)) throw matchNotFound();
    const outcome = await this.repository.saveDrink(account.id, matchId);
    if (outcome === "match_not_found") throw matchNotFound();
    return { status: outcome };
  }

  async listVibeBar(token: string): Promise<SavedDrink[]> {
    const account = await this.authorize(token);
    return this.repository.listSavedDrinks(account.id, 100);
  }

  async createVenue(token: string, input: CreateVenueInput): Promise<VenueSessionInfo> {
    const account = await this.authorize(token);
    if (account.merchantId) {
      throw new VenueManagementServiceError(
        { code: "CONFLICT", message: "This account already manages a venue.", retryable: false },
        409,
      );
    }
    const parsed = createVenueInputSchema.parse(input);
    await this.mutate(() => this.repository.createVenue(account.id, {
      name: parsed.name,
      slugBase: slugify(parsed.name),
      address: parsed.address,
      venueType: parsed.venueType,
    }));
    const refreshed = await this.authorize(token);
    return this.buildSession(refreshed);
  }

  async getDashboard(token: string, range: VenueDashboardRange, now: Date = new Date()): Promise<VenueDashboardStats> {
    const merchantId = await this.requireVenue(token);
    const since = rangeStart(range, now);
    const sinceIso = since.toISOString();
    const [menuViews, matches, feedback] = await Promise.all([
      this.repository.countMenuViews(merchantId, sinceIso),
      this.repository.listMatchEvents(merchantId, sinceIso, DASHBOARD_EVENT_LIMIT),
      this.repository.listFeedback(merchantId, sinceIso, DASHBOARD_EVENT_LIMIT),
    ]);
    return computeDashboard(range, sinceIso, menuViews, matches, feedback);
  }

  async getQr(token: string): Promise<VenueQr> {
    const merchantId = await this.requireVenue(token);
    const profile = await this.repository.getVenueProfile(merchantId);
    if (!profile) throw forbidden();
    const renderQrSvg = this.options.renderQrSvg;
    if (!renderQrSvg) {
      throw new VenueManagementServiceError(
        { code: "INTERNAL_ERROR", message: "QR rendering is not configured on this server.", retryable: false },
        503,
      );
    }
    // Single-segment URL stays stable across re-publishes, so printed codes never expire.
    const consumerUrl = `${this.appUrl}/m/${profile.slug}`;
    return venueQrSchema.parse({ consumerUrl, qrSvg: await renderQrSvg(consumerUrl) });
  }

  async listDrinks(token: string): Promise<VenueDrink[]> {
    const merchantId = await this.requireVenue(token);
    const drinks = await this.repository.listDrinks(merchantId);
    return drinks.map((drink) => venueDrinkSchema.parse(drink));
  }

  async createDrink(token: string, input: DrinkInput): Promise<VenueDrink> {
    const merchantId = await this.requireVenue(token);
    const parsed = drinkInputSchema.parse(input);
    const drinkId = await this.mutate(() => this.repository.createDrink(merchantId, parsed));
    return this.readDrink(merchantId, drinkId);
  }

  async updateDrink(token: string, drinkId: string, input: DrinkInput): Promise<VenueDrink> {
    const merchantId = await this.requireVenue(token);
    const parsed = drinkInputSchema.parse(input);
    await this.mutate(() => this.repository.updateDrink(merchantId, drinkId, parsed));
    return this.readDrink(merchantId, drinkId);
  }

  async getDrinkUsage(token: string, drinkId: string): Promise<DrinkUsage> {
    const merchantId = await this.requireVenue(token);
    const menus = await this.mutate(() => this.repository.listDrinkMenuRefs(merchantId, drinkId));
    return drinkUsageSchema.parse({
      menus: menus.map((menu) => ({ id: menu.id, name: menu.name, status: menu.status })),
    });
  }

  async deleteDrink(token: string, drinkId: string): Promise<DeleteDrinkResult> {
    const merchantId = await this.requireVenue(token);
    const removedFromMenus = await this.mutate(() => this.repository.deleteDrink(merchantId, drinkId));
    return deleteDrinkResultSchema.parse({ removedFromMenus });
  }

  async suggestDrinkInfo(token: string, input: DrinkInfoRequestInput): Promise<DrinkInfoSuggestion> {
    await this.requireVenue(token);
    const provider = this.options.drinkInfoProvider;
    if (!provider) throw drinkInfoUnavailable();
    const parsed = drinkInfoRequestSchema.parse(input);
    try {
      const result = await provider.suggestDrinkInfo({
        name: parsed.name,
        description: parsed.description,
        ingredients: parsed.ingredients,
        traceId: randomUUID(),
        timeoutMs: DRINK_INFO_TIMEOUT_MS,
      });
      return drinkInfoSuggestionSchema.parse(result.suggestion);
    } catch (error) {
      if (error instanceof VenueManagementServiceError) throw error;
      throw drinkInfoUnavailable();
    }
  }

  async scanMenuPhoto(token: string, input: MenuPhotoScanInput): Promise<MenuPhotoScanResult> {
    await this.requireVenue(token);
    const provider = this.options.menuPhotoScanProvider;
    if (!provider) throw mediaUnavailable("Menu photo scanning is not configured on this server.");
    const parsed = menuPhotoScanInputSchema.parse(input);
    try {
      const scan = await provider.scanMenuPhoto({
        image: { bytes: decodeBase64(parsed.imageBase64), contentType: parsed.imageContentType },
        ...(parsed.fileName ? { fileName: parsed.fileName } : {}),
        traceId: randomUUID(),
        timeoutMs: MENU_PHOTO_TIMEOUT_MS,
      });
      return menuPhotoScanResultSchema.parse({ ...scan, provider: provider.id });
    } catch (error) {
      if (error instanceof VenueManagementServiceError) throw error;
      throw mediaUnavailable("The menu photo could not be read. Try a clearer, well-lit photo.");
    }
  }

  async scanMenuUrl(token: string, input: MenuUrlScanInput): Promise<MenuPhotoScanResult> {
    await this.requireVenue(token);
    const provider = this.options.menuPhotoScanProvider;
    if (!provider) throw mediaUnavailable("Automatic menu fetching is not configured on this server.");
    const parsed = menuUrlScanInputSchema.parse(input);
    try {
      const scan = await provider.scanMenuUrl({
        sourceUrl: parsed.sourceUrl,
        traceId: randomUUID(),
        timeoutMs: MENU_PHOTO_TIMEOUT_MS,
      });
      return menuPhotoScanResultSchema.parse({ ...scan, provider: `${provider.id}-url` });
    } catch (error) {
      if (error instanceof VenueManagementServiceError) throw error;
      throw mediaUnavailable("The menu URL could not be imported.");
    }
  }

  async importScannedMenu(token: string, input: ImportScannedMenuInput): Promise<ImportScannedMenuResult> {
    const merchantId = await this.requireVenue(token);
    const parsed = importScannedMenuInputSchema.parse(input);
    const createdDrinks: VenueDrink[] = [];
    const drinkIds: string[] = [];
    for (const drink of parsed.drinks) {
      const drinkId = await this.mutate(() => this.repository.createDrink(merchantId, drink));
      drinkIds.push(drinkId);
      createdDrinks.push(await this.readDrink(merchantId, drinkId));
    }
    const menuId = await this.mutate(() => this.repository.createVenueMenu(merchantId, {
      name: parsed.name,
      slugBase: slugify(parsed.name),
      drinkIds,
    }));
    return importScannedMenuResultSchema.parse({
      menu: await this.readMenu(merchantId, menuId),
      drinks: createdDrinks,
    });
  }

  async prepareDrinkPhoto(token: string, input: PrepareDrinkPhotoInput): Promise<PrepareDrinkPhotoResult> {
    const merchantId = await this.requireVenue(token);
    const provider = this.options.drinkPhotoProvider;
    const storage = this.options.mediaStorage;
    if (!provider || !storage) throw mediaUnavailable("Drink photo uploads are not configured on this server.");
    const parsed = prepareDrinkPhotoInputSchema.parse(input);
    try {
      const image = parsed.sourceImageUrl
        ? await fetchDrinkPhotoFromUrl(parsed.sourceImageUrl, MENU_PHOTO_TIMEOUT_MS)
        : {
            bytes: decodeBase64(parsed.imageBase64!),
            contentType: parsed.imageContentType!,
          };
      const prepared = await provider.prepareDrinkPhoto({
        name: parsed.name,
        description: parsed.description,
        image,
        traceId: randomUUID(),
        timeoutMs: MENU_PHOTO_TIMEOUT_MS,
      });
      const stored = await storage.uploadDrinkPhoto({
        merchantId,
        objectId: randomUUID(),
        drinkName: parsed.name,
        bytes: prepared.bytes,
        contentType: prepared.contentType,
      });
      return prepareDrinkPhotoResultSchema.parse({
        imageUrl: stored.imageUrl,
        backgroundRemoved: prepared.backgroundRemoved,
        provider: provider.id,
      });
    } catch (error) {
      if (error instanceof VenueManagementServiceError) throw error;
      throw mediaUnavailable("The drink photo could not be prepared. Try a PNG, JPEG, or WebP under 8 MB.");
    }
  }

  async listMenus(token: string): Promise<VenueAdminMenu[]> {
    const merchantId = await this.requireVenue(token);
    const menus = await this.repository.listVenueMenus(merchantId);
    return menus.map((menu) => venueAdminMenuSchema.parse(menu));
  }

  async createMenu(token: string, input: CreateVenueMenuInput): Promise<VenueAdminMenu> {
    const merchantId = await this.requireVenue(token);
    const parsed = createVenueMenuInputSchema.parse(input);
    const menuId = await this.mutate(() => this.repository.createVenueMenu(merchantId, {
      name: parsed.name,
      slugBase: slugify(parsed.name),
      drinkIds: parsed.drinkIds,
    }));
    return this.readMenu(merchantId, menuId);
  }

  async updateMenu(token: string, menuId: string, input: UpdateVenueMenuInput): Promise<VenueAdminMenu> {
    const merchantId = await this.requireVenue(token);
    const parsed = updateVenueMenuInputSchema.parse(input);
    await this.mutate(() => this.repository.updateVenueMenu(merchantId, menuId, {
      ...(parsed.name === undefined ? {} : { name: parsed.name }),
      ...(parsed.drinkIds === undefined ? {} : { drinkIds: parsed.drinkIds }),
    }));
    return this.readMenu(merchantId, menuId);
  }

  async deleteMenu(token: string, menuId: string): Promise<void> {
    const merchantId = await this.requireVenue(token);
    await this.mutate(() => this.repository.deleteVenueMenu(merchantId, menuId));
  }

  async publishMenu(token: string, menuId: string): Promise<VenueAdminMenu[]> {
    const merchantId = await this.requireVenue(token);
    await this.mutate(() => this.repository.publishVenueMenu(merchantId, menuId));
    const menus = await this.repository.listVenueMenus(merchantId);
    return menus.map((menu) => venueAdminMenuSchema.parse(menu));
  }

  async recordMenuView(event: MenuViewEvent): Promise<void> {
    // Best-effort analytics: a failed write must never affect the consumer flow.
    try {
      const parsed = menuViewEventSchema.parse(event);
      await this.repository.recordMenuView(parsed.merchantSlug, parsed.menuId ?? null);
    } catch {
      return;
    }
  }

  async recordMatch(result: VenueMatchResult, accountId: string | null = null, originalVibe: string | null = null): Promise<string | null> {
    try {
      return await this.repository.recordMatchEvent({
        merchantId: result.venue.id,
        menuId: result.menu.id,
        itemId: result.item.id,
        itemName: result.item.name,
        traceId: result.traceId,
        accountId,
        snapshot: {
          originalVibe: originalVibe?.trim().slice(0, 500) || null,
          vibeName: result.vibeName,
          tastesLike: result.tastesLike,
          flavorProfile: result.flavorProfile,
          whyThisMatch: result.whyThisMatch,
          roast: result.roast,
          venueName: result.venue.name,
          venueSlug: result.venue.slug,
          menuName: result.menu.name,
          menuSlug: result.menu.slug,
        },
      });
    } catch {
      return null;
    }
  }

  async submitFeedback(
    matchId: string,
    input: FeedbackInput,
    accountId: string | null = null,
  ): Promise<FeedbackReceipt> {
    const parsed = feedbackInputSchema.parse(input);
    if (!UUID_PATTERN.test(matchId)) {
      throw matchNotFound();
    }
    const outcome = await this.repository.createFeedback(
      matchId,
      parsed.rating,
      parsed.comment ?? null,
      accountId,
    );
    if (outcome === "match_not_found") throw matchNotFound();
    if (outcome === "duplicate") {
      throw new VenueManagementServiceError(
        { code: "CONFLICT", message: "Feedback was already recorded for this match.", retryable: false },
        409,
      );
    }
    return { matchId, status: "recorded" };
  }

  private async authorize(token: string): Promise<StoredVenueAccount> {
    if (token.length < 16) throw unauthorized();
    const verifier = this.options.identityVerifier;
    if (verifier) {
      const identity = await verifier.verify(token);
      if (!identity) throw unauthorized();
      return this.repository.findOrCreateAccountByIdentity(identity);
    }
    const account = await this.repository.verifyVenueSession(sha256Hex(token));
    if (!account) throw unauthorized();
    return account;
  }

  private async requireVenue(token: string): Promise<string> {
    const account = await this.authorize(token);
    if (!account.merchantId) {
      throw new VenueManagementServiceError(
        { code: "FORBIDDEN", message: "Create your venue before using the venue backend.", retryable: false },
        403,
      );
    }
    return account.merchantId;
  }

  private async buildSession(account: StoredVenueAccount): Promise<VenueSessionInfo> {
    const profile = account.merchantId
      ? await this.repository.getVenueProfile(account.merchantId)
      : null;
    return venueSessionInfoSchema.parse({
      account: {
        id: account.id,
        name: account.nameNormalized,
        displayName: account.displayName,
        email: account.email,
      },
      venue: profile ? venueProfileSchema.parse(profile) : null,
    });
  }

  private async readDrink(merchantId: string, drinkId: string): Promise<VenueDrink> {
    const drinks = await this.repository.listDrinks(merchantId);
    const drink = drinks.find((entry) => entry.id === drinkId);
    if (!drink) throw forbidden();
    return venueDrinkSchema.parse(drink);
  }

  private async readMenu(merchantId: string, menuId: string): Promise<VenueAdminMenu> {
    const menus = await this.repository.listVenueMenus(merchantId);
    const menu = menus.find((entry) => entry.id === menuId);
    if (!menu) throw forbidden();
    return venueAdminMenuSchema.parse(menu);
  }

  private async mutate<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof Error && error.message.includes("already exists")) {
        throw new VenueManagementServiceError(
          { code: "CONFLICT", message: "That name is already in use.", retryable: false },
          409,
        );
      }
      if (error instanceof Error && error.message.includes("active drink")) {
        throw new VenueManagementServiceError(
          { code: "CONFLICT", message: "A menu needs at least one drink before publishing.", retryable: false },
          409,
        );
      }
      if (error instanceof Error && error.message.includes("unknown drink")) {
        throw invalidRequest("The menu references drinks that are not in your library.");
      }
      throw forbidden();
    }
  }
}

/** Keeps public reads available when the privileged Supabase key is not configured. */
export class UnavailableVenueManagementService implements VenueManagementService {
  async getSharedMatch(matchId: string): Promise<SharedMatch> {
    void matchId;
    return venueBackendUnavailable();
  }

  async saveToVibeBar(token: string, matchId: string): Promise<{ status: "created" | "duplicate" }> {
    void token;
    void matchId;
    return venueBackendUnavailable();
  }

  async listVibeBar(token: string): Promise<SavedDrink[]> {
    void token;
    return venueBackendUnavailable();
  }

  async login(name: string): Promise<VenueLoginResult> {
    void name;
    return venueBackendUnavailable();
  }

  async getSession(token: string): Promise<VenueSessionInfo> {
    void token;
    return venueBackendUnavailable();
  }

  async logout(token: string): Promise<void> {
    void token;
    venueBackendUnavailable();
  }

  async resolveAccountId(token: string): Promise<string | null> {
    void token;
    return null;
  }

  async createVenue(token: string, input: CreateVenueInput): Promise<VenueSessionInfo> {
    void token;
    void input;
    return venueBackendUnavailable();
  }

  async getDashboard(token: string, range: VenueDashboardRange, now?: Date): Promise<VenueDashboardStats> {
    void token;
    void range;
    void now;
    return venueBackendUnavailable();
  }

  async getQr(token: string): Promise<VenueQr> {
    void token;
    return venueBackendUnavailable();
  }

  async listDrinks(token: string): Promise<VenueDrink[]> {
    void token;
    return venueBackendUnavailable();
  }

  async createDrink(token: string, input: DrinkInput): Promise<VenueDrink> {
    void token;
    void input;
    return venueBackendUnavailable();
  }

  async updateDrink(token: string, drinkId: string, input: DrinkInput): Promise<VenueDrink> {
    void token;
    void drinkId;
    void input;
    return venueBackendUnavailable();
  }

  async getDrinkUsage(token: string, drinkId: string): Promise<DrinkUsage> {
    void token;
    void drinkId;
    return venueBackendUnavailable();
  }

  async deleteDrink(token: string, drinkId: string): Promise<DeleteDrinkResult> {
    void token;
    void drinkId;
    return venueBackendUnavailable();
  }

  async suggestDrinkInfo(token: string, input: DrinkInfoRequestInput): Promise<DrinkInfoSuggestion> {
    void token;
    void input;
    return venueBackendUnavailable();
  }

  async scanMenuPhoto(token: string, input: MenuPhotoScanInput): Promise<MenuPhotoScanResult> {
    void token;
    void input;
    return venueBackendUnavailable();
  }

  async scanMenuUrl(token: string, input: MenuUrlScanInput): Promise<MenuPhotoScanResult> {
    void token;
    void input;
    return venueBackendUnavailable();
  }

  async importScannedMenu(token: string, input: ImportScannedMenuInput): Promise<ImportScannedMenuResult> {
    void token;
    void input;
    return venueBackendUnavailable();
  }

  async prepareDrinkPhoto(token: string, input: PrepareDrinkPhotoInput): Promise<PrepareDrinkPhotoResult> {
    void token;
    void input;
    return venueBackendUnavailable();
  }

  async listMenus(token: string): Promise<VenueAdminMenu[]> {
    void token;
    return venueBackendUnavailable();
  }

  async createMenu(token: string, input: CreateVenueMenuInput): Promise<VenueAdminMenu> {
    void token;
    void input;
    return venueBackendUnavailable();
  }

  async updateMenu(token: string, menuId: string, input: UpdateVenueMenuInput): Promise<VenueAdminMenu> {
    void token;
    void menuId;
    void input;
    return venueBackendUnavailable();
  }

  async deleteMenu(token: string, menuId: string): Promise<void> {
    void token;
    void menuId;
    venueBackendUnavailable();
  }

  async publishMenu(token: string, menuId: string): Promise<VenueAdminMenu[]> {
    void token;
    void menuId;
    return venueBackendUnavailable();
  }

  async recordMenuView(event: MenuViewEvent): Promise<void> {
    // Public consumer beacons degrade to no-ops instead of failing the page.
    void event;
  }

  async recordMatch(result: VenueMatchResult, accountId?: string | null, originalVibe?: string | null): Promise<string | null> {
    void originalVibe;
    void result;
    void accountId;
    return null;
  }

  async submitFeedback(
    matchId: string,
    input: FeedbackInput,
    accountId?: string | null,
  ): Promise<FeedbackReceipt> {
    void matchId;
    void input;
    void accountId;
    return venueBackendUnavailable();
  }
}

export function computeDashboard(
  range: VenueDashboardRange,
  sinceIso: string,
  menuViews: number,
  matches: readonly StoredMatchEvent[],
  feedback: readonly StoredFeedbackEntry[],
): VenueDashboardStats {
  const byItem = new Map<string, { itemId: string; name: string; matches: number }>();
  for (const match of matches) {
    const existing = byItem.get(match.itemId);
    if (existing) {
      existing.matches += 1;
    } else {
      // Matches arrive newest-first, so the first name seen is the freshest snapshot.
      byItem.set(match.itemId, { itemId: match.itemId, name: match.itemName, matches: 1 });
    }
  }
  const topDrinks = [...byItem.values()]
    .sort((left, right) => right.matches - left.matches || left.name.localeCompare(right.name))
    .slice(0, 10);
  const averageRating = feedback.length > 0
    ? Math.round((feedback.reduce((sum, entry) => sum + entry.rating, 0) / feedback.length) * 10) / 10
    : null;
  return venueDashboardStatsSchema.parse({
    range,
    since: sinceIso,
    menuViews,
    totalMatches: matches.length,
    feedback: { total: feedback.length, averageRating },
    topDrinks,
    recentFeedback: feedback.slice(0, 20).map((entry) => ({
      id: entry.id,
      rating: entry.rating,
      comment: entry.comment,
      drinkName: entry.itemName,
      createdAt: entry.createdAt,
    })),
  });
}

export function rangeStart(range: VenueDashboardRange, now: Date): Date {
  if (range === "today") {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
  const days = range === "7d" ? 7 : 30;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export function normalizeAccountName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return base || "venue";
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function unauthorized(): VenueManagementServiceError {
  return new VenueManagementServiceError(
    { code: "UNAUTHORIZED", message: "Sign in to manage your venue.", retryable: false },
    401,
  );
}

function forbidden(): VenueManagementServiceError {
  return new VenueManagementServiceError(
    { code: "FORBIDDEN", message: "This venue action is not allowed.", retryable: false },
    403,
  );
}

function invalidRequest(message: string): VenueManagementServiceError {
  return new VenueManagementServiceError(
    { code: "INVALID_REQUEST", message, retryable: false },
    400,
  );
}

function matchNotFound(): VenueManagementServiceError {
  return new VenueManagementServiceError(
    { code: "MATCH_NOT_FOUND", message: "That match is unknown or has expired.", retryable: false },
    404,
  );
}

function drinkInfoUnavailable(): never {
  throw new VenueManagementServiceError(
    {
      code: "MATCH_PROVIDER_UNAVAILABLE",
      message: "Drink suggestions are temporarily unavailable. You can fill the fields manually.",
      retryable: true,
    },
    503,
  );
}

function mediaUnavailable(message: string): never {
  throw new VenueManagementServiceError(
    { code: "MATCH_PROVIDER_UNAVAILABLE", message, retryable: true },
    503,
  );
}

function decodeBase64(value: string): Uint8Array {
  const bytes = Uint8Array.from(Buffer.from(value, "base64"));
  if (bytes.length === 0 || bytes.length > 8_000_000) {
    throw invalidRequest("Upload a PNG, JPEG, or WebP image under 8 MB.");
  }
  return bytes;
}

async function fetchDrinkPhotoFromUrl(
  sourceUrl: string,
  timeoutMs: number,
): Promise<{ bytes: Uint8Array; contentType: "image/png" | "image/jpeg" | "image/webp" }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(sourceUrl, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        // Some CDNs reject bare Node fetch; look like a normal browser download.
        "user-agent": "Mozilla/5.0 (compatible; VibetailDrinkPhoto/1.0)",
        accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });
    if (!response.ok) {
      throw invalidRequest(`Could not download the image URL (${response.status}).`);
    }
    const headerType = (response.headers.get("content-type") ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length === 0 || bytes.length > 8_000_000) {
      throw invalidRequest("Image URL must point to a PNG, JPEG, or WebP under 8 MB.");
    }
    const sniffed = sniffImageContentType(bytes);
    const contentType = normalizeVenueImageContentType(headerType) ?? sniffed;
    if (!contentType) {
      throw invalidRequest("Image URL must be a PNG, JPEG, or WebP.");
    }
    return { bytes, contentType };
  } catch (error) {
    if (error instanceof VenueManagementServiceError) throw error;
    throw invalidRequest("Could not download the image URL. Check that it is a public PNG, JPEG, or WebP link.");
  } finally {
    clearTimeout(timer);
  }
}

function normalizeVenueImageContentType(
  value: string,
): "image/png" | "image/jpeg" | "image/webp" | undefined {
  if (value === "image/png" || value === "image/jpeg" || value === "image/webp") return value;
  if (value === "image/jpg") return "image/jpeg";
  return undefined;
}

function sniffImageContentType(bytes: Uint8Array): "image/png" | "image/jpeg" | "image/webp" | undefined {
  if (bytes.length >= 8
    && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes.length >= 12
    && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return "image/webp";
  }
  return undefined;
}

function venueBackendUnavailable(): never {
  throw new VenueManagementServiceError(
    {
      code: "INTERNAL_ERROR",
      message: "The venue backend is unavailable until the server-only Supabase service-role key is configured.",
      retryable: false,
    },
    503,
  );
}
