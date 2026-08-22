import { useState } from "react";
import { accountInitial, signOut, type AuthUser } from "../../auth/auth-session.js";
import { useAuthUser } from "../../auth/useAuthUser.js";

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
        <AccountControl />
      </div>
    </header>
  );
}

/** Signed out: one Log in link. Signed in: the guest's avatar and its menu. */
function AccountControl() {
  const auth = useAuthUser();
  // The slot holds the avatar's width while the session resolves, so the rest
  // of the header does not shift once it arrives.
  if (auth.status === "loading") return <span className="house-account-slot" aria-hidden />;
  if (auth.status === "guest") {
    const href = signInHref();
    // The sign-in page is its own invitation; a Log in link there would only
    // fold the current URL into its own `next`.
    return href ? <a className="house-account-link" href={href}>Log in</a> : <span className="house-account-slot" aria-hidden />;
  }
  return <AccountMenu user={auth.user} />;
}

function AccountMenu({ user }: { user: AuthUser }) {
  const [open, setOpen] = useState(false);
  const label = user.displayName || user.email || "Account";

  async function leave() {
    await signOut().catch(() => undefined);
    // A full load drops every cached session-bound view, not just this header.
    window.location.assign("/");
  }

  return (
    <div
      className="house-account"
      // Focus leaving the whole control closes it — no document-level listener,
      // and keyboard users get the same dismissal as a click elsewhere.
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
      onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}
    >
      <button
        className="house-avatar"
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account: ${label}`}
        onClick={() => setOpen((value) => !value)}
      >
        {user.avatarUrl
          ? <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" />
          : <span aria-hidden>{accountInitial(user)}</span>}
      </button>
      {open && (
        <div className="house-account-menu" role="menu">
          <p title={label}>{label}</p>
          {/* No venue link here: whether this account owns a bar takes a session
              call, and the nav already carries Management for the ones that do. */}
          <button role="menuitem" type="button" onClick={() => void leave()}>Sign out</button>
        </div>
      )}
    </div>
  );
}

/** Sign-in returns the guest to the page they left; empty when already there. */
function signInHref(): string {
  const { pathname, search } = window.location;
  if (pathname === "/signin") return "";
  return pathname === "/" ? "/signin" : `/signin?next=${encodeURIComponent(pathname + search)}`;
}

export function SiteFooter() {
  return <footer className="house-footer"><div className="house-shell house-footer-grid">
    <div><p className="house-wordmark">VIBETAL(E.)</p><h2>Every mood deserves<br />the perfect pour.</h2><a className="house-button house-button-light" href="/match">Match your vibe <span>→</span></a></div>
    <div><p className="house-eyebrow">Product</p><a href="/match">Match a drink</a><a href="/venues">Explore bars</a></div>
    <div><p className="house-eyebrow">Venues</p><a href="/for-bars">For bars</a><a href="/venue">Management</a></div>
    <div><p className="house-eyebrow">Contact</p><a href="mailto:hello@vibetail.com">hello@vibetail.com</a><a href="https://instagram.com/vibe.tail">@vibe.tail</a></div>
  </div><div className="house-shell house-footer-bottom"><span>© {new Date().getFullYear()} Vibetail</span><span>Real menus. Matched to real moods.</span></div></footer>;
}
