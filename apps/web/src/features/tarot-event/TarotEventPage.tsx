import { useState, type FormEvent } from "react";
import { tarotCards, tarotNoteTags, tarotTextureTags, type TarotCard, type TarotDrink, type TarotDrinkPreferences, type TarotOrientation, type TarotReading } from "@vibetail/contracts";
import { useSeo } from "../platform/useSeo.js";
import "./tarot-event.css";
import { allTarotSpreads, chooseTarotSpread, type TarotSpread } from "./tarot-spreads.js";
import { ReferenceTarotStage, type ReferenceDraw } from "./ReferenceTarotStage.js";

const tarotImageNames: Record<string, string> = {
  "the-fool": "00_Fool.jpg", "the-magician": "01_Magician.jpg", "the-high-priestess": "02_High_Priestess.jpg", "the-empress": "03_Empress.jpg", "the-emperor": "04_Emperor.jpg", "the-hierophant": "05_Hierophant.jpg", "the-lovers": "06_Lovers.jpg", "the-chariot": "07_Chariot.jpg", strength: "08_Strength.jpg", "the-hermit": "09_Hermit.jpg", "wheel-of-fortune": "10_Wheel_of_Fortune.jpg", justice: "11_Justice.jpg", "the-hanged-man": "12_Hanged_Man.jpg", death: "13_Death.jpg", temperance: "14_Temperance.jpg", "the-devil": "15_Devil.jpg", "the-tower": "16_Tower.jpg", "the-star": "17_Star.jpg", "the-moon": "18_Moon.jpg", "the-sun": "19_Sun.jpg", judgement: "20_Judgement.jpg", "the-world": "21_World.jpg",
};

const minorImageRanks: Record<string, string> = { ace: "01", two: "02", three: "03", four: "04", five: "05", six: "06", seven: "07", eight: "08", nine: "09", ten: "10", page: "11", knight: "12", queen: "13", king: "14" };
const minorImageSuits: Record<string, string> = { wands: "Wands", cups: "Cups", swords: "Swords", pentacles: "Pents" };
function tarotImageUrl(cardId: string): string | undefined { const majorFilename = tarotImageNames[cardId]; if (majorFilename) return `/deck/rider-waite/720px/${majorFilename}`; const match = /^(ace|two|three|four|five|six|seven|eight|nine|ten|page|knight|queen|king)-of-(wands|cups|swords|pentacles)$/.exec(cardId); if (!match) return undefined; const rank = match[1]!; const suit = match[2]!; return `/deck/rider-waite/720px/${minorImageSuits[suit]}${minorImageRanks[rank]}.jpg`; }

type View = "entry" | "preferences" | "home" | "physical" | "virtual" | "result";
type Result = { round: "first" | "second"; cardId: string; orientation: TarotOrientation; reading: TarotReading; drink: TarotDrink; spreadId?: string; spreadName?: string; draws?: Array<{ cardId: string; orientation: TarotOrientation; positionId: string; positionLabel: string; positionMeaning?: string }>; readings?: TarotReading[] };

