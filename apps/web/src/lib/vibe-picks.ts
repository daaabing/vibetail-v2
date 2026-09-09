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
  labelZh: string;
  mood: string;
  moodZh: string;
  /** The mood's colour — it becomes the liquid in the glass on the stage. */
  color: string;
}

export const VIBE_PICKS: VibePick[] = [
  {
    key: "meltdown",
    color: "#5b7a9e",
    art: "rain",
    label: "Falling apart",
    labelZh: "快要崩溃",
    mood: "quietly falling apart today, I want a drink I can sit with",
    moodZh: "今天在默默崩溃，想要一杯可以陪着坐一会儿的酒",
  },
  {
    key: "latenight",
    color: "#4fa3a5",
    art: "laptop",
    label: "Still at work",
    labelZh: "还在加班",
    mood: "still at the laptop far too late and running on nothing",
    moodZh: "深夜还在对着电脑，已经什么都不剩了",
  },
  {
    key: "party",
    color: "#c2497c",
    art: "party",
    label: "Out with everyone",
    labelZh: "和朋友出来浪",
    mood: "out with everyone tonight, I need something that hits without wrecking me",
    moodZh: "今晚和大家一起出来，想要一杯有劲但不会喝倒的",
  },
  {
    key: "heartbreak",
    color: "#a03a45",
    art: "heartbreak",
    label: "It ended badly",
    labelZh: "分手了",
    mood: "it ended badly and I keep opening their profile like that changes something",
    moodZh: "结束得很糟，还是忍不住去看对方的主页，好像这样能改变什么",
  },
  {
    key: "friday",
    color: "#e08a3c",
    art: "sun",
    label: "Friday, finally",
    labelZh: "终于周五",
    mood: "Friday afternoon, sun is out, the week is finally over and I'm happy",
    moodZh: "周五下午，阳光正好，终于熬过了这周，好开心",
  },
  {
    key: "waiting",
    color: "#9b8fc2",
    art: "phone",
    label: "Waiting on a reply",
    labelZh: "在等回复",
    mood: "they were last online four hours ago and I have been counting",
    moodZh: "对方四小时前最后上线，我一直在数着",
  },
  {
    key: "rotting",
    color: "#7a8b5e",
    art: "couch",
    label: "Not moving",
    labelZh: "不想动",
    mood: "not leaving this couch tonight and I've made peace with it",
    moodZh: "今晚不打算离开沙发了，已经和自己和解了",
  },
  {
    key: "celebrating",
    color: "#d9b23f",
    art: "confetti",
    label: "Something good",
    labelZh: "有好事",
    mood: "something good happened today and I want to mark it properly",
    moodZh: "今天有好事发生，想好好庆祝一下",
  },
  {
    key: "clarity",
    color: "#8fb3c9",
    art: "moon",
    label: "Clear-headed",
    labelZh: "头脑清醒",
    mood: "clear-headed, not sad, just want something good in the glass",
    moodZh: "头脑清醒，不难过，只想喝一杯好喝的",
  },
  {
    key: "wired",
    color: "#8a5a33",
    art: "coffee",
    label: "Overcaffeinated",
    labelZh: "咖啡因过量",
    mood: "too much coffee, brain is going far faster than the evening is",
    moodZh: "咖啡喝太多，脑子跑得比夜晚快多了",
  },
  {
    key: "unhinged",
    color: "#cf4f2e",
    art: "fire",
    label: "Slightly unhinged",
    labelZh: "有点疯",
    mood: "slightly unhinged tonight and looking for trouble I can afford",
    moodZh: "今晚有点疯，想找点承受得起的刺激",
  },
  {
    key: "overthinking",
    color: "#5f5aa0",
    art: "spiral",
    label: "Overthinking it",
    labelZh: "想太多",
    mood: "overthinking a conversation from three days ago, again",
    moodZh: "又在反复回想三天前的一段对话",
  },
  {
    key: "dressedup",
    color: "#8e4a86",
    art: "disco",
    label: "Dressed up",
    labelZh: "精心打扮",
    mood: "dressed up tonight and the drink needs to match the outfit",
    moodZh: "今晚精心打扮了，酒也要配得上这身行头",
  },
  {
    key: "reset",
    color: "#5fae83",
    art: "plant",
    label: "Trying to reset",
    labelZh: "想重启",
    mood: "trying to reset after a heavy week, something gentle please",
    moodZh: "沉重的一周之后想重启一下，来点温柔的",
  },
  {
    key: "insomnia",
    color: "#43587f",
    art: "clock",
    label: "2am, awake",
    labelZh: "凌晨两点，醒着",
    mood: "it's 2am, I'm not tired, and the flat is very quiet",
    moodZh: "凌晨两点，不困，屋子里很安静",
  },
  {
    key: "smiling",
    color: "#d97c62",
    art: "mask",
    label: "Company face on",
    labelZh: "社交面具",
    mood: "three hours of polite smiling and my face is starting to cramp",
    moodZh: "礼貌微笑三小时，脸已经要抽筋了",
  },
];

export function findVibePick(key: string | null): VibePick | undefined {
  if (!key) return undefined;
  return VIBE_PICKS.find((v) => v.key === key);
}
