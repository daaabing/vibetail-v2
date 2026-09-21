import { useCallback, useEffect, useMemo, useState } from "react";
import Draw from "../draw/art.js";
import { dayKey, entryDayKey, type DrinkLogEntry } from "./drink-log.js";
import {
  countLocalEntries,
  deleteJournalEntry,
  isCloudJournal,
  listJournalEntries,
  migrateLocalEntries,
} from "./drink-log-store.js";
import { ChevronIcon, StarIcon } from "./icons.js";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_FORMAT = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" });
const TIME_FORMAT = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" });

type MigrationState =
  | { status: "hidden" }
  | { status: "offer"; count: number }
  | { status: "uploading" }
  | { status: "done"; uploaded: number; failed: number };

/** Calendar: every logged drink — cloud journal when signed in — one month at a time. */
export function CalendarTab({ logVersion, onRecord }: { logVersion: number; onRecord(): void }) {
  const [entries, setEntries] = useState<DrinkLogEntry[]>();
  const [loadFailed, setLoadFailed] = useState(false);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => dayKey(new Date()));
  const [migration, setMigration] = useState<MigrationState>({ status: "hidden" });
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoadFailed(false);
    listJournalEntries()
      .then((loaded) => { if (!cancelled) { setEntries(loaded); setLoadFailed(false); } })
      // A failed cloud fetch is not an empty journal: keep whatever was on
      // screen and say so, instead of announcing "nothing on the record".
      .catch(() => { if (!cancelled) setLoadFailed(true); });
    void (async () => {
      if (!(await isCloudJournal())) return;
      const count = await countLocalEntries().catch(() => 0);
      if (cancelled || count === 0) return;
      // Never clobber an on-screen migration summary with a fresh offer —
      // a partial failure needs to stay readable until the user retries.
      setMigration((current) =>
        current.status === "hidden" || current.status === "offer" ? { status: "offer", count } : current);
    })();
    return () => { cancelled = true; };
  }, [logVersion, reloadTick]);

  const migrate = useCallback(async () => {
    setMigration({ status: "uploading" });
    const result = await migrateLocalEntries();
    setMigration({ status: "done", ...result });
    setReloadTick((tick) => tick + 1);
  }, []);

  const byDay = useMemo(() => {
    const map = new Map<string, DrinkLogEntry[]>();
    for (const entry of entries ?? []) {
      const key = entryDayKey(entry);
      map.set(key, [...(map.get(key) ?? []), entry]);
    }
    return map;
  }, [entries]);

  const weeks = useMemo(() => monthGrid(month), [month]);
  const selectedEntries = byDay.get(selectedDay) ?? [];
  const empty = entries !== undefined && entries.length === 0 && !loadFailed;

  return <div className="ma-page">
    <header className="ma-cal-head">
      <button aria-label="Previous month" className="ma-cal-nav" type="button" onClick={() => setMonth(addMonths(month, -1))}>
        <ChevronIcon direction="left" size={18} />
      </button>
      <h1>{MONTH_FORMAT.format(month)}</h1>
      <button aria-label="Next month" className="ma-cal-nav" type="button" onClick={() => setMonth(addMonths(month, 1))}>
        <ChevronIcon size={18} />
      </button>
    </header>

    {migration.status === "offer" && <div className="ma-sync-banner">
      <p>{migration.count} {migration.count === 1 ? "drink" : "drinks"} on this phone {migration.count === 1 ? "isn’t" : "aren’t"} in your account yet.</p>
      <button className="btn btn-solid" type="button" onClick={() => void migrate()}>Upload to account</button>
    </div>}
    {migration.status === "uploading" && <div className="ma-sync-banner"><p>Uploading your local drinks…</p></div>}
    {migration.status === "done" && <div className="ma-sync-banner" data-done>
      <p>{migration.uploaded} uploaded{migration.failed > 0 ? ` · ${migration.failed} kept on this phone` : " — all synced."}</p>
      {migration.failed > 0 && <button className="btn btn-solid" type="button" onClick={() => void migrate()}>Try again</button>}
    </div>}

    {loadFailed && <p className="ma-alert" role="alert">
      Couldn’t reach your journal just now. What you see may be out of date — check the connection and reopen this tab.
    </p>}

    <div className="ma-cal-grid" role="grid">
      {WEEKDAYS.map((day, index) => <span aria-hidden className="ma-cal-weekday" key={`${day}-${index}`}>{day}</span>)}
      {weeks.flat().map((date, index) => {
        if (!date) return <span aria-hidden key={`pad-${index}`} />;
        const key = dayKey(date);
        const logged = byDay.get(key)?.length ?? 0;
        return <button
          aria-label={`${key}, ${logged} ${logged === 1 ? "drink" : "drinks"}`}
          aria-pressed={key === selectedDay}
          className="ma-cal-day"
          data-today={key === dayKey(new Date()) || undefined}
          key={key}
          type="button"
          onClick={() => setSelectedDay(key)}
        >
          <span>{date.getDate()}</span>
          {logged > 0 && <span aria-hidden className="ma-cal-dots">{Array.from({ length: Math.min(logged, 3) }, (_, dot) => <i key={dot} />)}</span>}
        </button>;
      })}
    </div>

    {empty
      ? <div className="ma-empty">
        <span className="ma-empty-art"><Draw name="moon" strokeWidth={2} /></span>
        <p>Nothing on the record yet.</p>
        <button className="btn btn-solid" type="button" onClick={onRecord}>Record your first drink</button>
      </div>
      : <section className="ma-day-log">
        <h2 className="ma-kicker">{selectedDay === dayKey(new Date()) ? "Tonight" : selectedDay}</h2>
        {selectedEntries.length === 0 && <p className="ma-quiet">A quiet one — nothing logged this day.</p>}
        {selectedEntries.map((entry) => <LogCard
          entry={entry}
          key={entry.id}
          onDelete={async () => {
            await deleteJournalEntry(entry.id);
            setEntries((current) => current?.filter((candidate) => candidate.id !== entry.id));
          }}
        />)}
      </section>}
  </div>;
}

