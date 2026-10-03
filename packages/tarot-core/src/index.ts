import { createHash, randomBytes } from "node:crypto";
import {
  findTarotCard,
  tarotEventId,
  tarotReadingSchema,
  tarotNoteTags,
  tarotTextureTags,
  type TarotDrink,
  type TarotDrinkPreferences,
  type TarotGuest,
  type TarotOrientation,
  type TarotReading,
} from "@vibetail/contracts";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type TarotRound = "first" | "second";
export type TarotServiceErrorCode = "UNAUTHORIZED" | "NOT_FOUND" | "UNAVAILABLE" | "INVALID_REQUEST";
const TAROT_EVENT_DRINK_NAMES = ["Tashirita", "The Yak", "Autumn After Cake"] as const;

export class TarotServiceError extends Error {
  override readonly name = "TarotServiceError";
  constructor(readonly detail: { code: TarotServiceErrorCode; message: string; retryable: boolean }, readonly httpStatus: number) {
    super(detail.message);
  }
}

export interface TarotSessionContext { eventId: string; attendeeId: string; guest: TarotGuest; }
export interface TarotDraw { cardId: string; orientation: TarotOrientation; }
export interface TarotSpreadDraw extends TarotDraw { positionId: string; positionLabel: string; positionMeaning?: string; }
export interface TarotRoundResult extends TarotDraw { round: TarotRound; reading: TarotReading; readings?: TarotReading[]; draws?: TarotSpreadDraw[]; spreadId?: string; spreadName?: string; drink: TarotDrink; }

export interface TarotRepository {
  findAttendee(eventId: string, email: string): Promise<{ id: string; guest: TarotGuest; hasPreferences?: boolean; preferences?: TarotDrinkPreferences | undefined } | null>;
  createAttendee?(input: { eventId: string; email: string; displayName: string }): Promise<{ id: string; guest: TarotGuest; hasPreferences?: boolean; preferences?: TarotDrinkPreferences | undefined }>;
  createSession(input: { eventId: string; attendeeId: string; tokenHash: string; expiresAt: string }): Promise<void>;
  findSession(tokenHash: string): Promise<TarotSessionContext | null>;
  upsertDraw(context: TarotSessionContext, draw: TarotDraw): Promise<TarotDraw>;
  getDraw(context: TarotSessionContext): Promise<TarotDraw | null>;
  saveReading(context: TarotSessionContext, draw: TarotDraw, reading: TarotReading, questionHash: string, provider: string): Promise<void>;
  updateConsent(context: TarotSessionContext, marketingOptIn: boolean): Promise<void>;
  hasPreferences?(context: TarotSessionContext): Promise<boolean>;
  savePreferences?(context: TarotSessionContext, preferences: TarotDrinkPreferences): Promise<void>;
  savePhysicalCard?(context: TarotSessionContext, draw: TarotDraw, reading: TarotReading, questionHash: string, drink: TarotDrink, matchedTags: string[], provider: string): Promise<void>;
  getRound?(context: TarotSessionContext, round: TarotRound): Promise<{ draw: TarotDraw; question: string | null; reading: TarotReading | null; drink: TarotDrink | null } | null>;
  saveSecondRound?(context: TarotSessionContext, draw: TarotDraw, question: string, reading: TarotReading, drink: TarotDrink, matchedTags: string[], provider: string): Promise<void>;
  saveSecondRoundSpread?(context: TarotSessionContext, input: { draw: TarotDraw; draws: TarotSpreadDraw[]; question: string; reading: TarotReading; readings: TarotReading[]; spreadId: string; spreadName: string; drink: TarotDrink; matchedTags: string[]; provider: string }): Promise<void>;
}

export interface TarotInterpretationProvider {
  readonly id: string;
  interpret(input: { cardId: string; orientation: TarotOrientation; question: string }): Promise<TarotReading>;
}

export class TarotService {
  constructor(private readonly repository: TarotRepository, private readonly provider: TarotInterpretationProvider) {}

