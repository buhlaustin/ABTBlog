import Link from "next/link";
import { notFound } from "next/navigation";
import { BookCallButton } from "@/components/book-call-button";
import { JsonLd } from "@/components/json-ld";
import { MarkdownContent } from "@/components/markdown-content";
import {
  getAllCaseStudySlugs,
  getCaseStudyBySlug,
} from "@/lib/case-studies";
import { getServiceOfferBySlug } from "@/lib/services";
import { siteConfig } from "@/lib/site";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  pageMetadata,
} from "@/lib/seo";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllCaseStudySlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const study = getCaseStudyBySlug(slug);
  if (!study) return {};
  return pageMetadata({
    title: study.title,
    description: study.metaDescription,
    path: `/case-studies/${study.slug}/`,
    openGraphType: "article",
    publishedTime: new Date(study.date).toISOString(),
    authors: [siteConfig.name],
  });
}

export default async function CaseStudyPage({ params }: PageProps) {
  const { slug } = await params;
  const study = getCaseStudyBySlug(slug);
  if (!study) notFound();

  const relatedOffer = study.relatedOfferSlug
    ? getServiceOfferBySlug(study.relatedOfferSlug)
    : undefined;

  const path = `/case-studies/${study.slug}/`;

  return (
    <>
      <JsonLd
        data={articleJsonLd({
          title: study.title,
          description: study.metaDescription,
          path,
          datePublished: new Date(study.date).toISOString(),
          authorName: siteConfig.name,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Case studies", path: "/case-studies/" },
          { name: study.title, path },
        ])}
      />
      <main className="mx-auto w-full max-w-2xl flex-1 px-safe py-7 sm:py-16">
        <Link
          href="/case-studies/"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-accent hover:underline"
        >
          ← Case studies
        </Link>
        <header className="mt-4">
          <p className="font-mono text-xs uppercase tracking-wider text-muted">
            {study.client}
            {study.clientType ? ` · ${study.clientType}` : ""}
          </p>
          <h1 className="font-display mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            {study.title}
          </h1>
          <p className="mt-3 text-sm text-muted">
            {study.role} · {study.timeframe}
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {study.stack.map((tech) => (
              <li key={tech}>
                <span className="rounded-full border border-border bg-surface px-3 py-1 font-mono text-xs text-foreground">
                  {tech}
                </span>
              </li>
            ))}
          </ul>
        </header>

        <section className="mt-10">
          <h2 className="font-display text-lg font-bold tracking-tight">
            The problem
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted">
            {study.problem}
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-lg font-bold tracking-tight">
            What I did
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted">
            {study.approach}
          </p>
          {study.content.trim() ? (
            <div className="mt-6">
              <MarkdownContent content={study.content} />
            </div>
          ) : null}
        </section>

        <section className="mt-10">
          <h2 className="font-display text-lg font-bold tracking-tight">
            Results
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
            {study.results.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        {study.quote ? (
          <blockquote className="mt-10 border-l-4 border-accent pl-5 text-base italic text-foreground">
            {study.quote}
            {study.quoteAuthor ? (
              <footer className="mt-2 text-sm not-italic text-muted">
                — {study.quoteAuthor}
              </footer>
            ) : null}
          </blockquote>
        ) : null}

        <section className="lift-card mt-12 rounded-2xl border border-border bg-surface-raised px-6 py-8 text-center sm:px-10">
          {relatedOffer ? (
            <p className="text-sm text-muted">
              <Link
                href={`/services/${relatedOffer.slug}/`}
                className="font-semibold text-accent hover:underline"
              >
                {relatedOffer.name} →
              </Link>
            </p>
          ) : null}
          <div className="cta-mobile-stack mt-4 justify-center">
            <BookCallButton className="mx-auto" />
          </div>
        </section>
      </main>
    </>
  );
}