function LogCard({ entry, onDelete }: { entry: DrinkLogEntry; onDelete(): Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const photoUrl = useMemo(
    () => (entry.photo instanceof Blob ? URL.createObjectURL(entry.photo) : entry.photo),
    [entry.photo],
  );
  useEffect(() => () => {
    if (entry.photo instanceof Blob && photoUrl) URL.revokeObjectURL(photoUrl);
  }, [entry.photo, photoUrl]);

  return <article className="ma-log-card">
    {photoUrl
      ? <img alt={entry.drinkName} className="ma-log-photo" src={photoUrl} />
      : <span className="ma-log-sketch"><Draw name="glass" strokeWidth={2.2} /></span>}
    <div className="ma-log-body">
      <strong>{entry.drinkName}</strong>
      <small>
        {TIME_FORMAT.format(new Date(entry.createdAt))}
        {entry.venueName && <> · {entry.venueName}</>}
        {entry.source === "match" && <> · matched</>}
      </small>
      {entry.rating && <span aria-label={`${entry.rating} of 5 stars`} className="ma-log-stars">
        {Array.from({ length: 5 }, (_, index) => <StarIcon filled={index < (entry.rating ?? 0)} key={index} size={14} />)}
      </span>}
      {entry.note && <p>{entry.note}</p>}
    </div>
    {confirming
      ? <span className="ma-log-confirm">
        <button
          className="ma-log-delete"
          type="button"
          onClick={() => {
            setDeleteFailed(false);
            // A failed cloud delete keeps the card and says so, instead of
            // dying as an unhandled rejection.
            onDelete().catch(() => setDeleteFailed(true));
          }}
        >
          {deleteFailed ? "Retry delete" : "Delete"}
        </button>
        <button className="ma-log-keep" type="button" onClick={() => { setConfirming(false); setDeleteFailed(false); }}>Keep</button>
      </span>
      : <button aria-label={`Delete ${entry.drinkName}`} className="ma-log-x" type="button" onClick={() => setConfirming(true)}>×</button>}
  </article>;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

/** Sunday-first month grid; leading nulls pad the first week. */
function monthGrid(month: Date): (Date | null)[][] {
  const cells: (Date | null)[] = Array.from({ length: month.getDay() }, () => null);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  for (let day = 1; day <= days; day++) cells.push(new Date(month.getFullYear(), month.getMonth(), day));
  const weeks: (Date | null)[][] = [];
  for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7));
  return weeks;
}
