import { useState, type FormEvent } from "react";
import { HttpVenueClient, VenueClientError } from "../../../clients/http-venue-client.js";
import { useLang } from "../../../lib/i18n.js";

const client = new HttpVenueClient();

export function FeedbackForm({ matchId }: { matchId: string }) {
  const { lang, t } = useLang();
  const zh = lang === "zh";
  const copy = {
    prompt: t("How was this pick?", "这杯感觉如何？"),
    commentPlaceholder: t("Anything the bar should know? (optional)", "有什么想告诉酒吧的吗？（可选）"),
    submit: t("Send feedback", "发送反馈"),
    sending: t("Sending…", "发送中…"),
    thanks: t("Thanks — your feedback reached the venue.", "感谢——你的反馈已传达给酒吧。"),
    duplicate: t("Feedback for this match was already recorded.", "这杯酒的反馈之前已记录。"),
    failed: t("We couldn't send that. Please try again.", "未能发送，请重试。"),
    star: (value: number) => zh ? `${value} 星` : `${value} star${value === 1 ? "" : "s"}`,
  };
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [phase, setPhase] = useState<"idle" | "busy" | "done">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (rating < 1) return;
    setPhase("busy");
    setMessage("");
    try {
      const trimmed = comment.trim();
      await client.submitFeedback(matchId, { rating, ...(trimmed ? { comment: trimmed } : {}) });
      setPhase("done");
      setMessage(copy.thanks);
    } catch (caught) {
      if (caught instanceof VenueClientError && caught.status === 409) {
        setPhase("done");
        setMessage(copy.duplicate);
        return;
      }
      setPhase("idle");
      setMessage(copy.failed);
    }
  }

  if (phase === "done") {
    return <p className="vt-notice vt-feedback-done" role="status">{message}</p>;
  }

  return (
    <form className="vt-feedback" onSubmit={(event) => void submit(event)} data-testid="feedback-form">
      <p className="vt-kicker">{copy.prompt}</p>
      <div className="vt-feedback-stars" role="radiogroup" aria-label={copy.prompt}>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={rating === value}
            aria-label={copy.star(value)}
            className={value <= rating ? "is-filled" : ""}
            onClick={() => setRating(value)}
          >
            {value <= rating ? "★" : "☆"}
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        maxLength={1000}
        placeholder={copy.commentPlaceholder}
        onChange={(event) => setComment(event.target.value)}
      />
      {message && <p className="vt-form-error" role="alert">{message}</p>}
      <button className="vt-secondary" type="submit" disabled={rating < 1 || phase === "busy"}>
        {phase === "busy" ? copy.sending : copy.submit}
      </button>
    </form>
  );
}
