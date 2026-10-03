import { useEffect, useMemo, useRef } from "react";
import type { TarotOrientation } from "@vibetail/contracts";
import type { TarotSpread } from "./tarot-spreads.js";
import { Scene } from "../../tarot-reference/features/deck3d/Scene.js";
import { useDivination } from "../../tarot-reference/features/divination/divination.store.js";
import type { Spread } from "../../tarot-reference/spreads/types.js";
import "./reference-tarot-stage.css";

export type ReferenceDraw = {
  cardId: string;
  orientation: TarotOrientation;
  positionId: string;
  positionLabel: string;
  positionMeaning: string;
};

type Props = {
  question: string;
  spread: TarotSpread;
  pending: boolean;
  onComplete: (draws: ReferenceDraw[]) => void;
};

export function ReferenceTarotStage({ question, spread, pending, onComplete }: Props) {
  const phase = useDivination((state) => state.phase);
  const picked = useDivination((state) => state.picked);
  const drawn = useDivination((state) => state.drawn);
  const setSpread = useDivination((state) => state.setSpread);
  const setQuestion = useDivination((state) => state.setQuestion);
  const startShuffle = useDivination((state) => state.startShuffle);
  const stepCentered = useDivination((state) => state.stepCentered);
  const pickCentered = useDivination((state) => state.pickCentered);
  const undoLast = useDivination((state) => state.undoLast);
  const confirm = useDivination((state) => state.confirm);
  const submitted = useRef(false);

  const referenceSpread = useMemo<Spread>(() => ({
    spec: "tarot-spread/1.0",
    id: spread.id,
    name: spread.name,
    description: spread.description,
    cardCount: spread.positions.length,
    aspectRatio: 1.5,
    card: { widthRatio: 0.16, heightRatio: 0.28 },
    positions: spread.positions.map((position) => ({
      ...position,
      rotation: position.rotation ?? 0,
      z: position.index,
      prompt: position.meaning,
    })),
  }), [spread]);

  useEffect(() => {
    submitted.current = false;
    setQuestion(question);
    setSpread(referenceSpread);
  }, [question, referenceSpread, setQuestion, setSpread]);

  useEffect(() => {
    if (phase !== "done" || submitted.current || drawn.length !== spread.positions.length) return;
    submitted.current = true;
    onComplete(drawn.map((item, index) => ({
      cardId: referenceCardId(item.cardId),
      orientation: item.reversed ? "reversed" : "upright",
      positionId: spread.positions[index]?.id ?? item.positionId,
      positionLabel: spread.positions[index]?.label ?? item.positionId,
      positionMeaning: spread.positions[index]?.meaning ?? "",
    })));
  }, [drawn, onComplete, phase, spread]);

  const canConfirm = phase === "picking" && picked.length === spread.positions.length;
  const pickAndAdvance = () => { pickCentered(); stepCentered(1); };

  return <section className="tarot-panel tarot-reference-panel">
    <p className="tarot-step">02 / TAROT READING</p>
    <div className="tarot-reference-heading">
      <div><h2>{spread.name}</h2><p>{phase === "idle" ? "先洗牌，再按自己的直觉抽牌。" : phase === "picking" ? "拖动牌面浏览，或直接抽取中间的牌。" : phase === "done" ? "牌阵已经完成。" : "牌面正在落位。"}</p></div>
      <span>{picked.length} / {spread.positions.length}</span>
    </div>
    <div className="tarot-reference-scene"><Scene /></div>
    <div className="tarot-reference-actions">
      {phase === "idle" && <button className="tarot-button" type="button" onClick={startShuffle}>开始洗牌 ↗</button>}
      {phase === "picking" && <>
        <button className="tarot-icon-button" type="button" onClick={() => stepCentered(-1)} aria-label="上一张">←</button>
        <button className="tarot-button" type="button" onClick={pickAndAdvance}>抽取中间的牌</button>
        <button className="tarot-icon-button" type="button" onClick={() => stepCentered(1)} aria-label="下一张">→</button>
        <button className="tarot-text-button" type="button" onClick={undoLast} disabled={!picked.length}>撤回上一张</button>
        {canConfirm && <button className="tarot-button" type="button" onClick={confirm}>翻开牌阵 →</button>}
      </>}
      {phase === "done" && <p className="tarot-reference-complete">牌面已全部翻开，正在生成你的解读{pending ? "…" : "。"}</p>}
    </div>
  </section>;
}

function referenceCardId(cardId: string): string {
  const [family, rank] = cardId.split("_");
  if (family === "major") {
    const major = Number(rank);
    return ["the-fool", "the-magician", "the-high-priestess", "the-empress", "the-emperor", "the-hierophant", "the-lovers", "the-chariot", "strength", "the-hermit", "wheel-of-fortune", "justice", "the-hanged-man", "death", "temperance", "the-devil", "the-tower", "the-star", "the-moon", "the-sun", "judgement", "the-world"][major] ?? "the-fool";
  }
  const rankName: Record<string, string> = { "01": "ace", "02": "two", "03": "three", "04": "four", "05": "five", "06": "six", "07": "seven", "08": "eight", "09": "nine", "10": "ten", page: "page", knight: "knight", queen: "queen", king: "king" };
  return `${rankName[rank ?? "01"] ?? "ace"}-of-${family ?? "cups"}`;
}
