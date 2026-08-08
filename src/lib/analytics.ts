// Lightweight PostHog analytics wrapper.
// Tracks the funnel for the NYC offline campaign, always attaching
// `campaign`, `qr`, and `session_id` to every event.
import posthog from "posthog-js";

const POSTHOG_KEY = "phc_BwygSXEM6gU3apvFzjkP7JCH9W3jomsosiUGF5KuR6xV";
const POSTHOG_HOST = "https://us.i.posthog.com";
const CAMPAIGN = "nyc_offline_campaign";

const QR_STORAGE_KEY = "vibetail_qr";
const SESSION_STORAGE_KEY = "vibetail_session_id";

const isBrowser = () => typeof window !== "undefined";

let initialized = false;

function readQrParam(): string | null {
  if (!isBrowser()) return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const qr = params.get("qr");
    if (qr) {
      window.localStorage.setItem(QR_STORAGE_KEY, qr);
      return qr;
    }
    return window.localStorage.getItem(QR_STORAGE_KEY);
  } catch {
    return null;
  }
}

function ensureSessionId(): string | null {
  if (!isBrowser()) return null;
  try {
    let sid = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!sid) {
      sid =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, sid);
    }
    return sid;
  } catch {
    return null;
  }
}

function detectDeviceType(): "mobile" | "tablet" | "desktop" {
  if (!isBrowser()) return "desktop";
  const ua = navigator.userAgent || "";
  if (
    /iPad|Tablet/i.test(ua) ||
    (window.innerWidth >= 600 && window.innerWidth <= 1024 && /Mobi/i.test(ua))
  ) {
    return "tablet";
  }
  if (/Mobi|Android|iPhone|iPod/i.test(ua) || window.innerWidth < 600) return "mobile";
  return "desktop";
}

export function initAnalytics() {
  if (initialized || !isBrowser()) return;

  // Skip analytics on dev/preview hosts so staging traffic doesn't pollute
  // the production funnel. Only vibetail.com (and www) count.
  const host = window.location.hostname;
  const isProd = host === "vibetail.com" || host === "www.vibetail.com";
  if (!isProd) {
    try {
      console.log("[analytics] skipped (non-prod host)", host);
    } catch {}
    initialized = true;
    return;
  }

  initialized = true;

  const qr = readQrParam();
  const sessionId = ensureSessionId();

  try {
    console.log("[analytics] init", {
      qr,
      session_id: sessionId,
      href: window.location.href,
      origin: window.location.origin,
    });
  } catch {}

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: true,
    capture_pageleave: true,
    person_profiles: "always",
    loaded: (ph) => {
      ph.register({
        campaign: CAMPAIGN,
        qr: qr ?? null,
        session_id: sessionId,
        device_type: detectDeviceType(),
      });
      // Always emit an explicit landing event so every entry point
      // (including QR-linked /drinks/:id pages that don't call track())
      // shows up in PostHog.
      try {
        ph.capture("app_loaded", {
          campaign: CAMPAIGN,
          qr: qr ?? null,
          session_id: sessionId,
          device_type: detectDeviceType(),
          path: window.location.pathname,
          href: window.location.href,
        });
        if (qr) {
          ph.capture("qr_scanned", {
            campaign: CAMPAIGN,
            qr,
            session_id: sessionId,
            device_type: detectDeviceType(),
            path: window.location.pathname,
          });
        }
      } catch {}
    },
  });
}

export function track(event: string, props: Record<string, unknown> = {}) {
  if (!isBrowser()) return;
  try {
    if (!initialized) initAnalytics();
    const payload = {
      campaign: CAMPAIGN,
      qr: readQrParam(),
      session_id: ensureSessionId(),
      device_type: detectDeviceType(),
      timestamp: new Date().toISOString(),
      ...props,
    };
    try {
      console.log("[analytics] track", event, payload);
    } catch {}
    posthog.capture(event, payload);
  } catch (e) {
    // analytics must never break the app
    console.warn("analytics track failed", e);
  }
}
