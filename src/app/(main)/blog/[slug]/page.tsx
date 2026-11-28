import Link from "next/link";
import { notFound } from "next/navigation";
import { BookCallButton } from "@/components/book-call-button";
import { JsonLd } from "@/components/json-ld";
import { BlogPlayableEmbed } from "@/components/blog-playable-embed";
import { MarkdownContent } from "@/components/markdown-content";
import { PostAuthorCard } from "@/components/post-author-card";
import { formatBlogDate, getAllPostSlugs, getPostBySlug } from "@/lib/blog";
import { articleJsonLd, pageMetadata } from "@/lib/seo";

const EDTECH_CONVERSION_TAGS = [
  "edtech",
  "lti",
  "oneroster",
  "integrations",
  "consulting",
] as const;

function postShowsEdtechCta(tags: string[]): boolean {
  const normalized = new Set(tags.map((tag) => tag.toLowerCase()));
  return EDTECH_CONVERSION_TAGS.some((tag) => normalized.has(tag));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return pageMetadata({
    title: post.title,
    description: post.description,
    path: `/blog/${post.slug}/`,
    openGraphType: "article",
    publishedTime: new Date(post.date).toISOString(),
    authors: [post.author],
    tags: post.tags,
  });
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const jsonLd = articleJsonLd({
    title: post.title,
    description: post.description,
    path: `/blog/${post.slug}/`,
    datePublished: new Date(post.date).toISOString(),
    authorName: post.author,
  });

  return (
    <>
      <JsonLd data={jsonLd} />
    <main className="mx-auto w-full max-w-2xl flex-1 px-safe py-7 sm:py-16">
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
          {formatBlogDate(post.date)}
        </time>
        <h1 className="font-display mt-3 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
          {post.title}
        </h1>
        <PostAuthorCard variant="byline" authorName={post.author} />
        <div className="mt-8">
          <MarkdownContent content={post.content} />
        </div>
        {post.playable ? (
          <BlogPlayableEmbed
            title={post.playable.title}
            entryPath={post.playable.entry}
            workHref={post.playable.workHref}
          />
        ) : null}
        {postShowsEdtechCta(post.tags) ? (
          <aside className="lift-card mt-10 rounded-2xl border border-border bg-surface-raised p-6 sm:p-8">
            <p className="text-sm leading-relaxed text-muted">
              Working through an LTI or rostering problem right now? I do this
              as fixed-scope sprints and monthly retainers.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <Link
                href="/services/lti-oneroster-integration-sprint/"
                className="text-sm font-semibold text-accent hover:text-blue-700"
              >
                LTI 1.3 + OneRoster Integration Sprint →
              </Link>
              <BookCallButton variant="secondary" />
            </div>
          </aside>
        ) : null}
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
    </>
  );
}
