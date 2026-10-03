/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
const majorImages: Record<string, string> = {
  major_00: "00_Fool.jpg", major_01: "01_Magician.jpg", major_02: "02_High_Priestess.jpg", major_03: "03_Empress.jpg", major_04: "04_Emperor.jpg", major_05: "05_Hierophant.jpg", major_06: "06_Lovers.jpg", major_07: "07_Chariot.jpg", major_08: "08_Strength.jpg", major_09: "09_Hermit.jpg", major_10: "10_Wheel_of_Fortune.jpg", major_11: "11_Justice.jpg", major_12: "12_Hanged_Man.jpg", major_13: "13_Death.jpg", major_14: "14_Temperance.jpg", major_15: "15_Devil.jpg", major_16: "16_Tower.jpg", major_17: "17_Star.jpg", major_18: "18_Moon.jpg", major_19: "19_Sun.jpg", major_20: "20_Judgement.jpg", major_21: "21_World.jpg",
};

const ranks: Record<string, string> = { "01": "01", "02": "02", "03": "03", "04": "04", "05": "05", "06": "06", "07": "07", "08": "08", "09": "09", "10": "10", page: "11", knight: "12", queen: "13", king: "14" };
const suits: Record<string, string> = { wands: "Wands", cups: "Cups", swords: "Swords", pentacles: "Pents" };

/** URL for the reviewed local Rider–Waite assets bundled by the event app. */
export function cardImageUrl(imageKey: string): string {
  const major = majorImages[imageKey];
  if (major) return `/deck/rider-waite/720px/${major}`;
  const [suit, rank] = imageKey.split("_");
  return `/deck/rider-waite/720px/${suits[suit ?? ""] ?? "Pents"}${ranks[rank ?? ""] ?? "01"}.jpg`;
}
