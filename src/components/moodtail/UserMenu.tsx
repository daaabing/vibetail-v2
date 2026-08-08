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

export default function UserMenu({ onDark = false }: { onDark?: boolean } = {}) {
  const navigate = useNavigate();
  const { lang } = useLang();
  const { user } = useAuth();

  if (!user) {
    return (
      <button
        onClick={() => navigate({ to: "/auth" })}
        className="mono-sm px-3 py-1.5 transition-colors"
        style={{
          border: `1.5px solid ${onDark ? "rgba(242,237,225,0.5)" : "var(--line-strong)"}`,
          borderRadius: "10px 7px 11px 8px / 8px 10px 7px 10px",
          color: onDark ? "var(--paper)" : "var(--ink-soft)",
          fontFamily: "var(--font-note)",
          fontSize: 15,
          letterSpacing: 0,
          textTransform: "none",
        }}
      >
        {"Sign in"}
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
    toast.success("Signed out");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={"User menu"}
          className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-offset-1 transition-transform active:scale-95"
          style={{
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          }}
        >
          <Avatar
            className="h-8 w-8 rounded-none border"
            style={{ borderColor: "var(--line-strong)" }}
          >
            {avatarUrl && (
              <AvatarImage src={avatarUrl} alt={displayName} referrerPolicy="no-referrer" />
            )}
            <AvatarFallback
              className="text-[11px] font-semibold"
              style={{ background: "var(--ink)", color: "var(--paper)" }}
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
              <p className="text-[11px] leading-none text-muted-foreground truncate">
                {user.email}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate({ to: "/gallery" })}>{"My Bar"}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-destructive focus:text-destructive"
        >
          {"Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
