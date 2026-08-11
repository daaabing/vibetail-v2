/**
 * The vibes offered on step 01, as a scrollable rack of drawn cards.
 *
 * Deliberately short. The old tag cloud offered 126 labels and made choosing
 * feel like admin; sixteen scenes you can recognise at a glance is a decision
 * you can actually make, and anything outside them goes in the free-text line.
 *
 * `mood` is what we hand the model, so it reads as a sentence, not a tag.
 */

export interface VibePick {
  key: string;
  /** Illustration name in the drawing book. */
  art: string;
  label: string;
  mood: string;
  /** The mood's colour — it becomes the liquid in the glass on the stage. */
  color: string;
}

export const VIBE_PICKS: VibePick[] = [
  {
    key: "meltdown",
    color: "#5b7a9e",
    art: "rain",
    label: "Falling apart",
    mood: "quietly falling apart today, I want a drink I can sit with",
  },
  {
    key: "latenight",
    color: "#4fa3a5",
    art: "laptop",
    label: "Still at work",
    mood: "still at the laptop far too late and running on nothing",
  },
  {
    key: "party",
    color: "#c2497c",
    art: "party",
    label: "Out with everyone",
    mood: "out with everyone tonight, I need something that hits without wrecking me",
  },
  {
    key: "heartbreak",
    color: "#a03a45",
    art: "heartbreak",
    label: "It ended badly",
    mood: "it ended badly and I keep opening their profile like that changes something",
  },
  {
    key: "friday",
    color: "#e08a3c",
    art: "sun",
    label: "Friday, finally",
    mood: "Friday afternoon, sun is out, the week is finally over and I'm happy",
  },
  {
    key: "waiting",
    color: "#9b8fc2",
    art: "phone",
    label: "Waiting on a reply",
    mood: "they were last online four hours ago and I have been counting",
  },
  {
    key: "rotting",
    color: "#7a8b5e",
    art: "couch",
    label: "Not moving",
    mood: "not leaving this couch tonight and I've made peace with it",
  },
  {
    key: "celebrating",
    color: "#d9b23f",
    art: "confetti",
    label: "Something good",
    mood: "something good happened today and I want to mark it properly",
  },
  {
    key: "clarity",
    color: "#8fb3c9",
    art: "moon",
    label: "Clear-headed",
    mood: "clear-headed, not sad, just want something good in the glass",
  },
  {
    key: "wired",
    color: "#8a5a33",
    art: "coffee",
    label: "Overcaffeinated",
    mood: "too much coffee, brain is going far faster than the evening is",
  },
  {
    key: "unhinged",
    color: "#cf4f2e",
    art: "fire",
    label: "Slightly unhinged",
    mood: "slightly unhinged tonight and looking for trouble I can afford",
  },
  {
    key: "overthinking",
    color: "#5f5aa0",
    art: "spiral",
    label: "Overthinking it",
    mood: "overthinking a conversation from three days ago, again",
  },
  {
    key: "dressedup",
    color: "#8e4a86",
    art: "disco",
    label: "Dressed up",
    mood: "dressed up tonight and the drink needs to match the outfit",
  },
  {
    key: "reset",
    color: "#5fae83",
    art: "plant",
    label: "Trying to reset",
    mood: "trying to reset after a heavy week, something gentle please",
  },
  {
    key: "insomnia",
    color: "#43587f",
    art: "clock",
    label: "2am, awake",
    mood: "it's 2am, I'm not tired, and the flat is very quiet",
  },
  {
    key: "smiling",
    color: "#d97c62",
    art: "mask",
    label: "Company face on",
    mood: "three hours of polite smiling and my face is starting to cramp",
  },
];

export function findVibePick(key: string | null): VibePick | undefined {
  if (!key) return undefined;
  return VIBE_PICKS.find((v) => v.key === key);
}
