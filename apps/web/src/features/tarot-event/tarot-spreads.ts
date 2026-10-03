export type TarotSpreadPosition = {
  id: string;
  index: number;
  label: string;
  x: number;
  y: number;
  rotation?: number;
  meaning: string;
};

export type TarotSpread = {
  id: string;
  name: string;
  description: string;
  positions: TarotSpreadPosition[];
};

const position = (id: string, index: number, label: string, x: number, y: number, meaning: string, rotation = 0): TarotSpreadPosition => ({ id, index, label, x, y, meaning, rotation });

export const tarotSpreads: readonly TarotSpread[] = [
  {
    id: "single",
    name: "一张牌 · 秋日指引",
    description: "把注意力收回当下，听听一张牌给你的提醒。",
    positions: [position("guidance", 1, "当下的启示", 0.5, 0.5, "针对你的问题，最值得看见的核心启示。")],
  },
  {
    id: "decision",
    name: "二选一 · 两条路",
    description: "当你在两个方向之间犹豫时，看见各自的气候。",
    positions: [position("a", 1, "选择 A", 0.32, 0.5, "选择 A 这条路的能量与代价。"), position("b", 2, "选择 B", 0.68, 0.5, "选择 B 这条路的能量与代价。")],
  },
  {
    id: "three-card",
    name: "三张牌 · 过去 / 现在 / 未来",
    description: "沿着一条时间线，看清问题从哪里来、此刻在哪里、可能走向哪里。",
    positions: [position("past", 1, "过去", 0.2, 0.5, "影响当前局面的过往根源。"), position("present", 2, "现在", 0.5, 0.5, "此刻的核心处境与能量。"), position("future", 3, "未来", 0.8, 0.5, "延续当前方向的可能走向。")],
  },
  {
    id: "situation-action-outcome",
    name: "三张牌 · 情境 / 行动 / 结果",
    description: "把一个具体问题拆成现状、下一步和可能的回响。",
    positions: [position("situation", 1, "情境", 0.2, 0.5, "当前处境的核心现状。"), position("action", 2, "行动", 0.5, 0.5, "此刻最值得采取的态度与行动。"), position("outcome", 3, "结果", 0.8, 0.5, "延续当前方向后可能出现的走向。")],
  },
  {
    id: "relationship",
    name: "五张牌 · 关系镜像",
    description: "看看你、对方、彼此之间，以及这段关系需要的方向。",
    positions: [position("you", 1, "你的能量", 0.2, 0.5, "你在这段关系中的状态。"), position("other", 2, "对方的能量", 0.8, 0.5, "对方在这段关系中的状态。"), position("connection", 3, "关系本身", 0.5, 0.5, "你们之间正在发生的主题。"), position("lesson", 4, "要看见的事", 0.5, 0.18, "这段关系带来的提醒。"), position("direction", 5, "下一步", 0.5, 0.82, "关系最值得尝试的方向.")],
  },
];

