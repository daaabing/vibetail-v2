import type { Cocktail } from "@/lib/cocktails-store";
type NewCocktail = Omit<Cocktail, "id" | "publicId" | "createdAt" | "imageData">;

export const SEED_COCKTAILS: NewCocktail[] = [
  {
    cocktailName: "Merge Conflict Mojito",
    originalMood: "debugging at 2am with false confidence",
    selectedFlavors: ["bitter", "chaotic", "refreshing"],
    customPreference: "",
    flavorProfile: "bitter, chaotic, refreshing",
    tastesLike: "Three broken APIs, one working button, and the dangerous belief that everything will ship on time.",
    ingredients: [
      "2 oz cold brew confidence",
      "1 splash of last-minute panic",
      "3 crushed bugs (unresolved)",
      "A garnish of launch tweet energy",
    ],
    recipe:
      "Shake with unresolved bugs, caffeine, and one risky demo commit.\nServe immediately before judging.\nGarnish with false confidence and a browser tab you are afraid to close.",
    roast: "You are not okay, but your demo might be.",
    category: "builder-brain",
  },
  {
    cocktailName: "Prompt Injection Punch",
    originalMood: "trying to make an AI agent behave like a normal employee",
    selectedFlavors: ["chaotic", "dangerous", "spicy"],
    customPreference: "",
    flavorProfile: "chaotic, dangerous, spicy",
    tastesLike: "Nineteen system prompt rewrites, one hallucinated feature, and existential trust issues with your own code.",
    ingredients: [
      "3 oz misaligned instructions",
      "A splash of jailbreak paranoia",
      "2 tsp false confidence in guardrails",
      "Garnish: a stack trace you are pretending not to see",
    ],
    recipe:
      "Stir in 14 system prompt iterations.\nAdd one part hope and two parts despair.\nServe in a mug labeled 'production-ready'.\nGarnish with a model card you skimmed once.",
    roast: "Your agent works. It just has its own opinions about scope.",
    category: "builder-brain",
  },
  {
    cocktailName: "Demo Day Daiquiri",
    originalMood: "demo-ready but internally panicking",
    selectedFlavors: ["sweet", "dangerous"],
    customPreference: "something like a daiquiri but terrifying",
    flavorProfile: "sweet, dangerous",
    tastesLike: "Polished slides, one hardcoded response, and the unshakeable belief that nobody will click that button.",
    ingredients: [
      "2 oz rehearsed confidence",
      "1 oz live data (please don't break)",
      "A sprig of mint for the judges",
      "A secret emergency hotfix in your back pocket",
    ],
    recipe:
      "Blend on high until it looks intentional.\nPour into your cleanest glass.\nServe exactly 3 minutes before your time slot.\nGarnish with a smile that says 'this is definitely not hardcoded'.",
    roast: "The demo works. Everything after the demo is someone else's problem.",
    category: "builder-brain",
  },
  {
    cocktailName: "Ship It Spritz",
    originalMood: "locked in and held together by vibes",
    selectedFlavors: ["refreshing", "chaotic"],
    customPreference: "",
    flavorProfile: "refreshing, chaotic",
    tastesLike: "Focus music on loop, a Figma tab you haven't touched, and pure kinetic energy with nowhere to go.",
    ingredients: [
      "4 oz undirected momentum",
      "1 oz 'we'll fix it in the next sprint'",
      "A squeeze of JIRA avoidance",
      "Topped with vibe-based architecture",
    ],
    recipe:
      "Combine ingredients without reading the docs.\nStir counterclockwise while nodding confidently.\nServe immediately before anyone asks about tests.\nGarnish with a commit message that just says 'stuff'.",
    roast: "You shipped. Nobody knows what you shipped. Legends don't explain themselves.",
    category: "builder-brain",
  },
  {
    cocktailName: "Hallucination Highball",
    originalMood: "caffeinated, delusional, and trusting the LLM too much",
    selectedFlavors: ["unhinged", "expensive", "chaotic"],
    customPreference: "espresso martini vibes",
    flavorProfile: "unhinged, expensive, chaotic",
    tastesLike: "GPT-4's confidence, a citation that leads nowhere, and the electric feeling of being wrong at scale.",
    ingredients: [
      "3 oz model confidence (unjustified)",
      "1 tbsp fabricated references",
      "A dash of 'let me double-check that'",
      "Garnish: a hallucinated feature you put in the roadmap",
    ],
    recipe:
      "Pour without verifying.\nShake with blind optimism.\nServe before grounding in facts.\nGarnish with a confident tone and zero sources.",
    roast: "You and the model both believe it. That's almost the same as it being true.",
    category: "builder-brain",
  },
  {
    cocktailName: "Soft Launch Spritz",
    originalMood: "in a talking stage but pretending I don't care",
    selectedFlavors: ["sweet", "mysterious", "dreamy"],
    customPreference: "something that tastes like mixed signals",
    flavorProfile: "sweet, mysterious, dreamy",
    tastesLike: "A text left on read for three hours, replied to casually, and a notification you turned your phone over for.",
    ingredients: [
      "2 oz maintained indifference",
      "1 oz extremely tracked read receipts",
      "A splash of 'no I wasn't waiting'",
      "Garnish: a perfectly timed response delay",
    ],
    recipe:
      "Type and delete. Twice.\nWait exactly long enough to seem unbothered.\nServe at room temperature to avoid seeming too eager.\nGarnish with a reply that says 'haha yeah' but means everything.",
    roast: "You care deeply. The three-hour delay was curated.",
    category: "love-drunk",
  },
  {
    cocktailName: "No Contact Negroni",
    originalMood: "ghosted but thriving allegedly",
    selectedFlavors: ["bitter", "elegant", "dramatic"],
    customPreference: "bitter but make it glamorous",
    flavorProfile: "bitter, elegant, dramatic",
    tastesLike: "Unanswered Instagram stories, a glow-up still in progress, and the specific bitterness of choosing yourself loudly.",
    ingredients: [
      "2 oz dignified silence",
      "1 oz revenge gym membership",
      "A splash of new profile picture energy",
      "Garnish: a finsta they definitely check",
    ],
    recipe:
      "Delete the thread. Keep the screenshots.\nStir with a 'I'm doing great actually' energy.\nServe in your best outfit to no one in particular.\nGarnish with a vague Instagram story at 11pm.",
    roast: "The thriving is real. The 'allegedly' is carrying a lot of weight though.",
    category: "heartbreak",
  },
  {
    cocktailName: "Situationship Sour",
    originalMood: "emotionally unavailable but still checking their story",
    selectedFlavors: ["sour", "dreamy", "unhinged"],
    customPreference: "sweet but emotionally damaging",
    flavorProfile: "sour, dreamy, unhinged",
    tastesLike: "Plausible deniability, the middle section of a Phoebe Bridgers song, and feelings you have agreed not to name.",
    ingredients: [
      "1.5 oz undefined terms",
      "2 oz 'we're just hanging out'",
      "A squeeze of situational awareness (absent)",
      "Garnish: a story view from someone who 'doesn't care'",
    ],
    recipe:
      "Stir with unresolved tension.\nServe without labeling the glass.\nDo not ask what this is.\nGarnish with a heart react that means nothing. Allegedly.",
    roast: "The label is 'complicated'. The feelings are not.",
    category: "heartbreak",
  },
  {
    cocktailName: "Main Character Martini",
    originalMood: "dramatic, mysterious, and slightly overdressed",
    selectedFlavors: ["elegant", "dramatic", "expensive"],
    customPreference: "espresso martini vibes but make it a main character moment",
    flavorProfile: "elegant, dramatic, expensive",
    tastesLike: "A mid-song walk in the rain, a meaningful glance across the room, and the profound certainty that this scene matters.",
    ingredients: [
      "3 oz narrative gravitas",
      "1 oz 'everyone is watching me right now'",
      "A twist of atmospheric music only you can hear",
      "Garnish: excellent timing",
    ],
    recipe:
      "Enter slowly. Leave impressions.\nShake with deliberate energy.\nServe in the most dramatic glassware available.\nGarnish with a knowing look and appropriate lighting.",
    roast: "This is your moment. It has been your moment for six years.",
    category: "chaos",
  },
  {
    cocktailName: "Cold Brew Breakdown",
    originalMood: "running on caffeine, ambition, and poor decisions",
    selectedFlavors: ["bitter", "unhinged", "dangerous"],
    customPreference: "make it taste like heartbreak and cold brew",
    flavorProfile: "bitter, unhinged, dangerous",
    tastesLike: "Four cold brews, a bold career move you made at midnight, and the specific clarity that arrives too late.",
    ingredients: [
      "4 oz cold brew (double strength)",
      "1 oz 'I can sleep when I'm finished'",
      "A splash of overconfidence",
      "Garnish: a new tab called 'should I just quit and start a startup'",
    ],
    recipe:
      "Consume before fully waking up.\nAdd ambition to taste, more than seems reasonable.\nStir with a slightly unhinged decision.\nServe immediately. Do not sleep first.",
    roast: "You're not tired. You're caffeinated beyond consequence.",
    category: "late-night",
  },
];