  async startSession(email: string, displayName: string): Promise<{ token: string; expiresAt: string; guest: TarotGuest; needsPreferences: boolean; preferences?: TarotDrinkPreferences | undefined }> {
    const name = displayName.trim();
    const normalizedEmail = normalizeEmail(email);
    let attendee = await this.repository.findAttendee(tarotEventId, normalizedEmail);
    if (!attendee && name && this.repository.createAttendee) {
      attendee = await this.repository.createAttendee({ eventId: tarotEventId, email: normalizedEmail, displayName: name });
    }
    if (!attendee) throw new TarotServiceError({ code: "UNAUTHORIZED", message: "Enter your email and name to join this event.", retryable: false }, 401);
    const context = { eventId: tarotEventId, attendeeId: attendee.id, guest: { ...attendee.guest, email: normalizedEmail, attendeeId: attendee.id } };
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
    await this.repository.createSession({ eventId: tarotEventId, attendeeId: attendee.id, tokenHash: hashToken(token), expiresAt });
    const needsPreferences = this.repository.hasPreferences ? !(await this.repository.hasPreferences(context)) : !attendee.hasPreferences;
    return { token, expiresAt, guest: context.guest, needsPreferences, preferences: attendee.preferences };
  }

  async getSession(token: string): Promise<TarotSessionContext> {
    const session = await this.repository.findSession(hashToken(token));
    if (!session) throw new TarotServiceError({ code: "UNAUTHORIZED", message: "Your event session has expired.", retryable: false }, 401);
    return session;
  }

  async savePreferences(context: TarotSessionContext, preferences: TarotDrinkPreferences): Promise<void> {
    if (!this.repository.savePreferences) throw new TarotServiceError({ code: "UNAVAILABLE", message: "Preferences are not configured.", retryable: true }, 503);
    await this.repository.savePreferences(context, preferences);
  }

  async physicalCard(context: TarotSessionContext, draw: TarotDraw): Promise<TarotRoundResult> {
    assertCard(draw);
    if (!this.repository.savePhysicalCard) throw new TarotServiceError({ code: "UNAVAILABLE", message: "This event flow is not configured.", retryable: true }, 503);
    const reading = tarotReadingSchema.parse(await this.provider.interpret({ ...draw, question: "" }));
    const drink = await this.pickDrink(context, "first");
    await this.repository.savePhysicalCard(context, draw, reading, hashToken("first"), drink, matchedTags(context, drink), this.provider.id);
    return { round: "first", ...draw, reading, drink };
  }

  async secondReading(context: TarotSessionContext, draw: TarotDraw, question: string): Promise<TarotRoundResult> {
    assertCard(draw);
    if (!this.repository.saveSecondRound) throw new TarotServiceError({ code: "UNAVAILABLE", message: "This event flow is not configured.", retryable: true }, 503);
    const reading = tarotReadingSchema.parse(await this.provider.interpret({ ...draw, question: question.trim() }));
    const drink = await this.pickDrink(context, "second");
    await this.repository.saveSecondRound(context, draw, question.trim(), reading, drink, matchedTags(context, drink), this.provider.id);
    return { round: "second", ...draw, reading, drink };
  }

