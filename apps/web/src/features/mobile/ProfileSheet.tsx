import { useEffect, useState } from "react";
import Draw from "../draw/art.js";
import { signOut } from "../auth/auth-session.js";
import { useAuthUser } from "../auth/useAuthUser.js";
import { listJournalEntries } from "./drink-log-store.js";
import type { DrinkLogEntry } from "./drink-log.js";
import { UserIcon } from "./icons.js";

/**
 * The profile is the journal talking back: totals over the record, plus the
 * account door — sign in to keep the journal on the account, sign out to go
 * back to this phone only.
 */
export function ProfileSheet({ logVersion }: { logVersion: number }) {
  const auth = useAuthUser();
  const [entries, setEntries] = useState<DrinkLogEntry[]>();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // On failure entries stays undefined: the stats show "—", not a false 0.
    listJournalEntries().then((loaded) => { if (!cancelled) setEntries(loaded); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [logVersion]);

  const now = new Date();
  const thisMonth = entries?.filter((entry) => {
    const created = new Date(entry.createdAt);
    return created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth();
  }).length ?? 0;
  const places = new Set(entries?.map((entry) => entry.venueName?.trim().toLowerCase()).filter(Boolean)).size;

  return <div className="ma-profile">
    <span className="ma-profile-badge"><UserIcon size={26} /></span>
    <h2 className="display">Your nights, on record</h2>

    <dl className="ma-stats">
      <div><dt>Drinks logged</dt><dd>{entries?.length ?? "—"}</dd></div>
      <div><dt>This month</dt><dd>{entries ? thisMonth : "—"}</dd></div>
      <div><dt>Places</dt><dd>{entries ? places : "—"}</dd></div>
    </dl>

    {auth.status === "signed_in" && <div className="ma-account">
      <p className="ma-account-line">{auth.user.email ?? auth.user.displayName}</p>
      <p className="ma-fineprint">Your journal is synced to this account.</p>
      <button
        className="ma-account-signout"
        disabled={signingOut}
        type="button"
        onClick={() => {
          setSigningOut(true);
          void signOut().finally(() => window.location.assign("/app"));
        }}
      >
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </div>}

    {auth.status === "guest" && <div className="ma-account">
      <a className="btn btn-solid" href={`/signin?next=${encodeURIComponent("/app")}`}>Sign in to sync</a>
      <p className="ma-fineprint">Right now the journal lives only on this phone. Sign in and it follows you across devices.</p>
    </div>}

    <div className="ma-profile-sign">
      <span className="ma-profile-art"><Draw name="feather" strokeWidth={2} /></span>
      <span className="signature">Vibetail</span>
    </div>
  </div>;
}
