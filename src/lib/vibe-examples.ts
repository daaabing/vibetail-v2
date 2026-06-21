// Real-world Chinese cocktail menu examples — handwritten bistro menu vibe.
// Used as STYLE references (tone of voice for cocktailName + tastesLike +
// roast) whenever the user is generating in Chinese. The AI must NOT copy
// the names, ingredients or strings — it should mimic the WIT and cadence
// (荒诞、抽象、口语化、自嘲、谐音梗).

export interface VibeExample {
  /** Big handwritten title on the menu page. */
  name: string;
  /** Side-column "tasting note" / vibe story — vertical text on the original. */
  tastesLike: string;
  /** Short flavor description from the menu footer. */
  flavorProfile: string;
  /** Rough mood / topic tags used for matching. Empty = generic, always eligible. */
  moodTags: string[];
}

// Emotion / relationship-themed examples
const EMOTIONAL_EXAMPLES: VibeExample[] = [
  {
    name: "你要这样想我也没办法",
    tastesLike: "你要这么说我也不在乎，你如果非要这么想，那你觉得好就好。",
    flavorProfile: "苹果的，有一点点姜味，所以你问我？你辛什么姜子！",
    moodTags: ["无语", "敷衍", "摆烂", "冷战", "懒得解释", "随便", "无所谓", "委屈", "被误会"],
  },
  {
    name: "绝望的直女",
    tastesLike: "心理上接收不了男生，生理上又接受不了女生。有一种看透了男生又爱不上女生的无力感。",
    flavorProfile: "葡萄小黑提，白朗姆！柠檬！",
    moodTags: ["单身", "绝望", "母胎solo", "不想恋爱", "看透", "厌男", "无力", "孤独", "情感空窗"],
  },
  {
    name: "还以为是被爱了",
    tastesLike: "差点以为自己被爱了，还偷偷开心了好久。",
    flavorProfile: "香石榴柑橘，蓝柑——意思是不要越过栏杆。",
    moodTags: ["暗恋", "误会", "心动", "失落", "被拒", "暧昧", "自作多情", "心碎", "幻灭", "空欢喜"],
  },
  {
    name: "所以我们现在是什么关系",
    tastesLike: "是什么关系？我问你，你的不回应像这杯酒的后劲一样上头。",
    flavorProfile: "蓝色的香石榴味道，还有点烈！像雨后的晴天。",
    moodTags: ["暧昧", "situationship", "已读不回", "不回消息", "搞暧昧", "纠结", "上头", "拉扯", "不明不白", "等回复"],
  },
  {
    name: "莫非是瞧上小生了？",
    tastesLike: "小美人，喜欢小生这么叫你吗～桀桀桀！",
    flavorProfile: "西柚清爽，柑橘果皮微苦，接骨木花香，黑莓金酒赋予莓果清甜，整体轻盈不失稳重。",
    moodTags: ["心动", "暧昧", "被撩", "调情", "心痒", "暗送秋波", "怦然心动"],
  },
  {
    name: "听老婆的话会发达",
    tastesLike: "在外朋友都觉得妻子很凶，只有体盾的我才懂。多么喜欢被妻子掌控在手心的感觉。请把这句话默念一百遍。",
    flavorProfile: "苹果和菠萝与蛋黄酒的融合，稍微厚重的口感又带有清爽的果香，像是在喝甜酸奶味的液体小蛋糕。",
    moodTags: ["怕老婆", "妻管严", "宠妻", "听话", "婚姻", "认怂", "甜蜜"],
  },
];

// Generic / non-emotional examples — vibes, weather, food cravings,
// self-mockery, social commentary, etc.
const GENERIC_EXAMPLES: VibeExample[] = [
  {
    name: "粉色娇嫩",
    tastesLike: "你管我如今几岁！",
    flavorProfile: "酸酸甜甜，淡淡的莓果味儿和奶香，比较清爽，有蛋清介意勿点！",
    moodTags: ["少女心", "粉红", "可爱", "嫩", "装嫩", "甜", "天真"],
  },
  {
    name: "三分凉薄二分讥笑",
    tastesLike: "呵，小东西（皱眉），叫声主人，命都给你（气泡音）。",
    flavorProfile: "清爽的黄瓜与薄荷佐以气泡感，夏天就是要这样的味道。",
    moodTags: ["清凉", "夏天", "薄荷", "凉爽", "高冷", "傲娇", "讥讽", "毒舌"],
  },
  {
    name: "你听听我的心慌不慌",
    tastesLike: "好慌，酒里到底有什么！",
    flavorProfile: "入口松柏加上薄荷味，回味一点椰子的清香。",
    moodTags: ["紧张", "心慌", "焦虑", "好奇", "未知", "刺激", "面试", "见家长", "汇报"],
  },
  {
    name: "今天也没有班上",
    tastesLike: "醒来发现是周六，可以继续摆烂，谁也别叫我。",
    flavorProfile: "微甜的椰子奶味，淡淡咖啡尾韵，慵懒到底。",
    moodTags: ["周末", "放假", "摆烂", "躺平", "懒", "慵懒", "周六", "周日", "休息"],
  },
  {
    name: "上班如上坟",
    tastesLike: "周一早上的咖啡也救不了我，老板再说一句我就拌了这杯下去。",
    flavorProfile: "浓缩咖啡 + 威士忌 + 一丝绝望的焦糖。",
    moodTags: ["上班", "打工", "周一", "加班", "老板", "崩溃", "疲惫", "打工人", "牛马"],
  },
  {
    name: "想吃辣的想喝凉的",
    tastesLike: "嘴上说要清淡，手已经点了一份火锅。",
    flavorProfile: "辣椒梅子糖浆，冰镇苏打，柠檬皮油提香。",
    moodTags: ["馋", "想吃", "火锅", "辣", "夜宵", "嘴馋", "深夜", "饿"],
  },
  {
    name: "下雨天和巧克力更配",
    tastesLike: "雨声当 BGM，玻璃窗起雾，世界把我静音了一下。",
    flavorProfile: "可可、烤橡木、一点点烟熏，回甘像被子。",
    moodTags: ["下雨", "雨天", "阴天", "潮湿", "安静", "独处", "宅", "巧克力"],
  },
];

export const VIBE_EXAMPLES: VibeExample[] = [...EMOTIONAL_EXAMPLES, ...GENERIC_EXAMPLES];

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

/**
 * Pick the example whose moodTags best overlap with the user's mood.
 * Falls back to a random example so Chinese output always gets a style anchor.
 */
export function pickVibeExample(mood: string): VibeExample {
  const m = (mood || "").toLowerCase();
  const emotional = isEmotionalVibe(mood);
  // If the vibe sounds emotional, bias toward emotional examples; otherwise
  // consider all examples. Within the pool, score by tag overlap + jitter.
  const pool = emotional ? EMOTIONAL_EXAMPLES : VIBE_EXAMPLES;
  let best = pool[Math.floor(Math.random() * pool.length)];
  let bestScore = -1;
  for (const ex of pool) {
    let score = 0;
    for (const tag of ex.moodTags) {
      if (m.includes(tag.toLowerCase())) score += 2;
    }
    score += Math.random() * 0.8;
    if (score > bestScore) {
      bestScore = score;
      best = ex;
    }
  }
  return best;
}
