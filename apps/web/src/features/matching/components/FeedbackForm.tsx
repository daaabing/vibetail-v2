import { useState, type FormEvent } from "react";
import type { Locale } from "@vibetail/contracts";
import { HttpVenueClient, VenueClientError } from "../../../clients/http-venue-client.js";

const client = new HttpVenueClient();

const COPY = {
  en: {
    prompt: "How was this pick?",
    commentPlaceholder: "Anything the bar should know? (optional)",
    submit: "Send feedback",
    sending: "Sending…",
    thanks: "Thanks — your feedback reached the venue.",
    duplicate: "Feedback for this match was already recorded.",
    failed: "We couldn't send that. Please try again.",
    star: (value: number) => `${value} star${value === 1 ? "" : "s"}`,
  },
  zh: {
    prompt: "这次推荐怎么样？",
    commentPlaceholder: "想告诉酒吧什么？（可选）",
    submit: "提交反馈",
    sending: "提交中……",
    thanks: "谢谢！你的反馈已送达商家。",
    duplicate: "这次匹配的反馈已经记录过了。",
    failed: "提交失败，请再试一次。",
    star: (value: number) => `${value} 星`,
  },
} as const;

export function FeedbackForm({ matchId, locale }: { matchId: string; locale: Locale }) {
  const copy = COPY[locale];
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
