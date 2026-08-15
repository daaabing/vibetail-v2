import { useEffect, useState } from "react";
import type { VenueDashboardRange, VenueDashboardStats } from "@vibetail/contracts";
import { useSeo } from "../../platform/useSeo.js";
import { VenueAdminLoading, VenueShell, errorMessage, useVenueSession } from "../VenueShell.js";

const RANGES: Array<{ value: VenueDashboardRange; label: string }> = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];

export function VenueDashboardPage() {
  useSeo("Venue dashboard — Vibetail", "Vibetail usage, matches, and feedback for your venue.", true);
  const state = useVenueSession();
  const [range, setRange] = useState<VenueDashboardRange>("today");
  const [stats, setStats] = useState<VenueDashboardStats>();
  const [error, setError] = useState("");

  const client = state?.client;
  useEffect(() => {
    if (!client) return;
    let active = true;
    setStats(undefined);
    setError("");
    client.getDashboard(range)
      .then((loaded) => { if (active) setStats(loaded); })
      .catch((caught: unknown) => { if (active) setError(errorMessage(caught)); });
    return () => { active = false; };
  }, [client, range]);

  if (!state) return <VenueAdminLoading />;

  return (
    <VenueShell active="dashboard" state={state}>
      <section className="vt-manage-section">
        <div className="vt-section-heading">
          <div><p className="vt-kicker">Dashboard</p><h2>How Vibetail is working tonight</h2></div>
          <div className="vt-venue-ranges" role="group" aria-label="Date range">
            {RANGES.map((entry) => (
              <button
                key={entry.value}
                className={entry.value === range ? "vt-primary" : "vt-secondary"}
                onClick={() => setRange(entry.value)}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </div>
        {error && <div className="vt-alert" role="alert">{error}</div>}
        {!stats && !error && <p className="vt-loading">Crunching the numbers…</p>}
        {stats && (
          <>
            <div className="vt-venue-stats">
              <article className="vt-venue-stat"><p>Vibetail usage</p><strong>{stats.menuViews}</strong><small>menu opens</small></article>
              <article className="vt-venue-stat"><p>Total matches</p><strong>{stats.totalMatches}</strong><small>drinks recommended</small></article>
              <article className="vt-venue-stat"><p>Total feedback</p><strong>{stats.feedback.total}</strong><small>{stats.feedback.averageRating === null ? "no ratings yet" : `${stats.feedback.averageRating.toFixed(1)} ★ average`}</small></article>
            </div>
            <div className="vt-venue-panels">
              <article className="vt-venue-panel">
                <h3>Most matched drinks</h3>
                {stats.topDrinks.length === 0 && <p>No matches in this range yet. Share your QR code to get started.</p>}
                {stats.topDrinks.length > 0 && (
                  <ol>
                    {stats.topDrinks.map((drink) => (
                      <li key={drink.itemId}><span>{drink.name}</span><strong>{drink.matches}</strong></li>
                    ))}
                  </ol>
                )}
              </article>
              <article className="vt-venue-panel">
                <h3>Recent feedback</h3>
                {stats.recentFeedback.length === 0 && <p>No feedback in this range yet.</p>}
                {stats.recentFeedback.length > 0 && (
                  <ul>
                    {stats.recentFeedback.map((entry) => (
                      <li key={entry.id}>
                        <div className="vt-venue-feedback-head">
                          <span aria-label={`${entry.rating} out of 5 stars`}>{"★".repeat(entry.rating)}{"☆".repeat(5 - entry.rating)}</span>
                          <small>{entry.drinkName}</small>
                        </div>
                        {entry.comment && <p>{entry.comment}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </div>
          </>
        )}
      </section>
    </VenueShell>
  );
}
