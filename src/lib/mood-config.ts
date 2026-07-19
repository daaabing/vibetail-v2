// Per-mood liquid color + short reply line + user-voice prefill.
// - `response*`  → bartender-style reply, shown under the bottle.
// - `prefill*`   → first-person "here's what's happening with me" line,
//                  drops straight into the textarea when the vibe is picked.

export interface MoodConfig {
  color: string;
  responseZh: string;
  responseEn: string;
  prefillZh?: string;
  prefillEn?: string;
}

const MAP: Record<string, MoodConfig> = {
  // ── 今天在干嘛？(zh) ─────────────────────────────────────────────
  "摸鱼中": { color: "#8FB6C8", responseZh: "摸鱼不是偷懒，是灵魂在后台运行。", responseEn: "Not slacking — soul running in the background.", prefillZh: "今天班上得心不在焉，能摸的鱼全摸了。", prefillEn: "Barely at work today, fishing every minute I can." },
  "下班了（终于）": { color: "#F2B66D", responseZh: "辛苦了，今天的你值得被好好倒满。", responseEn: "You made it. Tonight's glass fills all the way.", prefillZh: "总算下班了，只想找个地方把今天关掉。", prefillEn: "Finally off — just want to switch today off somewhere." },
  "加班续命": { color: "#C86B5A", responseZh: "CPU 可以烧，灵魂不能断电。", responseEn: "CPU burning, soul still plugged in.", prefillZh: "还在加班，需要点液体续命。", prefillEn: "Still at the office. Need liquid life support." },
  "工位发呆": { color: "#A8A6D9", responseZh: "发呆也是一种低功耗思考模式。", responseEn: "Zoning out is just low-power mode.", prefillZh: "盯着屏幕发呆一下午，脑子已经离线。", prefillEn: "Stared at the screen all afternoon, brain offline." },
  "假装很忙": { color: "#D5B26E", responseZh: "演得很好，建议给自己颁一杯。", responseEn: "Great performance — reward yourself a glass.", prefillZh: "其实没什么事，就是不想让人来找我。", prefillEn: "Nothing to do — just don't want anyone to find me." },
  "等外卖": { color: "#E39C6A", responseZh: "外卖还没到，仪式感可以先到。", responseEn: "Food's late — ritual can start early.", prefillZh: "外卖还有二十分钟，先喝一口垫垫。", prefillEn: "Food's twenty minutes out — need something to start on." },
  "等对象回消息": { color: "#D98BA7", responseZh: "消息会不会来不知道，微醺可以先来。", responseEn: "Text may not come. This drink will.", prefillZh: "两小时了ta还没回消息，我先假装不在乎。", prefillEn: "Two hours, no reply. Pretending I'm not checking." },
  "和朋友微醺": { color: "#F0A36F", responseZh: "这杯适合碰一下，也适合多聊一句。", responseEn: "Made for a clink and one more story.", prefillZh: "和朋友在外面，想再来一杯不那么正经的。", prefillEn: "Out with friends, want something a little unserious." },
  "一个人小酌": { color: "#B48FD9", responseZh: "一个人的酒，也可以很有陪伴感。", responseEn: "Drinking alone — still good company.", prefillZh: "一个人在家，想给自己倒一杯。", prefillEn: "Home alone. Just want to pour myself something nice." },
  "深夜emo": { color: "#596C91", responseZh: "别急着振作，先把夜晚轻轻放下。", responseEn: "No rush to recover. Just set the night down gently.", prefillZh: "就不该睡前刷小红书，又开始焦虑了。", prefillEn: "Shouldn't have opened my phone before bed. Spiraling again." },
  "熬夜冠军": { color: "#6A86C8", responseZh: "你不是不困，你是在和明天极限拉扯。", responseEn: "Not un-tired. Just wrestling with tomorrow.", prefillZh: "明明困得要命，就是舍不得睡。", prefillEn: "Exhausted but can't bring myself to sleep." },
  "奖励一下自己": { color: "#F0C76E", responseZh: "批准了，今天的奖励额度已到账。", responseEn: "Approved. Reward credits deposited.", prefillZh: "今天扛下来了，我要给自己发个奖。", prefillEn: "Survived today. Awarding myself something nice." },
  "庆祝一下": { color: "#F5A35C", responseZh: "值得庆祝的事，不需要等到很大才算数。", responseEn: "You don't need a big reason to celebrate.", prefillZh: "有点小事想庆祝，别问什么事。", prefillEn: "Something small to celebrate. Don't ask what." },
  "借酒消愁（真的假的）": { color: "#7E8CA8", responseZh: "真的假的不重要，先把心事稀释一点。", responseEn: "Real or not — let's dilute it a little.", prefillZh: "说是借酒消愁，其实就是想给自己一个理由。", prefillEn: "Say it's drowning sorrows — really just wanted a reason." },
  "今天必须喝一杯": { color: "#D66A5F", responseZh: "收到，今天这杯不是可选项，是精神刚需。", responseEn: "Copy — tonight this drink is a necessity.", prefillZh: "今天不喝一杯说不过去。", prefillEn: "Today wouldn't make sense without a drink." },
  "周末启动中": { color: "#62BFA3", responseZh: "周末模式已启动，请降低理智浓度。", responseEn: "Weekend mode engaged. Lowering the sensible.", prefillZh: "周五晚了，理智可以先下班。", prefillEn: "It's Friday night — the sensible me clocks out." },
  "逃离现实": { color: "#7A9ED9", responseZh: "现实先静音一下，今晚交给想象力。", responseEn: "Muting reality. Handing the mic to imagination.", prefillZh: "不想面对任何人，包括我自己。", prefillEn: "Don't want to face anyone. Including myself." },
  "放空充电": { color: "#9BCBB8", responseZh: "正在充电中，请勿打扰这颗电量不足的心。", responseEn: "Charging — do not disturb this low-battery heart.", prefillZh: "什么都不想干，只想脑子空一会儿。", prefillEn: "Don't want to do anything. Just want my head empty for a bit." },
  "人在酒吧，魂在床上": { color: "#B08AD8", responseZh: "身体很社交，灵魂已经盖好被子了。", responseEn: "Body's out. Soul's already tucked in.", prefillZh: "人来了，但灵魂已经躺床上了。", prefillEn: "I showed up. My soul is already in bed." },
  "团建营业": { color: "#C0A36E", responseZh: "营业中，但请给灵魂保留一点下班权。", responseEn: "On the clock — soul deserves overtime rights.", prefillZh: "团建现场营业中，笑容按分钟计费。", prefillEn: "Team dinner. Smiling on the clock." },
  "今天不想做人": { color: "#6F7788", responseZh: "可以，今晚先做一杯会呼吸的酒。", responseEn: "Fine — tonight, be a drink that breathes.", prefillZh: "今天不想当人，可以当杯酒吗。", prefillEn: "Not doing the human thing today. Can I be a drink instead?" },
  "出来透透气": { color: "#8EC8C2", responseZh: "透气成功，心里的窗户开了一条缝。", responseEn: "A little air — window in your chest just cracked open.", prefillZh: "在家待久了，得出来透一口。", prefillEn: "Been inside too long. Needed to breathe out here." },
  "约会中": { color: "#DAA0B4", responseZh: "气氛刚好，这杯别端得太用力。", responseEn: "Vibe's just right — hold the glass loosely.", prefillZh: "在约会，需要一杯让我看起来很松弛的。", prefillEn: "On a date. Need a drink that makes me look effortless." },
  "第一次见面": { color: "#E7B389", responseZh: "第一杯尽量不出错，接下来才有故事。", responseEn: "Play the first drink safe. Story starts at the second.", prefillZh: "第一次见面，别让我点错酒露馅。", prefillEn: "First meet — don't let me order something embarrassing." },
  "看球！": { color: "#7BB58A", responseZh: "开赛前一杯，别喝到中场就沉了。", responseEn: "Pregame pour — don't sink by halftime.", prefillZh: "马上开赛，得来一杯能陪我喊到加时的。", prefillEn: "Kickoff soon — need something to shout through overtime with." },
  "追剧配酒": { color: "#B39AC7", responseZh: "剧情起伏靠它，情绪也靠它。", responseEn: "Plot twists pair better with this in hand.", prefillZh: "开新剧了，得配杯像样的。", prefillEn: "Starting a new series. Need a proper glass in hand." },
  "打游戏中": { color: "#6BB2D0", responseZh: "手要稳，酒可以不稳。", responseEn: "Hands steady — the drink doesn't have to be.", prefillZh: "打排位打到手抖，要点液体镇定剂。", prefillEn: "Ranked has my hands shaking. Need liquid calm." },
  "聊人生": { color: "#8FA99B", responseZh: "话题很重，杯子请别端太满。", responseEn: "Heavy topic — don't fill the glass too full.", prefillZh: "和朋友聊到人生的部分了，我需要点助推。", prefillEn: "We got to the life-talk part of the night. Need a nudge." },
  "等奇迹发生": { color: "#C7B26E", responseZh: "奇迹迟到没关系，酒不会迟到。", responseEn: "Miracles run late. Drinks don't.", prefillZh: "没什么盼头，但还是想等点什么好事。", prefillEn: "Nothing to look forward to. Still waiting for something good." },
  "纯粹嘴馋": { color: "#E8A574", responseZh: "不需要理由，馋就是理由。", responseEn: "No excuse needed. Craving is the reason.", prefillZh: "没什么心情不心情的，就是嘴馋。", prefillEn: "No mood involved — just craving something in the glass." },

  // ── 今天是什么局？ ────────────────────────────────────────────────
  "摸鱼局": { color: "#8FB6C8", responseZh: "低调开局，别被老板抓到。", responseEn: "Low-key start. Don't get caught.", prefillZh: "偷偷摸摸约的局，声音都要小一点。", prefillEn: "Snuck out for drinks. Keeping it quiet." },
  "发疯局": { color: "#D66A5F", responseZh: "OK，安全带请系好。", responseEn: "OK — buckle up.", prefillZh: "今晚要发疯，理智先别跟来。", prefillEn: "Going feral tonight. Leave the sensible me at home." },
  "微醺局": { color: "#F0A36F", responseZh: "刚刚好，不多不少那种。", responseEn: "Just enough — that sweet spot.", prefillZh: "不想喝多，就想微微上头。", prefillEn: "Don't want to get wrecked — just pleasantly floaty." },
  "治愈局": { color: "#9BCBB8", responseZh: "轻一点，慢一点，够了。", responseEn: "Lighter. Slower. Enough.", prefillZh: "最近有点累，就想被一杯酒好好抱一下。", prefillEn: "Been a rough stretch. Want a drink that hugs me back." },
  "失恋局": { color: "#7E8CA8", responseZh: "这杯不解决问题，但陪你坐着。", responseEn: "Won't fix it — will sit with you.", prefillZh: "刚失恋，需要一杯不会离开我的东西。", prefillEn: "Just got dumped. Need something that won't leave me." },
  "桃花局": { color: "#DAA0B4", responseZh: "颜值上桌，酒也得跟上。", responseEn: "You look good — drink better keep up.", prefillZh: "今晚可能会有故事，先来一杯稳住。", prefillEn: "Tonight might turn into something. Setting the tone." },
  "暧昧局": { color: "#E19DB0", responseZh: "别说破，喝就完了。", responseEn: "Don't name it. Just sip.", prefillZh: "和那个人又要见面了，我需要装作很淡定。", prefillEn: "Seeing that person again — need to look very casual about it." },
  "社牛局": { color: "#F5A35C", responseZh: "话匣子开好了，酒来加油。", responseEn: "Mouth's already running — this fuels it.", prefillZh: "今天状态在线，想认识点新朋友。", prefillEn: "Feeling on tonight. Want to meet new people." },
  "社恐局": { color: "#8A9EB3", responseZh: "手里得有点东西，才不慌。", responseEn: "Something in the hand keeps the panic down.", prefillZh: "被拉出来社交，手里得攥点什么才安心。", prefillEn: "Dragged out socializing. Need something in my hand to survive." },
  "老友局": { color: "#C0A36E", responseZh: "熟人杯，不用装。", responseEn: "Old-friend pour. No pretending.", prefillZh: "老朋友聚会，不用装了，随便点。", prefillEn: "Old friends. Nothing to prove. Just pour me something easy." },
  "拼酒局": { color: "#C86B5A", responseZh: "别硬撑，撑不住就换这杯。", responseEn: "Don't hero it. Switch to this.", prefillZh: "今晚拼酒，得来一杯上头但不难喝的。", prefillEn: "Party night — need something that hits without tasting like regret." },
  "续摊局": { color: "#B08AD8", responseZh: "第二场了，这杯要顺口。", responseEn: "Round two — keep it smooth.", prefillZh: "第二场了，这杯得顺口点。", prefillEn: "Second bar of the night. Keep it easy." },
  "世界杯决赛局": { color: "#7BB58A", responseZh: "上半场先克制，下半场再放开。", responseEn: "Restraint in the first half. Loosen up in the second.", prefillZh: "决赛之夜，上半场先克制。", prefillEn: "Final night — going to pace myself in the first half." },
  "今天全靠氛围感": { color: "#B7A9B3", responseZh: "内容不重要，感觉到位就行。", responseEn: "Substance optional. Vibe mandatory.", prefillZh: "今天什么都不想想，全靠氛围感。", prefillEn: "Not thinking tonight — pure vibes only." },

  // ── 今日状态 ─────────────────────────────────────────────────────
  "摆烂中": { color: "#7E8CA8", responseZh: "躺平也是一种功夫。", responseEn: "Lying flat is a discipline too.", prefillZh: "今天什么都不想干，纯躺平。", prefillEn: "Not doing a thing today. Fully horizontal." },
  "发疯中": { color: "#D66A5F", responseZh: "这杯正好配你的能量。", responseEn: "This one matches your energy exactly.", prefillZh: "现在情绪像开了倍速，压不下来。", prefillEn: "My mood is running at 2x. Can't slow it down." },
  "已读不回": { color: "#8A9EB3", responseZh: "不回消息，这杯回你。", responseEn: "You ignore them — this drink answers back.", prefillZh: "看完消息就是不想回，先给自己倒一杯。", prefillEn: "Read the message. Not replying. Pouring instead." },
  "CPU烧了": { color: "#C86B5A", responseZh: "关机重启前，先喝一口。", responseEn: "Reboot after one sip.", prefillZh: "脑子今天用得太狠，已经冒烟了。", prefillEn: "Overclocked my brain today. Something's smoking." },
  "电量1%": { color: "#596C91", responseZh: "一口回血，理论上。", responseEn: "One sip = full charge. Theoretically.", prefillZh: "整个人快没电了，急需回血。", prefillEn: "Running on fumes. Need a top-up." },
  "满血复活": { color: "#62BFA3", responseZh: "状态在线，杯子要跟上。", responseEn: "Fully online — the glass better keep up.", prefillZh: "扶我起来我还能再战三百回合。", prefillEn: "Prop me up — I can go three hundred more rounds." },
  "嘴硬心软": { color: "#DAA0B4", responseZh: "外硬内柔，这杯懂你。", responseEn: "Tough outside, soft inside — this one gets it.", prefillZh: "嘴上说不在乎，其实想了一整天。", prefillEn: "Said I didn't care. Thought about it all day." },
  "情绪稳定（伪）": { color: "#8FA99B", responseZh: "演得挺像的，不拆穿。", responseEn: "Convincing act. Not calling it out.", prefillZh: "表面很稳，内心已经炸了三次了。", prefillEn: "Looking fine — inside I've combusted three times already." },
  "灵魂出走": { color: "#B08AD8", responseZh: "身体在这，酒代你陪着。", responseEn: "Body's here — this drink stands in for the rest.", prefillZh: "人是坐这的，脑子飘到哪去了不知道。", prefillEn: "Body's at the table. Head is somewhere else entirely." },
  "好运加载中": { color: "#F0C76E", responseZh: "加载条差一杯的距离。", responseEn: "Loading bar is one drink away.", prefillZh: "感觉今晚可能会有好事发生。", prefillEn: "Got a feeling something good could happen tonight." },
  "今天有点上头": { color: "#E39C6A", responseZh: "已经上头，再来点也不亏。", responseEn: "Already buzzed — one more won't hurt.", prefillZh: "已经有点上头了，再来一杯也没差。", prefillEn: "Already a little buzzed. One more won't hurt." },
  "已进入周末模式": { color: "#62BFA3", responseZh: "OOO 已开启，别打扰。", responseEn: "OOO is on. Do not disturb.", prefillZh: "周末已启动，别跟我提工作。", prefillEn: "Weekend mode on. Don't mention work to me." },
  "选择性营业": { color: "#C0A36E", responseZh: "只对喜欢的人营业，包括这杯。", responseEn: "Only open to people I like. This drink included.", prefillZh: "今晚只对喜欢的人营业。", prefillEn: "Only open to people I actually like tonight." },
  "人间清醒（偶尔）": { color: "#BFBEBD", responseZh: "清醒到不了半夜，先喝为敬。", responseEn: "Clarity won't survive midnight. Drink up first.", prefillZh: "现在很清醒，估计撑不过半夜。", prefillEn: "Very clear-headed right now. Probably won't last past midnight." },
  "今日宜微醺": { color: "#F0A36F", responseZh: "黄历这么说的，那就听。", responseEn: "The stars said so. Let's listen.", prefillZh: "今天不适合清醒，微醺刚好。", prefillEn: "Today isn't a sober kind of day. Slightly floaty is perfect." },
  "靠意志力活着": { color: "#7E8CA8", responseZh: "意志力见底，这杯顶上。", responseEn: "Willpower's out. This drink takes over.", prefillZh: "全靠意志力硬撑到现在。", prefillEn: "Pure willpower is the only thing holding me up right now." },
  "一切都会好的吧": { color: "#9BCBB8", responseZh: "会的吧，先喝一口再说。", responseEn: "Probably. Sip first, worry later.", prefillZh: "都会好起来的吧，先喝一口再说。", prefillEn: "It'll be fine, right? Sipping first, deciding later." },
  "今天主打一个开心": { color: "#F5A35C", responseZh: "主打开心，别的先靠边。", responseEn: "Happiness first. Everything else, later.", prefillZh: "今天主打一个开心，别的一律不管。", prefillEn: "Only doing happy today. Everything else can wait." },
  "随机播放人生": { color: "#B39AC7", responseZh: "下一首交给运气。", responseEn: "Next track — luck picks.", prefillZh: "这段时间过得像随机播放，下一首不知道是啥。", prefillEn: "Life's on shuffle lately. No idea what plays next." },
  "管它呢": { color: "#B7A9B3", responseZh: "对，就是这个态度。", responseEn: "Yeah. That's the attitude.", prefillZh: "算了，管它呢，先喝再说。", prefillEn: "Whatever. Drinking first, dealing with it later." },

  // ── English extras (a handful of the common ones) ────────────────
  "Happy": { color: "#F0C76E", responseZh: "开心的时候更好喝。", responseEn: "Tastes better when you're happy.", prefillZh: "今天状态特别好，想给自己奖一杯。", prefillEn: "In a really good mood today — want to reward it." },
  "Chill": { color: "#9BCBB8", responseZh: "放松点，这杯很缓。", responseEn: "Easy. This one takes its time.", prefillZh: "没什么事，就想慢慢喝一杯。", prefillEn: "Nothing going on — just want something slow." },
  "Cozy": { color: "#E39C6A", responseZh: "把自己裹起来喝。", responseEn: "Wrap up, then sip.", prefillZh: "裹着毯子想喝点暖的。", prefillEn: "Under a blanket — want something warm in my hand." },
  "Romantic": { color: "#DAA0B4", responseZh: "灯光调暗，酒调好。", responseEn: "Lights low, drink dialed in.", prefillZh: "今晚气氛正好，想要一杯配得上的。", prefillEn: "Tonight has a mood — want a drink that keeps up." },
  "Flirty": { color: "#E19DB0", responseZh: "眼神先递过去。", responseEn: "Send the look first.", prefillZh: "今晚有点想搞事情。", prefillEn: "Feeling a little dangerous tonight." },
  "Stressed": { color: "#7E8CA8", responseZh: "先放下手机，再拿起杯子。", responseEn: "Phone down, glass up.", prefillZh: "肩膀紧到能敲鼓，需要一杯松一下。", prefillEn: "Shoulders are up by my ears. Need to unclench." },
  "Heartbroken": { color: "#596C91", responseZh: "这杯不修复什么，只陪你。", responseEn: "This one doesn't fix. Just stays.", prefillZh: "心里空了一块，想要点东西填一下。", prefillEn: "Something's missing in my chest. Want to fill it a little." },
  "Chaotic": { color: "#D66A5F", responseZh: "混乱是一种风格。", responseEn: "Chaos is a style.", prefillZh: "今天一切都在乱，那就干脆一起乱。", prefillEn: "Everything's chaos today — leaning into it." },
  "Just Vibing": { color: "#B7A9B3", responseZh: "什么都不想，喝就完了。", responseEn: "No thoughts. Just sip.", prefillZh: "什么都不想想，纯氛围就好。", prefillEn: "Not thinking. Just here for the vibe." },
  "Celebrating": { color: "#F5A35C", responseZh: "杯子举高一点。", responseEn: "Raise the glass higher.", prefillZh: "今天有值得庆祝的事，你别管是啥。", prefillEn: "Something worth celebrating today — don't ask what." },
  "Tired": { color: "#7E8CA8", responseZh: "累了就慢慢来。", responseEn: "Tired — take it slow.", prefillZh: "累到只想瘫着，能不动就不动。", prefillEn: "Too tired to move. Bring it to me." },
  "Surprise Me": { color: "#B08AD8", responseZh: "行，交给我。", responseEn: "Fine. I've got it.", prefillZh: "不想选了，你看着调吧。", prefillEn: "Don't want to pick. You choose." },
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
): { color: string; response: string; prefill: string } {
  if (!label) {
    return {
      color: fallbackColor,
      response: lang === "zh" ? FALLBACK_ZH[0] : FALLBACK_EN[0],
      prefill: "",
    };
  }
  const cfg = MAP[label];
  if (cfg) {
    const response = lang === "zh" ? cfg.responseZh : cfg.responseEn;
    const prefill =
      lang === "zh"
        ? cfg.prefillZh ?? cfg.responseZh
        : cfg.prefillEn ?? cfg.responseEn;
    return { color: cfg.color, response, prefill };
  }
  // Deterministic fallback line based on label hash so it's varied but stable.
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) | 0;
  const pool = lang === "zh" ? FALLBACK_ZH : FALLBACK_EN;
  return {
    color: fallbackColor,
    response: pool[Math.abs(h) % pool.length],
    prefill: label,
  };
}
