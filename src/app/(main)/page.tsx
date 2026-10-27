import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog";
import { SiteLogo } from "@/components/site-logo";
import { profile, siteConfig } from "@/lib/profile";
import { workItems } from "@/lib/work-registry";
import { WorkCard } from "@/components/work-card";

export const metadata: Metadata = {
  title: { absolute: siteConfig.title },
  description:
    "Builder and software engineer in Knoxville, TN—real-time edtech, browser games, simulations, and open source.",
};

const focusPillars = [
  {
    title: "Real-time edtech",
    body: "Low-latency classroom software, WebRTC media, and LMS integrations built for K–12 hardware in the wild.",
  },
  {
    title: "Simulations & games",
    body: "Interactive physics, social strategy, and browser prototypes—things you can run without installing anything.",
  },
  {
    title: "Open source",
    body: "Developer tools and research code on GitHub, plus hosted demos collected here under Work.",
  },
] as const;

function PlayHosBanner() {
  return (
    <Link
      href="/work/hos/"
      className="group relative block overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 px-6 py-8 text-white shadow-lg transition hover:border-zinc-600 sm:px-8 sm:py-10"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 100% 0%, rgba(37, 99, 235, 0.45), transparent 55%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(59, 130, 246, 0.2), transparent 50%)",
        }}
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.25em] text-blue-300/90">
            Playable in the browser
          </p>
          <h2 className="font-display mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            House of Strategy
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400 sm:text-base">
            Outwit ten AI houseguests—alliances, competitions, and evictions in a
            text-based social strategy game.
          </p>
        </div>
        <span className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 transition group-hover:bg-blue-50 sm:w-auto">
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
  const otherFeatured = featuredWork.filter((item) => item.slug !== "hos");
  const latestPost = getAllPosts()[0];
  const bioLead = profile.bioParagraphs[0];
  const bioSide = profile.bioParagraphs[3];

  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="relative border-b border-border">
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(250,250,250,0)_0%,rgb(255_255_255)_85%),radial-gradient(ellipse_90%_60%_at_50%_-20%,rgba(37,99,235,0.12),transparent)]"
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-5xl gap-10 px-safe py-12 sm:py-20 lg:grid-cols-[1fr_minmax(0,17rem)] lg:items-start lg:gap-14">
          <div className="min-w-0">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-muted">
              {siteConfig.location}
            </p>
            <h1 className="mt-4 max-w-lg">
              <SiteLogo variant="hero" />
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-foreground">
              {bioLead}
            </p>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-muted">
              {bioSide}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/work/"
                className="inline-flex min-h-11 items-center rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 active:bg-zinc-700"
              >
                Explore work
              </Link>
              <Link
                href="/about/"
                className="inline-flex min-h-11 items-center rounded-full border border-border bg-white px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface active:bg-surface-raised"
              >
                About
              </Link>
              <Link
                href="/blog/"
                className="inline-flex min-h-11 items-center rounded-full px-5 py-2.5 text-sm font-semibold text-muted transition hover:text-foreground active:text-foreground"
              >
                Blog
              </Link>
            </div>
          </div>

          <aside className="flex flex-col gap-3 lg:pt-2">
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm">
              <Image
                src={profile.avatarUrl}
                alt=""
                width={48}
                height={48}
                className="h-12 w-12 rounded-xl border border-border object-cover"
              />
              <div className="min-w-0 text-sm">
                <p className="font-semibold text-foreground">{siteConfig.name}</p>
                <p className="truncate text-muted">{profile.role}</p>
              </div>
            </div>
            <Link
              href="/work/hos/"
              className="flex min-h-11 items-center rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground transition hover:border-zinc-300 hover:bg-surface-raised active:bg-surface-raised"
            >
              Play House of Strategy →
            </Link>
            <a
              href={siteConfig.github}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground transition hover:border-zinc-300 hover:bg-surface-raised active:bg-surface-raised"
            >
              GitHub @
              {siteConfig.githubUsername} ↗
            </a>
          </aside>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-safe pb-20 pt-12 sm:pb-24 sm:pt-16">
        <section className="mb-16">
          <PlayHosBanner />
        </section>

        <section className="mb-16">
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.15em] text-muted">
            Focus
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {focusPillars.map((pillar) => (
              <article
                key={pillar.title}
                className="rounded-2xl border border-border bg-surface p-6"
              >
                <h3 className="font-display text-lg font-bold tracking-tight text-foreground">
                  {pillar.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {pillar.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight">
                Selected work
              </h2>
              <p className="mt-1 text-sm text-muted">
                Hosted demos and open-source projects.
              </p>
            </div>
            <Link
              href="/work/"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-accent hover:text-blue-700 active:text-blue-800"
            >
              View all →
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {otherFeatured.map((item) => (
              <WorkCard key={item.slug} item={item} />
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          {latestPost ? (
            <article className="flex flex-col rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8">
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
          ) : null}

          <article className="flex flex-col rounded-2xl border border-border bg-surface p-6 sm:p-8">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
              About
            </p>
            <h2 className="font-display mt-3 text-2xl font-bold tracking-tight text-foreground">
              Resume, experience &amp; quick facts
            </h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
              Eight years in real-time software and K–12 edtech—platform
              operations, ClassQuip, and side projects collected in one place.
            </p>
            <Link
              href="/about/"
              className="mt-6 text-sm font-semibold text-accent hover:text-blue-700"
            >
              Full about page →
            </Link>
          </article>
        </section>
      </div>
    </main>
  );
}
