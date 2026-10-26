import Link from "next/link";
import { getAllPosts } from "@/lib/blog";
import { siteConfig } from "@/lib/site";
import { workItems } from "@/lib/work-registry";
import { WorkCard } from "@/components/work-card";

export default function HomePage() {
  const featuredWork = workItems.filter((item) => item.featured);
  const latestPost = getAllPosts()[0];

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-20 pt-12 sm:px-6 sm:pt-20">
      <section className="relative mb-20 overflow-hidden rounded-3xl border border-border/80 bg-surface/60 px-6 py-12 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <p className="mb-4 font-mono text-xs font-medium uppercase tracking-[0.25em] text-accent">
          Personal monolith
        </p>
        <h1 className="font-display max-w-2xl text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          Build for work.
          <span className="block text-muted">Ship for fun.</span>
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
          {siteConfig.description} Writing, open source, and playable projects
          live at{" "}
          <span className="font-medium text-foreground">austinbuhltech.com</span>
          .
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/work/"
            className="inline-flex items-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-300"
          >
            Explore work
          </Link>
          <Link
            href="/work/hos/"
            className="inline-flex items-center rounded-full border border-border bg-surface-raised px-6 py-3 text-sm font-semibold text-foreground transition hover:border-emerald-500/50"
          >
            Play House of Strategy
          </Link>
          <Link
            href="/blog/"
            className="inline-flex items-center rounded-full px-6 py-3 text-sm font-semibold text-muted transition hover:text-foreground"
          >
            Read the blog
          </Link>
        </div>
      </section>

      <section className="mb-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Featured work
            </h2>
            <p className="mt-1 text-sm text-muted">
              Hosted here and elsewhere on GitHub.
            </p>
          </div>
          <Link
            href="/work/"
            className="text-sm font-semibold text-accent hover:text-emerald-300"
          >
            View all
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {featuredWork.map((item) => (
            <WorkCard key={item.slug} item={item} />
          ))}
        </div>
      </section>

      {latestPost ? (
        <section className="rounded-2xl border border-border/80 bg-surface/50 p-6 sm:p-8">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
            Latest post
          </p>
          <h2 className="font-display mt-3 text-2xl font-bold">
            <Link
              href={`/blog/${latestPost.slug}/`}
              className="text-foreground hover:text-accent"
            >
              {latestPost.title}
            </Link>
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {latestPost.description}
          </p>
        </section>
      ) : null}
    </main>
  );
}
