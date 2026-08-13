import { SiteFooter, SiteHeader } from "../components/SiteHeader.js";
import { useSeo } from "../useSeo.js";

export function ForBarsPage() {
  useSeo("Vibetail for bars", "Put your live menu behind the vibe and help every guest order with confidence.");
  return <div className="house-page house-for-bars">
    <SiteHeader overlay />
    <main>
      <section className="for-bars-hero">
        <div className="for-bars-shade" />
        <div className="house-shell for-bars-copy"><p className="house-eyebrow on-dark">For bars & restaurants</p><h1>Put your own menu<br />behind the <em>vibe.</em></h1><p>Guests describe their night. Vibetail recommends one drink that is actually active on your published menu—and explains why it fits.</p><a className="house-button house-button-light" href="/manage">Open bar management <span>→</span></a></div>
      </section>
      <section className="house-section house-paper"><div className="house-shell"><div className="house-section-head"><p className="house-eyebrow">The working loop</p><h2>Keep the recommendation<br /><em>honest, every night.</em></h2></div><div className="house-ledger">
        {[['01','Build the menu','Create menus and add the drinks guests can actually order.'],['02','Control availability','Active, sold out and hidden states update the candidate set.'],['03','Publish the experience','Each published menu gets its own guest-facing Vibetail link.'],['04','Preview before service','Open the exact flow your guests will see before sharing it.']].map(([no,title,body]) => <article key={no}><span>{no}</span><h3>{title}</h3><p>{body}</p></article>)}
      </div><div className="for-bars-action"><p>This page uses the real management service. Menu-photo recognition is not simulated.</p><a className="house-button" href="/manage">Manage a bar <span>→</span></a></div></div></section>
    </main><SiteFooter />
  </div>;
}
