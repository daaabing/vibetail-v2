import { useEffect, useRef } from "react";

/** A small confirmation before the OAuth redirect — being thrown to Google
 *  mid-flow with no warning reads as a bug, not a feature. */
export function SignInDialog({ onConfirm, onCancel }: { onConfirm(): void; onCancel(): void }) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return <div className="signin-overlay" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
    <div className="signin-dialog" role="dialog" aria-modal="true" aria-labelledby="signin-title" data-testid="signin-dialog">
      <p className="vt-kicker">Your Vibe Bar</p>
      <h2 id="signin-title">Sign in to keep this drink</h2>
      <p>Your Vibe Bar follows your account, so tonight’s match is still there next time. You’ll be taken to Google to sign in, then brought right back.</p>
      <div className="vt-actions">
        <button ref={confirmRef} className="btn btn-solid" type="button" onClick={onConfirm}>Continue with Google →</button>
        <button className="mono-sm underline underline-offset-4" type="button" onClick={onCancel}>Not now</button>
      </div>
    </div>
  </div>;
}
