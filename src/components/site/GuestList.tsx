import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/analytics";
import { useLang } from "@/lib/i18n";

const COPY = {
  en: {
    label: "Join the guest list",
    hint: "Invitations to pop-ups, new experiences and exclusive launches.",
    placeholder: "your@email.com",
    submit: "Join",
    submitting: "Joining…",
    done: "You're on the list",
    invalid: "Please enter a valid email",
    error: "Something went wrong. Try again.",
    already: "You're already on the list",
  },
};

/**
 * Newsletter capture. `variant` switches between the paper page style and the
 * inverted ink panel used inside the final call-to-action band.
 */
export default function GuestList({
  source,
  variant = "paper",
}: {
  source: string;
  variant?: "paper" | "ink";
}) {
  const { lang } = useLang();
  const copy = COPY["en"];
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const ink = variant === "ink";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      toast.error(copy.invalid);
      return;
    }
    setStatus("loading");
    const { error } = await supabase
      .from("newsletter_subscribers")
      .insert({ email: trimmed, source });
    if (error) {
      if (error.code === "23505") {
        toast.success(copy.already);
        setStatus("done");
        track("email_submitted", { already_subscribed: true });
        return;
      }
      console.error("newsletter subscribe failed", error);
      toast.error(copy.error);
      setStatus("idle");
      return;
    }
    toast.success(copy.done);
    setStatus("done");
    track("email_submitted", { source });
  };

  return (
    <div>
      <div className="mono-sm mb-2" style={{ color: ink ? "rgba(244,240,230,0.5)" : undefined }}>
        {copy.label}
      </div>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status !== "idle"}
          placeholder={copy.placeholder}
          className="field field-box min-w-0 flex-1 disabled:opacity-60"
          style={
            ink
              ? {
                  background: "transparent",
                  borderColor: "rgba(244,240,230,0.3)",
                  color: "var(--paper)",
                }
              : undefined
          }
        />
        <button
          type="submit"
          disabled={status !== "idle"}
          className={`btn ${ink ? "btn-outline" : "btn-solid"}`}
        >
          {status === "loading" ? copy.submitting : status === "done" ? copy.done : copy.submit}
        </button>
      </form>
      <p
        className="mt-2.5 text-xs"
        style={{ color: ink ? "rgba(244,240,230,0.5)" : "var(--ink-mute)" }}
      >
        {copy.hint}
      </p>
    </div>
  );
}