const generatedReferenceSpreads: Array<[string, string, string, string[]]> = [
  ["yes-no-clarifier", "是非澄清 · 两张", "先看答案倾向，再看背后的条件。", ["答案", "澄清"]],
  ["mind-body-spirit", "身 · 心 · 灵", "从三个层面看看你现在的整体状态。", ["心智", "身体", "灵性"]],
  ["pentagram", "五芒星", "从五个角度看见一件事的完整形状。", ["根源", "现状", "阻力", "支持", "方向"]],
  ["horseshoe", "马蹄铁 · 七张", "沿着一条弧线看见问题的脉络与走向。", ["过去", "现在", "隐藏因素", "阻碍", "外部影响", "建议", "结果"]],
  ["chakra", "七脉轮", "观察身体、情绪和行动能量的流动。", ["根基", "感受", "意志", "连接", "表达", "直觉", "信念"]],
  ["relationship-cross", "关系十字", "把关系里的双方、张力和可能性放在同一张桌上。", ["你", "对方", "关系", "阻力", "支持", "过去", "未来"]],
  ["celtic-cross", "凯尔特十字 · 十张", "适合想把一个问题看得更深、更完整的时候。", ["核心", "阻碍", "根源", "过去", "目标", "未来", "你的状态", "环境", "希望", "结果"]],
  ["zodiac-houses", "十二宫", "把问题放进生活的十二个领域里看。", ["自我", "资源", "沟通", "家庭", "创造", "日常", "关系", "共享", "远方", "事业", "社群", "内在"]],
  ["year-ahead", "未来一年 · 十三张", "从当下开始，沿着一整年的节奏往前看。", ["主题", "一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"]],
  ["career", "事业 · 三张", "看清工作里的现状、机会和下一步。", ["现状", "机会", "行动"]],
  ["career-cross", "事业十字", "当工作问题需要更多背景和策略时使用。", ["核心", "挑战", "资源", "行动", "结果"]],
  ["wealth", "财富 · 三张", "看看资源、流动和现实选择。", ["现状", "阻力", "建议"]],
  ["wealth-flow", "财富流动", "把收入、支出和长期积累放在一起看。", ["来源", "流动", "阻力", "机会", "方向"]],
  ["crush", "心动对象", "看看一段心动关系里的能量和可能。", ["你的感受", "对方的感受", "吸引力", "阻力", "下一步"]],
  ["admirer", "暗中欣赏", "探索一段还没有说出口的连接。", ["你", "对方", "隐藏的事", "阻力", "可能"]],
  ["true-love", "真爱关系", "把关系的深层主题和成长方向摊开。", ["你", "对方", "连接", "过去", "未来", "建议"]],
  ["single-no-more", "告别单身", "从内在准备到现实行动，看见新的相遇。", ["准备", "旧模式", "机会", "行动", "结果"]],
  ["reunite", "复合", "回看一段关系是否还有新的可能。", ["你", "对方", "分开的原因", "仍在的连接", "建议", "走向"]],
  ["situationship", "暧昧关系", "看清暧昧里的真实期待和边界。", ["你的期待", "对方的期待", "现状", "阻力", "建议"]],
  ["trend", "关系趋势", "沿着当下的能量，看这段关系会如何变化。", ["现在", "近期", "中期", "转折", "方向"]],
];

const spreadLayouts: Record<string, Array<[number, number, number]>> = {
  "yes-no-clarifier": [[0.35, 0.5, 0], [0.65, 0.5, 0]],
  "mind-body-spirit": [[0.5, 0.18, 0], [0.22, 0.7, 0], [0.78, 0.7, 0]],
  pentagram: [[0.5, 0.12, 0], [0.85, 0.38, 0], [0.7, 0.82, 0], [0.3, 0.82, 0], [0.15, 0.38, 0]],
  horseshoe: [[0.12, 0.62, -28], [0.25, 0.38, -18], [0.4, 0.22, -8], [0.6, 0.22, 8], [0.75, 0.38, 18], [0.88, 0.62, 28], [0.5, 0.82, 0]],
  chakra: [[0.5, 0.9, 0], [0.5, 0.78, 0], [0.5, 0.66, 0], [0.5, 0.54, 0], [0.5, 0.42, 0], [0.5, 0.3, 0], [0.5, 0.18, 0]],
  "relationship-cross": [[0.18, 0.5, 0], [0.82, 0.5, 0], [0.5, 0.5, 0], [0.5, 0.2, 0], [0.5, 0.8, 0], [0.28, 0.2, 0], [0.72, 0.8, 0]],
  "celtic-cross": [[0.38, 0.5, 0], [0.38, 0.5, 90], [0.38, 0.78, 0], [0.38, 0.22, 0], [0.12, 0.5, 0], [0.64, 0.5, 0], [0.88, 0.86, 0], [0.88, 0.62, 0], [0.88, 0.38, 0], [0.88, 0.14, 0]],
  "zodiac-houses": [[0.5, 0.08, 0], [0.75, 0.15, 0], [0.9, 0.35, 0], [0.9, 0.65, 0], [0.75, 0.85, 0], [0.5, 0.92, 0], [0.25, 0.85, 0], [0.1, 0.65, 0], [0.1, 0.35, 0], [0.25, 0.15, 0], [0.5, 0.35, 0], [0.5, 0.65, 0]],
  "year-ahead": [[0.5, 0.12, 0], [0.18, 0.28, 0], [0.34, 0.28, 0], [0.5, 0.28, 0], [0.66, 0.28, 0], [0.82, 0.28, 0], [0.18, 0.5, 0], [0.34, 0.5, 0], [0.5, 0.5, 0], [0.66, 0.5, 0], [0.82, 0.5, 0], [0.34, 0.72, 0], [0.66, 0.72, 0]],
  career: [[0.2, 0.5, 0], [0.5, 0.25, 0], [0.8, 0.5, 0]],
  "career-cross": [[0.5, 0.5, 0], [0.5, 0.5, 90], [0.22, 0.5, 0], [0.78, 0.5, 0], [0.5, 0.82, 0]],
  wealth: [[0.2, 0.5, 0], [0.5, 0.25, 0], [0.8, 0.5, 0]],
  "wealth-flow": [[0.15, 0.5, 0], [0.35, 0.25, 0], [0.55, 0.5, 0], [0.75, 0.25, 0], [0.85, 0.7, 0]],
  crush: [[0.16, 0.5, 0], [0.84, 0.5, 0], [0.5, 0.2, 0], [0.5, 0.5, 0], [0.5, 0.8, 0]],
  admirer: [[0.2, 0.5, 0], [0.8, 0.5, 0], [0.5, 0.22, 0], [0.5, 0.5, 0], [0.5, 0.78, 0]],
  "true-love": [[0.18, 0.5, 0], [0.82, 0.5, 0], [0.5, 0.2, 0], [0.5, 0.5, 0], [0.5, 0.8, 0], [0.5, 0.92, 0]],
  "single-no-more": [[0.18, 0.5, 0], [0.38, 0.25, 0], [0.62, 0.25, 0], [0.82, 0.5, 0], [0.5, 0.8, 0]],
  reunite: [[0.16, 0.5, 0], [0.84, 0.5, 0], [0.5, 0.2, 0], [0.5, 0.5, 0], [0.5, 0.8, 0], [0.5, 0.92, 0]],
  situationship: [[0.16, 0.5, 0], [0.84, 0.5, 0], [0.5, 0.2, 0], [0.5, 0.5, 0], [0.5, 0.8, 0]],
  trend: [[0.12, 0.5, 0], [0.31, 0.25, 0], [0.5, 0.5, 0], [0.69, 0.25, 0], [0.88, 0.5, 0]],
};

