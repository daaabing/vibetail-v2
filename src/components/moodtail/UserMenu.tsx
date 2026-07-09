import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { useLang } from "@/lib/i18n";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function UserMenu() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const { user } = useAuth();
  const isZh = lang === "zh";

  if (!user) {
    return (
      <button
        onClick={() => navigate({ to: "/auth" })}
        className="text-[11px] font-semibold tracking-wider px-3 py-1 rounded-full transition-colors hover:bg-white/10"
        style={{
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(14px)",
          color: "var(--app-text-secondary)",
        }}
      >
        {isZh ? "登录" : "Sign in"}
      </button>

    );
  }

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const avatarUrl =
    (typeof meta.avatar_url === "string" && meta.avatar_url) ||
    (typeof meta.picture === "string" && meta.picture) ||
    "";
  const displayName =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    user.email?.split("@")[0] ||
    "User";
  const initial = displayName.trim().charAt(0).toUpperCase() || "U";

  async function handleSignOut() {
    await supabase.auth.signOut();
    toast.success(isZh ? "已退出" : "Signed out");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={isZh ? "用户菜单" : "User menu"}
          className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-offset-1 transition-transform active:scale-95"
          style={{
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          }}
        >
          <Avatar className="h-8 w-8 border border-[rgba(74,62,61,0.2)]">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} referrerPolicy="no-referrer" />}
            <AvatarFallback
              className="text-[11px] font-semibold"
              style={{ background: "var(--app-primary)", color: "white" }}
            >
              {initial}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-semibold leading-none truncate">{displayName}</p>
            {user.email && (
              <p className="text-[11px] leading-none text-muted-foreground truncate">{user.email}</p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate({ to: "/gallery" })}>
          {isZh ? "我的酒柜" : "My Bar"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-destructive focus:text-destructive"
        >
          {isZh ? "退出登录" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
