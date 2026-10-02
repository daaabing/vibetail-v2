import { useEffect, useRef, useState, type FormEvent } from "react";
import { signInWithEmail, signUpWithEmail } from "../../auth/auth-session.js";
import { useLang } from "../../../lib/i18n.js";

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
  const { t } = useLang();
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
    if (!email.trim() || !password) { setNotice(t("Enter your email and password.", "请输入邮箱和密码。")); return; }
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
      setNotice(t("Almost there — confirm the link we just emailed you, then sign in.", "即将完成——请确认我们刚发给你的邮件链接，然后登录。"));
      setMode("sign_in");
    } catch (caught) {
      setNotice((caught as Error).message || t("That didn’t work — please try again.", "操作失败，请重试。"));
    } finally {
      setBusy(false);
    }
  }

  return <div className="signin-overlay" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
    <div className="signin-dialog" role="dialog" aria-modal="true" aria-labelledby="signin-title" data-testid="signin-dialog">
      <p className="vt-kicker">{t("Your Vibe Bar", "你的 Vibe Bar")}</p>
      <h2 id="signin-title">{title}</h2>
      <p>{description}</p>

      {view === "choice" && <div className="vt-actions signin-choices">
        <button ref={firstControl} className="btn btn-solid" type="button" onClick={onGoogle}>{t("Continue with Google →", "使用 Google 继续 →")}</button>
        <button className="btn btn-outline" data-testid="continue-email" type="button" onClick={() => setView("email")}>{t("Continue with email", "使用邮箱继续")}</button>
        <button className="mono-sm underline underline-offset-4" type="button" onClick={onCancel}>{t("Not now", "暂不")}</button>
      </div>}

      {view === "email" && <form className="signin-email" onSubmit={(event) => void submitEmail(event)}>
        <label htmlFor="signin-email">{t("Email", "邮箱")}</label>
        <input ref={emailInput} id="signin-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <label htmlFor="signin-password">{t("Password", "密码")}</label>
        <input id="signin-password" type="password" autoComplete={mode === "sign_in" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} />
        {notice && <p className="vt-form-error" role="alert">{notice}</p>}
        <div className="vt-actions">
          <button className="btn btn-solid" data-testid="email-submit" disabled={busy} type="submit">
            {busy ? t("One moment…", "请稍候…") : mode === "sign_in" ? t("Sign in →", "登录 →") : t("Create account →", "创建账号 →")}
          </button>
          <button className="mono-sm underline underline-offset-4" type="button" onClick={() => { setMode(mode === "sign_in" ? "sign_up" : "sign_in"); setNotice(""); }}>
            {mode === "sign_in" ? t("New here? Create an account", "新用户？创建账号") : t("Have an account? Sign in", "已有账号？直接登录")}
          </button>
        </div>
        <button className="mono-sm signin-back" type="button" onClick={() => { setView("choice"); setNotice(""); }}>{t("← All sign-in options", "← 所有登录方式")}</button>
      </form>}
    </div>
  </div>;
}
