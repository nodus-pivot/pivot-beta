import Link from "next/link";
import { PivotMark } from "@/components/brand/pivot-mark";

const WALKTHROUGH = "mailto:wesley@noduswatches.com?subject=Pivot%20walkthrough";

/* Copy is verbatim from the original app's marketing view (index (5).html, #view-marketing). */

const PREVIEW_ROWS = [
  { model: "Contrail GMT", who: "Wesley K.", stage: "Received & diagnostics", tone: "accent" },
  { model: "Sector Deep", who: "Cullen C.", stage: "In repair", tone: "accent" },
  { model: "Avalon II Bronze", who: "Jake W.", stage: "Request part", tone: "amber" },
  { model: "Canyon", who: "Zach K.", stage: "Return home", tone: "accent" },
] as const;

const BENEFITS = [
  {
    title: "Cuts administrative hours by 50%+",
    body: (
      <>
        Automated updates handle the &ldquo;is my watch done yet&rdquo; traffic <em>before</em> it hits your inbox, in copy you write once.
      </>
    ),
  },
  {
    title: "A record for every repair",
    body: "Every stage, every note, every shipping label — logged automatically, so nothing depends on someone’s memory.",
  },
  {
    title: "A customer experience with your name on it",
    body: "Emails, tone, and timing are yours to set. Customers deal with your brand, not a generic ticketing tool.",
  },
];

const TODAY = [
  "Someone manually tracks intake and coordinates repairs over WhatsApp",
  "Shipping labels created and sent one at a time, by hand",
  "Your team personally messages customers with every status update",
  "Intake, shipping, and communication are three separate manual jobs",
  "Progress depends on someone remembering to follow up",
];
const WITH_PIVOT = [
  "Intake, coordination, shipping, and updates — one system, automatically",
  "Labels generate themselves the moment a repair’s ready to ship",
  "Customers get updated without anyone writing an email",
  "Every repair’s status lives in one place for everyone to see",
  "Nothing depends on any one person remembering anything",
];

const INCLUDED = [
  { tag: "Brand", title: "Stays on your site, start to finish", body: "The service request form lives on your own website, in your own look — customers never know it’s Pivot underneath. Every submission feeds straight into your queue as a ticket." },
  { tag: "Mail", title: "Automated email updates, written by you", body: "Customers get notified at every stage — received, in repair, shipped — with wording you fully control, not a canned template." },
  { tag: "Stack", title: "Connected to the tools you already run on", body: "Shipping software, your brand’s website, Gmail, Google Sheets, Slack, Monday.com — and wherever else your company works. Pivot fits into your stack instead of asking you to leave it." },
  { tag: "Global", title: "One shared view, wherever your brand does business", body: "Brand HQ, the repair team, and the customer are always looking at the same status — no reconciling timezones, inboxes, or spreadsheets between offices." },
  { tag: "Triage", title: "AI triage before a watch ever ships", soon: true, body: "We’re building the world’s largest knowledge base for the watch industry — the foundation for AI that reviews what a customer describes, flags what’s likely wrong, and walks them through simple at-home checks before a watch ever ships in." },
];