  async secondSpreadReading(context: TarotSessionContext, draws: TarotSpreadDraw[], question: string, spreadId: string, spreadName: string): Promise<TarotRoundResult> {
    if (!draws.length) throw new TarotServiceError({ code: "INVALID_REQUEST", message: "Choose at least one card.", retryable: false }, 400);
    draws.forEach(assertCard);
    const cleanQuestion = question.trim();
    const readings = await Promise.all(draws.map((draw) => this.provider.interpret({ cardId: draw.cardId, orientation: draw.orientation, question: `${cleanQuestion}\n牌阵位置：${draw.positionLabel}${draw.positionMeaning ? `\n该位置的含义：${draw.positionMeaning}` : ""}` })));
    const reading = tarotReadingSchema.parse({
      title: spreadName,
      body: readings.map((item, index) => `${draws[index]?.positionLabel ?? "这张牌"}：${item.body}`).join("\n\n").slice(0, 2_000),
      reflection: readings.map((item) => item.reflection).join(" ").slice(0, 500),
    });
    const drink = await this.pickDrink(context, "second");
    const repository = this.repository as TarotRepository & { saveSecondRoundSpread?: TarotRepository["saveSecondRoundSpread"] };
    if (repository.saveSecondRoundSpread) {
      await repository.saveSecondRoundSpread(context, { draw: draws[0]!, draws, question: cleanQuestion, reading, readings, spreadId, spreadName, drink, matchedTags: matchedTags(context, drink), provider: this.provider.id });
    } else {
      if (!this.repository.saveSecondRound) throw new TarotServiceError({ code: "UNAVAILABLE", message: "This event flow is not configured.", retryable: true }, 503);
      await this.repository.saveSecondRound(context, draws[0]!, cleanQuestion, reading, drink, matchedTags(context, drink), this.provider.id);
    }
    return { round: "second", ...draws[0]!, draws, readings, spreadId, spreadName, reading, drink };
  }

  async draw(context: TarotSessionContext, draw: TarotDraw): Promise<TarotDraw> { return this.repository.upsertDraw(context, draw); }
  async reading(context: TarotSessionContext, input: { cardId: string; question: string }): Promise<{ cardId: string; reading: TarotReading }> {
    const draw = await this.repository.getDraw(context);
    if (!draw || draw.cardId !== input.cardId) throw new TarotServiceError({ code: "INVALID_REQUEST", message: "Choose the card you drew first.", retryable: false }, 400);
    const reading = tarotReadingSchema.parse(await this.provider.interpret({ ...draw, question: input.question }));
    await this.repository.saveReading(context, draw, reading, hashToken(input.question), this.provider.id);
    return { cardId: draw.cardId, reading };
  }
  async consent(context: TarotSessionContext, marketingOptIn: boolean): Promise<void> { await this.repository.updateConsent(context, marketingOptIn); }

  private async pickDrink(context: TarotSessionContext, round: TarotRound): Promise<TarotDrink> {
    const repository = this.repository as TarotRepository & { listDrinks?: (context: TarotSessionContext, round: TarotRound) => Promise<TarotDrink[]> };
    if (!repository.listDrinks) throw new TarotServiceError({ code: "UNAVAILABLE", message: "Drink matching is not configured.", retryable: true }, 503);
    const options = await repository.listDrinks(context, round);
    if (!options[0]) throw new TarotServiceError({ code: "NOT_FOUND", message: "There are no available event drinks.", retryable: false }, 404);
    return options[0];
  }
}

export class UnavailableTarotService {
  async startSession(): Promise<never> { throw unavailable(); }
  async getSession(): Promise<never> { throw unavailable(); }
  async savePreferences(): Promise<never> { throw unavailable(); }
  async physicalCard(): Promise<never> { throw unavailable(); }
  async secondReading(): Promise<never> { throw unavailable(); }
  async draw(): Promise<never> { throw unavailable(); }
  async reading(): Promise<never> { throw unavailable(); }
  async consent(): Promise<never> { throw unavailable(); }
}

function unavailable(): TarotServiceError { return new TarotServiceError({ code: "UNAVAILABLE", message: "The tarot experience is not configured.", retryable: true }, 503); }
function assertCard(draw: TarotDraw): void { if (!findTarotCard(draw.cardId)) throw new TarotServiceError({ code: "INVALID_REQUEST", message: "That tarot card is not in this deck.", retryable: false }, 400); }
export function normalizeEmail(email: string): string { return email.trim().toLowerCase(); }
export function hashToken(value: string): string { return createHash("sha256").update(value, "utf8").digest("hex"); }
function matchedTags(_context: TarotSessionContext, drink: TarotDrink): string[] { return drink.flavorTags.slice(0, 3); }

