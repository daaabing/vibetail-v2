import { describe, expect, it } from "vitest";
import { DeterministicTarotProvider, TarotService, type TarotRepository } from "./index.js";

function fakeRepository(): TarotRepository {
  const attendee = { id: "attendee-1", guest: { displayName: "Nora Wang", zodiac: "天蝎", element: "水" as const, task: "找一位风象朋友。" } };
  let tokenHash = "";
  let draw: { cardId: string; orientation: "upright" | "reversed" } | null = null;
  return {
    async findAttendee(_eventId, email) { return email === "nora@example.test" ? attendee : null; },
    async createSession(input) { tokenHash = input.tokenHash; },
    async findSession(input) { return input === tokenHash ? { eventId: "tarot-night-2026-10-03", attendeeId: attendee.id, guest: attendee.guest } : null; },
    async upsertDraw(_context, input) { draw = input; return input; },
    async getDraw() { return draw; },
    async saveReading() {},
    async updateConsent() {},
  };
}

describe("TarotService", () => {
  it("opens the seeded guest session and keeps question processing behind the provider boundary", async () => {
    const service = new TarotService(fakeRepository(), new DeterministicTarotProvider());
    const session = await service.startSession(" Nora@example.test ", "Nora Wang");
    const context = await service.getSession(session.token);
    await service.draw(context, { cardId: "the-fool", orientation: "upright" });
    const result = await service.reading(context, { cardId: "the-fool", question: "我该把注意力放在哪里？" });
    expect(result.reading.body).toContain("我该把注意力放在哪里？");
  });
});
