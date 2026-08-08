import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/use-auth";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  head: () => {
    const URL = "https://vibetail.com/auth";
    return {
      meta: [
        { title: "Sign in — Vibetail" },
        {
          name: "description",
          content:
            "Sign in to Vibetail to save your AI-mixed cocktails to the cloud and revisit your vibe collection.",
        },
        { name: "robots", content: "noindex" },
        { property: "og:title", content: "Sign in — Vibetail" },
        {
          property: "og:description",
          content: "Sign in to Vibetail to save your AI-mixed cocktails to the cloud.",
        },
        { property: "og:url", content: URL },
      ],
      links: [{ rel: "canonical", href: URL }],
    };
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { lang } = useLang();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/gallery" });
  }, [user, loading, navigate]);
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
    back: "Back",
  };

  async function onGoogle() {
    setBusy(true);
    const r = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/gallery",
    });
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
          options: { emailRedirectTo: `${window.location.origin}/gallery` },
        });
        if (error) throw error;
        toast.success("Signed up. Check your email to verify.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/gallery" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auth error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="flex min-h-svh flex-col items-center justify-center p-5"
      style={{ background: "var(--paper)" }}
    >
      <div className="w-full" style={{ maxWidth: 380 }}>
        <button
          type="button"
          onClick={() => navigate({ to: "/" })}
          className="mono mb-6 flex items-center gap-2"
        >
          <span aria-hidden>←</span>
          {T.back}
        </button>

        <div className="card-paper relative overflow-hidden p-7">
          <div className="grain-layer" aria-hidden style={{ opacity: 0.3 }} />
          <div className="relative">
            <div className="mono-sm">Vibetail</div>
            <h1 className="display mt-2 text-[32px] leading-none">
              {mode === "signin" ? T.signIn : T.signUp}
            </h1>

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
        </div>
      </div>
    </div>
  );
}
