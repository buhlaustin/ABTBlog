import Image from "next/image";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog";
import { JsonLd } from "@/components/json-ld";
import { profile, siteConfig } from "@/lib/profile";
import { pageMetadata, personJsonLd } from "@/lib/seo";
import { workItems } from "@/lib/work-registry";
import { Reveal } from "@/components/reveal";
import { WorkCard } from "@/components/work-card";

export const metadata = pageMetadata({
  title: siteConfig.defaultTitle,
  description: `${siteConfig.description} Contract software development and consulting when capacity allows.`,
  path: "/",
  absoluteTitle: true,
});

const focusPillars = [
  {
    title: "Real-time edtech",
    body: "Low-latency classroom software, WebRTC media, and LMS integrations built for K–12 hardware in the wild.",
  },
  {
    title: "Simulations & games",
    body: "Personal browser prototypes—strategy games, tycoon sims, physics toys—hosted here so you can play without installing anything.",
  },
  {
    title: "Open source",
    body: "Developer tools and research code on GitHub, plus hosted demos collected here under Work.",
  },
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
  const { hero } = profile;

  return (
    <>
      <JsonLd data={personJsonLd()} />
      <main className="flex-1">
      {/* Hero */}
      <section className="relative border-b border-border">
        <div
          className="hero-mesh pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(250,250,250,0)_0%,rgb(255_255_255)_85%),radial-gradient(ellipse_90%_60%_at_50%_-20%,rgba(37,99,235,0.12),transparent)]"
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-5xl gap-8 px-safe py-10 sm:gap-10 sm:py-12 md:py-20 lg:grid-cols-[1fr_minmax(0,17rem)] lg:items-start lg:gap-14">
          <div className="min-w-0">
            <Reveal when="mount">
              <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                {siteConfig.name}
              </h1>
            </Reveal>
            <Reveal when="mount" delayMs={80}>
              <p className="mt-3 font-mono text-sm text-muted sm:text-base">
                {hero.tagline}
              </p>
            </Reveal>
            <Reveal when="mount" delayMs={140}>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-foreground">
                {hero.lead}
              </p>
            </Reveal>
            <Reveal when="mount" delayMs={200}>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
                {hero.support.before}
                <Link href="/services/" className="text-foreground hover:text-accent">
                  {hero.support.linkLabel}
                </Link>
                {hero.support.after}
              </p>
            </Reveal>
            <Reveal when="mount" delayMs={260}>
              <div className="cta-mobile-stack mt-8">
                <Link
                  href="/work/"
                  className="btn-press inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 active:bg-zinc-700 sm:w-auto"
                >
                  {hero.sideProjectsCta}
                  <span aria-hidden>↓</span>
                </Link>
                <Link
                  href="/services/"
                  className="btn-press inline-flex min-h-11 w-full items-center justify-center rounded-full border border-border bg-white px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface active:bg-surface-raised sm:w-auto"
                >
                  Services
                </Link>
                <a
                  href={siteConfig.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-press inline-flex min-h-11 w-full items-center justify-center rounded-full border border-border bg-white px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface active:bg-surface-raised sm:w-auto"
                >
                  GitHub
                </a>
              </div>
            </Reveal>
            <Reveal when="mount" delayMs={320} className="mt-5 lg:hidden">
              <div className="mobile-quick-row">
                <Link
                  href="/work/startup-sim/"
                  className="mobile-quick-chip lift-card rounded-full border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm"
                >
                  ▶ Startup Sim
                </Link>
                <Link
                  href="/work/"
                  className="mobile-quick-chip lift-card rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground"
                >
                  All demos
                </Link>
                <a
                  href={siteConfig.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mobile-quick-chip lift-card rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground"
                >
                  GitHub ↗
                </a>
              </div>
            </Reveal>
          </div>

          <aside className="hidden flex-col gap-3 lg:flex lg:pt-2">
            <Reveal when="mount" delayMs={180} className="lift-card flex items-center gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm">
              <Image
                src={profile.avatarUrl}
                alt=""
                width={48}
                height={48}
                className="h-12 w-12 rounded-xl border border-border object-cover"
              />
              <div className="min-w-0 text-sm leading-snug">
                <p className="font-semibold text-foreground">{siteConfig.name}</p>
                <p className="text-muted">{profile.hero.tagline}</p>
              </div>
            </Reveal>
            <Reveal when="mount" delayMs={240}>
              <Link
                href="/work/startup-sim/"
                className="lift-card flex min-h-11 items-center rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground transition hover:border-zinc-300 hover:bg-surface-raised active:bg-surface-raised"
              >
                Play Startup Simulator →
              </Link>
            </Reveal>
            <Reveal when="mount" delayMs={300}>
              <a
                href={siteConfig.github}
                target="_blank"
                rel="noopener noreferrer"
                className="lift-card flex min-h-11 items-center rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground transition hover:border-zinc-300 hover:bg-surface-raised active:bg-surface-raised"
              >
                GitHub @
                {siteConfig.githubUsername} ↗
              </a>
            </Reveal>
          </aside>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-safe pb-20 pt-12 sm:pb-24 sm:pt-16">
        <Reveal className="mb-16">
          <PlayStartupSimBanner />
        </Reveal>

        <section className="mb-16">
          <Reveal>
            <h2 className="font-display text-sm font-bold uppercase tracking-[0.15em] text-muted">
              Focus
            </h2>
          </Reveal>
          <div className="mobile-snap-row mt-6 md:grid md:grid-cols-3 md:gap-4">
            {focusPillars.map((pillar, index) => (
              <Reveal key={pillar.title} delayMs={index * 70} className="mobile-snap-card md:w-auto">
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

        <section className="mb-16">
          <Reveal className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight">
                Selected Work
              </h2>
              <p className="mt-1 text-sm text-muted">
                Interactive sims, political games, and scientific computing.
              </p>
            </div>
            <Link
              href="/work/"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-accent hover:text-blue-700 active:text-blue-800"
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
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          {latestPost ? (
            <Reveal>
            <article className="lift-card flex flex-col rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
                Latest post
              </p>
              <h2 className="font-display mt-3 text-xl font-bold tracking-tight sm:text-2xl">
                <Link
                  href={`/blog/${latestPost.slug}/`}
                  className="text-foreground hover:text-accent active:text-accent"
                >
                  {latestPost.title}
                </Link>
              </h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                {latestPost.description}
              </p>
              <Link
                href={`/blog/${latestPost.slug}/`}
                className="mt-6 text-sm font-semibold text-accent hover:text-blue-700"
              >
                Read post →
              </Link>
            </article>
            </Reveal>
          ) : null}

          <Reveal delayMs={80}>
          <article className="lift-card flex flex-col rounded-2xl border border-border bg-surface p-6 sm:p-8">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
              Services
            </p>
            <h2 className="font-display mt-3 text-2xl font-bold tracking-tight text-foreground">
              Contract development &amp; consulting
            </h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
              Freelance builds, architecture reviews, and prototypes. Knoxville
              or remote US.
            </p>
            <Link
              href="/services/"
              className="mt-6 text-sm font-semibold text-accent hover:text-blue-700"
            >
              Services →
            </Link>
          </article>
          </Reveal>
        </section>
      </div>
    </main>
    </>
  );
}
