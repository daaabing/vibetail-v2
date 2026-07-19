// Per-mood liquid color + short reply line + user-voice prefill.
// - `response*`  → bartender-style reply, shown under the bottle.
// - `prefill*`   → first-person, scene-specific line the user could have
//                  written themselves; drops straight into the textarea
//                  when the vibe is picked. Each one is unique — do not
//                  reuse phrasing between entries.

export interface MoodConfig {
  color: string;
  responseZh: string;
  responseEn: string;
  prefillZh?: string;
  prefillEn?: string;
}

const MAP: Record<string, MoodConfig> = {
  // ── 今天在干嘛？(zh) ─────────────────────────────────────────────
  "摸鱼中": { color: "#8FB6C8", responseZh: "摸鱼不是偷懒，是灵魂在后台运行。", responseEn: "Not slacking — soul running in the background.", prefillZh: "会议开着，购物车已经加到第三页。", prefillEn: "Meeting's on mute — I'm on page three of the checkout." },
  "下班了（终于）": { color: "#F2B66D", responseZh: "辛苦了，今天的你值得被好好倒满。", responseEn: "You made it. Tonight's glass fills all the way.", prefillZh: "电脑一合，先假装自己是个自由人。", prefillEn: "Laptop shut. Pretending to be a free person for a few hours." },
  "加班续命": { color: "#C86B5A", responseZh: "CPU 可以烧，灵魂不能断电。", responseEn: "CPU burning, soul still plugged in.", prefillZh: "十点半的办公室只剩我和打印机的嗡嗡声。", prefillEn: "10:30pm and it's just me and the printer humming." },
  "工位发呆": { color: "#A8A6D9", responseZh: "发呆也是一种低功耗思考模式。", responseEn: "Zoning out is just low-power mode.", prefillZh: "光标闪了二十分钟，一个字没打。", prefillEn: "Cursor's been blinking for twenty minutes. Zero words typed." },
  "假装很忙": { color: "#D5B26E", responseZh: "演得很好，建议给自己颁一杯。", responseEn: "Great performance — reward yourself a glass.", prefillZh: "键盘敲得很响，其实在回微信。", prefillEn: "Typing loudly. Actually just replying to texts." },
  "等外卖": { color: "#E39C6A", responseZh: "外卖还没到，仪式感可以先到。", responseEn: "Food's late — ritual can start early.", prefillZh: "刷了七次app，骑手还在两公里外。", prefillEn: "Refreshed the app seven times. Driver is somehow further away." },
  "等对象回消息": { color: "#D98BA7", responseZh: "消息会不会来不知道，微醺可以先来。", responseEn: "Text may not come. This drink will.", prefillZh: "ta最后一次在线是四小时前，我数得比工资还清楚。", prefillEn: "They were last online four hours ago. I've been counting." },
  "和朋友微醺": { color: "#F0A36F", responseZh: "这杯适合碰一下，也适合多聊一句。", responseEn: "Made for a clink and one more story.", prefillZh: "已经开始重复讲同一个故事了，还是想再来一杯。", prefillEn: "Already telling the same story twice — still want another round." },
  "一个人小酌": { color: "#B48FD9", responseZh: "一个人的酒，也可以很有陪伴感。", responseEn: "Drinking alone — still good company.", prefillZh: "关了大灯只留桌上那盏，感觉像自己的电影。", prefillEn: "Killed the overhead. Just the desk lamp. Feels like a film." },
  "深夜emo": { color: "#596C91", responseZh: "别急着振作，先把夜晚轻轻放下。", responseEn: "No rush to recover. Just set the night down gently.", prefillZh: "就不该睡前刷小红书，又开始焦虑了。", prefillEn: "Shouldn't have opened my phone before bed. Spiraling again." },
  "熬夜冠军": { color: "#6A86C8", responseZh: "你不是不困，你是在和明天极限拉扯。", responseEn: "Not un-tired. Just wrestling with tomorrow.", prefillZh: "明天九点有会，我这儿两点还在挑歌。", prefillEn: "9am meeting tomorrow. It's 2am and I'm curating a playlist." },
  "奖励一下自己": { color: "#F0C76E", responseZh: "批准了，今天的奖励额度已到账。", responseEn: "Approved. Reward credits deposited.", prefillZh: "项目终于滚出我的邮箱了，我值得一杯好的。", prefillEn: "That project finally left my inbox. I'm owed something nice." },
  "庆祝一下": { color: "#F5A35C", responseZh: "值得庆祝的事，不需要等到很大才算数。", responseEn: "You don't need a big reason to celebrate.", prefillZh: "好消息刚发到群里，得趁热喝一口。", prefillEn: "Just dropped the news in the group chat. Drinking on the momentum." },
  "借酒消愁（真的假的）": { color: "#7E8CA8", responseZh: "真的假的不重要，先把心事稀释一点。", responseEn: "Real or not — let's dilute it a little.", prefillZh: "说是消愁，其实就是想给自己一个不讲话的借口。", prefillEn: "Say it's sorrow. Really just wanted an excuse not to talk." },
  "今天必须喝一杯": { color: "#D66A5F", responseZh: "收到，今天这杯不是可选项，是精神刚需。", responseEn: "Copy — tonight this drink is a necessity.", prefillZh: "不喝一杯，今天这日子对不起我自己。", prefillEn: "If I don't drink tonight, today would owe me an apology." },
  "周末启动中": { color: "#62BFA3", responseZh: "周末模式已启动，请降低理智浓度。", responseEn: "Weekend mode engaged. Lowering the sensible.", prefillZh: "周五晚上八点，理智已经打卡下班。", prefillEn: "8pm Friday. My good judgment already clocked out." },
  "逃离现实": { color: "#7A9ED9", responseZh: "现实先静音一下，今晚交给想象力。", responseEn: "Muting reality. Handing the mic to imagination.", prefillZh: "手机静音，门反锁，只想消失两小时。", prefillEn: "Phone silenced, door locked. Want to vanish for two hours." },
  "放空充电": { color: "#9BCBB8", responseZh: "正在充电中，请勿打扰这颗电量不足的心。", responseEn: "Charging — do not disturb this low-battery heart.", prefillZh: "脑子里一整天全是杂音，需要一杯把它调静音。", prefillEn: "My head's been static all day. Need something to hit mute." },
  "人在酒吧，魂在床上": { color: "#B08AD8", responseZh: "身体很社交，灵魂已经盖好被子了。", responseEn: "Body's out. Soul's already tucked in.", prefillZh: "眼睛在笑，心里在想被子今天有没有晒。", prefillEn: "Smiling politely. Wondering if I aired out the duvet." },
  "团建营业": { color: "#C0A36E", responseZh: "营业中，但请给灵魂保留一点下班权。", responseEn: "On the clock — soul deserves overtime rights.", prefillZh: "已经笑了三小时，脸有点抽筋。", prefillEn: "Three hours of company smile. Face is starting to cramp." },
  "今天不想做人": { color: "#6F7788", responseZh: "可以，今晚先做一杯会呼吸的酒。", responseEn: "Fine — tonight, be a drink that breathes.", prefillZh: "谁再让我处理消息我当场辞职。", prefillEn: "One more Slack ping and I'm quitting on the spot." },
  "出来透透气": { color: "#8EC8C2", responseZh: "透气成功，心里的窗户开了一条缝。", responseEn: "A little air — window in your chest just cracked open.", prefillZh: "在家关了三天，出来吹口风都觉得奢侈。", prefillEn: "Three days indoors. Even the breeze feels expensive." },
  "约会中": { color: "#DAA0B4", responseZh: "气氛刚好，这杯别端得太用力。", responseEn: "Vibe's just right — hold the glass loosely.", prefillZh: "对面在讲他的旅行，我在想我这个动作显不显自然。", prefillEn: "They're mid-story. I'm checking if I look natural holding this glass." },
  "第一次见面": { color: "#E7B389", responseZh: "第一杯尽量不出错，接下来才有故事。", responseEn: "Play the first drink safe. Story starts at the second.", prefillZh: "手心是湿的，酒单挑了半天还不敢开口。", prefillEn: "Palms are damp. Stared at the menu for five minutes and still can't order." },
  "看球！": { color: "#7BB58A", responseZh: "开赛前一杯，别喝到中场就沉了。", responseEn: "Pregame pour — don't sink by halftime.", prefillZh: "主队上场了，这杯得撑到终场哨。", prefillEn: "My team just took the pitch. This glass has to survive full time." },
  "追剧配酒": { color: "#B39AC7", responseZh: "剧情起伏靠它，情绪也靠它。", responseEn: "Plot twists pair better with this in hand.", prefillZh: "新一季刚开播，我已经准备好边哭边看。", prefillEn: "New season just dropped. Prepared to cry through the finale." },
  "打游戏中": { color: "#6BB2D0", responseZh: "手要稳，酒可以不稳。", responseEn: "Hands steady — the drink doesn't have to be.", prefillZh: "又双叒被队友坑了，得来点液体镇静。", prefillEn: "Teammates threw again. Need a liquid sedative." },
  "聊人生": { color: "#8FA99B", responseZh: "话题很重，杯子请别端太满。", responseEn: "Heavy topic — don't fill the glass too full.", prefillZh: "聊到\"你后悔过吗\"这一段了，杯子先满上。", prefillEn: "We just hit the \"any regrets?\" part of the night. Top me up." },
  "等奇迹发生": { color: "#C7B26E", responseZh: "奇迹迟到没关系，酒不会迟到。", responseEn: "Miracles run late. Drinks don't.", prefillZh: "简历海投第三十封，心里还留着一点点侥幸。", prefillEn: "Thirty applications in. Still holding onto a tiny maybe." },
  "纯粹嘴馋": { color: "#E8A574", responseZh: "不需要理由，馋就是理由。", responseEn: "No excuse needed. Craving is the reason.", prefillZh: "不为什么，刚才刷到一张酒的照片就馋住了。", prefillEn: "No reason. Saw a photo of a drink and now I can't unsee it." },

  // ── 今天是什么局？ ────────────────────────────────────────────────
  "摸鱼局": { color: "#8FB6C8", responseZh: "低调开局，别被老板抓到。", responseEn: "Low-key start. Don't get caught.", prefillZh: "谎报了个牙医预约，其实在这儿点酒。", prefillEn: "Told them I had a dentist appointment. I'm at the bar." },
  "发疯局": { color: "#D66A5F", responseZh: "OK，安全带请系好。", responseEn: "OK — buckle up.", prefillZh: "今晚不发疯，明天没法上班。", prefillEn: "If I don't lose it tonight, I can't function tomorrow." },
  "微醺局": { color: "#F0A36F", responseZh: "刚刚好，不多不少那种。", responseEn: "Just enough — that sweet spot.", prefillZh: "只想飘到二楼，别把我送上天台。", prefillEn: "Take me up one floor. Not to the roof." },
  "治愈局": { color: "#9BCBB8", responseZh: "轻一点，慢一点，够了。", responseEn: "Lighter. Slower. Enough.", prefillZh: "一周被开了三次会，就想被一杯酒温柔对待。", prefillEn: "Three back-to-back weeks. Want a drink that treats me gently." },
  "失恋局": { color: "#7E8CA8", responseZh: "这杯不解决问题，但陪你坐着。", responseEn: "Won't fix it — will sit with you.", prefillZh: "分手第三天，还是会点开ta的头像看一眼。", prefillEn: "Day three of the breakup. Still tapping their profile like it changes anything." },
  "桃花局": { color: "#DAA0B4", responseZh: "颜值上桌，酒也得跟上。", responseEn: "You look good — drink better keep up.", prefillZh: "今天穿了新衣服，得让这杯配得上。", prefillEn: "New outfit tonight. The drink needs to match." },
  "暧昧局": { color: "#E19DB0", responseZh: "别说破，喝就完了。", responseEn: "Don't name it. Just sip.", prefillZh: "ta刚在我腿边坐下，我得装作没在意。", prefillEn: "They just sat down close. Pretending my heart rate is normal." },
  "社牛局": { color: "#F5A35C", responseZh: "话匣子开好了，酒来加油。", responseEn: "Mouth's already running — this fuels it.", prefillZh: "已经加了三个陌生人微信，还想再聊。", prefillEn: "Already added three strangers on IG. Still not done meeting people." },
  "社恐局": { color: "#8A9EB3", responseZh: "手里得有点东西，才不慌。", responseEn: "Something in the hand keeps the panic down.", prefillZh: "全场就我不认识人，得靠这杯撑住我。", prefillEn: "I know nobody here. This drink is my hostage insurance." },
  "老友局": { color: "#C0A36E", responseZh: "熟人杯，不用装。", responseEn: "Old-friend pour. No pretending.", prefillZh: "十年没见，第一句还是那句\"你还是那个死样子\"。", prefillEn: "Haven't seen them in ten years. First line was still \"you look exactly the same, jerk.\"" },
  "拼酒局": { color: "#C86B5A", responseZh: "别硬撑，撑不住就换这杯。", responseEn: "Don't hero it. Switch to this.", prefillZh: "桌上那位酒量深不见底，我先给自己留条命。", prefillEn: "Someone at this table drinks like a truck. Preserving myself." },
  "续摊局": { color: "#B08AD8", responseZh: "第二场了，这杯要顺口。", responseEn: "Round two — keep it smooth.", prefillZh: "第一家已经断片一半，这家得挑清醒点的。", prefillEn: "Half of round one is a blur. Round two needs to be smoother." },
  "世界杯决赛局": { color: "#7BB58A", responseZh: "上半场先克制，下半场再放开。", responseEn: "Restraint in the first half. Loosen up in the second.", prefillZh: "支持的队进决赛了，喝到手抖也值。", prefillEn: "My team made the final. Worth every shaky sip." },
  "今天全靠氛围感": { color: "#B7A9B3", responseZh: "内容不重要，感觉到位就行。", responseEn: "Substance optional. Vibe mandatory.", prefillZh: "内容不重要，滤镜和灯光到位就行。", prefillEn: "Content doesn't matter. Lighting does." },

  // ── 今日状态 ─────────────────────────────────────────────────────
  "摆烂中": { color: "#7E8CA8", responseZh: "躺平也是一种功夫。", responseEn: "Lying flat is a discipline too.", prefillZh: "家务堆成小山了，看见就当没看见。", prefillEn: "Dishes are stacked. Chose to walk past them." },
  "发疯中": { color: "#D66A5F", responseZh: "这杯正好配你的能量。", responseEn: "This one matches your energy exactly.", prefillZh: "想砸键盘，想删同事，想把明天从日历里抠掉。", prefillEn: "Want to smash the keyboard, delete my coworker, and yeet tomorrow off the calendar." },
  "已读不回": { color: "#8A9EB3", responseZh: "不回消息，这杯回你。", responseEn: "You ignore them — this drink answers back.", prefillZh: "消息看了三小时，就是不想动手打字。", prefillEn: "Read three hours ago. Zero desire to type back." },
  "CPU烧了": { color: "#C86B5A", responseZh: "关机重启前，先喝一口。", responseEn: "Reboot after one sip.", prefillZh: "脑子已经罢工，微信提示音都懒得听了。", prefillEn: "Brain has filed a complaint. I can't even bring myself to check notifications." },
  "电量1%": { color: "#596C91", responseZh: "一口回血，理论上。", responseEn: "One sip = full charge. Theoretically.", prefillZh: "走到便利店都得歇一下，需要立刻回血。", prefillEn: "Had to sit down halfway to the corner store. Need a top-up now." },
  "满血复活": { color: "#62BFA3", responseZh: "状态在线，杯子要跟上。", responseEn: "Fully online — the glass better keep up.", prefillZh: "扶我起来我还能再战三百回合。", prefillEn: "Prop me up — I can go three hundred more rounds." },
  "嘴硬心软": { color: "#DAA0B4", responseZh: "外硬内柔，这杯懂你。", responseEn: "Tough outside, soft inside — this one gets it.", prefillZh: "说了不在乎，结果晚饭都咽不下去。", prefillEn: "Said I didn't care. Then couldn't finish dinner." },
  "情绪稳定（伪）": { color: "#8FA99B", responseZh: "演得挺像的，不拆穿。", responseEn: "Convincing act. Not calling it out.", prefillZh: "表面笑得很得体，心里已经掀桌八次了。", prefillEn: "Smiling on the outside. Flipped the table in my head at least eight times." },
  "灵魂出走": { color: "#B08AD8", responseZh: "身体在这，酒代你陪着。", responseEn: "Body's here — this drink stands in for the rest.", prefillZh: "坐这半小时了，别人说什么我一个字没听进去。", prefillEn: "Been at this table thirty minutes. Haven't retained a single sentence." },
  "好运加载中": { color: "#F0C76E", responseZh: "加载条差一杯的距离。", responseEn: "Loading bar is one drink away.", prefillZh: "今天一路绿灯，感觉要有好事发生。", prefillEn: "Every light was green on the way here. Something's about to happen." },
  "今天有点上头": { color: "#E39C6A", responseZh: "已经上头，再来点也不亏。", responseEn: "Already buzzed — one more won't hurt.", prefillZh: "才第二杯脸已经烧起来了，但停不下来。", prefillEn: "Only on drink two and my face is already lit. Not stopping." },
  "已进入周末模式": { color: "#62BFA3", responseZh: "OOO 已开启，别打扰。", responseEn: "OOO is on. Do not disturb.", prefillZh: "周六十一点才睁眼，一整天不想穿鞋。", prefillEn: "Woke up at 11 on Saturday. Not putting shoes on today." },
  "选择性营业": { color: "#C0A36E", responseZh: "只对喜欢的人营业，包括这杯。", responseEn: "Only open to people I like. This drink included.", prefillZh: "群消息选择性已读，只回三个人。", prefillEn: "Read all the group chats. Replying to exactly three humans." },
  "人间清醒（偶尔）": { color: "#BFBEBD", responseZh: "清醒到不了半夜，先喝为敬。", responseEn: "Clarity won't survive midnight. Drink up first.", prefillZh: "现在还理智，估计撑不过午夜。", prefillEn: "Clear-headed right now. Won't survive midnight." },
  "今日宜微醺": { color: "#F0A36F", responseZh: "黄历这么说的，那就听。", responseEn: "The stars said so. Let's listen.", prefillZh: "天气好、人闲、心情松，正适合上头一点。", prefillEn: "Nice weather, empty schedule, loose mood. Perfect to get gently lit." },
  "靠意志力活着": { color: "#7E8CA8", responseZh: "意志力见底，这杯顶上。", responseEn: "Willpower's out. This drink takes over.", prefillZh: "五个闹钟按下去，全靠一口气吊着。", prefillEn: "Snoozed five alarms this morning. Running on spite." },
  "一切都会好的吧": { color: "#9BCBB8", responseZh: "会的吧，先喝一口再说。", responseEn: "Probably. Sip first, worry later.", prefillZh: "事情还没解决，但先允许自己开心一会儿。", prefillEn: "Nothing's resolved yet. Giving myself an hour off from worrying." },
  "今天主打一个开心": { color: "#F5A35C", responseZh: "主打开心，别的先靠边。", responseEn: "Happiness first. Everything else, later.", prefillZh: "决定了，今天不接负能量。", prefillEn: "Executive decision: not accepting bad vibes today." },
  "随机播放人生": { color: "#B39AC7", responseZh: "下一首交给运气。", responseEn: "Next track — luck picks.", prefillZh: "上个月还在辞职，这周又开始面试了。", prefillEn: "Quit last month. Back in interviews this week. Life on shuffle." },
  "管它呢": { color: "#B7A9B3", responseZh: "对，就是这个态度。", responseEn: "Yeah. That's the attitude.", prefillZh: "明天再想吧，今晚只想瘫着。", prefillEn: "Tomorrow's problem. Tonight I'm just a puddle." },

  // ── English extras (a handful of the common ones) ────────────────
  "Happy": { color: "#F0C76E", responseZh: "开心的时候更好喝。", responseEn: "Tastes better when you're happy.", prefillZh: "今天一路顺，破例奖自己一杯好的。", prefillEn: "Day actually went right for once. Cashing that in." },
  "Chill": { color: "#9BCBB8", responseZh: "放松点，这杯很缓。", responseEn: "Easy. This one takes its time.", prefillZh: "没什么事，就想慢慢磨掉一个晚上。", prefillEn: "Nowhere to be, no one waiting. Want to slow-burn the evening." },
  "Cozy": { color: "#E39C6A", responseZh: "把自己裹起来喝。", responseEn: "Wrap up, then sip.", prefillZh: "裹着毯子，灯关到最暗，手机翻过来放。", prefillEn: "Under a blanket, lights dimmed, phone face-down." },
  "Romantic": { color: "#DAA0B4", responseZh: "灯光调暗，酒调好。", responseEn: "Lights low, drink dialed in.", prefillZh: "对面那位又在用那种眼神看我了。", prefillEn: "They're across the table doing that eye thing again." },
  "Flirty": { color: "#E19DB0", responseZh: "眼神先递过去。", responseEn: "Send the look first.", prefillZh: "对上两次眼了，我这次不打算移开。", prefillEn: "Made eye contact twice. Not looking away this time." },
  "Stressed": { color: "#7E8CA8", responseZh: "先放下手机，再拿起杯子。", responseEn: "Phone down, glass up.", prefillZh: "肩膀紧到能敲鼓，需要一杯松一下。", prefillEn: "Inbox has three flagged threads. Not opening any of them." },
  "Heartbroken": { color: "#596C91", responseZh: "这杯不修复什么，只陪你。", responseEn: "This one doesn't fix. Just stays.", prefillZh: "还是会不自觉在搜索框打ta的名字。", prefillEn: "Still catching myself typing their name into search." },
  "Chaotic": { color: "#D66A5F", responseZh: "混乱是一种风格。", responseEn: "Chaos is a style.", prefillZh: "一天丢了钥匙、错过地铁、和陌生人吵了一架。", prefillEn: "Lost my keys, missed the train, argued with a stranger. Still smiling." },
  "Just Vibing": { color: "#B7A9B3", responseZh: "什么都不想，喝就完了。", responseEn: "No thoughts. Just sip.", prefillZh: "没计划、没想法、只想有音乐和一杯酒。", prefillEn: "No agenda. No thoughts. Just music and a glass." },
  "Celebrating": { color: "#F5A35C", responseZh: "杯子举高一点。", responseEn: "Raise the glass higher.", prefillZh: "今天签下来了，还没告诉任何人。", prefillEn: "Signed the thing today. Nobody else knows yet." },
  "Tired": { color: "#7E8CA8", responseZh: "累了就慢慢来。", responseEn: "Tired — take it slow.", prefillZh: "下午四点身体就下班了，我现在在自动驾驶。", prefillEn: "Body clocked out at 4pm. I'm running on autopilot." },
  "Surprise Me": { color: "#B08AD8", responseZh: "行，交给我。", responseEn: "Fine. I've got it.", prefillZh: "懒得选了，你倒什么我喝什么。", prefillEn: "Too tired to decide. Whatever you pour, I'll drink." },
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
