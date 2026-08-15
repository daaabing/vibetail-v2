import { useEffect, useState } from "react";
import type { VenueQr } from "@vibetail/contracts";
import { useSeo } from "../../platform/useSeo.js";
import { VenueAdminLoading, VenueShell, errorMessage, useVenueSession } from "../VenueShell.js";

export function VenueQrPage() {
  useSeo("QR code — Vibetail", "Print the QR code that opens your live menu.", true);
  const state = useVenueSession();
  const [qr, setQr] = useState<VenueQr>();
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const client = state?.client;
  useEffect(() => {
    if (!client) return;
    let active = true;
    client.getQr()
      .then((loaded) => { if (active) setQr(loaded); })
      .catch((caught: unknown) => { if (active) setError(errorMessage(caught)); });
    return () => { active = false; };
  }, [client]);

  if (!state) return <VenueAdminLoading />;

  async function copyUrl() {
    if (!qr) return;
    await navigator.clipboard.writeText(qr.consumerUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2_000);
  }

  return (
    <VenueShell active="qr" state={state}>
      <section className="vt-manage-section">
        <div className="vt-section-heading">
          <div><p className="vt-kicker">QR code</p><h2>One code, always current</h2></div>
        </div>
        <p>
          Guests scan this code to open your live menu and get matched.
          The link always points at whichever menu is currently published, so a printed code never goes stale.
        </p>
        {error && <div className="vt-alert" role="alert">{error}</div>}
        {!qr && !error && <p className="vt-loading">Rendering your QR code…</p>}
        {qr && (
          <div className="vt-venue-qr">
            {/* Server-rendered same-origin SVG from the qrcode library. */}
            <div className="vt-venue-qr-frame" dangerouslySetInnerHTML={{ __html: qr.qrSvg }} />
            <p><a href={qr.consumerUrl}>{qr.consumerUrl}</a></p>
            <div className="vt-inline-actions">
              <button className="vt-primary" onClick={() => window.print()}>Print</button>
              <button className="vt-secondary" onClick={() => void copyUrl()}>{copied ? "Copied!" : "Copy link"}</button>
            </div>
          </div>
        )}
      </section>
    </VenueShell>
  );
}
