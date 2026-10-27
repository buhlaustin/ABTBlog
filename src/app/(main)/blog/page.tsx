import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog",
  description: "Writing on building, edtech, and side projects.",
};

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-4xl font-bold tracking-tight">Blog</h1>
      <p className="mt-4 text-muted">Notes on what I&apos;m building and learning.</p>
      <ul className="mt-12 divide-y divide-border/80">
        {posts.map((post) => (
          <li key={post.slug} className="py-8 first:pt-0">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <time
                dateTime={post.date}
                className="font-mono text-xs uppercase tracking-wider text-muted"
              >
                {new Date(post.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
              <span className="text-xs text-muted" aria-hidden>
                ·
              </span>
              <span className="text-xs font-semibold text-foreground">
                {post.author}
              </span>
            </div>
            <h2 className="font-display mt-2 text-xl font-bold">
              <Link
                href={`/blog/${post.slug}/`}
                className="text-foreground hover:text-accent"
              >
                {post.title}
              </Link>
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {post.description}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