export class DeterministicTarotProvider implements TarotInterpretationProvider {
  readonly id = "deterministic-rws";
  async interpret({ cardId, orientation, question }: { cardId: string; orientation: TarotOrientation; question: string }): Promise<TarotReading> {
    const card = findTarotCard(cardId);
    const position = orientation === "upright" ? "正位" : "逆位";
    const meaning = card?.meanings[orientation];
    const [userQuestion, ...contextLines] = question.split("\n");
    const positionLine = contextLines.find((line) => line.startsWith("牌阵位置："));
    const positionMeaning = contextLines.find((line) => line.startsWith("该位置的含义："));
    const positionLabel = positionLine?.replace("牌阵位置：", "").trim();
    const positionHint = positionMeaning?.replace("该位置的含义：", "").trim();
    const context = positionLabel
      ? `放在「${positionLabel}」这个位置上，它尤其提醒你留意${positionHint ? `：${positionHint}` : "正在发生的变化"}。`
      : userQuestion?.trim()
        ? "把它放回你正在思考的事里，看看这份提醒和当下的感受如何相遇。"
        : "先把注意力放回正在发生的事。";
    return tarotReadingSchema.parse({
      title: card ? `${card.zh} · ${position}` : `${cardId} · ${position}`,
      body: `${meaning?.message ?? "这张牌邀请你先把注意力放回正在发生的事。"} ${context} 今晚不必急着得到一个绝对答案，先辨认你真正想保护、尝试或松开的东西。`,
      reflection: meaning?.nextStep ?? "如果这个问题只需要一个很小的下一步，你愿意在明天试什么？",
    });
  }
}