export const FLAVOR_CHIPS = [
  { label: "sweet",    labelZh: "甜",   color: "#F472B6" },
  { label: "bitter",   labelZh: "苦",   color: "#78716C" },
  { label: "spicy",    labelZh: "辣",   color: "#EF4444" },
  { label: "smoky",    labelZh: "烟熏", color: "#A8A29E" },
  { label: "sour",     labelZh: "酸",   color: "#A3E635" },
  { label: "citrusy",  labelZh: "柑橘", color: "#FACC15" },
  { label: "herbal",   labelZh: "草本", color: "#4ADE80" },
  { label: "dry",      labelZh: "干型", color: "#D6D3D1" },
  { label: "fruity",   labelZh: "果香", color: "#FB7185" },
  { label: "floral",   labelZh: "花香", color: "#E879F9" },
  { label: "earthy",   labelZh: "泥土", color: "#A16207" },
  { label: "creamy",   labelZh: "奶感", color: "#FDE68A" },
  { label: "bubbly",   labelZh: "气泡", color: "#67E8F9" },
  { label: "boozy",    labelZh: "酒感", color: "#C084FC" },
  { label: "tart",     labelZh: "涩口", color: "#86EFAC" },
];

export const MOOD_PLACEHOLDERS_EN = [
  "sleep-deprived, caffeinated, and pretending my demo works",
  "in a talking stage but acting unbothered",
  "debugging at 2am with suspicious confidence",
  "ghosted but thriving allegedly",
  "locked in, dramatic, and running on vibes",
  "romantically delusional but fully self-aware",
  "five tabs open, zero decisions made",
  "caffeinated, delusional, and trusting the LLM too much",
];

