import { useEffect, useState } from "react";
import Draw from "../draw/art.js";
import { listDrinkLogEntries, type DrinkLogEntry } from "./drink-log.js";
import { UserIcon } from "./icons.js";

/**
 * The profile is the log talking back: a few totals over the on-device
 * record. No account behind it — that's the whole point, stated plainly.
 */
export function ProfileSheet({ logVersion }: { logVersion: number }) {
  const [entries, setEntries] = useState<DrinkLogEntry[]>();

  useEffect(() => {
    let cancelled = false;
    listDrinkLogEntries().then((loaded) => { if (!cancelled) setEntries(loaded); }).catch(() => setEntries([]));
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

    <p className="ma-fineprint">Your calendar lives only on this phone — no account, no cloud, nothing shared. Deleting the app deletes the record.</p>

    <div className="ma-profile-sign">
      <span className="ma-profile-art"><Draw name="feather" strokeWidth={2} /></span>
      <span className="signature">Vibetail</span>
    </div>
  </div>;
}
