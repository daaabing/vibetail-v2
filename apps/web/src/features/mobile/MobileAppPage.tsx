import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { VenueDirectoryEntry } from "@vibetail/contracts";
import { HttpVenueClient } from "../../clients/http-venue-client.js";
import { useSeo } from "../platform/useSeo.js";
import Draw from "../draw/art.js";
import { CalendarTab } from "./CalendarTab.js";
import { ExploreTab } from "./ExploreTab.js";
import { MatchSheet, type MatchScope } from "./MatchSheet.js";
import { ProfileSheet } from "./ProfileSheet.js";
import { RecordDrinkSheet } from "./RecordDrinkSheet.js";
import { VenueSheet } from "./VenueSheet.js";
import { CalendarIcon, MartiniIcon, PlusIcon, UserIcon } from "./icons.js";
import "./mobile.css";

const client = new HttpVenueClient();

type Tab = "explore" | "calendar";

type SheetState =
  | { kind: "plus" }
  | { kind: "record" }
  | { kind: "match"; scope: MatchScope }
  | { kind: "profile" }
  | { kind: "venue"; entry: VenueDirectoryEntry };

export type VenuesState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; entries: VenueDirectoryEntry[] };

/**
 * The mobile app shell: two tabs (Explore, Calendar), a raised + button
 * between them, and the profile in the top-right. Everything else opens as
 * a sheet on top so the guest never leaves the shell.
 */
export function MobileAppPage() {
  useSeo("Vibetail", "Explore bars near you, match your vibe, and keep a calendar of every drink.");
  const [tab, setTab] = useState<Tab>("explore");
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [venues, setVenues] = useState<VenuesState>({ status: "loading" });
  // Bumped whenever the log changes so the calendar and profile re-read it.
  const [logVersion, setLogVersion] = useState(0);

  useEffect(() => {
    client.listActiveVenues()
      .then((entries) => setVenues({ status: "ready", entries }))
      .catch(() => setVenues({ status: "error" }));
  }, []);

  const close = useCallback(() => setSheet(null), []);
  const venueNames = venues.status === "ready" ? venues.entries.map(({ venue }) => venue.name) : [];

  return <div className="ma-shell">
    <header className="ma-top">
      <span className="ma-wordmark signature">Vibetail</span>
      <button aria-label="Your profile" className="ma-avatar" type="button" onClick={() => setSheet({ kind: "profile" })}>
        <UserIcon size={20} />
      </button>
    </header>

    <main className="ma-main">
      {tab === "explore"
        ? <ExploreTab venues={venues} onOpenVenue={(entry) => setSheet({ kind: "venue", entry })} />
        : <CalendarTab logVersion={logVersion} onRecord={() => setSheet({ kind: "record" })} />}
    </main>

    <nav aria-label="Vibetail tabs" className="ma-tabbar">
      <button aria-current={tab === "explore"} className="ma-tab" type="button" onClick={() => setTab("explore")}>
        <MartiniIcon />
        <span>Explore</span>
      </button>
      <button aria-label="Start something" className="ma-plus" type="button" onClick={() => setSheet({ kind: "plus" })}>
        <PlusIcon size={26} />
      </button>
      <button aria-current={tab === "calendar"} className="ma-tab" type="button" onClick={() => setTab("calendar")}>
        <CalendarIcon />
        <span>Calendar</span>
      </button>
    </nav>

    <AnimatePresence>
      {sheet?.kind === "plus" && <BottomSheet key="plus" label="Start something" onClose={close}>
        <PlusMenu
          onMatch={() => setSheet({ kind: "match", scope: { kind: "global" } })}
          onRecord={() => setSheet({ kind: "record" })}
        />
      </BottomSheet>}

      {sheet?.kind === "record" && <BottomSheet key="record" label="Record a drink" onClose={close}>
        <RecordDrinkSheet
          venueNames={venueNames}
          onSaved={() => { setSheet(null); setTab("calendar"); setLogVersion((version) => version + 1); }}
        />
      </BottomSheet>}

      {sheet?.kind === "profile" && <BottomSheet key="profile" label="Your profile" onClose={close}>
        <ProfileSheet logVersion={logVersion} />
      </BottomSheet>}

      {sheet?.kind === "venue" && <BottomSheet key="venue" label={sheet.entry.venue.name} onClose={close}>
        <VenueSheet
          entry={sheet.entry}
          onMatch={(scope) => setSheet({ kind: "match", scope })}
        />
      </BottomSheet>}

      {sheet?.kind === "match" && <MatchSheet key="match" scope={sheet.scope} onClose={close} />}
    </AnimatePresence>
  </div>;
}

/** The + menu: the night starts here — match a vibe, or log what's in hand. */
function PlusMenu({ onMatch, onRecord }: { onMatch(): void; onRecord(): void }) {
  return <div className="ma-plus-menu">
    <button className="ma-plus-option" type="button" onClick={onMatch}>
      <span className="ma-plus-art"><Draw name="shaker" strokeWidth={2.4} /></span>
      <span>
        <strong>Let’s start a match</strong>
        <small>Tell us the mood. We pick the drink and the bar.</small>
      </span>
    </button>
    <button className="ma-plus-option" type="button" onClick={onRecord}>
      <span className="ma-plus-art"><Draw name="glass" strokeWidth={2.4} /></span>
      <span>
        <strong>Record a drink</strong>
        <small>Snap what you’re sipping and keep it on your calendar.</small>
      </span>
    </button>
  </div>;
}

export function BottomSheet({ children, label, onClose }: { children: React.ReactNode; label: string; onClose(): void }) {
  return <div aria-label={label} className="ma-sheet-layer" role="dialog">
    <motion.button
      animate={{ opacity: 1 }}
      aria-label="Close"
      className="ma-scrim"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      type="button"
      onClick={onClose}
    />
    <motion.section
      animate={{ y: 0 }}
      className="ma-sheet"
      exit={{ y: "104%" }}
      initial={{ y: "104%" }}
      transition={{ type: "spring", stiffness: 380, damping: 38 }}
    >
      <span aria-hidden className="ma-grip" />
      {children}
    </motion.section>
  </div>;
}