export interface TarotSupabaseConfig { url: string; serviceRoleKey: string; }
export class SupabaseTarotRepository implements TarotRepository {
  private readonly client: SupabaseClient;
  constructor(config: TarotSupabaseConfig) { this.client = createClient(config.url, config.serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } }); }
  async findAttendee(eventId: string, email: string) {
    const { data, error } = await this.client.from("event_attendees").select("id, display_name, email_normalized, zodiac, element, task").eq("event_id", eventId).eq("email_normalized", email).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const preferences = await this.client.from("event_attendee_drink_preferences").select("attendee_id,flavor_tags").eq("event_id", eventId).eq("attendee_id", data.id).maybeSingle();
    if (preferences.error) throw preferences.error;
    return { id: data.id as string, hasPreferences: Boolean(preferences.data), preferences: parsePreferences(preferences.data), guest: { attendeeId: data.id, email: data.email_normalized, displayName: data.display_name, zodiac: data.zodiac, element: data.element, task: data.task } as TarotGuest };
  }
  async createAttendee(input: { eventId: string; email: string; displayName: string }) {
    const { data, error } = await this.client.from("event_attendees").insert({ event_id: input.eventId, email_normalized: input.email, display_name: input.displayName, zodiac: "未填写", element: "风", task: "和一位来宾完成今晚的默契测试。" }).select("id, display_name, email_normalized, zodiac, element, task").single();
    if (error) throw error;
    return { id: data.id as string, hasPreferences: false, guest: { attendeeId: data.id, email: data.email_normalized, displayName: data.display_name, zodiac: data.zodiac, element: data.element, task: data.task } as TarotGuest };
  }
  async createSession(input: { eventId: string; attendeeId: string; tokenHash: string; expiresAt: string }) { const { error } = await this.client.from("event_sessions").insert({ event_id: input.eventId, attendee_id: input.attendeeId, token_hash: input.tokenHash, expires_at: input.expiresAt }); if (error) throw error; }
  async findSession(tokenHash: string) {
    const { data, error } = await this.client.from("event_sessions").select("event_id, attendee_id, expires_at").eq("token_hash", tokenHash).gt("expires_at", new Date().toISOString()).maybeSingle();
    if (error) throw error; if (!data) return null;
    const attendee = await this.client.from("event_attendees").select("display_name, email_normalized, zodiac, element, task").eq("event_id", data.event_id).eq("id", data.attendee_id).maybeSingle();
    if (attendee.error) throw attendee.error; if (!attendee.data) return null;
    return { eventId: data.event_id, attendeeId: data.attendee_id, guest: { attendeeId: data.attendee_id, email: attendee.data.email_normalized, displayName: attendee.data.display_name, zodiac: attendee.data.zodiac, element: attendee.data.element, task: attendee.data.task } as TarotGuest };
  }
  async hasPreferences(context: TarotSessionContext) { const { data, error } = await this.client.from("event_attendee_drink_preferences").select("attendee_id").eq("event_id", context.eventId).eq("attendee_id", context.attendeeId).maybeSingle(); if (error) throw error; return Boolean(data); }
  async savePreferences(context: TarotSessionContext, preferences: TarotDrinkPreferences) { const { error } = await this.client.from("event_attendee_drink_preferences").upsert({ event_id: context.eventId, attendee_id: context.attendeeId, flavor_tags: [...preferences.textures, ...preferences.notes, ...(preferences.description ? [preferences.description] : [])] }, { onConflict: "event_id,attendee_id" }); if (error) throw error; }
  async listDrinks(context: TarotSessionContext, _round: TarotRound): Promise<TarotDrink[]> {
    const prefs = await this.client.from("event_attendee_drink_preferences").select("flavor_tags").eq("event_id", context.eventId).eq("attendee_id", context.attendeeId).maybeSingle();
    if (prefs.error) throw prefs.error;
    const previous = await this.client.from("event_drink_recommendations").select("round,drink_id,drink_snapshot").eq("event_id", context.eventId).eq("attendee_id", context.attendeeId);
    if (previous.error) throw previous.error;
    const existingRound = (previous.data ?? []).find((row) => row.round === _round);
    const existingDrink = existingRound ? drinkFromSnapshot(existingRound.drink_snapshot) : null;
    if (existingDrink) return [existingDrink];
    const excluded = new Set((previous.data ?? []).map((row) => row.drink_id));
    const catalog = await this.client.from("event_drink_catalog").select("drink_id, sort_order").eq("event_id", context.eventId).order("sort_order", { ascending: true });
    if (catalog.error) throw catalog.error;
    const catalogIds = (catalog.data ?? []).map((row) => row.drink_id);
    if (!catalogIds.length) return [];
    const drinks = await this.client.from("drinks").select("id,name,description,price,image_url,flavor_tags,recommendation_note").eq("availability_status", "active").in("id", catalogIds);
    if (drinks.error) throw drinks.error;
    const preferences = parsePreferences(prefs.data);
    const toEnglish: Record<string, string[]> = { 清爽: ["refreshing", "citrusy"], 顺滑: ["creamy", "smooth"], 浓郁: ["rich"], 有气泡: ["sparkling", "bubbly", "refreshing"], 柑橘: ["citrusy"], 热带水果: ["fruity"], 花香: ["floral"], 姜味: ["ginger", "spicy"], 草本: ["herbal", "botanical"], 奶油甜香: ["creamy", "sweet"] };
    const selected = [...(preferences?.textures ?? []), ...(preferences?.notes ?? []), ...(preferences?.flavorTags ?? [])];
    const wanted = new Set(selected.flatMap((tag) => toEnglish[tag] ?? [tag]));
    const description = preferences?.description ?? "";
    return drinks.data.filter((drink) => TAROT_EVENT_DRINK_NAMES.includes(drink.name as typeof TAROT_EVENT_DRINK_NAMES[number]) && !excluded.has(drink.id)).sort((a, b) => scoreDrink(b.flavor_tags, wanted, description, b.description, b.name) - scoreDrink(a.flavor_tags, wanted, description, a.description, a.name) || String(a.id).localeCompare(String(b.id))).map((drink) => ({ id: drink.id, name: drink.name, description: drink.description ?? "", price: drink.price, imageUrl: drink.image_url, flavorTags: drink.flavor_tags ?? [], recommendationNote: drink.recommendation_note }));
  }
  async savePhysicalCard(context: TarotSessionContext, draw: TarotDraw, reading: TarotReading, questionHash: string, drink: TarotDrink, matchedTags: string[], provider: string) { await this.saveRound(context, "first", draw, null, reading, questionHash, drink, matchedTags, provider); }
  async saveSecondRound(context: TarotSessionContext, draw: TarotDraw, question: string, reading: TarotReading, drink: TarotDrink, matchedTags: string[], provider: string) { await this.saveRound(context, "second", draw, question, reading, hashToken(question), drink, matchedTags, provider); }
  async saveSecondRoundSpread(context: TarotSessionContext, input: { draw: TarotDraw; draws: TarotSpreadDraw[]; question: string; reading: TarotReading; readings: TarotReading[]; spreadId: string; spreadName: string; drink: TarotDrink; matchedTags: string[]; provider: string }) { await this.saveRound(context, "second", input.draw, input.question, input.reading, hashToken(input.question), input.drink, input.matchedTags, input.provider, { spreadId: input.spreadId, spreadName: input.spreadName, draws: input.draws, readings: input.readings }); }
  async getRound(context: TarotSessionContext, round: TarotRound) {
    const row = await this.client.from("event_tarot_rounds").select("id,card_id,orientation,question,spread_id,spread_name,draws,readings,event_tarot_round_readings(title,body,reflection),event_drink_recommendations(drink_snapshot)").eq("event_id", context.eventId).eq("attendee_id", context.attendeeId).eq("round", round).maybeSingle();
    if (row.error) throw row.error; if (!row.data) return null;
    const readingRow = Array.isArray(row.data.event_tarot_round_readings) ? row.data.event_tarot_round_readings[0] : row.data.event_tarot_round_readings;
    const drinkRow = Array.isArray(row.data.event_drink_recommendations) ? row.data.event_drink_recommendations[0] : row.data.event_drink_recommendations;
    return { draw: { cardId: row.data.card_id, orientation: row.data.orientation as TarotOrientation }, question: row.data.question, reading: readingRow ? { title: readingRow.title, body: readingRow.body, reflection: readingRow.reflection } : null, drink: drinkRow?.drink_snapshot as TarotDrink | null };
  }
  private async saveRound(context: TarotSessionContext, round: TarotRound, draw: TarotDraw, question: string | null, reading: TarotReading, questionHash: string, drink: TarotDrink, matchedTags: string[], provider: string, spread?: { spreadId: string; spreadName: string; draws: TarotSpreadDraw[]; readings: TarotReading[] }) {
    const baseRound = { event_id: context.eventId, attendee_id: context.attendeeId, round, card_id: draw.cardId, orientation: draw.orientation, question, updated_at: new Date().toISOString() };
    let saved = await this.client.from("event_tarot_rounds").upsert({ ...baseRound, ...(spread ? { spread_id: spread.spreadId, spread_name: spread.spreadName, draws: spread.draws, readings: spread.readings } : {}) }, { onConflict: "event_id,attendee_id,round" }).select("id").single();
    // The spread columns are additive. During a rolling migration, an older
    // database may still be serving this request; preserve the reading and
    // recommendation by retrying the compatibility payload without them.
    if (saved.error && spread) {
      saved = await this.client.from("event_tarot_rounds").upsert(baseRound, { onConflict: "event_id,attendee_id,round" }).select("id").single();
    }
    if (saved.error) throw saved.error;
    const read = await this.client.from("event_tarot_round_readings").upsert({ event_id: context.eventId, round_id: saved.data.id, attendee_id: context.attendeeId, title: reading.title, body: reading.body, reflection: reading.reflection, provider, question_hash: questionHash, updated_at: new Date().toISOString() }, { onConflict: "event_id,round_id" });
    if (read.error) throw read.error;
    const recommendation = await this.client.from("event_drink_recommendations").upsert({ event_id: context.eventId, attendee_id: context.attendeeId, round, drink_id: drink.id, matched_flavor_tags: matchedTags, drink_snapshot: drink }, { onConflict: "event_id,attendee_id,round" });
    if (recommendation.error) throw recommendation.error;
  }
  async upsertDraw(context: TarotSessionContext, draw: TarotDraw) { const { data, error } = await this.client.from("event_tarot_draws").upsert({ event_id: context.eventId, attendee_id: context.attendeeId, card_id: draw.cardId, orientation: draw.orientation }, { onConflict: "event_id,attendee_id" }).select("card_id, orientation").single(); if (error) throw error; return { cardId: data.card_id, orientation: data.orientation as TarotOrientation }; }
  async getDraw(context: TarotSessionContext) { const { data, error } = await this.client.from("event_tarot_draws").select("card_id, orientation").eq("event_id", context.eventId).eq("attendee_id", context.attendeeId).maybeSingle(); if (error) throw error; return data ? { cardId: data.card_id, orientation: data.orientation as TarotOrientation } : null; }
  async saveReading(context: TarotSessionContext, draw: TarotDraw, reading: TarotReading, questionHash: string, provider: string) { const current = await this.client.from("event_tarot_draws").select("id").eq("event_id", context.eventId).eq("attendee_id", context.attendeeId).single(); if (current.error) throw current.error; const { error } = await this.client.from("event_tarot_readings").upsert({ event_id: context.eventId, attendee_id: context.attendeeId, draw_id: current.data.id, title: reading.title, body: reading.body, reflection: reading.reflection, provider, question_hash: questionHash }, { onConflict: "event_id,attendee_id,draw_id" }); if (error) throw error; void draw; }
  async updateConsent(context: TarotSessionContext, marketingOptIn: boolean) { const { error } = await this.client.from("event_attendees").update({ marketing_opt_in: marketingOptIn, consent_source: "tarot-page", consent_updated_at: new Date().toISOString() }).eq("event_id", context.eventId).eq("id", context.attendeeId); if (error) throw error; }
}

