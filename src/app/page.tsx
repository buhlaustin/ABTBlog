import Link from "next/link";
import { getAllPosts } from "@/lib/blog";
import { siteConfig } from "@/lib/site";
import { workItems } from "@/lib/work-registry";
import { WorkCard } from "@/components/work-card";

export default function HomePage() {
  const featuredWork = workItems.filter((item) => item.featured);
  const latestPost = getAllPosts()[0];

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
      <section className="mb-16 max-w-2xl">
        <p className="mb-3 text-sm font-medium uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
          {siteConfig.url.replace("https://", "")}
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
          {siteConfig.name}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          {siteConfig.description}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/work/"
            className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Explore work
          </Link>
          <Link
            href="/blog/"
            className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Read the blog
          </Link>
        </div>
      </section>

      <section className="mb-16">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight">Featured work</h2>
          <Link
            href="/work/"
            className="text-sm font-medium text-emerald-700 dark:text-emerald-400"
          >
            View all
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {featuredWork.map((item) => (
            <WorkCard key={item.slug} item={item} />
          ))}
        </div>
      </section>

      {latestPost ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
          <p className="text-sm font-medium uppercase tracking-widest text-zinc-500">
            Latest post
          </p>
          <h2 className="mt-2 text-xl font-semibold">
            <Link href={`/blog/${latestPost.slug}/`} className="hover:underline">
              {latestPost.title}
            </Link>
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {latestPost.description}
          </p>
        </section>
      ) : null}
    </main>
  );
}
