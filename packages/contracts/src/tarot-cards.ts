import type { TarotOrientation } from "./tarot-event.js";

export type TarotCard = {
  id: string;
  name: string;
  zh: string;
  number: string;
  keywords: string;
  meanings: Record<TarotOrientation, { message: string; nextStep: string }>;
};

export const majorArcanaCards: readonly TarotCard[] = [
  { id: "the-fool", name: "The Fool", zh: "愚者", number: "00", keywords: "新的开始 · 信任 · 试一试", meanings: { upright: { message: "一条新路正在出现。先允许自己不知道全部答案。", nextStep: "选一件今天就能开始的小事，先动起来。" }, reversed: { message: "你可能想立刻跳进未知，但还没看清脚下的边界。", nextStep: "保留热情，也补上一个最基本的确认。" } } },
  { id: "the-magician", name: "The Magician", zh: "魔术师", number: "01", keywords: "资源 · 专注 · 行动", meanings: { upright: { message: "你手边已有足够的资源，关键是把注意力收回来。", nextStep: "列出已有的三项条件，先用其中一项推进。" }, reversed: { message: "能量被分散了，或者你在替别人完成想法。", nextStep: "暂时放下一个分心项，把力气留给真正想做的事。" } } },
  { id: "the-high-priestess", name: "The High Priestess", zh: "女祭司", number: "02", keywords: "直觉 · 留白 · 内在声音", meanings: { upright: { message: "现在不必急着解释，安静感受到的部分也很重要。", nextStep: "给自己十分钟不输入新信息，只记下最先浮现的念头。" }, reversed: { message: "外界声音有点太大，让你听不见自己的判断。", nextStep: "把一个决定延后一天，再听听身体的反应。" } } },
  { id: "the-empress", name: "The Empress", zh: "皇后", number: "03", keywords: "丰盛 · 照料 · 生长", meanings: { upright: { message: "你正在培育的事有成长空间，耐心和滋养比催促有效。", nextStep: "为它补上一点具体的照料：时间、休息或一句支持。" }, reversed: { message: "你可能把照顾别人放在了自己之前，热情开始被消耗。", nextStep: "先给自己留出一段不需要回应任何人的时间。" } } },
  { id: "the-emperor", name: "The Emperor", zh: "皇帝", number: "04", keywords: "结构 · 边界 · 主见", meanings: { upright: { message: "清晰的规则会让你更自由，不需要靠硬撑来维持秩序。", nextStep: "给眼前的事定一个边界：时间、范围或优先级。" }, reversed: { message: "控制得太紧，反而让沟通和创造没有空间。", nextStep: "问一次自己：这里有什么可以交出去或放松一点？" } } },
  { id: "the-hierophant", name: "The Hierophant", zh: "教皇", number: "05", keywords: "学习 · 传统 · 共同体", meanings: { upright: { message: "有经验的人或成熟的方法，能为你提供一个可靠的起点。", nextStep: "找一位你信任的人，请他分享一个具体经验。" }, reversed: { message: "既有规则未必适合你现在的处境，可以保留自己的判断。", nextStep: "写下你想遵守的原则，而不是照搬别人的做法。" } } },
  { id: "the-lovers", name: "The Lovers", zh: "恋人", number: "06", keywords: "连接 · 选择 · 价值", meanings: { upright: { message: "这不是只有对错的选择，更像一次和自身价值对齐的机会。", nextStep: "问自己：哪条路更接近我真正想成为的人？" }, reversed: { message: "关系或选择里有一处没说开的不一致。", nextStep: "把最担心的那件事，用一句诚实的话说出来。" } } },
  { id: "the-chariot", name: "The Chariot", zh: "战车", number: "07", keywords: "方向 · 意志 · 推进", meanings: { upright: { message: "你已经有了前进的力，接下来需要的是更明确的方向。", nextStep: "为这一周选一个最重要的目标，其他事暂时靠后。" }, reversed: { message: "你同时拉着太多方向，努力感正在替代真正的推进。", nextStep: "停下一个不再服务目标的动作，给自己腾出空间。" } } },
  { id: "strength", name: "Strength", zh: "力量", number: "08", keywords: "勇气 · 温柔 · 稳定", meanings: { upright: { message: "真正的力量不必用力证明，它来自稳定地陪自己走过去。", nextStep: "面对一件难事时，先用更温柔的语气和自己说话。" }, reversed: { message: "你可能低估了自己，或把疲惫误认为不够强大。", nextStep: "把支持说出口，请一个人替你分担一小部分。" } } },
  { id: "the-hermit", name: "The Hermit", zh: "隐者", number: "09", keywords: "独处 · 寻找 · 灯火", meanings: { upright: { message: "答案需要一点安静才会靠近。独处不是退场，而是校准。", nextStep: "关掉通知，给自己一段只属于自己的散步或书写时间。" }, reversed: { message: "你可能躲得太久，忘了让别人看见你。", nextStep: "给一个可信的人发出一条简单的近况消息。" } } },
  { id: "wheel-of-fortune", name: "Wheel of Fortune", zh: "命运之轮", number: "10", keywords: "变化 · 时机 · 转向", meanings: { upright: { message: "局面正在变化，顺势调整比固守原计划更有力量。", nextStep: "留意一个重复出现的机会，给它一次认真回应。" }, reversed: { message: "你越想抓住不变，越容易错过正在发生的转机。", nextStep: "在一件小事上试着换一种做法。" } } },
  { id: "justice", name: "Justice", zh: "正义", number: "11", keywords: "诚实 · 平衡 · 结果", meanings: { upright: { message: "清楚地看待事实，会比急着得到安慰更帮得上你。", nextStep: "把这件事里你能负责和不能负责的部分分开写下来。" }, reversed: { message: "有一处失衡被暂时忽略了，可能是承诺、信息或责任。", nextStep: "补问一个关键问题，再决定下一步。" } } },
  { id: "the-hanged-man", name: "The Hanged Man", zh: "倒吊人", number: "12", keywords: "暂停 · 换位 · 松开", meanings: { upright: { message: "停下来不等于落后。换个角度后，问题会显出新的出口。", nextStep: "今天先不催一个结果，改做一次观察或倾听。" }, reversed: { message: "你可能把等待变成了拖延，真正不愿面对的是选择。", nextStep: "给这件事设一个很小的截止点。" } } },
  { id: "death", name: "Death", zh: "死神", number: "13", keywords: "结束 · 转化 · 清理", meanings: { upright: { message: "有些阶段完成了，腾出位置才会有新的东西进入。", nextStep: "收尾一件已经不再适合的事，哪怕只是清理一个角落。" }, reversed: { message: "你仍在抓住一个已经改变的版本，因此感到卡住。", nextStep: "说出你最舍不得放下的部分，再决定是否继续。" } } },
  { id: "temperance", name: "Temperance", zh: "节制", number: "14", keywords: "调和 · 节奏 · 适量", meanings: { upright: { message: "不必非黑即白。你正在寻找适合自己的节奏与比例。", nextStep: "在两种极端之间，试一次更温和的中间选项。" }, reversed: { message: "某个部分走得太快或太满，身体和情绪都在提醒你。", nextStep: "今晚少做一点，把空白还给自己。" } } },
  { id: "the-devil", name: "The Devil", zh: "恶魔", number: "15", keywords: "欲望 · 依附 · 松绑", meanings: { upright: { message: "你看见了一个让自己反复消耗的模式，这本身就是松动的开始。", nextStep: "给这个模式起个名字，并决定今晚不再喂它一次。" }, reversed: { message: "你已经在挣脱，只是还不习惯没有旧习惯的空位。", nextStep: "准备一个替代动作，让自己更容易坚持。" } } },
  { id: "the-tower", name: "The Tower", zh: "高塔", number: "16", keywords: "真相 · 震动 · 重建", meanings: { upright: { message: "一件事正在逼你看清真相。虽然突兀，却也释放了重建的空间。", nextStep: "先处理最实际的一步，不必一次解决所有后果。" }, reversed: { message: "你察觉到裂缝，却还在努力维持原样。", nextStep: "挑一件你一直回避的事实，温和但直接地面对它。" } } },
  { id: "the-star", name: "The Star", zh: "星星", number: "17", keywords: "希望 · 疗愈 · 远方", meanings: { upright: { message: "希望不是夸张的乐观，而是你仍愿意朝光亮处走一点。", nextStep: "做一件能让自己恢复一点能量的小事。" }, reversed: { message: "你可能暂时看不见光，不代表它不存在。", nextStep: "把目标缩小到足够具体，让自己重新获得一次完成感。" } } },
  { id: "the-moon", name: "The Moon", zh: "月亮", number: "18", keywords: "感受 · 迷雾 · 潜意识", meanings: { upright: { message: "现在的感受很真实，但未必等于全部事实。让迷雾先存在一会儿。", nextStep: "先分开记录你知道的事、猜测的事和害怕的事。" }, reversed: { message: "一些原本模糊的东西正在变清楚，别急着用旧故事解释它。", nextStep: "向当事人确认一次，而不是继续自己推演。" } } },
  { id: "the-sun", name: "The Sun", zh: "太阳", number: "19", keywords: "清晰 · 喜悦 · 分享", meanings: { upright: { message: "你的能量正在变得明亮。把成果和快乐放到关系里，会更有回响。", nextStep: "把一件最近让你开心的事告诉身边的人。" }, reversed: { message: "光还在，只是被疲惫或过高期待遮住了一点。", nextStep: "降低一次标准，先允许自己享受过程。" } } },
  { id: "judgement", name: "Judgement", zh: "审判", number: "20", keywords: "回望 · 醒来 · 回应", meanings: { upright: { message: "过去的经历正在给你新的提醒。你已经准备好回应那个被搁置的召唤。", nextStep: "重新打开一件曾经很重要、后来被搁置的事。" }, reversed: { message: "你可能对自己要求太苛刻，因此迟迟不肯向前。", nextStep: "把一次错误改写成一个你已经学会的东西。" } } },
  { id: "the-world", name: "The World", zh: "世界", number: "21", keywords: "完成 · 整合 · 下一圈", meanings: { upright: { message: "一个循环正在收束。承认自己的完成，才能轻松进入下一段。", nextStep: "为一个阶段留下一句总结，或好好庆祝一次。" }, reversed: { message: "你离完成并不远，可能只是还没给结尾一个明确的形状。", nextStep: "定义完成的标准，然后补上最后一个小步骤。" } } },
];

