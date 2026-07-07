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
        { name: "description", content: "Sign in to Vibetail to save your AI-mixed cocktails to the cloud and revisit your vibe collection." },
        { name: "robots", content: "noindex" },
        { property: "og:title", content: "Sign in — Vibetail" },
        { property: "og:description", content: "Sign in to Vibetail to save your AI-mixed cocktails to the cloud." },
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

  const isZh = lang === "zh";
  const T = {
    signIn: isZh ? "登录" : "Sign in",
    signUp: isZh ? "注册" : "Sign up",
    email: isZh ? "邮箱" : "Email",
    password: isZh ? "密码" : "Password",
    google: isZh ? "用 Google 继续" : "Continue with Google",
    or: isZh ? "或" : "or",
    needAcct: isZh ? "还没有账号？" : "No account yet?",
    haveAcct: isZh ? "已经有账号？" : "Already have one?",
    submit: isZh ? "继续" : "Continue",
    back: isZh ? "返回" : "Back",
  };

  async function onGoogle() {
    setBusy(true);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/gallery" });
    if (r.error) {
      toast.error(r.error.message || (isZh ? "Google 登录失败" : "Google sign in failed"));
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
        toast.success(isZh ? "注册成功，请查收验证邮件" : "Signed up. Check your email to verify.");
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
    <div className="min-h-svh flex flex-col items-center justify-center p-5 w-full md:max-w-md md:mx-auto">
      <motion.button
        whileTap={{ scale: 0.94 }}
        onClick={() => navigate({ to: "/" })}
        className="self-start mb-6 text-xs flex items-center gap-1.5"
        style={{ color: "var(--app-text-secondary)" }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M15.75 19.5L8.25 12l7.5-7.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {T.back}
      </motion.button>

      <div className="w-full glass-card rounded-2xl p-6 space-y-5">
        <h1 className="text-2xl font-semibold text-center" style={{ fontFamily: "var(--font-heading)", color: "var(--app-text)" }}>
          {mode === "signin" ? T.signIn : T.signUp}
        </h1>

        <button
          type="button"
          onClick={onGoogle}
          disabled={busy}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-md font-semibold text-sm transition-all disabled:opacity-50"
          style={{
            background: "white",
            border: "1.5px solid rgba(74,62,61,0.2)",
            color: "var(--app-text)",
          }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {T.google}
        </button>

        <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider" style={{ color: "var(--app-text-muted)" }}>
          <div className="flex-1 h-px" style={{ background: "rgba(74,62,61,0.15)" }} />
          {T.or}
          <div className="flex-1 h-px" style={{ background: "rgba(74,62,61,0.15)" }} />
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="email"
            required
            placeholder={T.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-md text-sm outline-none"
            style={{ border: "1.5px solid rgba(74,62,61,0.2)", background: "rgba(255,255,255,0.7)" }}
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder={T.password}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-md text-sm outline-none"
            style={{ border: "1.5px solid rgba(74,62,61,0.2)", background: "rgba(255,255,255,0.7)" }}
          />
          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-md text-sm font-semibold tracking-wider disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #C2410C 0%, #E0533C 100%)",
              color: "white",
              boxShadow: "2px 3px 12px rgba(194,65,12,0.25)",
            }}
          >
            {busy ? "…" : T.submit}
          </motion.button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="block w-full text-center text-xs underline"
          style={{ color: "var(--app-text-secondary)" }}
        >
          {mode === "signin" ? T.needAcct + " " + T.signUp : T.haveAcct + " " + T.signIn}
        </button>
      </div>
    </div>
  );
}
