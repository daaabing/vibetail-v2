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
  "出来见世面": { color: "#8EC8C2", responseZh: "很好，胃口打开了。", responseEn: "Nice. Palate's open tonight.", prefillZh: "出来见见世面，想试点没喝过的路子。", prefillEn: "Out to see the world tonight. Want to try something I've never had." },
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
  "吃瓜局": { color: "#A9B4A1", responseZh: "瓜要新鲜，酒要顺口。", responseEn: "Fresh gossip pairs with smooth pours.", prefillZh: "群里刚爆了个大瓜，得端一杯边喝边看。", prefillEn: "Group chat just dropped tea. Pouring one to read through it properly." },
  "吹牛局": { color: "#D5B26E", responseZh: "牛皮吹起来，酒也得压得住。", responseEn: "Big talk needs a proper glass to hold it down.", prefillZh: "今晚讲话全部四舍五入，欢迎质疑我不承认。", prefillEn: "Every story tonight is rounded up. Feel free to doubt me — I'll deny." },
  "摆烂局": { color: "#7E8CA8", responseZh: "摆烂也要摆得像样。", responseEn: "If we're lying flat, let's do it in style.", prefillZh: "什么都不想安排，谁来我就跟谁喝一口。", prefillEn: "Zero plans tonight. Whoever shows up, I clink with." },
  "KPI清零局": { color: "#62BFA3", responseZh: "季度归零，庆祝合法。", responseEn: "Quarter reset. Celebration authorized.", prefillZh: "季度结了，KPI归零，庆祝一下我还活着。", prefillEn: "Quarter closed, KPIs zeroed. Celebrating still being alive." },
  "工资到账局": { color: "#F0C76E", responseZh: "余额到账，杯子请自便。", responseEn: "Balance dropped. Order freely.", prefillZh: "工资今早到了，今晚不看酒单价格。", prefillEn: "Payday hit this morning. Not checking prices tonight." },
  "发工资前局": { color: "#8FA99B", responseZh: "预算有限，气氛不能省。", responseEn: "Tight budget, undiminished vibes.", prefillZh: "离发工资还有五天，只能点便宜又体面的。", prefillEn: "Five days from payday. Need something cheap that still looks classy." },
  "周五快乐局": { color: "#F5A35C", responseZh: "周五快乐从这一杯开始。", responseEn: "Friday joy starts at this glass.", prefillZh: "周五晚上九点，我下周不想想。", prefillEn: "9pm Friday. Not thinking about Monday for at least twelve hours." },
  "明天不上班局": { color: "#62BFA3", responseZh: "没有明早会议，请放心倒。", responseEn: "No morning meetings — pour freely.", prefillZh: "明天不上班，今晚可以放开喝一点。", prefillEn: "No work tomorrow. Tonight I can actually let go." },
  "赛前热身局": { color: "#7BB58A", responseZh: "开赛前一杯，稳一下心跳。", responseEn: "Pregame sip to steady the pulse.", prefillZh: "开场还有一小时，先来一杯热身。", prefillEn: "Kickoff in an hour. Warming up the voice." },
  "世界杯决赛局": { color: "#7BB58A", responseZh: "上半场先克制，下半场再放开。", responseEn: "Restraint in the first half. Loosen up in the second.", prefillZh: "支持的队进决赛了，喝到手抖也值。", prefillEn: "My team made the final. Worth every shaky sip." },
  "人生重启局": { color: "#B08AD8", responseZh: "重启前，先喝一口。", responseEn: "One sip before the reboot.", prefillZh: "刚辞职，今晚给自己按个重启键。", prefillEn: "Just quit. Hitting the reset button tonight." },
  "情绪稳定局（装的）": { color: "#8FA99B", responseZh: "演技很好，我不拆穿。", responseEn: "Solid acting. Not blowing your cover.", prefillZh: "朋友圈发得很稳，眼下的黑眼圈骗不了人。", prefillEn: "Posted something calm. Eye bags say otherwise." },
  "今天必须开心局": { color: "#F0C76E", responseZh: "开心是任务，配合完成。", responseEn: "Happiness is the assignment. Cooperating.", prefillZh: "今天一定要开心，不开心的事明天再想。", prefillEn: "Tonight I have to be happy. Everything else is a Monday problem." },
  "管他呢先喝局": { color: "#B7A9B3", responseZh: "先喝再想，顺序别搞反。", responseEn: "Sip first, think later. Don't reverse it.", prefillZh: "问题一堆没解决，管他呢先喝一杯。", prefillEn: "Pile of unresolved stuff. Whatever — drinking first." },
  "成年人的崩溃局": { color: "#596C91", responseZh: "崩溃可以小声，酒可以大声。", responseEn: "Meltdown quiet. Drink loud.", prefillZh: "地铁上就想哭，硬忍到坐下这杯。", prefillEn: "Nearly cried on the subway. Held it in until this glass." },
  "有故事局": { color: "#C0A36E", responseZh: "慢慢讲，酒陪你。", responseEn: "Take your time. The drink's listening.", prefillZh: "今天真的发生了太多事，得慢慢讲。", prefillEn: "So much happened today. Going to need slow sips to tell it." },
  "随便喝喝局": { color: "#B7A9B3", responseZh: "随便就好，不用做题。", responseEn: "Easy pick — no essay required.", prefillZh: "没什么目的，就是路过想坐下喝一杯。", prefillEn: "No agenda. Walked past, decided to sit down." },
  "今天全靠氛围感": { color: "#B7A9B3", responseZh: "内容不重要，感觉到位就行。", responseEn: "Substance optional. Vibe mandatory.", prefillZh: "内容不重要，滤镜和灯光到位就行。", prefillEn: "Content doesn't matter. Lighting does." },

  // ── 今日状态 ─────────────────────────────────────────────────────
  "摆烂中": { color: "#7E8CA8", responseZh: "躺平也是一种功夫。", responseEn: "Lying flat is a discipline too.", prefillZh: "家务堆成小山了，看见就当没看见。", prefillEn: "Dishes are stacked. Chose to walk past them." },
  "发疯中": { color: "#D66A5F", responseZh: "这杯正好配你的能量。", responseEn: "This one matches your energy exactly.", prefillZh: "想砸键盘，想删同事，想把明天从日历里抠掉。", prefillEn: "Want to smash the keyboard, delete my coworker, and yeet tomorrow off the calendar." },
  "已读不回": { color: "#8A9EB3", responseZh: "不回消息，这杯回你。", responseEn: "You ignore them — this drink answers back.", prefillZh: "消息看了三小时，就是不想动手打字。", prefillEn: "Read three hours ago. Zero desire to type back." },
  "CPU烧了": { color: "#C86B5A", responseZh: "关机重启前，先喝一口。", responseEn: "Reboot after one sip.", prefillZh: "脑子已经罢工，微信提示音都懒得听了。", prefillEn: "Brain has filed a complaint. Can't even bring myself to check notifications." },
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

  // ── English — Mood row ───────────────────────────────────────────
  "Happy": { color: "#F0C76E", responseZh: "开心的时候更好喝。", responseEn: "Tastes better when you're happy.", prefillEn: "Day actually went right for once. Cashing that in." },
  "Excited": { color: "#F5A35C", responseZh: "别急，杯子先端稳。", responseEn: "Slow down. Steady the glass first.", prefillEn: "Something good is about to start and I can't sit still." },
  "Relaxed": { color: "#9BCBB8", responseZh: "松弛感在线。", responseEn: "Loose. In a good way.", prefillEn: "Shoulders finally dropped. Not moving them again for hours." },
  "Cozy": { color: "#E39C6A", responseZh: "把自己裹起来喝。", responseEn: "Wrap up, then sip.", prefillEn: "Under a blanket, lights dimmed, phone face-down." },
  "Chill": { color: "#9BCBB8", responseZh: "放松点，这杯很缓。", responseEn: "Easy. This one takes its time.", prefillEn: "Nowhere to be, no one waiting. Want to slow-burn the evening." },
  "Adventurous": { color: "#7A9ED9", responseZh: "今晚敢喝一点没喝过的。", responseEn: "Dare something you haven't tried.", prefillEn: "Give me something I've never ordered before." },
  "Romantic": { color: "#DAA0B4", responseZh: "灯光调暗，酒调好。", responseEn: "Lights low, drink dialed in.", prefillEn: "They're across the table doing that eye thing again." },
  "Flirty": { color: "#E19DB0", responseZh: "眼神先递过去。", responseEn: "Send the look first.", prefillEn: "Made eye contact twice. Not looking away this time." },
  "Confident": { color: "#C86B5A", responseZh: "今晚气场自带滤镜。", responseEn: "You brought your own lighting tonight.", prefillEn: "Wearing the outfit that always works. Feeling untouchable." },
  "Playful": { color: "#F5A35C", responseZh: "别太正经，别太散。", responseEn: "Not too serious, not too loose.", prefillEn: "In a mood to cause a small, harmless amount of trouble." },
  "Nostalgic": { color: "#B39AC7", responseZh: "旧歌配旧感觉。", responseEn: "Old song. Old feeling.", prefillEn: "An old song came on and now I'm back in 2016." },
  "Dreamy": { color: "#B08AD8", responseZh: "半梦半醒最好喝。", responseEn: "Half-awake tastes best.", prefillEn: "Head in the clouds. Feet barely on the floor." },
  "Curious": { color: "#8FA99B", responseZh: "第一次试的酒最有故事。", responseEn: "First-time pours have the best stories.", prefillEn: "Want to try something I can't pronounce." },
  "Grateful": { color: "#F0C76E", responseZh: "小小庆祝一下今天。", responseEn: "A small salute to today.", prefillEn: "Small good thing happened today. Marking it." },
  "Celebrating": { color: "#F5A35C", responseZh: "杯子举高一点。", responseEn: "Raise the glass higher.", prefillEn: "Signed the thing today. Nobody else knows yet." },
  "Hopeful": { color: "#9BCBB8", responseZh: "留一口给可能。", responseEn: "Save a sip for maybe.", prefillEn: "Waiting on news. Toasting the good version early." },
  "Tired": { color: "#7E8CA8", responseZh: "累了就慢慢来。", responseEn: "Tired — take it slow.", prefillEn: "Body clocked out at 4pm. I'm running on autopilot." },
  "Burned Out": { color: "#7E8CA8", responseZh: "先关一下机，再倒酒。", responseEn: "Shut down first. Pour second.", prefillEn: "Haven't had a real weekend in a month. Something needs to give." },
  "Stressed": { color: "#7E8CA8", responseZh: "先放下手机，再拿起杯子。", responseEn: "Phone down, glass up.", prefillEn: "Inbox has three flagged threads. Not opening any of them." },
  "Overthinking": { color: "#596C91", responseZh: "把想法先放杯子边上。", responseEn: "Park the thoughts by the glass.", prefillEn: "Been replaying the same text conversation for an hour." },
  "Heartbroken": { color: "#596C91", responseZh: "这杯不修复什么，只陪你。", responseEn: "This one doesn't fix. Just stays.", prefillEn: "Still catching myself typing their name into search." },
  "Delulu": { color: "#DAA0B4", responseZh: "妄想也是养分。", responseEn: "Delusion counts as nutrition.", prefillEn: "Convinced they're going to text me tonight. They are not." },
  "Chaotic": { color: "#D66A5F", responseZh: "混乱是一种风格。", responseEn: "Chaos is a style.", prefillEn: "Lost my keys, missed the train, argued with a stranger. Still smiling." },
  "Unhinged": { color: "#D66A5F", responseZh: "别拦我，我今晚不管了。", responseEn: "Don't stop me tonight.", prefillEn: "Feeling like doing something my future self will not endorse." },
  "Main Character": { color: "#F5A35C", responseZh: "这场戏是你的。", responseEn: "This scene is yours.", prefillEn: "Walking into this bar like the camera is following me." },
  "Feeling Lucky": { color: "#F0C76E", responseZh: "运气来了，别关门。", responseEn: "Luck's here — keep the door open.", prefillEn: "Won a coin flip earlier. Riding the wave." },
  "Treating Myself": { color: "#F2B66D", responseZh: "今天你说了算。", responseEn: "Tonight you call it.", prefillEn: "Skipped lunch to justify ordering the top-shelf one." },
  "YOLO": { color: "#D66A5F", responseZh: "上限先别设。", responseEn: "No ceiling tonight.", prefillEn: "Only live once. Ordering the weird one on the menu." },
  "In My Healing Era": { color: "#9BCBB8", responseZh: "轻轻喝，慢慢好。", responseEn: "Sip gently. Heal slowly.", prefillEn: "Journaling, walking, drinking one nice thing tonight." },
  "Just Vibing": { color: "#B7A9B3", responseZh: "什么都不想，喝就完了。", responseEn: "No thoughts. Just sip.", prefillEn: "No agenda. No thoughts. Just music and a glass." },

  // ── English — What are you doing? ─────────────────────────────────
  "Doomscrolling": { color: "#7E8CA8", responseZh: "先合上手机再喝。", responseEn: "Close the phone. Then sip.", prefillEn: "Been on the same app for two hours and feel worse." },
  "Romanticizing My Life": { color: "#DAA0B4", responseZh: "把这一杯也拍进去。", responseEn: "Get the glass in the shot too.", prefillEn: "Playing my life like it has a soundtrack tonight." },
  "Touching Grass": { color: "#A9B4A1", responseZh: "外面空气比手机好闻。", responseEn: "Outside beats the timeline.", prefillEn: "Actually went outside today. Rewarding myself for it." },
  "Avoiding Responsibilities": { color: "#8A9EB3", responseZh: "责任先放门口。", responseEn: "Leave the to-do list at the door.", prefillEn: "There's a whole list waiting for me. Not opening it tonight." },
  "Procrastinating": { color: "#A8A6D9", responseZh: "拖延也要拖得优雅。", responseEn: "Even procrastination can be graceful.", prefillEn: "Deadline is tomorrow morning. This drink is more urgent." },
  "Pretending to Be Productive": { color: "#D5B26E", responseZh: "浏览器开着，酒杯也开着。", responseEn: "Tabs open. Glass open.", prefillEn: "Docs open. Nothing typed. Vibes very produced." },
  "Healing (Allegedly)": { color: "#9BCBB8", responseZh: "疗愈也是可以喝的。", responseEn: "Healing pours count.", prefillEn: "Told everyone I'm resting. Actually just drinking slowly." },
  "Main Character Moment": { color: "#F5A35C", responseZh: "灯光正好，镜头也在。", responseEn: "Lights are set. Camera's rolling.", prefillEn: "Walked in with the coat, the song, the whole thing." },
  "Delulu Era": { color: "#DAA0B4", responseZh: "妄想在营业。", responseEn: "Delusion is open for business.", prefillEn: "Convinced tonight is when everything changes. It is not." },
  "Locked In": { color: "#8FA99B", responseZh: "专注中，续一杯就行。", responseEn: "In the zone. Just top me up.", prefillEn: "Deep work mode. One drink is my whole social plan." },
  "Unwinding": { color: "#9BCBB8", responseZh: "解开一天的每根线。", responseEn: "Untangling the day, thread by thread.", prefillEn: "Kicked shoes off, put on the slow playlist." },
  "Rotting on the Couch": { color: "#7E8CA8", responseZh: "沙发也是杯垫。", responseEn: "Couch counts as a coaster.", prefillEn: "Been in this exact couch dent for six hours." },
  "Watching the World Burn": { color: "#C86B5A", responseZh: "别灭，先看着。", responseEn: "Don't put it out yet.", prefillEn: "Everything's on fire. I'm just watching with a drink." },
  "Making Questionable Decisions": { color: "#D66A5F", responseZh: "决策已上头。", responseEn: "Judgment: pending review.", prefillEn: "About to text someone I really should not text." },
  "Celebrating Something": { color: "#F5A35C", responseZh: "先喝再解释。", responseEn: "Drink first, explain later.", prefillEn: "Something good happened. Details to follow." },
  "Recovering from Yesterday": { color: "#8A9EB3", responseZh: "小口，慢慢来。", responseEn: "Small sips. Take it easy.", prefillEn: "Yesterday was a lot. Today is a slow rebuild." },
  "Crying in Style": { color: "#596C91", responseZh: "眼泪配这杯正好。", responseEn: "The tears go with this one.", prefillEn: "Fully crying but the outfit and lighting are immaculate." },
  "Flirting with Bad Ideas": { color: "#E19DB0", responseZh: "别真上手就行。", responseEn: "Look — don't touch.", prefillEn: "Thinking about a bad idea. Not doing it. Yet." },
  "Chasing Dopamine": { color: "#F5A35C", responseZh: "开心不嫌多。", responseEn: "No such thing as too much joy.", prefillEn: "Bought a small treat, played a good song, ordered this." },
  "Soft Launching My Personality": { color: "#DAC5C3", responseZh: "先露一角就好。", responseEn: "Just a corner tonight.", prefillEn: "Testing a slightly different version of me tonight." },
  "Ghosting My Problems": { color: "#8A9EB3", responseZh: "已读不回，包括生活。", responseEn: "Left life on read.", prefillEn: "My problems have been calling. Not picking up." },
  "Escaping Reality": { color: "#7A9ED9", responseZh: "现实先静音。", responseEn: "Mute reality. Please.", prefillEn: "Phone silenced, door locked. Want to vanish for two hours." },
  "Running on Caffeine": { color: "#C86B5A", responseZh: "咖啡因加酒精，请系好安全带。", responseEn: "Caffeine plus alcohol — buckle up.", prefillEn: "Fourth espresso today and still tired. Switching fuels." },
  "Surviving Monday": { color: "#7E8CA8", responseZh: "撑住了，一杯奖励。", responseEn: "You survived. One reward pour.", prefillEn: "Monday tried its best. I'm still standing." },
  "Clocking Out Mentally": { color: "#A8A6D9", responseZh: "脑子已经下班。", responseEn: "Brain has left the building.", prefillEn: "Body at desk. Mind clocked out at noon." },
  "Living My Best Life": { color: "#F0C76E", responseZh: "顶配版你，请入座。", responseEn: "Best version of you — take a seat.", prefillEn: "Good week, good outfit, good bar. Not questioning it." },
  "Rewatching Comfort Shows": { color: "#E39C6A", responseZh: "老剧配新杯。", responseEn: "Old show. New glass.", prefillEn: "Sixth time through this show. Pretend it's my first." },
  "Plotting My Next Vacation": { color: "#7A9ED9", responseZh: "计划得配点浪漫。", responseEn: "Plans deserve a splash of romance.", prefillEn: "Ten tabs open, none of them work. All of them beaches." },
  "Manifesting": { color: "#F0C76E", responseZh: "念力配这杯正好。", responseEn: "Intention pairs with this pour.", prefillEn: "Written it down three times. Now toasting it into being." },
  "Touching Nothing but My Phone": { color: "#7E8CA8", responseZh: "手指忙，人在放空。", responseEn: "Thumbs busy. Brain off.", prefillEn: "Haven't moved in an hour. Just my thumb has cardio." },
  "Watching the Sunset": { color: "#F5A35C", responseZh: "颜色刚好配这一杯。", responseEn: "The sky picked your drink.", prefillEn: "Sky's doing the pink thing again. Pouring one to match." },
  "Watching the Stars": { color: "#596C91", responseZh: "夜空作陪，杯子作伴。", responseEn: "Sky above. Glass in hand.", prefillEn: "Lying on the ground looking up. Bringing the glass along." },
  "Beach Day": { color: "#7BB58A", responseZh: "咸风配一杯冰的。", responseEn: "Salt air needs something cold.", prefillEn: "Sand in my shoes. Sun on my face. Need something cold." },
  "Pool Party": { color: "#6BB2D0", responseZh: "湿脚也要仪式感。", responseEn: "Wet feet still deserve ceremony.", prefillEn: "Chlorine in my hair. Music too loud. Perfect." },
  "BBQ": { color: "#C86B5A", responseZh: "烟火气配酒最对。", responseEn: "Smoke and glass belong together.", prefillEn: "Smells like charcoal out here. Drink better keep up." },
  "Brunch": { color: "#F2B66D", responseZh: "早午一杯，天理难违。", responseEn: "Brunch pour — a natural law.", prefillEn: "Slept until 11 and I'm already ordering. No regrets." },
  "Wedding": { color: "#DAA0B4", responseZh: "祝福敬上一杯。", responseEn: "Toast this one to them.", prefillEn: "Cried during vows. Toasting now like nothing happened." },
  "Birthday": { color: "#F5A35C", responseZh: "生日快乐，请入座。", responseEn: "Happy birthday — take a seat.", prefillEn: "It's my birthday and I'm quietly ordering the fancy one." },
  "Celebration": { color: "#F0C76E", responseZh: "值得的，都要过一下。", responseEn: "If it's worth it, mark it.", prefillEn: "Small win today — but I want to feel it properly." },
  "Watching Sports": { color: "#7BB58A", responseZh: "开场前先来一杯。", responseEn: "One before kickoff.", prefillEn: "Game's on the big screen. Glass in my other hand." },
  "World Cup Final": { color: "#7BB58A", responseZh: "决赛之夜，这杯要顶得住。", responseEn: "Final night — the glass has to survive.", prefillEn: "My team is in the final. My heart rate is not okay." },
  "Movie Night": { color: "#B39AC7", responseZh: "灯关上，杯端好。", responseEn: "Lights out. Glass up.", prefillEn: "Popcorn made, phone off, the movie has started." },
  "Game Night": { color: "#6BB2D0", responseZh: "输赢别当真。", responseEn: "Don't take the score seriously.", prefillEn: "Losing on purpose so nobody flips the table." },
  "Karaoke": { color: "#E19DB0", responseZh: "破音前先喝一口。", responseEn: "One sip before the high note.", prefillEn: "Queued a song way outside my range. Need liquid courage." },
  "Cooking Dinner": { color: "#E39C6A", responseZh: "锅铲一手，杯子一手。", responseEn: "Spatula in one. Glass in the other.", prefillEn: "Onion in the pan. Sip in the other hand." },
  "Reading a Book": { color: "#8FA99B", responseZh: "翻页也是配酒动作。", responseEn: "Turning pages counts as pairing.", prefillEn: "Same page for twenty minutes. Might be the drink." },
  "Rooftop Hangout": { color: "#7A9ED9", responseZh: "风大，杯子拿稳。", responseEn: "Windy up here. Hold on.", prefillEn: "City lights, rooftop wind, one drink to make it official." },

  // ── English — Energy ─────────────────────────────────────────────
  "Low Energy": { color: "#7E8CA8", responseZh: "轻一点，够就好。", responseEn: "Light. Enough.", prefillEn: "Barely made it out. Need something that meets me here." },
  "Need a Reset": { color: "#9BCBB8", responseZh: "先归零，再倒酒。", responseEn: "Reset. Then pour.", prefillEn: "Something to close the day cleanly, please." },
  "Taking It Slow": { color: "#8FA99B", responseZh: "慢一点没关系。", responseEn: "Slow is fine here.", prefillEn: "One drink, three hours. That's the plan." },
  "Feeling Fancy": { color: "#F2B66D", responseZh: "今晚配得起好东西。", responseEn: "Tonight deserves the good stuff.", prefillEn: "Put on the perfume that's usually for special occasions." },
  "Ready to Party": { color: "#D66A5F", responseZh: "启动完成。", responseEn: "Ignition on.", prefillEn: "Already dancing to the walk-in music. Let's go." },
  "Chaos Mode": { color: "#D66A5F", responseZh: "混乱模式已开启。", responseEn: "Chaos mode: engaged.", prefillEn: "Zero plan. Fully committed to whatever happens." },
  "Full Send": { color: "#D66A5F", responseZh: "全送，别留手。", responseEn: "Send it. All in.", prefillEn: "No brakes tonight. Whatever the bar suggests, that's it." },
  "Staying Classy": { color: "#C0A36E", responseZh: "格调不能垮。", responseEn: "Composure stays intact.", prefillEn: "Sipping like there's someone watching. Because there is: me." },
  "Keeping It Casual": { color: "#B7A9B3", responseZh: "别整那些形式。", responseEn: "Skip the ceremony.", prefillEn: "Jeans, corner seat, first thing that sounds good." },
  "Feeling Dangerous": { color: "#C86B5A", responseZh: "小心一点，别太真诚。", responseEn: "Careful — don't get too honest.", prefillEn: "Something in my chest is asking to make a bad choice." },

  // ── English — Occasion ──────────────────────────────────────────
  "Friday Night": { color: "#F5A35C", responseZh: "周五之夜，别克制。", responseEn: "Friday night — don't hold back.", prefillEn: "Work brain: off. Friday brain: fully online." },
  "Saturday Brunch": { color: "#F2B66D", responseZh: "白天喝也很合理。", responseEn: "Daylight pours are legal here.", prefillEn: "Eggs on the way. Might as well start the day right." },
  "Summer Evening": { color: "#7BB58A", responseZh: "晚风配一杯冷的。", responseEn: "Breeze plus something cold.", prefillEn: "Warm air, no jacket, one cold drink. That's the whole plan." },
  "Rainy Day": { color: "#7A9ED9", responseZh: "雨声当BGM。", responseEn: "Rain as the soundtrack.", prefillEn: "Rain on the window. Not moving from this chair." },
  "Golden Hour": { color: "#F2B66D", responseZh: "光刚好，杯子也刚好。", responseEn: "The light is right. So is this.", prefillEn: "Everything looks better right now. Marking it with a pour." },
  "First Date": { color: "#E7B389", responseZh: "别慌，慢慢来。", responseEn: "Take it slow.", prefillEn: "Rehearsed opener three times. Still might blank." },
  "Reunion": { color: "#C0A36E", responseZh: "老朋友，老酒。", responseEn: "Old friends. Familiar pour.", prefillEn: "Haven't seen this group in years. Already crying-laughing." },
  "Promotion": { color: "#F0C76E", responseZh: "升职到账，杯子跟上。", responseEn: "Promotion booked. Glass to follow.", prefillEn: "Title just changed on the internal site. Marking it tonight." },
  "Breakup Recovery": { color: "#596C91", responseZh: "别急，慢慢好。", responseEn: "No rush. Slow heal.", prefillEn: "It's been three weeks. Trying to remember what I liked before them." },
  "It's Giving Friday": { color: "#F5A35C", responseZh: "很有周五的意思。", responseEn: "Very Friday of us.", prefillEn: "It's Tuesday but the vibe is Friday. Not fighting it." },
  "Barely Made It": { color: "#7E8CA8", responseZh: "撑到了，先喝一口。", responseEn: "You made it. Sip first.", prefillEn: "This week almost broke me. Almost." },
  "We Ball": { color: "#7BB58A", responseZh: "球都得打完。", responseEn: "We play it out.", prefillEn: "Plans fell apart, budget's tight, still showing up." },
  "Delulu but Hopeful": { color: "#DAC5C3", responseZh: "妄想里有点希望。", responseEn: "Delusion with a splash of hope.", prefillEn: "Chances are slim. Still buying the outfit." },
  "In My Villain Era": { color: "#C86B5A", responseZh: "反派也要有品位。", responseEn: "Even villains order well.", prefillEn: "Said no to three things today. Not sorry about any of them." },
  "Hot Girl Summer": { color: "#E19DB0", responseZh: "今晚全场焦点。", responseEn: "You're the plot tonight.", prefillEn: "Outside, hair done, phone almost dead. Not going home yet." },
  "Brat Summer": { color: "#7BB58A", responseZh: "任性一次没事。", responseEn: "Bratty is allowed tonight.", prefillEn: "Loud music, no plan, ordering whatever's the brightest color." },
  "Chaos O'Clock": { color: "#D66A5F", responseZh: "钟点已到，安全带请系好。", responseEn: "It's time. Buckle up.", prefillEn: "Group chat says we're going out. I've decided to believe them." },
  "Financially Irresponsible": { color: "#F0C76E", responseZh: "未来的你会理解的。", responseEn: "Future you will understand.", prefillEn: "Not checking my bank app tonight. That's future-me's problem." },
  "One More Drink Won't Hurt": { color: "#E39C6A", responseZh: "经典台词。", responseEn: "The classic line.", prefillEn: "Said this an hour ago. Saying it again now." },
  "Therapy Is Tomorrow": { color: "#8A9EB3", responseZh: "今天先放着。", responseEn: "Set it aside for tonight.", prefillEn: "Saving all my thoughts for the 10am session tomorrow." },
  "Post-PTO Depression": { color: "#7E8CA8", responseZh: "假期综合症，配一杯缓一下。", responseEn: "Post-vacation slump — soften it.", prefillEn: "Back at my desk. Body's here. Soul's still on the beach." },
  "Corporate Survivor": { color: "#8FA99B", responseZh: "在写字楼里活下来。", responseEn: "You survived the tower.", prefillEn: "Made it through another quarter. Silently toasting myself." },
  "Weekend Loading...": { color: "#62BFA3", responseZh: "加载中，请勿关闭。", responseEn: "Loading — do not close.", prefillEn: "It's Friday at 4:47pm. The clock is not moving." },
  "Vacation Brain": { color: "#7A9ED9", responseZh: "人在，脑不在。", responseEn: "Here in body. Not in mind.", prefillEn: "Physically at work. Mentally at a beach bar somewhere." },
  "First Date Panic": { color: "#E7B389", responseZh: "深呼吸，慢慢喝。", responseEn: "Deep breath. Slow sip.", prefillEn: "They just texted \"here.\" Pretending I'm not sweating." },
  "Situationship Certified": { color: "#DAA0B4", responseZh: "不清不楚，才有意思。", responseEn: "Undefined is a genre.", prefillEn: "We text every day. We are also definitely not dating." },
  "Soft Launch Energy": { color: "#DAC5C3", responseZh: "先露一角就好。", responseEn: "Just the corner of the frame.", prefillEn: "Posted a story with their hand in it. Nobody caught it." },
  "Main Character Energy": { color: "#F5A35C", responseZh: "灯光已就位。", responseEn: "Lights are ready.", prefillEn: "Walked in with the coat, the song, the whole thing." },
  "The Group Chat Finally Met": { color: "#F5A35C", responseZh: "线上见面终于变线下。", responseEn: "Group chat is now IRL.", prefillEn: "First time all of us in the same room. Already screaming." },
  "Touch Grass Challenge": { color: "#A9B4A1", responseZh: "户外营业中。", responseEn: "Open-air business.", prefillEn: "Left the house on purpose. Rewarding myself for it." },
  "Canon Event": { color: "#B08AD8", responseZh: "剧情推进，别插手。", responseEn: "Plot proceeding — don't interfere.", prefillEn: "Something character-defining is happening tonight. Just letting it." },
  "Midlife Crisis (Lite)": { color: "#8A9EB3", responseZh: "小小的存在危机。", responseEn: "Tiny existential moment.", prefillEn: "Bought running shoes I won't wear. That kind of week." },
  "It's Not That Deep": { color: "#B7A9B3", responseZh: "别想那么多。", responseEn: "Don't overthink.", prefillEn: "Everyone else is stressing. I'm choosing to opt out." },
  "Just Here for the Plot": { color: "#B39AC7", responseZh: "看戏就好。", responseEn: "You're audience tonight.", prefillEn: "Not in this drama. Just watching with a drink." },
  "Fake It Till You Make It": { color: "#C0A36E", responseZh: "装得像也是一种能力。", responseEn: "Convincing is a skill.", prefillEn: "Nobody in this room knows I have no idea what I'm doing." },
  "Emotionally Expensive": { color: "#DAA0B4", responseZh: "情绪成本很高。", responseEn: "Emotions run costly.", prefillEn: "One conversation today drained a whole week of energy." },
  "Mentally on Vacation": { color: "#7A9ED9", responseZh: "身体在这，脑子放假。", responseEn: "Body in the room. Brain elsewhere.", prefillEn: "In the meeting, physically. Somewhere else, mostly." },
  "Living Off Vibes": { color: "#B7A9B3", responseZh: "全靠感觉活着。", responseEn: "Running on vibes only.", prefillEn: "No plan, no budget, no worries. Just vibes." },
  "Absolutely Unsupervised": { color: "#D66A5F", responseZh: "没人管，请自控。", responseEn: "Nobody watching — govern yourself.", prefillEn: "Nobody knows where I am tonight. Delicious." },

  // ── English extras (kept for completeness) ────────────────────────
  "Surprise Me": { color: "#B08AD8", responseZh: "行，交给我。", responseEn: "Fine. I've got it.", prefillEn: "Too tired to decide. Whatever you pour, I'll drink." },
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