export const MOOD_PLACEHOLDERS_ZH = [
  "睡眠不足，咖啡因过量，demo 还没跑通",
  "在暧昧期但假装很淡定",
  "凌晨两点 debug，莫名充满信心",
  "被拉黑了但据说活得挺好",
  "锁定状态，情绪丰富，靠 vibe 续命",
  "感情上幻觉，但自我意识清醒",
  "开了五个 tab，一个决定没做",
  "喝多咖啡，过度信任 AI，继续摆烂",
];

export const MOOD_PLACEHOLDERS = MOOD_PLACEHOLDERS_EN;

export const CUSTOM_FLAVOR_PLACEHOLDERS_EN = [
  "something like a mojito",
  "espresso martini vibes",
  "make it taste like heartbreak and cold brew",
  "sweet but emotionally damaging",
  "spicy, dramatic, and expensive",
  "no real alcohol, just vibes",
];

export const CUSTOM_FLAVOR_PLACEHOLDERS_ZH = [
  "类似莫吉托的感觉",
  "浓缩马提尼那种味道",
  "像失恋加冷萃咖啡的感觉",
  "甜但是伤感情的那种",
  "辣、有戏剧感、还要贵",
  "不要酒精，只要氛围",
];

export const CUSTOM_FLAVOR_PLACEHOLDERS = CUSTOM_FLAVOR_PLACEHOLDERS_EN;

export const GALLERY_FILTERS = [
  { id: "all", label: "All" },
  { id: "builder-brain", label: "Builder Brain" },
  { id: "love-drunk", label: "Love Drunk" },
  { id: "heartbreak", label: "Heartbreak" },
  { id: "chaos", label: "Chaos" },
  { id: "late-night", label: "Late Night" },
];

export const VIBE_CHIPS = [
  // 技术 / builder
  { label: "写代码中", labelEn: "Hacking", category: "builder-brain", color: "#22C55E" },
  { label: "紧急修 bug", labelEn: "Hot Fix", category: "builder-brain", color: "#EF4444" },
  { label: "代码冻结了", labelEn: "Code Freeze", category: "builder-brain", color: "#38BDF8" },
  { label: "随时待命", labelEn: "On Call", category: "late-night", color: "#F59E0B" },
  { label: "密钥丢了", labelEn: "API Key Missing", category: "chaos", color: "#94A3B8" },
  { label: "演示日", labelEn: "Demo Day", category: "builder-brain", color: "#10B981" },
  // 情感 / 恋爱
  { label: "在恋爱", labelEn: "In Love", category: "love-drunk", color: "#F43F5E" },
  // 电影
  { label: "黑客帝国", labelEn: "The Matrix", category: "builder-brain", color: "#4ADE80" },
  { label: "迷失东京", labelEn: "Lost in Translation", category: "late-night", color: "#818CF8" },
  { label: "星际穿越", labelEn: "Interstellar", category: "chaos", color: "#38BDF8" },
  { label: "爱乐之城", labelEn: "La La Land", category: "love-drunk", color: "#FCD34D" },
  // 歌曲
  { label: "Espresso", labelEn: "Espresso", category: "love-drunk", color: "#D97706" },
  { label: "Anti-Hero", labelEn: "Anti-Hero", category: "chaos", color: "#EF4444" },
  { label: "午夜雨声", labelEn: "Midnight Rain", category: "late-night", color: "#6366F1" },
  { label: "坏女孩", labelEn: "Bad Guy", category: "chaos", color: "#1E293B" },
  // 状态
  { label: "疗愈中", labelEn: "Healing Era", category: "heartbreak", color: "#86EFAC" },
];
