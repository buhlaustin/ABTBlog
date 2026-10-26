import Link from "next/link";
import { getAllPosts } from "@/lib/blog";
import { siteConfig } from "@/lib/site";
import { workItems } from "@/lib/work-registry";
import { WorkCard } from "@/components/work-card";

export default function HomePage() {
  const featuredWork = workItems.filter((item) => item.featured);
  const latestPost = getAllPosts()[0];

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
      <section className="mb-16 max-w-2xl">
        <p className="mb-3 font-mono text-xs font-medium uppercase tracking-[0.2em] text-muted">
          austinbuhltech.com
        </p>
        <h1 className="font-display text-4xl font-extrabold leading-[1.12] tracking-tight text-foreground sm:text-5xl">
          {siteConfig.name}
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">
          {siteConfig.description}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/work/"
            className="inline-flex rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            Explore work
          </Link>
          <Link
            href="/work/hos/"
            className="inline-flex rounded-full border border-border bg-white px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface"
          >
            Play House of Strategy
          </Link>
          <Link
            href="/blog/"
            className="inline-flex px-5 py-2.5 text-sm font-semibold text-muted transition hover:text-foreground"
          >
            Blog
          </Link>
        </div>
      </section>

      <section className="mb-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 className="font-display text-2xl font-bold tracking-tight">
            Featured work
          </h2>
          <Link
            href="/work/"
            className="text-sm font-semibold text-accent hover:text-blue-700"
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
        <section className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
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
