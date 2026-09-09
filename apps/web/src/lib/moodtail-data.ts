export interface FlavorChip {
  label: string;
  labelZh: string;
  color: string;
}

export const FLAVOR_CHIPS: FlavorChip[] = [
  { label: "sweet", labelZh: "甜", color: "#F472B6" },
  { label: "bitter", labelZh: "苦", color: "#78716C" },
  { label: "spicy", labelZh: "辛辣", color: "#EF4444" },
  { label: "smoky", labelZh: "烟熏", color: "#A8A29E" },
  { label: "sour", labelZh: "酸", color: "#A3E635" },
  { label: "citrusy", labelZh: "柑橘", color: "#FACC15" },
  { label: "herbal", labelZh: "草本", color: "#4ADE80" },
  { label: "dry", labelZh: "干型", color: "#D6D3D1" },
  { label: "fruity", labelZh: "果香", color: "#FB7185" },
  { label: "floral", labelZh: "花香", color: "#E879F9" },
  { label: "earthy", labelZh: "泥土", color: "#A16207" },
  { label: "creamy", labelZh: "奶感", color: "#FDE68A" },
  { label: "bubbly", labelZh: "气泡", color: "#67E8F9" },
  { label: "boozy", labelZh: "酒感", color: "#C084FC" },
  { label: "tart", labelZh: "涩口", color: "#86EFAC" },
];

export const MOOD_PLACEHOLDERS_EN = [
  "a little anxious about tomorrow's interview",
  "Friday afternoon, sun is out, finally weekend — so happy",
  "late-night rain feels calm, want to put on a song",
  "long day, I want something bright and a little strange",
];

export const MOOD_PLACEHOLDERS_ZH = [
  "明天要面试，有点紧张",
  "周五下午，阳光正好，终于周末了——好开心",
  "深夜下雨，很安静，想放一首歌",
  "漫长的一天，想喝点明亮、又有一点奇怪的",
];
