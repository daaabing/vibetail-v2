import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useLang } from "@/lib/i18n";

export default function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang } = useLang();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // Auto-close once the user is signed in (covers email/password, Google OAuth redirect back, etc.)
  useEffect(() => {
    if (!open) return;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
        onClose();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [open, onClose]);

  const T = {
    signIn: "Sign in",
    signUp: "Sign up",
    email: "Email",
    password: "Password",
    google: "Continue with Google",
    or: "or",
    needAcct: "No account yet?",
    haveAcct: "Already have one?",
    submit: "Continue",
  };

  async function onGoogle() {
    setBusy(true);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.href });
    if (r.error) {
      toast.error(r.error.message || "Google sign in failed");
      setBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.href },
        });
        if (error) throw error;
        toast.success("Signed up. Check your email to verify.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // onClose handled by onAuthStateChange effect
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auth error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-5"
          style={{ background: "rgba(25,21,16,0.55)", backdropFilter: "blur(6px)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: "spring", damping: 24, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="paper-pocket pocket-card card-paper relative w-full max-w-sm overflow-hidden p-7"
          >
            <div className="grain-layer" aria-hidden style={{ opacity: 0.3 }} />

            <div className="relative">
              <button
                type="button"
                onClick={onClose}
                aria-label="close"
                className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center"
                style={{ color: "var(--ink-mute)" }}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  viewBox="0 0 24 24"
                >
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>

              <div className="eyebrow-gilt">Vibetail</div>
              <h2 className="display mt-2 text-[32px] leading-none">
                {mode === "signin" ? T.signIn : T.signUp}
              </h2>

              <button
                type="button"
                onClick={onGoogle}
                disabled={busy}
                className="btn btn-outline mt-6 w-full"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {T.google}
              </button>

              <div className="mono-sm my-5 flex items-center gap-3">
                <span className="h-px flex-1" style={{ background: "var(--line)" }} />
                {T.or}
                <span className="h-px flex-1" style={{ background: "var(--line)" }} />
              </div>

              <form onSubmit={onSubmit} className="space-y-2.5">
                <input
                  type="email"
                  required
                  placeholder={T.email}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field field-box"
                />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder={T.password}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field field-box"
                />
                <button type="submit" disabled={busy} className="btn btn-solid w-full">
                  {busy ? "…" : T.submit}
                </button>
              </form>

              <button
                type="button"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="mono-sm mt-5 block w-full text-center underline underline-offset-4"
              >
                {mode === "signin" ? T.needAcct + " " + T.signUp : T.haveAcct + " " + T.signIn}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
