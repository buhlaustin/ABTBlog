import Image from "next/image";
import Link from "next/link";
import { getAllPosts, getPostBySlug } from "@/lib/blog";
import { getAllCaseStudies } from "@/lib/case-studies";
import { BookCallButton } from "@/components/book-call-button";
import { JsonLd } from "@/components/json-ld";
import { profile, siteConfig } from "@/lib/profile";
import { pageMetadata, personJsonLd } from "@/lib/seo";
import { serviceOffers, servicesContact } from "@/lib/services";
import { workItems } from "@/lib/work-registry";
import { Reveal } from "@/components/reveal";
import { WorkCard } from "@/components/work-card";

export const metadata = pageMetadata({
  title:
    "Austin Buhl · LTI 1.3, OneRoster and WebRTC engineer for edtech teams",
  description:
    "I help edtech companies pass district IT: LTI 1.3 launches, OneRoster and Clever/ClassLink rostering, and live video that holds up on school networks. Fixed-scope sprints and monthly retainers. Knoxville, TN, remote US.",
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

const proofPostSlugs = [
  "oneroster-lti-plain-english",
  "live-class-attendance-is-a-clock-problem",
] as const;

function PlayStartupSimBanner() {
  return (
    <Link
      href="/work/startup-sim/"
      className="group lift-card relative block overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 px-5 py-7 text-white shadow-lg transition hover:border-zinc-600 sm:px-8 sm:py-10"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 100% 0%, rgba(52, 211, 153, 0.35), transparent 55%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(37, 99, 235, 0.35), transparent 50%)",
        }}
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.25em] text-emerald-300/90">
            Playable in the browser
          </p>
          <h2 className="font-display mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Startup Simulator
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400 sm:text-base">
            Take a company from a garage to an IPO. Manage cap tables, survive AI
            news cycles, and fend off your board in Career or Sandbox mode.
          </p>
        </div>
        <span className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 transition group-hover:bg-emerald-50 sm:w-auto">
          Play now
          <span aria-hidden className="transition group-hover:translate-x-0.5">
            →
          </span>
        </span>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const featuredWork = workItems.filter((item) => item.featured);
  const otherFeatured = featuredWork.filter((item) => item.slug !== "startup-sim");
  const latestPost = getAllPosts()[0];
  const featuredCaseStudy = getAllCaseStudies().find((s) => s.featured);
  const proofPosts = proofPostSlugs
    .map((slug) => getPostBySlug(slug))
    .filter((post): post is NonNullable<typeof post> => Boolean(post));
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
            <div className="mobile-snap-row mt-6 md:grid md:grid-cols-3 md:gap-4">
              {whereIHelp.map((pillar, index) => (
                <Reveal
                  key={pillar.title}
                  delayMs={index * 70}
                  className="mobile-snap-card md:w-auto"
                >
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
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      From {offer.price}
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

          <section className="mb-16">
            <Reveal>
              <h2 className="font-display text-2xl font-bold tracking-tight">
                Proof
              </h2>
            </Reveal>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {featuredCaseStudy ? (
                <Reveal>
                  <article className="lift-card rounded-2xl border border-border bg-white p-6 shadow-sm lg:col-span-2">
                    <p className="font-mono text-xs uppercase tracking-wider text-muted">
                      Case study · {featuredCaseStudy.client}
                    </p>
                    <h3 className="font-display mt-2 text-xl font-bold tracking-tight">
                      <Link
                        href={`/case-studies/${featuredCaseStudy.slug}/`}
                        className="text-foreground hover:text-accent"
                      >
                        {featuredCaseStudy.title}
                      </Link>
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      {featuredCaseStudy.summary}
                    </p>
                    <Link
                      href={`/case-studies/${featuredCaseStudy.slug}/`}
                      className="mt-4 inline-flex text-sm font-semibold text-accent hover:text-blue-700"
                    >
                      Read case study →
                    </Link>
                  </article>
                </Reveal>
              ) : null}
              {proofPosts.map((post, index) => (
                <Reveal key={post.slug} delayMs={index * 50}>
                  <article className="lift-card rounded-2xl border border-border bg-surface p-5">
                    <p className="font-mono text-xs uppercase tracking-wider text-muted">
                      Writing
                    </p>
                    <h3 className="font-display mt-2 text-lg font-bold tracking-tight">
                      <Link
                        href={`/blog/${post.slug}/`}
                        className="text-foreground hover:text-accent"
                      >
                        {post.title}
                      </Link>
                    </h3>
                  </article>
                </Reveal>
              ))}
            </div>
          </section>

          <section className="mb-16">
            <Reveal>
              <h2 className="font-display text-2xl font-bold tracking-tight">
                Lab
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-muted">
                Things I build for fun. Browser sims and games you can play
                without installing anything.
              </p>
            </Reveal>
            <Reveal className="mt-8">
              <PlayStartupSimBanner />
            </Reveal>
            <Reveal className="mb-8 mt-12 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <h3 className="font-display text-lg font-bold tracking-tight">
                Selected work
              </h3>
              <Link
                href="/work/"
                className="inline-flex min-h-11 items-center text-sm font-semibold text-accent hover:text-blue-700"
              >
                View all →
              </Link>
            </Reveal>
            <div className="grid gap-6 sm:grid-cols-2">
              {otherFeatured.map((item, index) => (
                <Reveal key={item.slug} delayMs={index * 80}>
                  <WorkCard item={item} />
                </Reveal>
              ))}
            </div>
            {latestPost ? (
              <Reveal className="mt-10">
                <article className="lift-card rounded-2xl border border-border bg-white p-6 shadow-sm">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
                    Latest post
                  </p>
                  <h3 className="font-display mt-3 text-xl font-bold tracking-tight">
                    <Link
                      href={`/blog/${latestPost.slug}/`}
                      className="text-foreground hover:text-accent"
                    >
                      {latestPost.title}
                    </Link>
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {latestPost.description}
                  </p>
                </article>
              </Reveal>
            ) : null}
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