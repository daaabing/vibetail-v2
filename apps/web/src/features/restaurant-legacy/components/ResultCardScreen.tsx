import type { LegacyResultViewModel } from "../adapters/legacy-result.js";

interface ResultCardScreenProps {
  locale: "en" | "zh";
  result: LegacyResultViewModel;
  onAgain(): void;
  onEdit(): void;
}

export function ResultCardScreen({ locale, result, onAgain, onEdit }: ResultCardScreenProps) {
  return (
    <section className="result-screen" data-testid="result-card">
      <p className="eyebrow">{locale === "zh" ? "今晚为你挑选" : "Your match for tonight"}</p>
      <div className="result-illustration" aria-hidden="true">
        <div className="glass"><span /></div>
      </div>
      <div className="result-heading">
        <div>
          <p className="result-section">{result.section ?? (locale === "zh" ? "餐厅精选" : "House selection")}</p>
          <h2>{result.itemName}</h2>
        </div>
        {result.price && <strong>{result.price}</strong>}
      </div>
      {result.description && <p className="result-description">{result.description}</p>}
      <blockquote>{result.explanation}</blockquote>
      <dl className="detail-grid">
        {result.baseSpirit && <div><dt>{locale === "zh" ? "基酒" : "Base"}</dt><dd>{result.baseSpirit}</dd></div>}
        <div><dt>{locale === "zh" ? "风味" : "Flavors"}</dt><dd>{result.flavorTags.join(" · ")}</dd></div>
        <div><dt>{locale === "zh" ? "配料" : "Ingredients"}</dt><dd>{result.ingredients.join(", ")}</dd></div>
      </dl>
      <div className="button-row">
        <button className="primary-button" type="button" onClick={onAgain}>{locale === "zh" ? "再匹配一次" : "Match again"}</button>
        <button className="text-button" type="button" onClick={onEdit}>{locale === "zh" ? "修改偏好" : "Edit preferences"}</button>
      </div>
    </section>
  );
}
