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
      <h1 className="text-3xl font-semibold tracking-tight">Blog</h1>
      <p className="mt-3 text-zinc-600 dark:text-zinc-400">
        Notes on what I&apos;m building and learning.
      </p>
      <ul className="mt-10 divide-y divide-zinc-200 dark:divide-zinc-800">
        {posts.map((post) => (
          <li key={post.slug} className="py-6">
            <time
              dateTime={post.date}
              className="text-sm text-zinc-500 dark:text-zinc-400"
            >
              {new Date(post.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
            <h2 className="mt-1 text-xl font-semibold">
              <Link href={`/blog/${post.slug}/`} className="hover:underline">
                {post.title}
              </Link>
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {post.description}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
