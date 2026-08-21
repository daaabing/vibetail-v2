import { useState } from "react";

export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <header className={`house-header${overlay ? " house-header-overlay" : ""}`}>
      <div className="house-header-inner">
        <a className="house-wordmark" href="/" aria-label="Vibetail home">VIBETAL(E.)</a>
        <button className={`house-menu-button${open ? " is-open" : ""}`} type="button" aria-expanded={open} aria-label="Menu" onClick={() => setOpen((value) => !value)}>
          <span /><span /><span />
        </button>
        <nav className={open ? "is-open" : ""} aria-label="Main navigation">
          <a href="/match">Match your vibe</a>
          <a href="/venues">Explore bars</a>
          <a href="/for-bars">For bars</a>
          <a href="/venue">Management</a>
        </nav>
        <a className="house-header-cta" href="/match">Meet your drink</a>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return <footer className="house-footer"><div className="house-shell house-footer-grid">
    <div><p className="house-wordmark">VIBETAL(E.)</p><h2>Every mood deserves<br />the perfect pour.</h2><a className="house-button house-button-light" href="/match">Match your vibe <span>→</span></a></div>
    <div><p className="house-eyebrow">Product</p><a href="/match">Match a drink</a><a href="/venues">Explore bars</a></div>
    <div><p className="house-eyebrow">Venues</p><a href="/for-bars">For bars</a><a href="/venue">Management</a></div>
    <div><p className="house-eyebrow">Contact</p><a href="mailto:hello@vibetail.com">hello@vibetail.com</a><a href="https://instagram.com/vibe.tail">@vibe.tail</a></div>
  </div><div className="house-shell house-footer-bottom"><span>© {new Date().getFullYear()} Vibetail</span><span>Real menus. Matched to real moods.</span></div></footer>;
}