export function TarotEventPage() {
  useSeo("Autumn Tarot Night — Vibetail", "A private tarot ritual by Vibetail.", true);
  const [view, setView] = useState<View>("entry");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [guest, setGuest] = useState<{ displayName: string; zodiac: string; element: string }>();
  const [textures, setTextures] = useState<string[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [preferenceDescription, setPreferenceDescription] = useState("");
  const [cardQuery, setCardQuery] = useState("");
  const [cardId, setCardId] = useState("");
  const [orientation, setOrientation] = useState<TarotOrientation>("upright");
  const [question, setQuestion] = useState("");
  const [questionSubmitted, setQuestionSubmitted] = useState(false);
  const [virtualSpread, setVirtualSpread] = useState<TarotSpread>(chooseTarotSpread(""));
  const [result, setResult] = useState<Result>();
  const [activeTab, setActiveTab] = useState<"reading" | "drink">("reading");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function api(path: string, init?: RequestInit) {
    const response = await fetch(path, { credentials: "include", ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { message?: string } | null;
      throw new Error(payload?.message ?? "REQUEST_FAILED");
    }
    return response.status === 204 ? null : await response.json() as Record<string, unknown>;
  }
  async function enter(event: FormEvent) {
    event.preventDefault(); setError(""); setPending(true);
    try { const body = await api("/v1/events/autumn-tarot/session", { method: "POST", body: JSON.stringify({ email: email.trim(), displayName: displayName.trim() }) }); const value = body as { guest: typeof guest; needsPreferences: boolean; preferences?: TarotDrinkPreferences | null }; setGuest(value.guest); if (value.preferences) { setTextures(value.preferences.textures); setNotes(value.preferences.notes); setPreferenceDescription(value.preferences.description); } setView(value.needsPreferences ? "preferences" : "home"); }
    catch { setError("这次进入没有完成，请确认邮箱和名字后再试一次。"); } finally { setPending(false); }
  }
  async function savePreferences(event: FormEvent) {
    event.preventDefault(); if (!textures.length || !notes.length) return; setPending(true); setError("");
    try { await api("/v1/events/autumn-tarot/preferences", { method: "PUT", body: JSON.stringify({ textures, notes, description: preferenceDescription }) }); setView("home"); } catch { setError("口味偏好还没保存成功，请再试一次。"); } finally { setPending(false); }
  }
  async function submitPhysical(event: FormEvent) {
    event.preventDefault(); if (!cardId) return; setPending(true); setError("");
    try { const body = await api("/v1/events/autumn-tarot/rounds/first/physical-card", { method: "POST", body: JSON.stringify({ cardId, orientation }) }); setResult(body as unknown as Result); setActiveTab("reading"); setView("result"); } catch { setError("这张牌还没保存成功，请再试一次。"); } finally { setPending(false); }
  }
  async function submitVirtualDraws(draws: ReferenceDraw[]) {
    if (!draws.length || question.trim().length < 2) return;
    setPending(true); setError("");
    try { const body = await api("/v1/events/autumn-tarot/rounds/second/reading", { method: "POST", body: JSON.stringify({ cardId: draws[0]!.cardId, orientation: draws[0]!.orientation, question: question.trim(), spreadId: virtualSpread.id, spreadName: virtualSpread.name, draws }) }); setResult(body as unknown as Result); setActiveTab("reading"); setView("result"); } catch { setError("你的解读还没生成成功，请再试一次。"); } finally { setPending(false); }
  }
  function beginVirtualReading() {
    setCardId(""); setQuestion(""); setQuestionSubmitted(false); setOrientation("upright"); setError(""); setView("virtual");
  }
  function submitVirtualQuestion(event: FormEvent) {
    event.preventDefault();
    if (question.trim().length < 2) return;
    setVirtualSpread(chooseTarotSpread(question));
    setQuestionSubmitted(true);
  }
  const matchingCards = tarotCards.filter((card) => `${card.zh} ${card.name} ${card.number} ${card.keywords}`.toLowerCase().includes(cardQuery.toLowerCase()));

  function returnToHome() { setError(""); setPending(false); setView("home"); }

  return <main className="tarot-page"><div className="tarot-grain" aria-hidden="true" /><header className="tarot-header"><a className="tarot-wordmark" href="/">VIBETAIL</a><span className="tarot-header-note">AUTUMN / 2026</span></header><div className="tarot-shell">
    <div className="tarot-intro">{view !== "entry" && view !== "home" && <button className="tarot-home-button" type="button" onClick={returnToHome}>← 回到活动首页</button>}<p className="tarot-eyebrow">A private reading by Vibetail · 03 OCT 2026</p><p className="tarot-mark">✦</p><h1>秋日微醺<br /><em>塔罗之夜</em></h1></div>
    {view === "entry" && <section className="tarot-panel tarot-entry"><p className="tarot-step">01 / FIND YOUR PLACE</p><h2>先确认你的席位。</h2><p>留下邮箱和名字，就能继续今晚的故事。</p><form onSubmit={enter}><label htmlFor="tarot-email">邮箱</label><input id="tarot-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /><label htmlFor="tarot-name">姓名</label><input id="tarot-name" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="你的姓名" /><button className="tarot-button" type="submit" disabled={pending}>{pending ? "正在打开…" : "进入活动 →"}</button></form></section>}
    {view === "preferences" && <section className="tarot-panel"><p className="tarot-step">02 / YOUR TASTE</p><h2>{guest?.displayName}，先告诉我们你喜欢哪一口。</h2><p>选选你偏爱的口感和风味，再补充一句自己的描述。之后两轮酒卡都会参考它，而且不会重复推荐。</p><form onSubmit={savePreferences}><PreferenceGroup title="你喜欢的口感" options={tarotTextureTags} selected={textures} onToggle={(tag) => setTextures((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag])} /><PreferenceGroup title="你喜欢的风味" options={tarotNoteTags} selected={notes} onToggle={(tag) => setNotes((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag])} /><label className="tarot-field-label" htmlFor="tarot-preference-description">还有什么想告诉我们的？</label><textarea id="tarot-preference-description" value={preferenceDescription} onChange={(e) => setPreferenceDescription(e.target.value)} placeholder="比如：我喜欢酸一点、清爽一点，不要太甜。" rows={4} maxLength={500} /><button className="tarot-button" type="submit" disabled={pending || !textures.length || !notes.length}>{pending ? "正在保存…" : "保存口味偏好 →"}</button></form></section>}
    {view === "home" && <section className="tarot-panel"><div className="tarot-section-head"><div><p className="tarot-step">TONIGHT, FOR YOU</p><h2>{guest?.displayName}，今晚从这里开始。</h2></div><button className="tarot-edit-button" onClick={() => setView("preferences")}>编辑口味</button></div><div className="tarot-entry-grid"><button className="tarot-choice" onClick={() => { setCardId(""); setCardQuery(""); setView("physical"); }}><span>01</span><strong>第一张牌 · 第一杯酒</strong><small>选出你刚刚抽到的实体牌，看看它给你的秋日解读，也看看今晚为你匹配的第一杯酒。</small></button><button className="tarot-choice" onClick={beginVirtualReading}><span>02</span><strong>塔罗牌 · 第二杯酒</strong><small>先写下你现在真正想问的问题，再按牌阵洗牌、逐张抽牌。最后会得到一份完整解读和一杯按口味为你匹配的酒。</small></button></div></section>}
    {view === "physical" && <section className="tarot-panel"><p className="tarot-step">01 / YOUR PHYSICAL CARD</p><h2>你抽到的是哪一张？</h2><p>搜索现场抽到的实体牌；方向如果不确定，可以先按正位。</p><form onSubmit={submitPhysical}><div className="tarot-card-picker"><input value={cardQuery} onChange={(e) => { setCardQuery(e.target.value); if (cardId) setCardId(""); }} placeholder="搜索中文名或英文名" role="combobox" aria-label="搜索塔罗牌" aria-controls="tarot-card-options" aria-expanded={Boolean(cardQuery)} autoComplete="off" required /><div id="tarot-card-options" className="tarot-card-options" role="listbox">{matchingCards.slice(0, 12).map((card) => { const selectCard = () => { setCardId(card.id); setCardQuery(`${card.zh} · ${card.name}`); }; return <button key={card.id} type="button" role="option" aria-selected={cardId === card.id} onPointerDown={(event) => { event.preventDefault(); selectCard(); }} onClick={selectCard}>{card.number} · {card.zh} / {card.name}</button>; })}{!matchingCards.length && <p>没有找到这张牌，换个关键词试试。</p>}</div></div><Orientation value={orientation} onChange={setOrientation} /><button className="tarot-button" disabled={pending || !cardId}>{pending ? "正在解读…" : "解读并匹配第一杯 →"}</button></form></section>}
    {view === "virtual" && (questionSubmitted ? <ReferenceTarotStage question={question} spread={virtualSpread} pending={pending} onComplete={(draws) => void submitVirtualDraws(draws)} /> : <QuestionForm question={question} setQuestion={setQuestion} onSubmit={submitVirtualQuestion} />)}
    {view === "result" && result && <ResultPanel result={result} activeTab={activeTab} setActiveTab={setActiveTab} onHome={() => setView("home")} />}
    {error && <p className="tarot-error" role="alert">{error}</p>}
  </div><footer className="tarot-footer"><span>VIBETAIL / A NIGHT TO REMEMBER</span><span>✦</span><span>NOT A PREDICTION</span></footer></main>;
}

function PreferenceGroup({ title, options, selected, onToggle }: { title: string; options: readonly string[]; selected: string[]; onToggle: (tag: string) => void }) { return <fieldset className="tarot-preference-group"><legend>{title}</legend><div className="tarot-flavor-grid">{options.map((tag) => <label key={tag} className={`tarot-flavor ${selected.includes(tag) ? "is-selected" : ""}`}><input type="checkbox" checked={selected.includes(tag)} onChange={() => onToggle(tag)} />{tag}</label>)}</div></fieldset>; }
function QuestionForm({ question, setQuestion, onSubmit }: { question: string; setQuestion: (value: string) => void; onSubmit: (event: FormEvent) => void }) { return <section className="tarot-panel tarot-question"><p className="tarot-step">02 / YOUR QUESTION</p><h2>先写下你想问的事。</h2><p>不用想得太完整。一句话就好；我们会根据你的问题选一个适合的牌阵。</p><form onSubmit={onSubmit}><label htmlFor="tarot-question">你的问题</label><textarea id="tarot-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="比如：接下来的秋天，我该把注意力放在哪里？" rows={5} maxLength={500} required /><div className="tarot-form-foot"><span>{question.length} / 500</span><button className="tarot-button" disabled={question.trim().length < 2}>进入抽牌 →</button></div></form></section>; }
function Orientation({ value, onChange }: { value: TarotOrientation; onChange: (value: TarotOrientation) => void }) { return <fieldset className="tarot-orientation"><legend>牌面方向</legend><label><input type="radio" checked={value === "upright"} onChange={() => onChange("upright")} />正位</label><label><input type="radio" checked={value === "reversed"} onChange={() => onChange("reversed")} />逆位</label></fieldset>; }
function ResultPanel({ result, activeTab, setActiveTab, onHome }: { result: Result; activeTab: "reading" | "drink"; setActiveTab: (tab: "reading" | "drink") => void; onHome: () => void }) {
  const card = tarotCards.find((item) => item.id === result.cardId) as TarotCard | undefined;
  const imageUrl = tarotImageUrl(result.cardId);
  const resultCards = result.draws ?? [{ cardId: result.cardId, orientation: result.orientation, positionId: "card", positionLabel: "指引" }];
  const isSpread = resultCards.length > 1;
  const spread = result.spreadId ? allTarotSpreads.find((item) => item.id === result.spreadId) : undefined;
  const positions = new Map(spread?.positions.map((item) => [item.id, item]) ?? []);
  const readings = result.readings ?? [result.reading];
  return <section className="tarot-panel tarot-reading">
    <p className="tarot-step">{result.round === "first" ? "01 / YOUR FIRST POUR" : "02 / YOUR SECOND POUR"}</p>
    <h2>{result.spreadName ?? card?.zh ?? result.cardId}</h2>
    {isSpread && spread ? <div className="tarot-result-board" style={{ aspectRatio: spread.id === "zodiac-houses" || spread.id === "year-ahead" ? "1.6" : String(spread.id === "chakra" ? 0.9 : spread.id === "celtic-cross" ? 1.15 : spread.id === "horseshoe" ? 1.7 : spread.id === "pentagram" ? 1 : 1.35) }} aria-label={`${spread.name} 完整牌阵`}>
      {resultCards.map((draw, index) => {
        const item = tarotCards.find((candidate) => candidate.id === draw.cardId);
        const src = tarotImageUrl(draw.cardId);
        const position = positions.get(draw.positionId) ?? spread.positions[index];
        const style = position ? { left: `${position.x * 100}%`, top: `${position.y * 100}%`, transform: `translate(-50%, -50%) rotate(${position.rotation ?? 0}deg)` } : undefined;
        return <figure key={draw.positionId} className="tarot-result-position" style={style}>
          {src && <img className={`tarot-result-card ${draw.orientation === "reversed" ? "is-reversed" : ""}`} src={src} alt={`${item?.zh ?? draw.cardId} · ${draw.orientation === "reversed" ? "逆位" : "正位"}`} />}
          <figcaption><strong>{draw.positionLabel}</strong><span>{item?.zh ?? draw.cardId} · {draw.orientation === "reversed" ? "逆位" : "正位"}</span></figcaption>
        </figure>;
      })}
    </div> : imageUrl && <img className={`tarot-result-card ${result.orientation === "reversed" ? "is-reversed" : ""}`} src={imageUrl} alt={`${card?.zh ?? result.cardId} · ${result.orientation === "reversed" ? "逆位" : "正位"}`} />}
    <p className="tarot-card-line">{isSpread ? "牌阵已经完成。下面按每个位置，看看它们如何一起回应你的问题。" : card?.meanings[result.orientation].message ?? "秋天刚刚开始，这张牌提醒你留意正在发生的变化。"}</p>
    <div className="tarot-tabs" role="tablist"><button className={activeTab === "reading" ? "is-active" : ""} onClick={() => setActiveTab("reading")}>解读</button><button className={activeTab === "drink" ? "is-active" : ""} onClick={() => setActiveTab("drink")}>{result.round === "first" ? "第一杯酒酒卡" : "第二杯酒酒卡"}</button></div>
    {activeTab === "reading" ? <article className="tarot-reading-paper">
      <p className="tarot-reading-kicker">{isSpread ? "完整牌阵解读" : "秋天刚刚开始，这张牌给你的启示"}</p>
      {isSpread ? <div className="tarot-position-readings">{resultCards.map((draw, index) => { const reading = readings[index] ?? result.reading; return <section key={draw.positionId} className="tarot-position-reading"><div><span>{String(index + 1).padStart(2, "0")}</span><h3>{draw.positionLabel}</h3></div><p className="tarot-position-card-name">{tarotCards.find((item) => item.id === draw.cardId)?.zh ?? draw.cardId} · {draw.orientation === "reversed" ? "逆位" : "正位"}</p><p>{reading.body}</p><p className="tarot-reading-reflection">{reading.reflection}</p></section>; })}</div> : <><p className="tarot-reading-body">{result.reading.body}</p><div className="tarot-rule" /><p className="tarot-reading-reflection">{result.reading.reflection}</p></>}
      {isSpread && <><div className="tarot-rule" /><p className="tarot-reading-summary-label">整组牌的回声</p><p className="tarot-reading-body">{result.reading.reflection}</p></>}
    </article> : <article className="tarot-drink-card"><p className="tarot-step">YOUR MATCH</p><h3>{result.drink.name}</h3><p className="tarot-drink-tarot-line">{isSpread ? "这杯酒，沿着整组牌的气息，为你留下今晚的第二个落点。" : card?.meanings[result.orientation].message ?? "一杯为这个秋天留下的酒。"}</p><p className="tarot-drink-label">这一杯的口味</p><p>{result.drink.description}</p><small>{result.drink.recommendationNote ?? "这杯酒，按你今晚的口味为你留下。"}</small><p className="tarot-drink-tags">{result.drink.flavorTags.join(" · ")}</p></article>}
    <button className="tarot-text-button" onClick={onHome}>回到两个入口 →</button><p className="tarot-reading-note">今晚的页面会保留在你的活动 session 里；会后 Vibetail 会把回忆和后续活动发到你的邮箱。</p>
  </section>;
}