function makeGeneratedSpread([id, name, description, labels]: [string, string, string, string[]]): TarotSpread {
  const layout = spreadLayouts[id];
  const positions = labels.map((label, index) => {
    const [x, y, rotation] = layout?.[index] ?? [0.12 + (index / Math.max(labels.length - 1, 1)) * 0.76, 0.5, 0];
    return position(`${id}-${index + 1}`, index + 1, label, x, y, `${label}位置的启示。`, rotation);
  });
  return { id, name, description, positions };
}

export const allTarotSpreads: readonly TarotSpread[] = [...tarotSpreads, ...generatedReferenceSpreads.map(makeGeneratedSpread)];

export function chooseTarotSpread(question: string): TarotSpread {
  const normalized = question.toLowerCase();
  if (/选择|决定|要不要|两难|choose|decision/.test(normalized)) return tarotSpreads[1]!;
  if (/关系|感情|喜欢|暧昧|复合|心动|真爱|爱情|relationship|love|crush/.test(normalized)) return allTarotSpreads.find((spread) => spread.id === (/复合|reunite/.test(normalized) ? "reunite" : /暧昧|situationship/.test(normalized) ? "situationship" : "relationship-cross"))!;
  if (/行动|怎么办|下一步|工作|事业|职业|career/.test(normalized)) return allTarotSpreads.find((spread) => spread.id === "career-cross")!;
  if (/钱|财富|收入|花销|财运|wealth|money/.test(normalized)) return allTarotSpreads.find((spread) => spread.id === "wealth-flow")!;
  if (/身体|健康|睡眠|能量|身心|chakra|mind|body|spirit/.test(normalized)) return allTarotSpreads.find((spread) => spread.id === "chakra")!;
  if (/一年|十二个月|year/.test(normalized)) return allTarotSpreads.find((spread) => spread.id === "year-ahead")!;
  if (/过去|现在|未来|变化|接下来|方向|一年|future|change|year/.test(normalized)) return tarotSpreads[2]!;
  return tarotSpreads[0]!;
}
