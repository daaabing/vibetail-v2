// Per-mood liquid color + short reply line. Falls back to the row color
// and a small variety of generic responses when a label isn't listed.

export interface MoodConfig {
  color: string;
  responseZh: string;
  responseEn: string;
}

const MAP: Record<string, MoodConfig> = {
  // ── 今天在干嘛？(zh) ─────────────────────────────────────────────
  "摸鱼中": { color: "#8FB6C8", responseZh: "摸鱼不是偷懒，是灵魂在后台运行。", responseEn: "Not slacking — soul running in the background." },
  "下班了（终于）": { color: "#F2B66D", responseZh: "辛苦了，今天的你值得被好好倒满。", responseEn: "You made it. Tonight's glass fills all the way." },
  "加班续命": { color: "#C86B5A", responseZh: "CPU 可以烧，灵魂不能断电。", responseEn: "CPU burning, soul still plugged in." },
  "工位发呆": { color: "#A8A6D9", responseZh: "发呆也是一种低功耗思考模式。", responseEn: "Zoning out is just low-power mode." },
  "假装很忙": { color: "#D5B26E", responseZh: "演得很好，建议给自己颁一杯。", responseEn: "Great performance — reward yourself a glass." },
  "等外卖": { color: "#E39C6A", responseZh: "外卖还没到，仪式感可以先到。", responseEn: "Food's late — ritual can start early." },
  "等对象回消息": { color: "#D98BA7", responseZh: "消息会不会来不知道，微醺可以先来。", responseEn: "Text may not come. This drink will." },
  "和朋友微醺": { color: "#F0A36F", responseZh: "这杯适合碰一下，也适合多聊一句。", responseEn: "Made for a clink and one more story." },
  "一个人小酌": { color: "#B48FD9", responseZh: "一个人的酒，也可以很有陪伴感。", responseEn: "Drinking alone — still good company." },
  "深夜emo": { color: "#596C91", responseZh: "别急着振作，先把夜晚轻轻放下。", responseEn: "No rush to recover. Just set the night down gently." },
  "熬夜冠军": { color: "#6A86C8", responseZh: "你不是不困，你是在和明天极限拉扯。", responseEn: "Not un-tired. Just wrestling with tomorrow." },
  "奖励一下自己": { color: "#F0C76E", responseZh: "批准了，今天的奖励额度已到账。", responseEn: "Approved. Reward credits deposited." },
  "庆祝一下": { color: "#F5A35C", responseZh: "值得庆祝的事，不需要等到很大才算数。", responseEn: "You don't need a big reason to celebrate." },
  "借酒消愁（真的假的）": { color: "#7E8CA8", responseZh: "真的假的不重要，先把心事稀释一点。", responseEn: "Real or not — let's dilute it a little." },
  "今天必须喝一杯": { color: "#D66A5F", responseZh: "收到，今天这杯不是可选项，是精神刚需。", responseEn: "Copy — tonight this drink is a necessity." },
  "周末启动中": { color: "#62BFA3", responseZh: "周末模式已启动，请降低理智浓度。", responseEn: "Weekend mode engaged. Lowering the sensible." },
  "逃离现实": { color: "#7A9ED9", responseZh: "现实先静音一下，今晚交给想象力。", responseEn: "Muting reality. Handing the mic to imagination." },
  "放空充电": { color: "#9BCBB8", responseZh: "正在充电中，请勿打扰这颗电量不足的心。", responseEn: "Charging — do not disturb this low-battery heart." },
  "人在酒吧，魂在床上": { color: "#B08AD8", responseZh: "身体很社交，灵魂已经盖好被子了。", responseEn: "Body's out. Soul's already tucked in." },
  "团建营业": { color: "#C0A36E", responseZh: "营业中，但请给灵魂保留一点下班权。", responseEn: "On the clock — soul deserves overtime rights." },
  "今天不想做人": { color: "#6F7788", responseZh: "可以，今晚先做一杯会呼吸的酒。", responseEn: "Fine — tonight, be a drink that breathes." },
  "出来透透气": { color: "#8EC8C2", responseZh: "透气成功，心里的窗户开了一条缝。", responseEn: "A little air — window in your chest just cracked open." },
  "约会中": { color: "#DAA0B4", responseZh: "气氛刚好，这杯别端得太用力。", responseEn: "Vibe's just right — hold the glass loosely." },
  "第一次见面": { color: "#E7B389", responseZh: "第一杯尽量不出错，接下来才有故事。", responseEn: "Play the first drink safe. Story starts at the second." },
  "看球！": { color: "#7BB58A", responseZh: "开赛前一杯，别喝到中场就沉了。", responseEn: "Pregame pour — don't sink by halftime." },
  "追剧配酒": { color: "#B39AC7", responseZh: "剧情起伏靠它，情绪也靠它。", responseEn: "Plot twists pair better with this in hand." },
  "打游戏中": { color: "#6BB2D0", responseZh: "手要稳，酒可以不稳。", responseEn: "Hands steady — the drink doesn't have to be." },
  "聊人生": { color: "#8FA99B", responseZh: "话题很重，杯子请别端太满。", responseEn: "Heavy topic — don't fill the glass too full." },
  "等奇迹发生": { color: "#C7B26E", responseZh: "奇迹迟到没关系，酒不会迟到。", responseEn: "Miracles run late. Drinks don't." },
  "纯粹嘴馋": { color: "#E8A574", responseZh: "不需要理由，馋就是理由。", responseEn: "No excuse needed. Craving is the reason." },

  // ── 今天是什么局？ ────────────────────────────────────────────────
  "摸鱼局": { color: "#8FB6C8", responseZh: "低调开局，别被老板抓到。", responseEn: "Low-key start. Don't get caught." },
  "发疯局": { color: "#D66A5F", responseZh: "OK，安全带请系好。", responseEn: "OK — buckle up." },
  "微醺局": { color: "#F0A36F", responseZh: "刚刚好，不多不少那种。", responseEn: "Just enough — that sweet spot." },
  "治愈局": { color: "#9BCBB8", responseZh: "轻一点，慢一点，够了。", responseEn: "Lighter. Slower. Enough." },
  "失恋局": { color: "#7E8CA8", responseZh: "这杯不解决问题，但陪你坐着。", responseEn: "Won't fix it — will sit with you." },
  "桃花局": { color: "#DAA0B4", responseZh: "颜值上桌，酒也得跟上。", responseEn: "You look good — drink better keep up." },
  "暧昧局": { color: "#E19DB0", responseZh: "别说破，喝就完了。", responseEn: "Don't name it. Just sip." },
  "社牛局": { color: "#F5A35C", responseZh: "话匣子开好了，酒来加油。", responseEn: "Mouth's already running — this fuels it." },
  "社恐局": { color: "#8A9EB3", responseZh: "手里得有点东西，才不慌。", responseEn: "Something in the hand keeps the panic down." },
  "老友局": { color: "#C0A36E", responseZh: "熟人杯，不用装。", responseEn: "Old-friend pour. No pretending." },
  "拼酒局": { color: "#C86B5A", responseZh: "别硬撑，撑不住就换这杯。", responseEn: "Don't hero it. Switch to this." },
  "续摊局": { color: "#B08AD8", responseZh: "第二场了，这杯要顺口。", responseEn: "Round two — keep it smooth." },
  "世界杯决赛局": { color: "#7BB58A", responseZh: "上半场先克制，下半场再放开。", responseEn: "Restraint in the first half. Loosen up in the second." },
  "今天全靠氛围感": { color: "#B7A9B3", responseZh: "内容不重要，感觉到位就行。", responseEn: "Substance optional. Vibe mandatory." },

  // ── 今日状态 ─────────────────────────────────────────────────────
  "摆烂中": { color: "#7E8CA8", responseZh: "躺平也是一种功夫。", responseEn: "Lying flat is a discipline too." },
  "发疯中": { color: "#D66A5F", responseZh: "这杯正好配你的能量。", responseEn: "This one matches your energy exactly." },
  "已读不回": { color: "#8A9EB3", responseZh: "不回消息，这杯回你。", responseEn: "You ignore them — this drink answers back." },
  "CPU烧了": { color: "#C86B5A", responseZh: "关机重启前，先喝一口。", responseEn: "Reboot after one sip." },
  "电量1%": { color: "#596C91", responseZh: "一口回血，理论上。", responseEn: "One sip = full charge. Theoretically." },
  "满血复活": { color: "#62BFA3", responseZh: "状态在线，杯子要跟上。", responseEn: "Fully online — the glass better keep up." },
  "嘴硬心软": { color: "#DAA0B4", responseZh: "外硬内柔，这杯懂你。", responseEn: "Tough outside, soft inside — this one gets it." },
  "情绪稳定（伪）": { color: "#8FA99B", responseZh: "演得挺像的，不拆穿。", responseEn: "Convincing act. Not calling it out." },
  "灵魂出走": { color: "#B08AD8", responseZh: "身体在这，酒代你陪着。", responseEn: "Body's here — this drink stands in for the rest." },
  "好运加载中": { color: "#F0C76E", responseZh: "加载条差一杯的距离。", responseEn: "Loading bar is one drink away." },
  "今天有点上头": { color: "#E39C6A", responseZh: "已经上头，再来点也不亏。", responseEn: "Already buzzed — one more won't hurt." },
  "已进入周末模式": { color: "#62BFA3", responseZh: "OOO 已开启，别打扰。", responseEn: "OOO is on. Do not disturb." },
  "选择性营业": { color: "#C0A36E", responseZh: "只对喜欢的人营业，包括这杯。", responseEn: "Only open to people I like. This drink included." },
  "人间清醒（偶尔）": { color: "#BFBEBD", responseZh: "清醒到不了半夜，先喝为敬。", responseEn: "Clarity won't survive midnight. Drink up first." },
  "今日宜微醺": { color: "#F0A36F", responseZh: "黄历这么说的，那就听。", responseEn: "The stars said so. Let's listen." },
  "靠意志力活着": { color: "#7E8CA8", responseZh: "意志力见底，这杯顶上。", responseEn: "Willpower's out. This drink takes over." },
  "一切都会好的吧": { color: "#9BCBB8", responseZh: "会的吧，先喝一口再说。", responseEn: "Probably. Sip first, worry later." },
  "今天主打一个开心": { color: "#F5A35C", responseZh: "主打开心，别的先靠边。", responseEn: "Happiness first. Everything else, later." },
  "随机播放人生": { color: "#B39AC7", responseZh: "下一首交给运气。", responseEn: "Next track — luck picks." },
  "管它呢": { color: "#B7A9B3", responseZh: "对，就是这个态度。", responseEn: "Yeah. That's the attitude." },

  // ── English extras (a handful of the common ones) ────────────────
  "Happy": { color: "#F0C76E", responseZh: "开心的时候更好喝。", responseEn: "Tastes better when you're happy." },
  "Chill": { color: "#9BCBB8", responseZh: "放松点，这杯很缓。", responseEn: "Easy. This one takes its time." },
  "Cozy": { color: "#E39C6A", responseZh: "把自己裹起来喝。", responseEn: "Wrap up, then sip." },
  "Romantic": { color: "#DAA0B4", responseZh: "灯光调暗，酒调好。", responseEn: "Lights low, drink dialed in." },
  "Flirty": { color: "#E19DB0", responseZh: "眼神先递过去。", responseEn: "Send the look first." },
  "Stressed": { color: "#7E8CA8", responseZh: "先放下手机，再拿起杯子。", responseEn: "Phone down, glass up." },
  "Heartbroken": { color: "#596C91", responseZh: "这杯不修复什么，只陪你。", responseEn: "This one doesn't fix. Just stays." },
  "Chaotic": { color: "#D66A5F", responseZh: "混乱是一种风格。", responseEn: "Chaos is a style." },
  "Just Vibing": { color: "#B7A9B3", responseZh: "什么都不想，喝就完了。", responseEn: "No thoughts. Just sip." },
  "Celebrating": { color: "#F5A35C", responseZh: "杯子举高一点。", responseEn: "Raise the glass higher." },
  "Tired": { color: "#7E8CA8", responseZh: "累了就慢慢来。", responseEn: "Tired — take it slow." },
  "Surprise Me": { color: "#B08AD8", responseZh: "行，交给我。", responseEn: "Fine. I've got it." },
};

const FALLBACK_ZH = [
  "收到，这个感觉能调。",
  "OK，正在为你配色。",
  "懂了，这杯我心里有数。",
  "行，这就配一杯像你的酒。",
];
const FALLBACK_EN = [
  "Got it. This one's mixable.",
  "OK — dialing in the color.",
  "I've got a shape for this.",
  "Fine. A drink that looks like you.",
];

export function getMoodConfig(
  label: string | null,
  fallbackColor: string,
  lang: "zh" | "en",
): { color: string; response: string } {
  if (!label) {
    return {
      color: fallbackColor,
      response: lang === "zh" ? FALLBACK_ZH[0] : FALLBACK_EN[0],
    };
  }
  const cfg = MAP[label];
  if (cfg) {
    return {
      color: cfg.color,
      response: lang === "zh" ? cfg.responseZh : cfg.responseEn,
    };
  }
  // Deterministic fallback line based on label hash so it's varied but stable.
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) | 0;
  const pool = lang === "zh" ? FALLBACK_ZH : FALLBACK_EN;
  return {
    color: fallbackColor,
    response: pool[Math.abs(h) % pool.length],
  };
}