type MinorSuit = { id: "wands" | "cups" | "swords" | "pentacles"; name: string; zh: string; element: string; theme: string };
const minorSuits: readonly MinorSuit[] = [
  { id: "wands", name: "Wands", zh: "权杖", element: "火", theme: "行动与热情" },
  { id: "cups", name: "Cups", zh: "圣杯", element: "水", theme: "情感与连接" },
  { id: "swords", name: "Swords", zh: "宝剑", element: "风", theme: "想法与选择" },
  { id: "pentacles", name: "Pentacles", zh: "星币", element: "土", theme: "现实与积累" },
];
const minorRanks = [
  { id: "ace", name: "Ace", zh: "王牌", image: "01", meaning: "一股新的能量正在出现" },
  { id: "two", name: "Two", zh: "二", image: "02", meaning: "在两个方向之间找到平衡" },
  { id: "three", name: "Three", zh: "三", image: "03", meaning: "合作会让眼前的事走得更远" },
  { id: "four", name: "Four", zh: "四", image: "04", meaning: "先稳住已有的东西，再决定下一步" },
  { id: "five", name: "Five", zh: "五", image: "05", meaning: "摩擦或变化正在提醒你调整方法" },
  { id: "six", name: "Six", zh: "六", image: "06", meaning: "过去的经验正好能为现在提供帮助" },
  { id: "seven", name: "Seven", zh: "七", image: "07", meaning: "坚持自己的判断，但也留意现实反馈" },
  { id: "eight", name: "Eight", zh: "八", image: "08", meaning: "节奏正在加快，专注会带来进展" },
  { id: "nine", name: "Nine", zh: "九", image: "09", meaning: "你已经走了很远，先确认自己的底气" },
  { id: "ten", name: "Ten", zh: "十", image: "10", meaning: "一个阶段的重量需要被看见和重新分配" },
  { id: "page", name: "Page", zh: "侍者", image: "11", meaning: "一个新消息或新视角值得被听见" },
  { id: "knight", name: "Knight", zh: "骑士", image: "12", meaning: "带着冲劲向前，但别忘了调整速度" },
  { id: "queen", name: "Queen", zh: "王后", image: "13", meaning: "成熟的直觉能帮你照看这件事" },
  { id: "king", name: "King", zh: "国王", image: "14", meaning: "把经验和边界变成可靠的主导力" },
] as const;

function createMinorArcana(): readonly TarotCard[] {
  return minorSuits.flatMap((suit) => minorRanks.map((rank) => ({
    id: `${rank.id}-of-${suit.id}`,
    name: `${rank.name} of ${suit.name}`,
    zh: `${suit.zh}${rank.zh}`,
    number: rank.image,
    keywords: `${suit.theme} · ${rank.meaning}`,
    meanings: {
      upright: { message: `${rank.meaning}。这张${suit.zh}牌把注意力带回${suit.theme}，也带回这个秋天真正想生长的部分。`, nextStep: `问自己：这件事里，关于${suit.theme}，我今天能做的最小一步是什么？` },
      reversed: { message: `${rank.meaning}的能量有些卡住了。关于${suit.theme}，你可能正在用旧的方式应对新的季节。`, nextStep: "先放慢一点，写下一个你愿意重新尝试的选择。" },
    },
  })));
}

export const minorArcanaCards: readonly TarotCard[] = createMinorArcana();
export const tarotCards: readonly TarotCard[] = [...majorArcanaCards, ...minorArcanaCards];

export function findTarotCard(cardId: string): TarotCard | undefined {
  return tarotCards.find((card) => card.id === cardId);
}
