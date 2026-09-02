import { useEffect, useMemo, useState } from "react";
import Draw from "../draw/art.js";
import { dayKey, deleteDrinkLogEntry, entryDayKey, listDrinkLogEntries, type DrinkLogEntry } from "./drink-log.js";
import { ChevronIcon, StarIcon } from "./icons.js";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_FORMAT = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" });
const TIME_FORMAT = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" });

/** Calendar: every logged drink, kept on-device, one month at a time. */
export function CalendarTab({ logVersion, onRecord }: { logVersion: number; onRecord(): void }) {
  const [entries, setEntries] = useState<DrinkLogEntry[]>();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => dayKey(new Date()));

  useEffect(() => {
    let cancelled = false;
    listDrinkLogEntries().then((loaded) => { if (!cancelled) setEntries(loaded); }).catch(() => setEntries([]));
    return () => { cancelled = true; };
  }, [logVersion]);

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
  const empty = entries !== undefined && entries.length === 0;

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
            await deleteDrinkLogEntry(entry.id);
            setEntries((current) => current?.filter((candidate) => candidate.id !== entry.id));
          }}
        />)}
      </section>}
  </div>;
}

function LogCard({ entry, onDelete }: { entry: DrinkLogEntry; onDelete(): Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  const photoUrl = useMemo(() => (entry.photo ? URL.createObjectURL(entry.photo) : null), [entry.photo]);
  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl); }, [photoUrl]);

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
        <button className="ma-log-delete" type="button" onClick={() => void onDelete()}>Delete</button>
        <button className="ma-log-keep" type="button" onClick={() => setConfirming(false)}>Keep</button>
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
