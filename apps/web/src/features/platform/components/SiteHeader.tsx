export function SiteHeader() {
  return (
    <header className="vt-header">
      <a className="vt-wordmark" href="/" aria-label="Vibetail home">Vibe<span>tail</span></a>
      <nav aria-label="Main navigation">
        <a href="/match">Match</a>
        <a href="/restaurants">Explore bars</a>
        <a href="/manage">Bar management</a>
      </nav>
    </header>
  );
}
