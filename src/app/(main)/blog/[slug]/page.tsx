import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownContent } from "@/components/markdown-content";
import { PostAuthorCard } from "@/components/post-author-card";
import { getAllPostSlugs, getPostBySlug } from "@/lib/blog";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-safe py-10 sm:py-16">
      <Link
        href="/blog/"
        className="inline-flex min-h-11 items-center text-sm font-semibold text-accent hover:text-blue-700 active:text-blue-800"
      >
        ← Blog
      </Link>
      <article className="mt-4 sm:mt-6">
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
        <h1 className="font-display mt-3 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
          {post.title}
        </h1>
        <PostAuthorCard variant="byline" authorName={post.author} />
        <div className="mt-8">
          <MarkdownContent content={post.content} />
        </div>
        <aside
          aria-labelledby="about-author-heading"
          className="mt-12 border-t border-border/80 pt-10"
        >
          <h2
            id="about-author-heading"
            className="font-display text-lg font-bold tracking-tight"
          >
            About the author
          </h2>
          <PostAuthorCard variant="footer" authorName={post.author} />
        </aside>
      </article>
    </main>
  );
}
