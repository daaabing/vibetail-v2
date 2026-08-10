export function LoadingOverlay({ locale }: { locale: "en" | "zh" }) {
  return (
    <div className="loading-overlay" role="status" aria-live="polite" data-testid="loading-state">
      <div className="loading-orbit" aria-hidden="true"><span /></div>
      <p>{locale === "zh" ? "正在翻阅今晚的菜单…" : "Reading tonight's menu…"}</p>
      <small>{locale === "zh" ? "只会从当前可点的项目中选择" : "Choosing only from currently available items"}</small>
    </div>
  );
}
