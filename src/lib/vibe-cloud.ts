// Cloud-of-vibes data — grouped by category, but the category name is NEVER
// shown in the UI. Each category renders as its own drifting row so the whole
// section reads like a soft cloud of chips floating past.

export interface VibeCloudRow {
  /** Morandi accent color used for the chip dot / selected border. */
  color: string;
  /** Drift direction: "ltr" = flows left→right, "rtl" = right→left. */
  dir: "ltr" | "rtl";
  /** Chip labels in this row. */
  labels: string[];
}

// ── English ────────────────────────────────────────────────────────────────
export const VIBE_ROWS_EN: VibeCloudRow[] = [
  {
    color: "#99B9C6", // Morandi Blue — Mood
    dir: "rtl",
    labels: [
      "Happy", "Excited", "Relaxed", "Cozy", "Chill", "Adventurous",
      "Romantic", "Flirty", "Confident", "Playful", "Nostalgic", "Dreamy",
      "Curious", "Grateful", "Celebrating", "Hopeful", "Tired", "Burned Out",
      "Stressed", "Overthinking", "Heartbroken", "Delulu", "Chaotic",
      "Unhinged", "Main Character", "Feeling Lucky", "Treating Myself",
      "YOLO", "In My Healing Era", "Just Vibing",
    ],
  },
  {
    color: "#A9B4A1", // Morandi Green — What are you doing?
    dir: "ltr",
    labels: [
      "Doomscrolling", "Romanticizing My Life", "Touching Grass",
      "Avoiding Responsibilities", "Procrastinating",
      "Pretending to Be Productive", "Healing (Allegedly)",
      "Main Character Moment", "Delulu Era", "Locked In", "Unwinding",
      "Rotting on the Couch", "Watching the World Burn",
      "Making Questionable Decisions", "Celebrating Something",
      "Recovering from Yesterday", "Crying in Style",
      "Flirting with Bad Ideas", "Chasing Dopamine",
      "Soft Launching My Personality", "Ghosting My Problems",
      "Escaping Reality", "Running on Caffeine", "Surviving Monday",
      "Clocking Out Mentally", "Living My Best Life",
      "Rewatching Comfort Shows", "Plotting My Next Vacation",
      "Manifesting", "Touching Nothing but My Phone",
      "Watching the Sunset", "Watching the Stars", "Beach Day",
      "Pool Party", "BBQ", "Brunch", "Wedding", "Birthday", "Celebration",
      "Watching Sports", "World Cup Final", "Movie Night", "Game Night",
      "Karaoke", "Cooking Dinner", "Reading a Book", "Rooftop Hangout",
    ],
  },
  {
    color: "#B7A9B3", // Morandi Lavender — Energy
    dir: "rtl",
    labels: [
      "Low Energy", "Need a Reset", "Taking It Slow", "Feeling Fancy",
      "Ready to Party", "Chaos Mode", "Full Send", "Staying Classy",
      "Keeping It Casual", "Feeling Dangerous",
    ],
  },
  {
    color: "#DAC5C3", // Morandi Pink — Occasion
    dir: "ltr",
    labels: [
      "Friday Night", "Saturday Brunch", "Summer Evening", "Rainy Day",
      "Golden Hour", "First Date", "Reunion", "Promotion",
      "Breakup Recovery", "It's Giving Friday", "Barely Made It", "We Ball",
      "Delulu but Hopeful", "In My Villain Era", "Hot Girl Summer",
      "Brat Summer", "Chaos O'Clock", "Financially Irresponsible",
      "One More Drink Won't Hurt", "Therapy Is Tomorrow",
      "Post-PTO Depression", "Corporate Survivor", "Weekend Loading...",
      "Vacation Brain", "First Date Panic", "Situationship Certified",
      "Soft Launch Energy", "Main Character Energy",
      "The Group Chat Finally Met", "Touch Grass Challenge", "Canon Event",
      "Midlife Crisis (Lite)", "It's Not That Deep", "Just Here for the Plot",
      "Fake It Till You Make It", "Emotionally Expensive",
      "Mentally on Vacation", "Living Off Vibes", "Absolutely Unsupervised",
    ],
  },
];

// ── 中文 ───────────────────────────────────────────────────────────────────
export const VIBE_ROWS_ZH: VibeCloudRow[] = [
  {
    color: "#99B9C6", // 今天在干嘛？
    dir: "rtl",
    labels: [
      "摸鱼中", "下班了（终于）", "加班续命", "工位发呆", "假装很忙",
      "等外卖", "等对象回消息", "和朋友微醺", "一个人小酌", "深夜emo",
      "熬夜冠军", "奖励一下自己", "庆祝一下", "借酒消愁（真的假的）",
      "今天必须喝一杯", "周末启动中", "逃离现实", "放空充电",
      "人在酒吧，魂在床上", "今天不想做人", "出来见世面", "团建营业",
      "约会中", "第一次见面", "看球！", "追剧配酒", "打游戏中",
      "聊人生", "等奇迹发生", "纯粹嘴馋",
    ],
  },
  {
    color: "#A9B4A1", // 今天是什么局？
    dir: "ltr",
    labels: [
      "摸鱼局", "发疯局", "微醺局", "治愈局", "失恋局", "桃花局",
      "暧昧局", "社牛局", "社恐局", "老友局", "拼酒局", "续摊局",
      "吃瓜局", "吹牛局", "摆烂局", "KPI清零局", "工资到账局",
      "发工资前局", "周五快乐局", "明天不上班局", "赛前热身局",
      "世界杯决赛局", "人生重启局", "情绪稳定局（装的）", "今天必须开心局",
      "管他呢先喝局", "成年人的崩溃局", "有故事局", "随便喝喝局",
      "今天全靠氛围感",
    ],
  },
  {
    color: "#DAC5C3", // 今日状态
    dir: "rtl",
    labels: [
      "摆烂中", "发疯中", "已读不回", "CPU烧了", "电量1%", "满血复活",
      "嘴硬心软", "情绪稳定（伪）", "灵魂出走", "好运加载中",
      "今天有点上头", "已进入周末模式", "选择性营业", "人间清醒（偶尔）",
      "今日宜微醺", "靠意志力活着", "一切都会好的吧",
      "今天主打一个开心", "随机播放人生", "管它呢",
    ],
  },
];
