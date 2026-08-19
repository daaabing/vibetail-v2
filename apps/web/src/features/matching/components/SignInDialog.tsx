import { useEffect, useRef, useState, type FormEvent } from "react";
import { signInWithEmail, signUpWithEmail } from "../../auth/auth-session.js";

interface SignInDialogProps {
  title: string;
  description: string;
  /** Starts the OAuth redirect; the caller parks its intent first. */
  onGoogle(): void;
  /** Email auth completes in place — the caller resumes its action directly. */
  onSignedIn(): void;
  onCancel(): void;
}

/** A confirmation with both sign-in paths — being thrown to Google mid-flow
 *  with no warning reads as a bug, and email accounts exist too. */
export function SignInDialog({ title, description, onGoogle, onSignedIn, onCancel }: SignInDialogProps) {
  const [view, setView] = useState<"choice" | "email">("choice");
  const [mode, setMode] = useState<"sign_in" | "sign_up">("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const firstControl = useRef<HTMLButtonElement>(null);
  const emailInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (view === "choice" ? firstControl.current : emailInput.current)?.focus();
  }, [view]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  async function submitEmail(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || !password) { setNotice("Enter your email and password."); return; }
    setBusy(true);
    setNotice("");
    try {
      if (mode === "sign_in") {
        await signInWithEmail(email.trim(), password);
        onSignedIn();
        return;
      }
      const signedIn = await signUpWithEmail(email.trim(), password);
      if (signedIn) { onSignedIn(); return; }
      setNotice("Almost there — confirm the link we just emailed you, then sign in.");
      setMode("sign_in");
    } catch (caught) {
      setNotice((caught as Error).message || "That didn’t work — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="signin-overlay" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
    <div className="signin-dialog" role="dialog" aria-modal="true" aria-labelledby="signin-title" data-testid="signin-dialog">
      <p className="vt-kicker">Your Vibe Bar</p>
      <h2 id="signin-title">{title}</h2>
      <p>{description}</p>

      {view === "choice" && <div className="vt-actions signin-choices">
        <button ref={firstControl} className="btn btn-solid" type="button" onClick={onGoogle}>Continue with Google →</button>
        <button className="btn btn-outline" data-testid="continue-email" type="button" onClick={() => setView("email")}>Continue with email</button>
        <button className="mono-sm underline underline-offset-4" type="button" onClick={onCancel}>Not now</button>
      </div>}

      {view === "email" && <form className="signin-email" onSubmit={(event) => void submitEmail(event)}>
        <label htmlFor="signin-email">Email</label>
        <input ref={emailInput} id="signin-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <label htmlFor="signin-password">Password</label>
        <input id="signin-password" type="password" autoComplete={mode === "sign_in" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} />
        {notice && <p className="vt-form-error" role="alert">{notice}</p>}
        <div className="vt-actions">
          <button className="btn btn-solid" data-testid="email-submit" disabled={busy} type="submit">
            {busy ? "One moment…" : mode === "sign_in" ? "Sign in →" : "Create account →"}
          </button>
          <button className="mono-sm underline underline-offset-4" type="button" onClick={() => { setMode(mode === "sign_in" ? "sign_up" : "sign_in"); setNotice(""); }}>
            {mode === "sign_in" ? "New here? Create an account" : "Have an account? Sign in"}
          </button>
        </div>
        <button className="mono-sm signin-back" type="button" onClick={() => { setView("choice"); setNotice(""); }}>← All sign-in options</button>
      </form>}
    </div>
  </div>;
}
