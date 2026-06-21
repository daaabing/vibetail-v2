// Real-world Chinese cocktail menu examples — emotional/relationship-themed
// names with poetic, slightly snarky tasting notes. Used as STYLE references
// (tone of voice for cocktailName + tastesLike + roast) when the user is in
// Chinese mode AND their vibe sounds emotion / relationship related.
//
// The AI must NOT copy the names or ingredients — it should mimic the WIT
// and the handwritten-menu cadence (荒诞、抽象、口语化、自嘲).

export interface VibeExample {
  /** Big handwritten title on the menu page. */
  name: string;
  /** Side-column "tasting note" / vibe story — vertical text on the original. */
  tastesLike: string;
  /** Short flavor description from the menu footer. */
  flavorProfile: string;
  /** Rough emotion tags used for matching. */
  moodTags: string[];
}

export const VIBE_EXAMPLES: VibeExample[] = [
  {
    name: "你要这样想我也没办法",
    tastesLike:
      "你要这么说我也不在乎，你如果非要这么想，那你觉得好就好。",
    flavorProfile: "苹果的，有一点点姜味，所以你问我？你辛什么姜子！",
    moodTags: [
      "无语", "敷衍", "摆烂", "冷战", "懒得解释", "随便", "无所谓",
      "委屈", "被误会",
    ],
  },
  {
    name: "绝望的直女",
    tastesLike:
      "心理上接收不了男生，生理上又接受不了女生。有一种看透了男生又爱不上女生的无力感。",
    flavorProfile: "葡萄小黑提，白朗姆！柠檬！",
    moodTags: [
      "单身", "绝望", "母胎solo", "不想恋爱", "看透", "厌男", "无力",
      "孤独", "情感空窗",
    ],
  },
  {
    name: "还以为是被爱了",
    tastesLike:
      "差点以为自己被爱了，还偷偷开心了好久。",
    flavorProfile: "香石榴柑橘，蓝柑——意思是不要越过栏杆。",
    moodTags: [
      "暗恋", "误会", "心动", "失落", "被拒", "暧昧", "自作多情",
      "心碎", "幻灭", "空欢喜",
    ],
  },
  {
    name: "所以我们现在是什么关系",
    tastesLike:
      "是什么关系？我问你，你的不回应像这杯酒的后劲一样上头。",
    flavorProfile: "蓝色的香石榴味道，还有点烈！像雨后的晴天。",
    moodTags: [
      "暧昧", "situationship", "已读不回", "不回消息", "搞暧昧", "纠结",
      "上头", "拉扯", "不明不白", "等回复",
    ],
  },
];

const EMOTION_KEYWORDS = [
  // relationship
  "爱", "喜欢", "心动", "暗恋", "暧昧", "前任", "分手", "失恋", "心碎",
  "恋爱", "对象", "男友", "女友", "约会", "表白", "拒绝", "异地",
  "已读", "不回", "消息", "回复", "拉扯", "纠结",
  // emotions
  "难过", "伤心", "孤独", "寂寞", "委屈", "想哭", "破防", "崩溃",
  "无语", "无奈", "摆烂", "躺平", "焦虑", "emo", "丧", "绝望",
  "开心", "高兴", "兴奋", "上头", "心情", "感情", "情绪",
  "单身", "一个人", "想你", "想他", "想她",
];

/** True when the (Chinese) mood text reads like an emotion / relationship vibe. */
export function isEmotionalVibe(mood: string): boolean {
  if (!mood) return false;
  const m = mood.toLowerCase();
  return EMOTION_KEYWORDS.some((k) => m.includes(k.toLowerCase()));
}

/** Pick the example whose moodTags best overlap with the user's mood text. */
export function pickVibeExample(mood: string): VibeExample {
  const m = (mood || "").toLowerCase();
  let best = VIBE_EXAMPLES[0];
  let bestScore = -1;
  for (const ex of VIBE_EXAMPLES) {
    let score = 0;
    for (const tag of ex.moodTags) {
      if (m.includes(tag.toLowerCase())) score += 2;
    }
    score += Math.random() * 0.5;
    if (score > bestScore) {
      bestScore = score;
      best = ex;
    }
  }
  return best;
}
