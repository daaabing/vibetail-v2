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
}

export const VIBE_PICKS: VibePick[] = [
  {
    key: "meltdown",
    art: "rain",
    label: "Falling apart",
    mood: "quietly falling apart today, I want a drink I can sit with",
  },
  {
    key: "latenight",
    art: "laptop",
    label: "Still at work",
    mood: "still at the laptop far too late and running on nothing",
  },
  {
    key: "party",
    art: "party",
    label: "Out with everyone",
    mood: "out with everyone tonight, I need something that hits without wrecking me",
  },
  {
    key: "heartbreak",
    art: "heartbreak",
    label: "It ended badly",
    mood: "it ended badly and I keep opening their profile like that changes something",
  },
  {
    key: "friday",
    art: "sun",
    label: "Friday, finally",
    mood: "Friday afternoon, sun is out, the week is finally over and I'm happy",
  },
  {
    key: "waiting",
    art: "phone",
    label: "Waiting on a reply",
    mood: "they were last online four hours ago and I have been counting",
  },
  {
    key: "rotting",
    art: "couch",
    label: "Not moving",
    mood: "not leaving this couch tonight and I've made peace with it",
  },
  {
    key: "celebrating",
    art: "confetti",
    label: "Something good",
    mood: "something good happened today and I want to mark it properly",
  },
  {
    key: "clarity",
    art: "moon",
    label: "Clear-headed",
    mood: "clear-headed, not sad, just want something good in the glass",
  },
  {
    key: "wired",
    art: "coffee",
    label: "Overcaffeinated",
    mood: "too much coffee, brain is going far faster than the evening is",
  },
  {
    key: "unhinged",
    art: "fire",
    label: "Slightly unhinged",
    mood: "slightly unhinged tonight and looking for trouble I can afford",
  },
  {
    key: "overthinking",
    art: "spiral",
    label: "Overthinking it",
    mood: "overthinking a conversation from three days ago, again",
  },
  {
    key: "dressedup",
    art: "disco",
    label: "Dressed up",
    mood: "dressed up tonight and the drink needs to match the outfit",
  },
  {
    key: "reset",
    art: "plant",
    label: "Trying to reset",
    mood: "trying to reset after a heavy week, something gentle please",
  },
  {
    key: "insomnia",
    art: "clock",
    label: "2am, awake",
    mood: "it's 2am, I'm not tired, and the flat is very quiet",
  },
  {
    key: "smiling",
    art: "mask",
    label: "Company face on",
    mood: "three hours of polite smiling and my face is starting to cramp",
  },
];

export function findVibePick(key: string | null): VibePick | undefined {
  if (!key) return undefined;
  return VIBE_PICKS.find((v) => v.key === key);
}