const eyebrow = "text-[11.5px] font-medium uppercase tracking-[0.06em] text-accent-text";
const btn = "inline-flex h-10 items-center justify-center rounded-lg border border-accent px-4 text-[14.5px] text-accent-text transition-colors hover:bg-accent-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-canvas text-text">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1080px] items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5 text-[19px] font-medium" aria-label="Pivot">
            <PivotMark size={26} />
            Pivot
          </Link>
          <nav className="flex items-center gap-7 text-[14px] text-text-2">
            <Link href="/status" className="hover:text-text">Check a repair</Link>
            <Link href="/sign-in" className="rounded-lg border border-border-strong px-3.5 py-1.5 text-text-2 hover:border-accent-text hover:text-accent-text">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-[1080px] gap-12 px-6 pb-18 pt-19 md:grid-cols-[1.05fr_0.95fr] md:items-center">
          <div>
            <p className={eyebrow}>Watch repair, digitized</p>
            <h1 className="mt-3 text-[40px] leading-[1.08] md:text-[50px]">One ledger for every watch that comes back to you.</h1>
            <p className="mt-5 max-w-[58ch] text-[17px] leading-relaxed text-text-2">
              Pivot tracks a repair from the moment a customer submits an inquiry to the moment it lands on the bench, through to the day
              it ships home — so nothing gets lost, nobody has to ask &ldquo;where&rsquo;s this one at,&rdquo; and your customer service team gets
              their week back.
            </p>
            <a href={WALKTHROUGH} className={`${btn} mt-8`}>Get a walkthrough</a>
          </div>

          <div className="rounded-[14px] border border-border bg-surface p-5 shadow-[0_0_0_1px_var(--pivot-border-strong),0_16px_40px_rgba(0,0,0,.55)]">
            <div className="mb-4 flex items-baseline justify-between">
              <span className="text-[13px] font-medium">Dashboard</span>
              <span className="text-[12.5px] text-text-3">6 open tickets</span>
            </div>
            <ul className="divide-y divide-border">
              {PREVIEW_ROWS.map((r) => (
                <li key={r.model} className="flex items-center gap-3 py-3">
                  <span
                    className={`h-[9px] w-[9px] flex-none rounded-full ${r.tone === "amber" ? "bg-amber" : "bg-accent"}`}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium">{r.model}</span>
                    <span className="block text-[12.5px] text-text-3">{r.who}</span>
                  </span>
                  <span className={`text-[13px] ${r.tone === "amber" ? "text-amber" : "text-text-2"}`}>{r.stage}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Benefits */}
        <section className="border-t border-border/60">
          <div className="mx-auto grid w-full max-w-[1080px] gap-10 px-6 py-18 md:grid-cols-3">
            {BENEFITS.map((b) => (
              <div key={b.title}>
                <h2 className="text-[17px]">{b.title}</h2>
                <p className="mt-2 text-[14.5px] leading-relaxed text-text-2">{b.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* The real shift */}
        <section className="border-t border-border/60">
          <div className="mx-auto w-full max-w-[1080px] px-6 py-22">
            <p className={eyebrow}>The real shift</p>
            <h2 className="mt-3 max-w-[22ch] text-[32px] leading-[1.15]">One platform instead of a person running relay.</h2>
            <p className="mt-4 max-w-[60ch] text-[16px] text-text-2">
              Intake, coordination, shipping, and customer communication aren&rsquo;t four separate jobs anymore — they&rsquo;re one system,
              and it runs itself.
            </p>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              <Column title="Today, without Pivot" items={TODAY} tone="muted" />
              <Column title="With Pivot" items={WITH_PIVOT} tone="accent" />
            </div>
          </div>
        </section>

        {/* What's included */}
        <section className="border-t border-border/60">
          <div className="mx-auto w-full max-w-[1080px] px-6 py-22">
            <p className={eyebrow}>What&rsquo;s included</p>
            <h2 className="mt-3 text-[32px] leading-[1.15]">Everything a repair touches, under one roof.</h2>
            <p className="mt-4 max-w-[60ch] text-[16px] text-text-2">
              No add-ons to configure, no separate tools to reconcile at the end of the month. One flat rate, one place it all lives.
            </p>
            <ul className="mt-10 grid gap-x-10 gap-y-9 md:grid-cols-2">
              {INCLUDED.map((f) => (
                <li key={f.tag} className="grid grid-cols-[64px_1fr] gap-4">
                  <span className="pt-1 font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">{f.tag}</span>
                  <div>
                    <h3 className="text-[16px]">
                      {f.title}
                      {f.soon ? (
                        <span className="ml-2 rounded-md border border-amber-border bg-amber-bg px-1.5 py-0.5 align-middle text-[11px] font-medium text-amber">
                          Coming soon
                        </span>
                      ) : null}
                    </h3>
                    <p className="mt-1.5 text-[14.5px] leading-relaxed text-text-2">{f.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Pricing */}
        <section className="border-t border-border/60">
          <div className="mx-auto grid w-full max-w-[1080px] gap-8 px-6 py-22 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className={eyebrow}>Pricing</p>
              <h2 className="mt-3 text-[32px] leading-[1.15]">
                Free <span className="text-text-3">to use</span>
              </h2>
              <p className="mt-4 max-w-[52ch] text-[16px] text-text-2">
                Pivot is currently free while we&rsquo;re rolling it out. Pricing will be announced before that changes.
              </p>
            </div>
            <a href={WALKTHROUGH} className={btn}>Get a walkthrough</a>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-3 px-6 py-10 text-[13px] text-text-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-text-2">
            <PivotMark size={18} />
            Pivot
            <span className="text-text-3">· Repair &amp; warranty ticketing, built for watch brands. Reach out for a walkthrough.</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="https://noduswatches.com" className="hover:text-text">Nodus Watches</a>
            <Link href="/privacy" className="hover:text-text">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Column({ title, items, tone }: { title: string; items: readonly string[]; tone: "muted" | "accent" }) {
  const accent = tone === "accent";
  return (
    <div className={`rounded-[14px] border p-6 ${accent ? "border-accent-800 bg-accent-900/40" : "border-border bg-surface"}`}>
      <h3 className={`text-[13px] font-medium uppercase tracking-[0.06em] ${accent ? "text-accent-text" : "text-text-3"}`}>{title}</h3>
      <ul className="mt-4 flex flex-col gap-3">
        {items.map((it) => (
          <li key={it} className="flex gap-3 text-[14.5px] leading-relaxed text-text-2">
            <span className={`mt-[9px] h-[6px] w-[6px] flex-none rounded-full ${accent ? "bg-accent" : "bg-border-strong"}`} aria-hidden />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