function scoreDrink(tags: string[] | null, wanted: Set<string>, description: string, drinkDescription: string | null, drinkName: string): number {
  const text = `${description} ${drinkDescription ?? ""} ${drinkName}`.toLowerCase();
  return (tags ?? []).filter((tag) => wanted.has(tag)).length + [...wanted].filter((tag) => text.includes(tag.toLowerCase())).length * 0.25;
}

function drinkFromSnapshot(value: unknown): TarotDrink | null {
  if (!value || typeof value !== "object") return null;
  const drink = value as Partial<TarotDrink>;
  if (typeof drink.id !== "string" || typeof drink.name !== "string" || !TAROT_EVENT_DRINK_NAMES.includes(drink.name as typeof TAROT_EVENT_DRINK_NAMES[number])) return null;
  if (typeof drink.description !== "string" || !Array.isArray(drink.flavorTags)) return null;
  return {
    id: drink.id,
    name: drink.name,
    description: drink.description,
    price: typeof drink.price === "string" || drink.price === null ? drink.price : null,
    imageUrl: typeof drink.imageUrl === "string" || drink.imageUrl === null ? drink.imageUrl : null,
    flavorTags: drink.flavorTags.filter((tag): tag is string => typeof tag === "string"),
    recommendationNote: typeof drink.recommendationNote === "string" || drink.recommendationNote === null ? drink.recommendationNote : null,
  };
}

function parsePreferences(value: unknown): TarotDrinkPreferences | undefined {
  if (!value || typeof value !== "object") return undefined;
  const row = value as { texture_tags?: unknown; note_tags?: unknown; description?: unknown; flavor_tags?: unknown };
  const flavorTags = Array.isArray(row.flavor_tags) ? row.flavor_tags.filter((item): item is string => typeof item === "string") : [];
  const textures = flavorTags.filter((tag) => (tarotTextureTags as readonly string[]).includes(tag));
  const notes = flavorTags.filter((tag) => (tarotNoteTags as readonly string[]).includes(tag));
  const description = flavorTags.find((tag) => !textures.includes(tag) && !notes.includes(tag)) ?? "";
  if (!textures.length && !notes.length && !description) return undefined;
  return { textures, notes, description, flavorTags } as TarotDrinkPreferences;
}
