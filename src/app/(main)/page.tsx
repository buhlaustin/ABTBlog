import Image from "next/image";
import Link from "next/link";
import { BookCallButton } from "@/components/book-call-button";
import { JsonLd } from "@/components/json-ld";
import { profile, siteConfig } from "@/lib/profile";
import { pageMetadata, personJsonLd } from "@/lib/seo";
import { offerPriceKind, serviceOffers, servicesContact } from "@/lib/services";
import { Reveal } from "@/components/reveal";

export const metadata = pageMetadata({
  title:
    "Austin Buhl · LTI 1.3, OneRoster and WebRTC engineer for edtech teams",
  description:
    "Edtech integrations and senior product engineering: LTI 1.3, OneRoster, WebRTC, web, and Android. Fixed sprints and retainers. Knoxville, remote US.",
  path: "/",
  absoluteTitle: true,
});

const whereIHelp = [
  {
    title: "LTI 1.3 and LTI Advantage",
    body: "Launches, deep linking, names and roles, grade passback. Tested against the LMSs your districts actually run.",
  },
  {
    title: "Rostering",
    body: "OneRoster and Clever/ClassLink sync that handles late rosters, term changes, and students who exist in one system but not the other.",
  },
  {
    title: "Live classroom video",
    body: "WebRTC tuned for filtered networks and low bandwidth, with attendance you can defend in an audit.",
  },
] as const;

export default function HomePage() {
  const { hero } = profile;

  return (
    <>
      <JsonLd data={personJsonLd()} />
      <main className="flex-1">
        <section className="relative border-b border-border">
          <div
            className="hero-mesh pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(250,250,250,0)_0%,rgb(255_255_255)_85%),radial-gradient(ellipse_90%_60%_at_50%_-20%,rgba(37,99,235,0.12),transparent)]"
            aria-hidden
          />
          <div className="relative mx-auto grid max-w-5xl gap-8 px-safe py-10 sm:gap-10 sm:py-12 md:py-20 lg:grid-cols-[1fr_minmax(0,17rem)] lg:items-start lg:gap-14">
            <div className="min-w-0">
              <Reveal when="mount">
                <p className="font-mono text-sm text-muted sm:text-base">
                  {hero.tagline}
                </p>
              </Reveal>
              <Reveal when="mount" delayMs={60}>
                <h1 className="font-display mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                  {hero.headline}
                </h1>
              </Reveal>
              <Reveal when="mount" delayMs={120}>
                <p className="mt-6 max-w-2xl text-lg leading-relaxed text-foreground">
                  {hero.lead}
                </p>
              </Reveal>
              <Reveal when="mount" delayMs={200}>
                <div className="cta-mobile-stack mt-8">
                  <BookCallButton />
                  <Link
                    href="/services/#offers"
                    className="btn-press inline-flex min-h-11 w-full items-center justify-center rounded-full border border-border bg-white px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface active:bg-surface-raised sm:w-auto"
                  >
                    See the offers
                  </Link>
                </div>
              </Reveal>
            </div>

            <aside className="hidden flex-col gap-3 lg:flex lg:pt-2">
              <Reveal
                when="mount"
                delayMs={180}
                className="lift-card flex items-center gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm"
              >
                <Image
                  src={profile.avatarUrl}
                  alt=""
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-xl border border-border object-cover"
                />
                <div className="min-w-0 text-sm leading-snug">
                  <p className="font-semibold text-foreground">
                    {siteConfig.name}
                  </p>
                  <p className="text-muted">{profile.hero.tagline}</p>
                </div>
              </Reveal>
              <Reveal when="mount" delayMs={240}>
                <Link
                  href="/case-studies/classquip/"
                  className="lift-card flex min-h-11 items-center rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground transition hover:border-zinc-300 hover:bg-surface-raised active:bg-surface-raised"
                >
                  ClassQuip case study →
                </Link>
              </Reveal>
              <Reveal when="mount" delayMs={300}>
                <a
                  href={profile.linkedIn}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lift-card flex min-h-11 items-center rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground transition hover:border-zinc-300 hover:bg-surface-raised active:bg-surface-raised"
                >
                  LinkedIn ↗
                </a>
              </Reveal>
            </aside>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-safe pb-20 pt-12 sm:pb-24 sm:pt-16">
          <section className="mb-16">
            <Reveal>
              <h2 className="font-display text-sm font-bold uppercase tracking-[0.15em] text-muted">
                Where I help
              </h2>
            </Reveal>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {whereIHelp.map((pillar, index) => (
                <Reveal key={pillar.title} delayMs={index * 70}>
                  <article className="lift-card h-full rounded-2xl border border-border bg-surface p-6">
                    <h3 className="font-display text-lg font-bold tracking-tight text-foreground">
                      {pillar.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      {pillar.body}
                    </p>
                  </article>
                </Reveal>
              ))}
            </div>
          </section>

          <section id="offers" className="mb-16">
            <Reveal className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="font-display text-2xl font-bold tracking-tight">
                Offers
              </h2>
              <BookCallButton variant="secondary" />
            </Reveal>
            <div className="grid gap-4 md:grid-cols-3">
              {serviceOffers.map((offer, index) => (
                <Reveal key={offer.slug} delayMs={index * 60}>
                  <article className="lift-card flex h-full flex-col rounded-2xl border border-border bg-white p-5 shadow-sm">
                    <h3 className="font-display text-base font-bold text-foreground">
                      {offer.name}
                    </h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                      {offer.oneLiner}
                    </p>
                    <p className="mt-3 font-mono text-xs text-muted">
                      {offer.timeframe}
                    </p>
                    <p className="mt-1 font-mono text-xs text-muted">
                      {offerPriceKind(offer.slug)}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-foreground">
                      {offer.price}
                    </p>
                    <Link
                      href={`/services/${offer.slug}/`}
                      className="mt-4 text-sm font-semibold text-accent hover:text-blue-700"
                    >
                      Details →
                    </Link>
                  </article>
                </Reveal>
              ))}
            </div>
          </section>

          <section className="mb-12 border-t border-border pt-10">
            <Reveal className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
              <div>
                <h2 className="font-display text-lg font-bold tracking-tight">
                  Lab
                </h2>
                <p className="mt-1 max-w-xl text-sm text-muted">
                  Personal browser projects and games I host here—not typical
                  client work unless you specifically want a prototype.
                </p>
              </div>
              <Link
                href="/work/"
                className="inline-flex min-h-11 items-center text-sm font-semibold text-accent hover:text-blue-700"
              >
                Browse the lab →
              </Link>
            </Reveal>
          </section>

          <Reveal>
            <section className="lift-card rounded-2xl border border-border bg-surface-raised px-6 py-8 text-center sm:px-10 sm:py-10">
              <h2 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Have a district deal waiting on an integration?
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted">
                Send me the details or grab 20 minutes.
              </p>
              <div className="cta-mobile-stack mx-auto mt-6 max-w-sm justify-center sm:max-w-none">
                <BookCallButton />
                <a
                  href={`mailto:${servicesContact.email}`}
                  className="btn-press inline-flex min-h-11 w-full items-center justify-center rounded-full border border-border bg-white px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface sm:w-auto"
                >
                  Email {servicesContact.email}
                </a>
              </div>
            </section>
          </Reveal>
        </div>
      </main>
    </>
  );
}